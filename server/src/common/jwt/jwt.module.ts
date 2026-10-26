import { PermissionCacheService } from './permission-cache.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthSessionEntity } from '../../database/entities';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { JwtService } from './jwt.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthSessionEntity]),
    NestJwtModule.registerAsync({
      imports: [TypeOrmModule.forFeature([AuthSessionEntity]), ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') ?? 'change-me-in-production',
      }),
    }),
  ],
  providers: [JwtService, PermissionCacheService],
  exports: [JwtService, PermissionCacheService, NestJwtModule],
})
export class JwtModule {}
