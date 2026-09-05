import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        BCRYPT_SALT_ROUNDS: 10,
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      username: 'testuser',
      password: 'Password123!',
      realName: '测试用户',
      email: 'test@example.com',
      phone: '13800138000',
      department: '技术部',
    };

    it('should successfully register a new user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockPrismaService.user.create.mockResolvedValue({
        id: BigInt(1),
        username: 'testuser',
        realName: '测试用户',
        email: 'test@example.com',
        phone: '13800138000',
        department: '技术部',
        status: 1,
        createdAt: new Date(),
      });

      const result = await service.register(registerDto);

      expect(result).toBeDefined();
      expect(result.username).toBe('testuser');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: 'testuser',
          password: 'hashedPassword',
        }),
        select: expect.any(Object),
      });
    });

    it('should throw ConflictException if username already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: BigInt(1),
        username: 'testuser',
      });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('用户名已存在');
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // first register: username check
        .mockResolvedValueOnce({ id: BigInt(1), email: 'test@example.com' }) // first register: email check
        .mockResolvedValueOnce(null) // second expect: username check
        .mockResolvedValueOnce({ id: BigInt(1), email: 'test@example.com' }); // second expect: email check

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('邮箱已被使用');
    });
  });

  describe('login', () => {
    const loginDto = {
      username: 'testuser',
      password: 'Password123!',
    };

    const mockUser = {
      id: BigInt(1),
      username: 'testuser',
      password: 'hashedPassword',
      realName: '测试用户',
      email: 'test@example.com',
      department: '技术部',
      status: 1,
      failedLoginAttempts: 0,
      lockedUntil: null,
      userRoles: [
        {
          role: {
            code: 'handler',
          },
        },
      ],
    };

    it('should successfully login with correct credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('test-token');

      const result = await service.login(loginDto);

      expect(result).toBeDefined();
      expect(result.user.username).toBe('testuser');
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBe('test-token');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('用户名或密码错误');
    });

    it('should throw UnauthorizedException if account is disabled', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: 0,
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('账号已被禁用');
    });

    it('should throw UnauthorizedException if account is locked', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        lockedUntil: futureDate,
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('用户名或密码错误');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          failedLoginAttempts: 1,
        }),
      });
    });

    it('should lock account after 5 failed login attempts', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 4,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      });
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh access token', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = {
        sub: '1',
        userId: '1',
        username: 'testuser',
        role: 'handler',
      };

      mockJwtService.verify.mockReturnValue(payload);
      mockJwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refreshToken(refreshToken);

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('new-access-token');
      expect(result.expiresIn).toBe(900);
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      const invalidToken = 'invalid-token';
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(invalidToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken(invalidToken)).rejects.toThrow(
        '刷新令牌无效或已过期',
      );
    });
  });

  describe('getMe', () => {
    it('should return current user info', async () => {
      const userId = '1';
      const mockUser = {
        id: BigInt(1),
        username: 'testuser',
        realName: '测试用户',
        email: 'test@example.com',
        phone: '13800138000',
        department: '技术部',
        avatarUrl: null,
        status: 1,
        createdAt: new Date(),
        userRoles: [
          {
            role: {
              code: 'handler',
            },
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getMe(userId);

      expect(result).toBeDefined();
      expect(result.username).toBe('testuser');
      expect(result.role).toBe('handler');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('999')).rejects.toThrow(UnauthorizedException);
      await expect(service.getMe('999')).rejects.toThrow('用户不存在');
    });
  });
});
