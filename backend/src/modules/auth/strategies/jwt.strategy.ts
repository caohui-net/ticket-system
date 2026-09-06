import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // 验证用户是否存在且未被禁用
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(payload.userId) },
    });

    if (!user || user.status !== 1) {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('用户已被删除');
    }

    return {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
    };
  }
}
