import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import sharp from 'sharp';
import { PrismaService } from '../../prisma.service';
import {
  AVATAR_DIR,
  AVATAR_SIZE_PX,
  AVATAR_URL_PREFIX,
} from '../../common/uploads';

const publicUserSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  status: true,
  avatar: true,
  created_at: true,
  updated_at: true,
} as const;

export type ChangePasswordResult = 'ok' | 'wrong-current' | 'same-as-current';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: number) {
    return this.prisma.users.findFirst({
      where: { id, deleted_at: null, status: 'active' },
      select: publicUserSelect,
    });
  }

  findByUsername(username: string) {
    return this.prisma.users.findFirst({
      where: { username, deleted_at: null },
      select: publicUserSelect,
    });
  }

  async validateUser(username: string, password: string) {
    const user = await this.prisma.users.findFirst({
      where: { username, deleted_at: null, status: 'active' },
    });
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    const { password: _password, deleted_at: _deletedAt, ...publicUser } = user;
    return publicUser;
  }

  /**
   * Resizes the uploaded image to a square WebP, stores it under
   * uploads/avatars and replaces the user's previous avatar file.
   */
  async updateAvatar(userId: number, imageBuffer: Buffer) {
    const webp = await sharp(imageBuffer)
      .rotate()
      .resize(AVATAR_SIZE_PX, AVATAR_SIZE_PX, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();

    await mkdir(AVATAR_DIR, { recursive: true });
    const fileName = `${userId}-${randomUUID()}.webp`;
    await writeFile(join(AVATAR_DIR, fileName), webp);

    const previous = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    const updatedUser = await this.prisma.users.update({
      where: { id: userId },
      data: { avatar: `${AVATAR_URL_PREFIX}${fileName}` },
      select: publicUserSelect,
    });

    if (previous?.avatar?.startsWith(AVATAR_URL_PREFIX)) {
      await unlink(join(AVATAR_DIR, basename(previous.avatar))).catch(
        () => undefined,
      );
    }

    return updatedUser;
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<ChangePasswordResult> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return 'wrong-current';
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      return 'same-as-current';
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.users.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
    return 'ok';
  }
}
