import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSurveyRecordDto {
  @ApiProperty({ example: 1, description: 'ID template (phải đang active)' })
  survey_template_id!: number | string;

  @ApiProperty({ example: 'Khảo sát hiện trạng HVAC khu sản xuất' })
  title?: string | null;

  @ApiPropertyOptional({ example: 'Dự án nâng cấp nhà máy' })
  project?: string | null;

  @ApiPropertyOptional({ example: 'Xưởng 1 - Khu pha chế' })
  location?: string | null;

  @ApiPropertyOptional({ example: '2026-11-10', description: 'YYYY-MM-DD' })
  survey_date?: string | null;

  @ApiPropertyOptional({ example: 'Ghi chú chung cho phiếu' })
  description?: string | null;
}

export class UpdateSurveyRecordDto {
  @ApiPropertyOptional() title?: string | null;
  @ApiPropertyOptional() project?: string | null;
  @ApiPropertyOptional() location?: string | null;
  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  survey_date?: string | null;
  @ApiPropertyOptional() description?: string | null;
}

export class CreateSurveyRecordStageDto {
  @ApiProperty({ example: 'Giai đoạn 1' }) stage_name?: string | null;
  @ApiProperty({ example: 1 }) stage_order?: number | string | null;
}

export class UpdateSurveyRecordStageDto {
  @ApiPropertyOptional() stage_name?: string | null;
  @ApiPropertyOptional() stage_order?: number | string | null;
}

export class CreateSurveyRecordStepDto {
  @ApiProperty({ example: 'Bước 1' }) step_name?: string | null;
  @ApiProperty({ example: 1 }) step_order?: number | string | null;
}

export class UpdateSurveyRecordStepDto {
  @ApiPropertyOptional() step_name?: string | null;
  @ApiPropertyOptional() step_order?: number | string | null;
}

export class CreateSurveyRecordParameterDto {
  @ApiProperty({ example: 'Nhiệt độ phòng' }) parameter_name?: string | null;
  @ApiProperty({
    enum: [
      'text',
      'number',
      'decimal',
      'boolean',
      'yes_no',
      'date',
      'datetime',
      'select',
    ],
  })
  data_type?: string | null;
  @ApiPropertyOptional({ example: '°C' }) unit?: string | null;
  @ApiPropertyOptional({ example: '18 - 25' }) requirement?: string | null;
  @ApiProperty({ example: 1 }) parameter_order?: number | string | null;
}

export class UpdateSurveyRecordParameterDto {
  @ApiPropertyOptional() parameter_name?: string | null;
  @ApiPropertyOptional() data_type?: string | null;
  @ApiPropertyOptional() unit?: string | null;
  @ApiPropertyOptional() requirement?: string | null;
  @ApiPropertyOptional() parameter_order?: number | string | null;
}

export class UpdateSurveyRecordParameterResultDto {
  @ApiPropertyOptional({
    description: 'Giá trị thực tế; null hoặc "" để xoá',
    oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
  })
  result_value?: string | number | boolean | null;

  @ApiPropertyOptional() note?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Chỉ nhận null để xoá ảnh; tải ảnh mới qua /image',
  })
  result_image_path?: string | null;
}
