import { ApiPropertyOptional } from '@nestjs/swagger';
import type { UpdateUploadSettingsDto as IUpdateUploadSettingsDto } from '@nova/shared-types';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class UploadLocalSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appPublicUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  uploadsDir?: string;
}

class UploadAliyunSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bucket?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessKeyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessKeySecret?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  publicBaseUrl?: string;
}

class UploadTencentSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bucket?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secretId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secretKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  publicBaseUrl?: string;
}

export class UpdateUploadSettingsDto implements IUpdateUploadSettingsDto {
  @ApiPropertyOptional({ enum: ['local', 'aliyun_oss', 'tencent_cos'] })
  @IsOptional()
  @IsIn(['local', 'aliyun_oss', 'tencent_cos'])
  provider?: 'local' | 'aliyun_oss' | 'tencent_cos';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => UploadLocalSettingsDto)
  local?: UploadLocalSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => UploadAliyunSettingsDto)
  aliyun?: UploadAliyunSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => UploadTencentSettingsDto)
  tencent?: UploadTencentSettingsDto;
}
