import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
import { CreateUserDto, UpdateUserDto } from './dto/manage-user.dto';

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

  // ---- User management (Cài đặt > Người dùng) ----------------------------

  /** Lists users that have not been soft-deleted. */
  findAllForManagement() {
    return this.prisma.users.findMany({
      where: { deleted_at: null },
      select: publicUserSelect,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async createUser(dto: CreateUserDto) {
    const data = {
      username: dto.username.trim(),
      name: dto.name.trim(),
      email: dto.email?.trim() || null,
      status: dto.status ?? 'active',
    };
    await this.ensureUnique(data.username, data.email);

    try {
      return await this.prisma.users.create({
        data: { ...data, password: await bcrypt.hash(dto.password, 10) },
        select: publicUserSelect,
      });
    } catch (error) {
      this.rethrowUniqueViolation(error);
    }
  }

  async updateUser(id: number, dto: UpdateUserDto, currentUserId: number) {
    const existing = await this.findManagedUserOrThrow(id);
    const data: Prisma.UsersUpdateInput = {};

    if (dto.username !== undefined) data.username = dto.username.trim();
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.email !== undefined) data.email = dto.email?.trim() || null;
    if (dto.status !== undefined) {
      if (id === currentUserId && dto.status !== 'active') {
        throw new BadRequestException('You cannot deactivate your own account');
      }
      data.status = dto.status;
    }
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    await this.ensureUnique(
      typeof data.username === 'string' && data.username !== existing.username
        ? data.username
        : null,
      typeof data.email === 'string' && data.email !== existing.email
        ? data.email
        : null,
      id,
    );

    try {
      const updated = await this.prisma.users.update({
        where: { id },
        data,
        select: publicUserSelect,
      });
      // Disabling an account or resetting its password ends its sessions.
      if (data.status === 'inactive' || data.password) {
        await this.prisma.tokens.deleteMany({ where: { user_id: id } });
      }
      return updated;
    } catch (error) {
      this.rethrowUniqueViolation(error);
    }
  }

  /**
   * Soft delete: the account can no longer sign in and disappears from the
   * list, but its name stays on survey records it signed or filled in.
   */
  async softDeleteUser(id: number, currentUserId: number) {
    if (id === currentUserId) {
      throw new BadRequestException('You cannot delete your own account');
    }
    await this.findManagedUserOrThrow(id);

    const [deleted] = await this.prisma.$transaction([
      this.prisma.users.update({
        where: { id },
        data: { deleted_at: new Date(), status: 'inactive' },
        select: publicUserSelect,
      }),
      this.prisma.tokens.deleteMany({ where: { user_id: id } }),
    ]);
    return deleted;
  }

  /** True when the account may still obtain new access tokens. */
  async isActive(id: number) {
    const user = await this.prisma.users.findFirst({
      where: { id, deleted_at: null, status: 'active' },
      select: { id: true },
    });
    return Boolean(user);
  }

  private async findManagedUserOrThrow(id: number) {
    const user = await this.prisma.users.findFirst({
      where: { id, deleted_at: null },
      select: { id: true, username: true, email: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /** Usernames and emails stay reserved by soft-deleted accounts too. */
  private async ensureUnique(
    username: string | null,
    email: string | null,
    excludedId?: number,
  ) {
    if (username) {
      const taken = await this.prisma.users.findUnique({
        where: { username },
        select: { id: true },
      });
      if (taken && taken.id !== excludedId) {
        throw new ConflictException('Username already exists');
      }
    }
    if (email) {
      const taken = await this.prisma.users.findUnique({
        where: { email },
        select: { id: true },
      });
      if (taken && taken.id !== excludedId) {
        throw new ConflictException('Email already exists');
      }
    }
  }

  private rethrowUniqueViolation(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Username or email already exists');
    }
    throw error;
  }
}
