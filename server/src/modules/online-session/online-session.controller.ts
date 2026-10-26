import { Controller, Delete, Get, Param, Query, Req, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtService } from '../../common/jwt/jwt.service';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { parseDurationToSeconds } from '../auth/auth.service';
import { ConfigService } from '@nestjs/config';
import { ListOnlineSessionsDto } from './dto/list-online-sessions.dto';
import { OnlineSessionService } from './online-session.service';

@ApiTags('sessions')
@ApiBearerAuth()
@Controller('sessions')
export class OnlineSessionController {
  constructor(
    private readonly onlineSessionService: OnlineSessionService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @Get('online')
  @RequirePermission('system:session:list')
  @ApiOperation({ summary: '在线用户列表' })
  list(@Query() query: ListOnlineSessionsDto, @Req() req: Request, @CurrentUser() user: AuthUser) {
    const token = this.extractBearerToken(req);
    const currentTokenId = this.jwtService.extractJti(token);
    return this.onlineSessionService.list(query, currentTokenId, user.userId);
  }

  @Delete('online/:tokenId')
  @RequirePermission('system:session:kick')
  @ApiOperation({ summary: '强制踢下线' })
  kick(@Param('tokenId') tokenId: string, @Req() req: Request, @CurrentUser() user: AuthUser) {
    const token = this.extractBearerToken(req);
    const operatorTokenId = this.jwtService.extractJti(token);
    const raw = this.configService.get<string>('jwt.accessExpiresIn') ?? '2h';
    const ttl = parseDurationToSeconds(raw);
    return this.onlineSessionService.kick(tokenId, operatorTokenId, ttl, user.userId);
  }

  private extractBearerToken(req: Request): string {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    return header.slice(7);
  }
}
