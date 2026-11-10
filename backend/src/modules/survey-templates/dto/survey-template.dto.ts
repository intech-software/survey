import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSurveyTemplateDto {
  @ApiProperty({
    example: 'KS-HVAC',
    description: 'Mã template (tối đa 50 ký tự)',
  })
  code?: string | null;

  @ApiProperty({
    example: 'Phiếu khảo sát hệ thống HVAC phòng sạch',
    description: 'Tên template (tối đa 255 ký tự)',
  })
  name?: string | null;

  @ApiPropertyOptional({ example: 1, description: 'Phiên bản, mặc định 1' })
  version?: number | string | null;

  @ApiPropertyOptional({ example: 'Áp dụng cho khảo sát hiện trạng' })
  description?: string | null;
}

export class UpdateSurveyTemplateDto extends CreateSurveyTemplateDto {
  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  status?: string | null;
}

export class CopySurveyTemplateDto extends CreateSurveyTemplateDto {
  @ApiProperty({ example: 1, description: 'ID template nguồn cần nhân bản' })
  source_template_id!: number | string;
}
