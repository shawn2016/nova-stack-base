import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '../../common/jwt/jwt.module';
import { MemberUserEntity } from '../../database/entities';
import { MemberAuthController } from './member-auth.controller';
import { MemberAuthService } from './member-auth.service';

@Module({
  imports: [JwtModule, TypeOrmModule.forFeature([MemberUserEntity])],
  controllers: [MemberAuthController],
  providers: [MemberAuthService],
  exports: [MemberAuthService],
})
export class MemberAuthModule {}
