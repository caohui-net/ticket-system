import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    this.logger.log(`Registering user: ${registerDto.username}`);

    // 检查用户名是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { username: registerDto.username },
    });

    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    // 检查邮箱是否已存在
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingEmail) {
      throw new ConflictException('邮箱已被使用');
    }

    // 加密密码
    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 10);
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        username: registerDto.username,
        password: hashedPassword,
        realName: registerDto.realName,
        email: registerDto.email,
        phone: registerDto.phone,
        department: registerDto.department,
        status: 1,
      },
      select: {
        id: true,
        username: true,
        realName: true,
        email: true,
        phone: true,
        department: true,
        status: true,
        createdAt: true,
      },
    });

    this.logger.log(`User registered successfully: ${user.username}`);

    return user;
  }

  async login(loginDto: LoginDto) {
    this.logger.log(`User login attempt: ${loginDto.username}`);

    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { username: loginDto.username },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 检查账号状态
    if (user.status !== 1) {
      throw new UnauthorizedException('账号已被禁用');
    }

    // 检查账号是否被锁定
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const remainingTime = Math.ceil(
        (user.lockedUntil.getTime() - new Date().getTime()) / 60000,
      );
      throw new UnauthorizedException(
        `账号已锁定，请${remainingTime}分钟后再试`,
      );
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      // 增加失败次数
      const newFailedAttempts = user.failedLoginAttempts + 1;
      const updates: any = {
        failedLoginAttempts: newFailedAttempts,
      };

      // 失败5次锁定15分钟
      if (newFailedAttempts >= 5) {
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        this.logger.warn(`Account locked due to multiple failed attempts: ${user.username}`);
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updates,
      });

      throw new UnauthorizedException('用户名或密码错误');
    }

    // 登录成功，重置失败次数
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: '0.0.0.0', // 实际应从请求中获取
      },
    });

    // 获取用户角色
    const roles = user.userRoles.map((ur) => ur.role.code);
    const primaryRole = roles[0] || 'creator';

    // 生成Token
    const tokens = await this.generateTokens({
      sub: user.id.toString(),
      userId: user.id.toString(),
      username: user.username,
      role: primaryRole,
    });

    this.logger.log(`User logged in successfully: ${user.username}`);

    return {
      user: {
        id: user.id.toString(),
        username: user.username,
        realName: user.realName,
        email: user.email,
        role: primaryRole,
        department: user.department,
      },
      tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
      const payload = this.jwtService.verify(refreshToken, { secret: refreshSecret });

      // 生成新的访问令牌
      const accessToken = await this.generateAccessToken({
        sub: payload.sub,
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
      });

      return {
        accessToken,
        expiresIn: 900, // 15分钟
      };
    } catch (error) {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: {
        id: true,
        username: true,
        realName: true,
        email: true,
        phone: true,
        department: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const roles = user.userRoles.map((ur) => ur.role.code);

    return {
      id: user.id.toString(),
      username: user.username,
      realName: user.realName,
      email: user.email,
      phone: user.phone,
      department: user.department,
      avatarUrl: user.avatarUrl,
      role: roles[0] || 'creator',
      status: user.status === 1 ? 'active' : 'inactive',
      createdAt: user.createdAt,
    };
  }

  private async generateTokens(payload: JwtPayload) {
    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15分钟
    };
  }

  private async generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    });
  }

  private async generateRefreshToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.sign(
      {
        sub: payload.sub,
        userId: payload.userId,
        tokenId: `refresh_${Date.now()}`,
      },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );
  }
}
