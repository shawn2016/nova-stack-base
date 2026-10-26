import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateJobDto {
  @ApiProperty({ maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name!: string;

  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  jobGroup?: string;

  @ApiProperty({ maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  invokeTarget!: string;

  @ApiProperty({ maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  cronExpression!: string;

  @ApiPropertyOptional({ enum: [0, 1] })
  @IsOptional()
  @IsIn([0, 1])
  status?: 0 | 1;

  @ApiPropertyOptional({ enum: [0, 1] })
  @IsOptional()
  @IsIn([0, 1])
  concurrent?: 0 | 1;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string | null;
}

export class UpdateJobDto {
  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  jobGroup?: string;

  @ApiPropertyOptional({ maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  invokeTarget?: string;

  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  cronExpression?: string;

  @ApiPropertyOptional({ enum: [0, 1] })
  @IsOptional()
  @IsIn([0, 1])
  status?: 0 | 1;

  @ApiPropertyOptional({ enum: [0, 1] })
  @IsOptional()
  @IsIn([0, 1])
  concurrent?: 0 | 1;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string | null;
}

export class UpdateJobStatusDto {
  @ApiProperty({ enum: [0, 1] })
  @IsIn([0, 1])
  status!: 0 | 1;
}
