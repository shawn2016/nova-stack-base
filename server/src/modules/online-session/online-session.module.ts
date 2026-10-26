import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '../../common/jwt/jwt.module';
import { AuthSessionEntity, SysUserEntity, SysConfigEntity } from '../../database/entities';
import { DataScopeModule } from '../data-scope/data-scope.module';
import { OnlineSessionController } from './online-session.controller';
import { OnlineSessionService } from './online-session.service';

@Module({
  imports: [
    JwtModule,
    DataScopeModule,
    TypeOrmModule.forFeature([SysConfigEntity, AuthSessionEntity, SysUserEntity]),
  ],
  controllers: [OnlineSessionController],
  providers: [OnlineSessionService],
  exports: [OnlineSessionService],
})
export class OnlineSessionModule {}
