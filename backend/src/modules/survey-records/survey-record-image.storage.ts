import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve, sep } from 'node:path';
import sharp from 'sharp';
import { UPLOADS_ROOT } from '../../common/uploads';

/** Public API route that streams a parameter image (JWT required). */
export const SURVEY_RECORD_IMAGE_ROUTE = '/survey-record-parameters/images';

/** Not under the public /uploads/avatars static route: served only via the API. */
const UPLOAD_DIR = join(UPLOADS_ROOT, 'survey-record-parameters', 'images');

const THUMBNAIL_MAX_SIZE = 640;
export const SURVEY_RECORD_IMAGE_MAX_BYTES = 20 * 1024 * 1024;

const EXTENSION_BY_MIME_TYPE = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);
const MIME_TYPE_BY_EXTENSION = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
]);

export const surveyRecordImageUploadOptions = {
  limits: { fileSize: SURVEY_RECORD_IMAGE_MAX_BYTES, files: 1 },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    callback: (error: Error | null, accept: boolean) => void,
  ) => {
    if (!EXTENSION_BY_MIME_TYPE.has(file.mimetype)) {
      callback(
        new BadRequestException('image must be a JPG, PNG, WEBP, or GIF image'),
        false,
      );
      return;
    }
    callback(null, true);
  },
};

const thumbnailPathFor = (filePath: string) =>
  `${filePath.slice(0, -extname(filePath).length)}.thumb.webp`;

/** Stores the original plus a WebP thumbnail; returns the API path to save. */
export async function storeSurveyRecordImage(file: Express.Multer.File) {
  const extension = EXTENSION_BY_MIME_TYPE.get(file.mimetype);
  if (!extension || !file.buffer?.length) {
    throw new BadRequestException('image is required');
  }

  let thumbnail: Buffer;
  try {
    thumbnail = await sharp(file.buffer, { animated: false })
      .rotate()
      .resize(THUMBNAIL_MAX_SIZE, THUMBNAIL_MAX_SIZE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new BadRequestException('The uploaded file is not a valid image');
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}${extension}`;
  const filePath = join(UPLOAD_DIR, filename);
  await writeFile(filePath, file.buffer);
  await writeFile(thumbnailPathFor(filePath), thumbnail);

  return `${SURVEY_RECORD_IMAGE_ROUTE}/${filename}`;
}

const resolveSafePath = (filename: string) => {
  const safeFilename = filename.trim();
  if (
    !safeFilename ||
    safeFilename.includes('/') ||
    safeFilename.includes('\\') ||
    basename(safeFilename) !== safeFilename ||
    safeFilename.endsWith('.thumb.webp')
  ) {
    return null;
  }
  const root = resolve(UPLOAD_DIR);
  const filePath = resolve(root, safeFilename);
  return filePath.startsWith(`${root}${sep}`) ? filePath : null;
};

const fileSize = async (filePath: string) => {
  try {
    const info = await stat(filePath);
    return info.isFile() ? info.size : null;
  } catch {
    return null;
  }
};

/** Prefers the thumbnail unless the original is requested. */
export async function resolveSurveyRecordImage(
  filename: string,
  original = false,
) {
  const filePath = resolveSafePath(filename);
  if (!filePath) return null;

  if (!original) {
    const thumbnailPath = thumbnailPathFor(filePath);
    const size = await fileSize(thumbnailPath);
    if (size !== null) {
      return { filePath: thumbnailPath, contentType: 'image/webp', size };
    }
  }

  const size = await fileSize(filePath);
  if (size === null) return null;
  return {
    filePath,
    contentType:
      MIME_TYPE_BY_EXTENSION.get(extname(filePath).toLowerCase()) ??
      'application/octet-stream',
    size,
  };
}

export async function removeSurveyRecordImageByPath(imagePath?: string | null) {
  if (!imagePath?.startsWith(`${SURVEY_RECORD_IMAGE_ROUTE}/`)) return;
  const filePath = resolveSafePath(
    imagePath.slice(SURVEY_RECORD_IMAGE_ROUTE.length + 1),
  );
  if (!filePath) return;
  await unlink(filePath).catch(() => undefined);
  await unlink(thumbnailPathFor(filePath)).catch(() => undefined);
}
