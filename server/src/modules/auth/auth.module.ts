import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MemberUserEntity,
  SysMenuEntity,
  SysPermissionEntity,
  SysRoleEntity,
  SysRolePermissionEntity,
  SysUserEntity,
  SysUserRoleEntity,
} from '../../database/entities';
import { JwtModule } from '../../common/jwt/jwt.module';
import { AuditModule } from '../audit/audit.module';
import { IpBlacklistModule } from '../ip-blacklist/ip-blacklist.module';
import { OnlineSessionModule } from '../online-session/online-session.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule,
    AuditModule,
    IpBlacklistModule,
    OnlineSessionModule,
    TypeOrmModule.forFeature([
      MemberUserEntity,
      SysUserEntity,
      SysUserRoleEntity,
      SysRoleEntity,
      SysRolePermissionEntity,
      SysPermissionEntity,
      SysMenuEntity,
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
