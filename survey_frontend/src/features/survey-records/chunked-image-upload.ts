import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";
import type { SurveyRecordParameter } from "./types";

/**
 * Uploads a photo at original quality in 1 MB pieces. A dropped connection
 * only re-sends the piece in flight; a failed upload can be resumed later
 * from the pieces the server already holds.
 */
export const CHUNKED_IMAGE_MAX_BYTES = 40 * 1024 * 1024;

type UploadSession = {
  upload_id: string;
  chunk_size: number;
  total_chunks: number;
  received_chunks: number[];
};

const routes = API_ROUTES.surveyRecords;
const MAX_ATTEMPTS = 5;
const CHUNK_TIMEOUT_MS = 60_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const statusOf = (error: unknown) =>
  (error as { response?: { status?: number } })?.response?.status;

/** Network errors, timeouts, 408/429 and 5xx are worth retrying. */
const isRetryable = (error: unknown) => {
  const status = statusOf(error);
  return !status || status === 408 || status === 429 || status >= 500;
};

async function withRetry<T>(task: () => Promise<T>) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === MAX_ATTEMPTS) break;
      await sleep(Math.min(1000 * 2 ** (attempt - 1), 8000));
    }
  }
  throw lastError;
}

export type ChunkedUploadHandle = {
  uploadId: string | null;
};

export async function uploadImageInChunks({
  parameterId,
  file,
  handle,
  onProgress,
}: {
  parameterId: number;
  file: File;
  /** Keeps the upload id so a failed upload can be resumed. */
  handle: ChunkedUploadHandle;
  onProgress?: (percent: number) => void;
}): Promise<SurveyRecordParameter> {
  let session: UploadSession | null = null;

  if (handle.uploadId) {
    session = await withRetry(async () => {
      const response = await axiosClient.get<UploadSession>(
        routes.imageUploadDetail(handle.uploadId as string),
      );
      return response.data;
    }).catch(() => null);
  }
  if (!session) {
    session = await withRetry(async () => {
      const response = await axiosClient.post<UploadSession>(
        routes.imageUploads(parameterId),
        { mime_type: file.type, size: file.size },
      );
      return response.data;
    });
  }
  handle.uploadId = session.upload_id;

  const { upload_id: uploadId, chunk_size: chunkSize, total_chunks: total } =
    session;
  const received = new Set(session.received_chunks);
  const report = () =>
    onProgress?.(Math.min(99, Math.round((received.size / total) * 100)));
  report();

  for (let index = 0; index < total; index += 1) {
    if (received.has(index)) continue;
    const piece = file.slice(index * chunkSize, (index + 1) * chunkSize);
    await withRetry(() =>
      axiosClient.put(routes.imageUploadChunk(uploadId, index), piece, {
        headers: { "Content-Type": "application/octet-stream" },
        timeout: CHUNK_TIMEOUT_MS,
      }),
    );
    received.add(index);
    report();
  }

  let completeAttempted = false;
  const parameter = await withRetry(async () => {
    try {
      const response = await axiosClient.post<SurveyRecordParameter>(
        routes.imageUploadComplete(uploadId),
      );
      return response.data;
    } catch (error) {
      // The first "complete" may have succeeded before the connection dropped.
      if (completeAttempted && statusOf(error) === 404) return null;
      completeAttempted = true;
      throw error;
    }
  });
  handle.uploadId = null;
  onProgress?.(100);
  return parameter as SurveyRecordParameter;
}
