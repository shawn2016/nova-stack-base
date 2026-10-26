import { Body, Controller, Get, HttpCode, Post, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { resolveClientIp } from '../../common/utils/resolve-client-ip';
import { Public } from './decorators/public.decorator';
import { CurrentUser, AuthUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'B 端管理员登录' })
  login(@Body() body: LoginDto, @Req() req: Request) {
    const trustProxy = this.configService.get<boolean>('ipBlacklist.trustProxy') ?? false;
    return this.authService.login(body, {
      ip: resolveClientIp(req, trustProxy),
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'B 端管理员登出' })
  logout(@Req() req: Request) {
    const token = this.extractBearerToken(req);
    return this.authService.logout(token);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: '刷新 accessToken' })
  refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '当前管理员信息' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user.userId);
  }

  @Put('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新当前管理员资料' })
  updateProfile(@CurrentUser() user: AuthUser, @Body() body: UpdateProfileDto) {
    return this.authService.updateProfile(user.userId, body);
  }

  @Put('me/password')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改当前管理员密码' })
  changePassword(@CurrentUser() user: AuthUser, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(user.userId, body);
  }

  @Get('me/menus')
  @ApiBearerAuth()
  @ApiOperation({ summary: '当前管理员菜单树' })
  menus(@CurrentUser() user: AuthUser) {
    return this.authService.getMenus(user.userId);
  }

  private extractBearerToken(req: Request): string {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return '';
    }
    return header.slice(7);
  }
}
