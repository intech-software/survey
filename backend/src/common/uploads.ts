import { join } from 'node:path';

// Files are stored under <backend>/uploads and served at /uploads/...
export const UPLOADS_ROOT = join(process.cwd(), 'uploads');
export const UPLOADS_URL_PREFIX = '/uploads/';

export const AVATAR_DIR = join(UPLOADS_ROOT, 'avatars');
export const AVATAR_URL_PREFIX = `${UPLOADS_URL_PREFIX}avatars/`;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const AVATAR_SIZE_PX = 512;
export const AVATAR_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];
