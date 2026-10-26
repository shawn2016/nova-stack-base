import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateIpBlacklistBodyDto {
  @ApiProperty({ example: '203.0.113.50' })
  @IsString()
  @Matches(/^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/, {
    message: 'Invalid IPv4 address',
  })
  ip!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;

  @ApiPropertyOptional({ description: 'ISO8601；空表示永久' })
  @IsOptional()
  @IsString()
  expiresAt?: string | null;
}
