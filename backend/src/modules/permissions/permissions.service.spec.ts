import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    permission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    rolePermission: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new permission', async () => {
      const createDto = {
        resource: 'ticket',
        action: 'create',
        description: '创建工单',
      };

      const mockPermission = {
        id: BigInt(1),
        resource: 'ticket',
        action: 'create',
        code: 'ticket:create',
        description: '创建工单',
        createdAt: new Date(),
      };

      mockPrismaService.permission.findUnique.mockResolvedValue(null);
      mockPrismaService.permission.create.mockResolvedValue(mockPermission);

      const result = await service.create(createDto);

      expect(result.code).toBe('ticket:create');
      expect(result.resource).toBe('ticket');
      expect(result.action).toBe('create');
      expect(mockPrismaService.permission.create).toHaveBeenCalledWith({
        data: {
          resource: 'ticket',
          action: 'create',
          code: 'ticket:create',
          description: '创建工单',
        },
      });
    });

    it('should throw ConflictException if permission already exists', async () => {
      const createDto = {
        resource: 'ticket',
        action: 'create',
      };

      mockPrismaService.permission.findUnique.mockResolvedValue({
        id: BigInt(1),
        code: 'ticket:create',
      });

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all permissions', async () => {
      const mockPermissions = [
        {
          id: BigInt(1),
          resource: 'ticket',
          action: 'create',
          code: 'ticket:create',
          description: '创建工单',
          createdAt: new Date(),
        },
        {
          id: BigInt(2),
          resource: 'ticket',
          action: 'read',
          code: 'ticket:read',
          description: '查看工单',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('ticket:create');
      expect(result[1].code).toBe('ticket:read');
    });
  });

  describe('findOne', () => {
    it('should return a permission by id', async () => {
      const mockPermission = {
        id: BigInt(1),
        resource: 'ticket',
        action: 'create',
        code: 'ticket:create',
        description: '创建工单',
        createdAt: new Date(),
        rolePermissions: [],
      };

      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);

      const result = await service.findOne(1);

      expect(result.code).toBe('ticket:create');
      expect(result.roles).toEqual([]);
    });

    it('should throw NotFoundException if permission not found', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a permission', async () => {
      const existingPermission = {
        id: BigInt(1),
        resource: 'ticket',
        action: 'create',
        code: 'ticket:create',
        description: '创建工单',
        createdAt: new Date(),
      };

      const updatedPermission = {
        ...existingPermission,
        description: '更新后的描述',
      };

      mockPrismaService.permission.findUnique.mockResolvedValue(
        existingPermission,
      );
      mockPrismaService.permission.update.mockResolvedValue(updatedPermission);

      const result = await service.update(1, { description: '更新后的描述' });

      expect(result.description).toBe('更新后的描述');
    });

    it('should throw NotFoundException if permission not found', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(null);

      await expect(service.update(999, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a permission', async () => {
      const mockPermission = {
        id: BigInt(1),
        code: 'ticket:create',
      };

      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);
      mockPrismaService.permission.delete.mockResolvedValue(mockPermission);

      const result = await service.remove(1);

      expect(result.message).toBe('权限删除成功');
      expect(mockPrismaService.permission.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });

    it('should throw NotFoundException if permission not found', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRolePermissions', () => {
    it('should return all permissions for a role', async () => {
      const mockRole = {
        id: BigInt(1),
        code: 'ADMIN',
        name: '管理员',
        rolePermissions: [
          {
            permission: {
              id: BigInt(1),
              resource: 'ticket',
              action: 'create',
              code: 'ticket:create',
              description: '创建工单',
              createdAt: new Date(),
            },
          },
        ],
      };

      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);

      const result = await service.getRolePermissions(1);

      expect(result.roleCode).toBe('ADMIN');
      expect(result.permissions).toHaveLength(1);
      expect(result.permissions[0].code).toBe('ticket:create');
    });

    it('should throw NotFoundException if role not found', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.getRolePermissions(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addRolePermission', () => {
    it('should add a permission to a role', async () => {
      const mockRole = { id: BigInt(1), code: 'ADMIN' };
      const mockPermission = {
        id: BigInt(1),
        code: 'ticket:create',
      };

      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);
      mockPrismaService.rolePermission.findUnique.mockResolvedValue(null);
      mockPrismaService.rolePermission.create.mockResolvedValue({});

      const result = await service.addRolePermission(1, 1);

      expect(result.message).toBe('权限添加成功');
      expect(mockPrismaService.rolePermission.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if permission already assigned', async () => {
      const mockRole = { id: BigInt(1) };
      const mockPermission = { id: BigInt(1) };

      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);
      mockPrismaService.rolePermission.findUnique.mockResolvedValue({});

      await expect(service.addRolePermission(1, 1)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('removeRolePermission', () => {
    it('should remove a permission from a role', async () => {
      mockPrismaService.rolePermission.findUnique.mockResolvedValue({});
      mockPrismaService.rolePermission.delete.mockResolvedValue({});

      const result = await service.removeRolePermission(1, 1);

      expect(result.message).toBe('权限移除成功');
      expect(mockPrismaService.rolePermission.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if permission not assigned', async () => {
      mockPrismaService.rolePermission.findUnique.mockResolvedValue(null);

      await expect(service.removeRolePermission(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateRolePermissions', () => {
    it('should batch update role permissions', async () => {
      const mockRole = { id: BigInt(1), code: 'ADMIN' };
      const mockPermissions = [
        { id: BigInt(1) },
        { id: BigInt(2) },
      ];

      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          rolePermission: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
        });
      });

      const result = await service.updateRolePermissions(1, [1, 2]);

      expect(result.message).toBe('角色权限更新成功');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if some permission IDs not found', async () => {
      const mockRole = { id: BigInt(1) };
      const mockPermissions = [{ id: BigInt(1) }]; // 只返回1个，但请求了2个

      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      await expect(
        service.updateRolePermissions(1, [1, 2]),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserPermissions', () => {
    it('should return all permissions for a user', async () => {
      const mockUser = {
        id: BigInt(1),
        username: 'testuser',
        realName: 'Test User',
        userRoles: [
          {
            role: {
              id: BigInt(1),
              code: 'ADMIN',
              name: '管理员',
              rolePermissions: [
                {
                  permission: {
                    id: BigInt(1),
                    resource: 'ticket',
                    action: 'create',
                    code: 'ticket:create',
                    description: '创建工单',
                    createdAt: new Date(),
                  },
                },
              ],
            },
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserPermissions(1);

      expect(result.username).toBe('testuser');
      expect(result.permissions).toHaveLength(1);
      expect(result.permissionCodes).toContain('ticket:create');
    });

    it('should deduplicate permissions from multiple roles', async () => {
      const mockUser = {
        id: BigInt(1),
        username: 'testuser',
        realName: 'Test User',
        userRoles: [
          {
            role: {
              id: BigInt(1),
              code: 'ADMIN',
              name: '管理员',
              rolePermissions: [
                {
                  permission: {
                    id: BigInt(1),
                    resource: 'ticket',
                    action: 'create',
                    code: 'ticket:create',
                    description: '创建工单',
                    createdAt: new Date(),
                  },
                },
              ],
            },
          },
          {
            role: {
              id: BigInt(2),
              code: 'AGENT',
              name: '客服',
              rolePermissions: [
                {
                  permission: {
                    id: BigInt(1),
                    resource: 'ticket',
                    action: 'create',
                    code: 'ticket:create',
                    description: '创建工单',
                    createdAt: new Date(),
                  },
                },
                {
                  permission: {
                    id: BigInt(2),
                    resource: 'ticket',
                    action: 'read',
                    code: 'ticket:read',
                    description: '查看工单',
                    createdAt: new Date(),
                  },
                },
              ],
            },
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserPermissions(1);

      // 应该去重，只有2个不同的权限
      expect(result.permissions).toHaveLength(2);
      expect(result.permissionCodes).toContain('ticket:create');
      expect(result.permissionCodes).toContain('ticket:read');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserPermissions(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
