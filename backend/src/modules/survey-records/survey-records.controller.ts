import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Request,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import {
  CreateSurveyRecordDto,
  CreateSurveyRecordParameterDto,
  CreateSurveyRecordStageDto,
  CreateSurveyRecordStepDto,
  UpdateSurveyRecordDto,
  UpdateSurveyRecordParameterDto,
  UpdateSurveyRecordParameterResultDto,
  UpdateSurveyRecordStageDto,
  UpdateSurveyRecordStepDto,
} from './dto/survey-record.dto';
import { surveyRecordImageUploadOptions } from './survey-record-image.storage';
import { SurveyRecordsEventsInterceptor } from './survey-records-events.interceptor';
import { SurveyRecordsService } from './survey-records.service';

type AuthRequest = { user: { id: number } };

@Controller()
@ApiTags('Survey records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(SurveyRecordsEventsInterceptor)
export class SurveyRecordsController {
  constructor(private readonly service: SurveyRecordsService) {}

  // ---- Records -----------------------------------------------------------

  @Get('survey-records')
  @ApiOperation({ summary: 'Danh sách phiếu khảo sát' })
  findAll() {
    return this.service.findAll();
  }

  @Post('survey-records')
  @ApiOperation({ summary: 'Tạo phiếu khảo sát từ template' })
  create(@Body() dto: CreateSurveyRecordDto, @Request() req: AuthRequest) {
    return this.service.create(dto, req.user);
  }

  @Get('survey-records/:id')
  @ApiOperation({ summary: 'Chi tiết phiếu khảo sát (kèm cây giai đoạn)' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Patch('survey-records/:id')
  @ApiOperation({ summary: 'Sửa thông tin phiếu (trước khi kiểm tra)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSurveyRecordDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete('survey-records/:id')
  @ApiOperation({ summary: 'Xoá phiếu (chưa phê duyệt)' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }

  @Patch('survey-records/:id/check-approval')
  @ApiOperation({ summary: 'Người kiểm tra ký xác nhận' })
  check(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    return this.service.check(id, req.user);
  }

  @Patch('survey-records/:id/final-approval')
  @ApiOperation({ summary: 'Người phê duyệt ký — khoá kết quả' })
  approve(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    return this.service.approve(id, req.user);
  }

  // ---- Structure ---------------------------------------------------------

  @Post('survey-records/:id/stages')
  createStage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSurveyRecordStageDto,
  ) {
    return this.service.createStage(id, dto);
  }

  @Patch('survey-record-stages/:id')
  updateStage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSurveyRecordStageDto,
  ) {
    return this.service.updateStage(id, dto);
  }

  @Delete('survey-record-stages/:id')
  deleteStage(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteStage(id);
  }

  @Post('survey-record-stages/:id/steps')
  createStep(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSurveyRecordStepDto,
  ) {
    return this.service.createStep(id, dto);
  }

  @Patch('survey-record-steps/:id')
  updateStep(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSurveyRecordStepDto,
  ) {
    return this.service.updateStep(id, dto);
  }

  @Delete('survey-record-steps/:id')
  deleteStep(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteStep(id);
  }

  @Post('survey-record-steps/:id/parameters')
  createParameter(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSurveyRecordParameterDto,
  ) {
    return this.service.createParameter(id, dto);
  }

  @Patch('survey-record-parameters/:id')
  updateParameter(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSurveyRecordParameterDto,
  ) {
    return this.service.updateParameter(id, dto);
  }

  @Delete('survey-record-parameters/:id')
  deleteParameter(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteParameter(id);
  }

  // ---- Entries -----------------------------------------------------------

  @Patch('survey-record-parameters/:id/result')
  @ApiOperation({ summary: 'Nhập kết quả thực tế / ghi chú / xoá ảnh' })
  updateResult(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSurveyRecordParameterResultDto,
    @Request() req: AuthRequest,
  ) {
    return this.service.updateParameterResult(id, dto, req.user);
  }

  @Post('survey-record-parameters/:id/image')
  @ApiOperation({ summary: 'Tải ảnh minh chứng cho thông số' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { image: { type: 'string', format: 'binary' } },
      required: ['image'],
    },
  })
  @UseInterceptors(FileInterceptor('image', surveyRecordImageUploadOptions))
  uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    if (!image) {
      throw new BadRequestException('image is required');
    }
    return this.service.uploadParameterImage(id, image);
  }

  // ---- Resumable photo upload (original quality, sent in 1 MB pieces) ----

  @Post('survey-record-parameters/:id/image-uploads')
  @ApiOperation({ summary: 'Bắt đầu tải ảnh gốc theo từng mảnh' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        mime_type: { type: 'string', example: 'image/jpeg' },
        size: { type: 'integer', example: 6291456 },
      },
      required: ['mime_type', 'size'],
    },
  })
  startImageUpload(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { mime_type?: unknown; size?: unknown },
    @Request() req: AuthRequest,
  ) {
    return this.service.startChunkedImageUpload(id, body, req.user);
  }

  @Get('survey-record-parameters/image-uploads/:uploadId')
  @ApiOperation({ summary: 'Các mảnh đã nhận (để tiếp tục khi bị ngắt)' })
  getImageUpload(
    @Param('uploadId') uploadId: string,
    @Request() req: AuthRequest,
  ) {
    return this.service.getChunkedImageUpload(uploadId, req.user);
  }

  @Put('survey-record-parameters/image-uploads/:uploadId/chunks/:index')
  @ApiOperation({ summary: 'Gửi một mảnh (application/octet-stream)' })
  @ApiConsumes('application/octet-stream')
  putImageChunk(
    @Param('uploadId') uploadId: string,
    @Param('index', ParseIntPipe) index: number,
    @Body() body: unknown,
    @Request() req: AuthRequest,
  ) {
    return this.service.writeChunkedImagePart(uploadId, index, body, req.user);
  }

  @Post('survey-record-parameters/image-uploads/:uploadId/complete')
  @ApiOperation({ summary: 'Ghép các mảnh và lưu ảnh gốc' })
  completeImageUpload(
    @Param('uploadId') uploadId: string,
    @Request() req: AuthRequest,
  ) {
    return this.service.completeChunkedImageUpload(uploadId, req.user);
  }

  @Get('survey-record-parameters/images/:filename')
  @ApiOperation({ summary: 'Xem ảnh (mặc định thumbnail; ?original=true)' })
  async getImage(
    @Param('filename') filename: string,
    @Query('original') original: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const image = await this.service.findParameterImageFile(
      filename,
      original === 'true' || original === '1',
    );
    if (!image) {
      throw new NotFoundException('Survey record image not found');
    }
    response.set({
      'Content-Type': image.contentType,
      'Content-Length': String(image.size),
      'Cache-Control': 'private, max-age=86400',
    });
    return new StreamableFile(createReadStream(image.filePath));
  }
}
