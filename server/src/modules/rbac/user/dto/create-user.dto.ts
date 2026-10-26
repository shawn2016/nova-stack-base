import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreateUserDto as ICreateUserDto } from '@nova/shared-types';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto implements ICreateUserDto {
  @ApiProperty({ maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(64)
  password!: string;

  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  nickname?: string;

  @ApiPropertyOptional({ enum: [0, 1] })
  @IsOptional()
  @IsIn([0, 1])
  status?: 0 | 1;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deptId?: string | null;
}
