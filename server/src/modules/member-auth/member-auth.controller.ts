import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { RefreshTokenDto } from '../auth/dto/refresh-token.dto';
import { MemberLoginDto } from './dto/login.dto';
import { MemberRegisterDto } from './dto/register.dto';
import { MemberAuthService } from './member-auth.service';

@ApiTags('member-auth')
@Controller('member/auth')
export class MemberAuthController {
  constructor(private readonly memberAuthService: MemberAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'C 端会员登录' })
  login(@Body() body: MemberLoginDto) {
    return this.memberAuthService.login(body);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'C 端会员注册' })
  register(@Body() body: MemberRegisterDto) {
    return this.memberAuthService.register(body);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'C 端会员登出' })
  logout(@Req() req: Request) {
    const token = this.extractBearerToken(req);
    return this.memberAuthService.logout(token);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: '刷新 accessToken' })
  refresh(@Body() body: RefreshTokenDto) {
    return this.memberAuthService.refresh(body.refreshToken);
  }

  private extractBearerToken(req: Request): string {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return '';
    }
    return header.slice(7);
  }
}
