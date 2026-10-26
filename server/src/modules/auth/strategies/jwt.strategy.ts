import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../../common/jwt/jwt-payload.interface';
import { JwtService } from '../../../common/jwt/jwt.service';
import { AuthUser } from '../decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') ?? 'change-me-in-production',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    this.jwtService.assertClaims(payload, 'access');
    await this.jwtService.assertSessionActive(payload);
    const blacklisted = await this.jwtService.isBlacklisted(payload.jti);
    if (blacklisted) {
      throw new UnauthorizedException('Token revoked');
    }

    return {
      userId: payload.sub,
      type: payload.type,
      jti: payload.jti,
    };
  }
}
