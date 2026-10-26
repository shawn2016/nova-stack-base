import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreateDeptDto as ICreateDeptDto } from '@nova/shared-types';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDeptDto implements ICreateDeptDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  parentId!: string;

  @ApiProperty({ maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  sort?: number;

  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  leader?: string | null;

  @ApiPropertyOptional({ maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @ApiPropertyOptional({ enum: [0, 1] })
  @IsOptional()
  @IsIn([0, 1])
  status?: 0 | 1;
}
