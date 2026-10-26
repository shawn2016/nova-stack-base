import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name!: string;

  @ApiProperty({ maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @ApiPropertyOptional({ enum: [0, 1] })
  @IsOptional()
  @IsIn([0, 1])
  status?: 0 | 1;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sort?: number;

  @ApiPropertyOptional({ enum: [1, 2, 3, 4, 5] })
  @IsOptional()
  @IsIn([1, 2, 3, 4, 5])
  dataScope?: 1 | 2 | 3 | 4 | 5;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  customDeptIds?: string[];
}
