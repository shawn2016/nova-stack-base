import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import type { MemberInfo, MemberLoginResponse, TokenPair } from '@nova/shared-types';
import { Repository } from 'typeorm';
import { JwtService } from '../../common/jwt/jwt.service';
import { toApiId } from '../../common/utils/to-api-id';
import { MemberUserEntity } from '../../database/entities';
import { parseDurationToSeconds } from '../auth/auth.service';
import { MemberLoginDto } from './dto/login.dto';
import { MemberRegisterDto } from './dto/register.dto';

@Injectable()
export class MemberAuthService {
  constructor(
    @InjectRepository(MemberUserEntity)
    private readonly memberRepo: Repository<MemberUserEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: MemberLoginDto): Promise<MemberLoginResponse> {
    const member = await this.memberRepo.findOne({
      where: { phone: dto.phone },
    });

    if (!member || member.status !== 1 || !member.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, member.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokenPair(member.id);

    return {
      tokens,
      user: this.toMemberInfo(member),
    };
  }

  async register(dto: MemberRegisterDto): Promise<MemberLoginResponse> {
    const existing = await this.memberRepo.findOne({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException('Phone already registered');
    }

    const member = await this.memberRepo.save(
      this.memberRepo.create({
        phone: dto.phone,
        passwordHash: await bcrypt.hash(dto.password, 10),
        nickname: dto.nickname ?? `会员${dto.phone.slice(-4)}`,
        avatar: null,
        status: 1,
      }),
    );

    const tokens = await this.issueTokenPair(member.id);

    return {
      tokens,
      user: this.toMemberInfo(member),
    };
  }

  async logout(accessToken: string): Promise<{ success: true }> {
    if (!accessToken) {
      throw new UnauthorizedException('Missing token');
    }

    const payload = await this.jwtService.verifyToken(accessToken, 'access');
    if (payload.type !== 'member') throw new UnauthorizedException('Invalid token type');
    await this.jwtService.revokeSession(payload.sid);
    const ttl = Math.max(payload.exp - Math.floor(Date.now() / 1000), 1);
    await this.jwtService.blacklist(payload.jti, ttl);

    return { success: true };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = await this.jwtService.verifyToken(refreshToken, 'refresh');

    if (payload.type !== 'member') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.jwtService.assertSessionActive(payload, refreshToken);

    const accessToken = await this.jwtService.signAccessToken({
      userId: payload.sub,
      type: 'member',
      sessionId: payload.sid,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getAccessExpiresInSeconds(),
    };
  }

  private async issueTokenPair(userId: string): Promise<TokenPair> {
    const sessionId = randomUUID();
    const refreshToken = await this.jwtService.signRefreshToken({
      userId,
      type: 'member',
      sessionId,
    });
    const accessToken = await this.jwtService.signAccessToken({
      userId,
      type: 'member',
      sessionId,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getAccessExpiresInSeconds(),
    };
  }

  private toMemberInfo(member: MemberUserEntity): MemberInfo {
    return {
      id: toApiId(member.id),
      phone: member.phone,
      nickname: member.nickname,
      avatar: member.avatar ?? '',
    };
  }

  private getAccessExpiresInSeconds(): number {
    const raw = this.configService.get<string>('jwt.accessExpiresIn') ?? '2h';
    return parseDurationToSeconds(raw);
  }
}
