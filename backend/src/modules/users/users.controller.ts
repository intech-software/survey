import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import {
  AVATAR_ALLOWED_MIME_TYPES,
  AVATAR_MAX_BYTES,
} from '../../common/uploads';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto, UpdateUserDto } from './dto/manage-user.dto';
import { UsersService } from './users.service';

type AuthRequest = { user: { id: number } };

@Controller('users')
@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Thông tin người dùng đang đăng nhập' })
  @ApiOkResponse({ description: 'Thông tin người dùng (không gồm mật khẩu)' })
  @ApiUnauthorizedResponse({ description: 'Access token không hợp lệ' })
  me(@Request() request: AuthRequest) {
    return request.user;
  }

  @Post('me/avatar')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
      fileFilter: (_req, file, callback) => {
        if (!AVATAR_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return callback(
            new HttpException(
              'Only JPG, PNG or WebP images are allowed',
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Tải ảnh đại diện cho user đang đăng nhập' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['avatar'],
      properties: { avatar: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ description: 'User sau khi cập nhật avatar' })
  @ApiBadRequestResponse({
    description: 'Thiếu file, sai định dạng (JPG/PNG/WebP) hoặc lớn hơn 5 MB',
  })
  async uploadAvatar(
    @Request() request: AuthRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.usersService.updateAvatar(request.user.id, file.buffer);
    } catch {
      throw new HttpException(
        'The uploaded file is not a valid image',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('me/change-password')
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({ summary: 'Đổi mật khẩu cho user đang đăng nhập' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ description: 'Đổi mật khẩu thành công' })
  @ApiBadRequestResponse({
    description:
      'Mật khẩu hiện tại không đúng, mật khẩu mới trùng mật khẩu cũ hoặc không đạt yêu cầu',
  })
  async changePassword(
    @Request() request: AuthRequest,
    @Body() body: ChangePasswordDto,
  ) {
    const result = await this.usersService.changePassword(
      request.user.id,
      body.currentPassword,
      body.newPassword,
    );
    if (result === 'wrong-current') {
      throw new HttpException(
        'Current password is incorrect',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (result === 'same-as-current') {
      throw new HttpException(
        'New password must be different from the current password',
        HttpStatus.BAD_REQUEST,
      );
    }
    return { message: 'Password changed successfully' };
  }

  // ---- User management (Cài đặt > Người dùng) ----------------------------

  @Get()
  @ApiOperation({ summary: 'Danh sách người dùng (chưa bị xóa)' })
  findAll() {
    return this.usersService.findAllForManagement();
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({ summary: 'Thêm người dùng' })
  @ApiBody({ type: CreateUserDto })
  create(@Body() body: CreateUserDto) {
    return this.usersService.createUser(body);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({
    summary: 'Sửa người dùng / đặt lại mật khẩu / khóa tài khoản',
  })
  @ApiBody({ type: UpdateUserDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserDto,
    @Request() request: AuthRequest,
  ) {
    return this.usersService.updateUser(id, body, request.user.id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa mềm người dùng (giữ tên trên các phiếu đã ký/nhập)',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() request: AuthRequest,
  ) {
    return this.usersService.softDeleteUser(id, request.user.id);
  }
}
