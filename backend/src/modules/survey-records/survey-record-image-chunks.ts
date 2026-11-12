import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { UPLOADS_ROOT } from '../../common/uploads';

/**
 * Resumable (chunked) uploads for survey record photos.
 *
 * The original file is sent in fixed-size pieces so a dropped connection
 * only costs the piece in flight, not the whole photo. Pieces are kept in a
 * private temp folder (never served) until the upload is completed, then
 * joined byte-for-byte — the stored original is identical to the source.
 */
export const IMAGE_CHUNK_SIZE = 1024 * 1024; // 1 MB
export const IMAGE_CHUNKED_MAX_BYTES = 40 * 1024 * 1024; // 40 MB
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

const TMP_DIR = join(UPLOADS_ROOT, 'tmp', 'survey-record-image-uploads');
const UPLOAD_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const IMAGE_CHUNK_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export type ImageUploadSession = {
  upload_id: string;
  parameter_id: number;
  user_id: number;
  mime_type: string;
  size: number;
  chunk_size: number;
  total_chunks: number;
  created_at: string;
};

const sessionDir = (uploadId: string) => {
  if (!UPLOAD_ID_PATTERN.test(uploadId)) {
    throw new NotFoundException('Upload not found');
  }
  return join(TMP_DIR, uploadId);
};
const chunkPath = (uploadId: string, index: number) =>
  join(sessionDir(uploadId), `${index}.part`);

/** Removes abandoned uploads (older than 24 h). Best effort. */
async function removeStaleSessions() {
  const entries = await readdir(TMP_DIR).catch(() => [] as string[]);
  const now = Date.now();
  await Promise.all(
    entries.map(async (entry) => {
      const info = await stat(join(TMP_DIR, entry)).catch(() => null);
      if (info && now - info.mtimeMs > STALE_AFTER_MS) {
        await rm(join(TMP_DIR, entry), { recursive: true, force: true });
      }
    }),
  );
}

export async function createImageUploadSession(input: {
  parameterId: number;
  userId: number;
  mimeType: unknown;
  size: unknown;
}): Promise<ImageUploadSession> {
  const mimeType = typeof input.mimeType === 'string' ? input.mimeType : '';
  if (!IMAGE_CHUNK_MIME_TYPES.includes(mimeType)) {
    throw new BadRequestException(
      'image must be a JPG, PNG, WEBP, or GIF image',
    );
  }
  const size = Number(input.size);
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new BadRequestException('size must be a positive integer');
  }
  if (size > IMAGE_CHUNKED_MAX_BYTES) {
    throw new BadRequestException(
      `image must not exceed ${IMAGE_CHUNKED_MAX_BYTES / 1024 / 1024} MB`,
    );
  }

  await removeStaleSessions();
  const session: ImageUploadSession = {
    upload_id: randomUUID(),
    parameter_id: input.parameterId,
    user_id: input.userId,
    mime_type: mimeType,
    size,
    chunk_size: IMAGE_CHUNK_SIZE,
    total_chunks: Math.ceil(size / IMAGE_CHUNK_SIZE),
    created_at: new Date().toISOString(),
  };
  const dir = sessionDir(session.upload_id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'session.json'), JSON.stringify(session));
  return session;
}

export async function readImageUploadSession(
  uploadId: string,
  userId: number,
): Promise<ImageUploadSession> {
  const raw = await readFile(
    join(sessionDir(uploadId), 'session.json'),
    'utf8',
  ).catch(() => null);
  if (!raw) {
    throw new NotFoundException('Upload not found or expired');
  }
  const session = JSON.parse(raw) as ImageUploadSession;
  if (session.user_id !== userId) {
    throw new ForbiddenException('Upload belongs to another user');
  }
  return session;
}

const expectedChunkSize = (session: ImageUploadSession, index: number) =>
  index === session.total_chunks - 1
    ? session.size - session.chunk_size * (session.total_chunks - 1)
    : session.chunk_size;

/** Indexes of pieces already stored with the expected size. */
export async function listReceivedChunks(session: ImageUploadSession) {
  const received: number[] = [];
  for (let index = 0; index < session.total_chunks; index += 1) {
    const info = await stat(chunkPath(session.upload_id, index)).catch(
      () => null,
    );
    if (info?.size === expectedChunkSize(session, index)) {
      received.push(index);
    }
  }
  return received;
}

/** Stores one piece. Re-sending the same piece is harmless (idempotent). */
export async function writeImageChunk(
  session: ImageUploadSession,
  index: number,
  body: unknown,
) {
  if (!Number.isInteger(index) || index < 0 || index >= session.total_chunks) {
    throw new BadRequestException('Chunk index out of range');
  }
  if (!Buffer.isBuffer(body)) {
    throw new BadRequestException(
      'Chunk body must be sent as application/octet-stream',
    );
  }
  if (body.length !== expectedChunkSize(session, index)) {
    throw new BadRequestException(
      `Chunk ${index} must be ${expectedChunkSize(session, index)} bytes`,
    );
  }
  await writeFile(chunkPath(session.upload_id, index), body);
}

/** Joins all pieces into the original file bytes. */
export async function assembleImageUpload(session: ImageUploadSession) {
  const received = await listReceivedChunks(session);
  if (received.length !== session.total_chunks) {
    const missing = session.total_chunks - received.length;
    throw new BadRequestException(
      `Upload incomplete: ${missing} chunk(s) missing`,
    );
  }
  const parts: Buffer[] = [];
  for (let index = 0; index < session.total_chunks; index += 1) {
    parts.push(await readFile(chunkPath(session.upload_id, index)));
  }
  const buffer = Buffer.concat(parts);
  if (buffer.length !== session.size) {
    throw new BadRequestException('Uploaded size does not match');
  }
  return buffer;
}

export async function removeImageUploadSession(uploadId: string) {
  await rm(sessionDir(uploadId), { recursive: true, force: true });
}
