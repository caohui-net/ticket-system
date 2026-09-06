import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建权限
   */
  async create(createPermissionDto: CreatePermissionDto) {
    const { resource, action, description } = createPermissionDto;
    const code = `${resource}:${action}`;

    // 检查权限是否已存在
    const existing = await this.prisma.permission.findUnique({
      where: { code },
    });

    if (existing) {
      throw new ConflictException(`权限 ${code} 已存在`);
    }

    const permission = await this.prisma.permission.create({
      data: {
        resource,
        action,
        code,
        description,
      },
    });

    this.logger.log(`Permission created: ${code}`);
    return this.formatPermission(permission);
  }

  /**
   * 获取所有权限
   */
  async findAll() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });

    return permissions.map((p) => this.formatPermission(p));
  }

  /**
   * 根据ID获取权限
   */
  async findOne(id: number) {
    const permission = await this.prisma.permission.findUnique({
      where: { id: BigInt(id) },
      include: {
        rolePermissions: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException(`权限 ID ${id} 不存在`);
    }

    return {
      ...this.formatPermission(permission),
      roles: permission.rolePermissions.map((rp) => ({
        id: rp.role.id.toString(),
        code: rp.role.code,
        name: rp.role.name,
      })),
    };
  }

  /**
   * 更新权限
   */
  async update(id: number, updateDto: Partial<CreatePermissionDto>) {
    const existing = await this.prisma.permission.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existing) {
      throw new NotFoundException(`权限 ID ${id} 不存在`);
    }

    // 如果更新了resource或action，需要重新生成code
    const data: any = { ...updateDto };
    if (updateDto.resource || updateDto.action) {
      const resource = updateDto.resource || existing.resource;
      const action = updateDto.action || existing.action;
      data.code = `${resource}:${action}`;

      // 检查新code是否冲突
      const conflict = await this.prisma.permission.findFirst({
        where: {
          code: data.code,
          id: { not: BigInt(id) },
        },
      });

      if (conflict) {
        throw new ConflictException(`权限 ${data.code} 已存在`);
      }
    }

    const permission = await this.prisma.permission.update({
      where: { id: BigInt(id) },
      data,
    });

    this.logger.log(`Permission updated: ${permission.code}`);
    return this.formatPermission(permission);
  }

  /**
   * 删除权限
   */
  async remove(id: number) {
    const permission = await this.prisma.permission.findUnique({
      where: { id: BigInt(id) },
    });

    if (!permission) {
      throw new NotFoundException(`权限 ID ${id} 不存在`);
    }

    await this.prisma.permission.delete({
      where: { id: BigInt(id) },
    });

    this.logger.log(`Permission deleted: ${permission.code}`);
    return { message: '权限删除成功' };
  }

  /**
   * 获取角色的所有权限
   */
  async getRolePermissions(roleId: number) {
    const role = await this.prisma.role.findUnique({
      where: { id: BigInt(roleId) },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`角色 ID ${roleId} 不存在`);
    }

    return {
      roleId: role.id.toString(),
      roleCode: role.code,
      roleName: role.name,
      permissions: role.rolePermissions.map((rp) =>
        this.formatPermission(rp.permission),
      ),
    };
  }

  /**
   * 给角色添加权限
   */
  async addRolePermission(roleId: number, permissionId: number) {
    const role = await this.prisma.role.findUnique({
      where: { id: BigInt(roleId) },
    });

    if (!role) {
      throw new NotFoundException(`角色 ID ${roleId} 不存在`);
    }

    const permission = await this.prisma.permission.findUnique({
      where: { id: BigInt(permissionId) },
    });

    if (!permission) {
      throw new NotFoundException(`权限 ID ${permissionId} 不存在`);
    }

    // 检查是否已存在
    const existing = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: BigInt(roleId),
          permissionId: BigInt(permissionId),
        },
      },
    });

    if (existing) {
      throw new ConflictException('该权限已分配给此角色');
    }

    await this.prisma.rolePermission.create({
      data: {
        roleId: BigInt(roleId),
        permissionId: BigInt(permissionId),
      },
    });

    this.logger.log(
      `Permission ${permission.code} added to role ${role.code}`,
    );

    return { message: '权限添加成功' };
  }

  /**
   * 移除角色权限
   */
  async removeRolePermission(roleId: number, permissionId: number) {
    const existing = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: BigInt(roleId),
          permissionId: BigInt(permissionId),
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('该权限未分配给此角色');
    }

    await this.prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId: BigInt(roleId),
          permissionId: BigInt(permissionId),
        },
      },
    });

    this.logger.log(`Permission removed from role ${roleId}`);
    return { message: '权限移除成功' };
  }

  /**
   * 批量更新角色权限
   */
  async updateRolePermissions(roleId: number, permissionIds: number[]) {
    const role = await this.prisma.role.findUnique({
      where: { id: BigInt(roleId) },
    });

    if (!role) {
      throw new NotFoundException(`角色 ID ${roleId} 不存在`);
    }

    // 验证所有权限ID是否存在
    const permissions = await this.prisma.permission.findMany({
      where: {
        id: { in: permissionIds.map((id) => BigInt(id)) },
      },
    });

    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('部分权限ID不存在');
    }

    // 事务处理：先删除所有现有权限，再添加新权限
    await this.prisma.$transaction(async (tx) => {
      // 删除现有权限
      await tx.rolePermission.deleteMany({
        where: { roleId: BigInt(roleId) },
      });

      // 添加新权限
      await tx.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: BigInt(roleId),
          permissionId: BigInt(permissionId),
        })),
      });
    });

    this.logger.log(`Role ${role.code} permissions updated`);
    return { message: '角色权限更新成功' };
  }

  /**
   * 获取用户的所有权限
   */
  async getUserPermissions(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`用户 ID ${userId} 不存在`);
    }

    // 收集所有权限（去重）
    const permissionMap = new Map();

    user.userRoles.forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => {
        permissionMap.set(rp.permission.code, rp.permission);
      });
    });

    const permissions = Array.from(permissionMap.values()).map((p) =>
      this.formatPermission(p),
    );

    return {
      userId: user.id.toString(),
      username: user.username,
      realName: user.realName,
      roles: user.userRoles.map((ur) => ({
        id: ur.role.id.toString(),
        code: ur.role.code,
        name: ur.role.name,
      })),
      permissions,
      permissionCodes: permissions.map((p) => p.code),
    };
  }

  /**
   * 格式化权限对象
   */
  private formatPermission(permission: any) {
    return {
      id: permission.id.toString(),
      resource: permission.resource,
      action: permission.action,
      code: permission.code,
      description: permission.description,
      createdAt: permission.createdAt,
    };
  }
}
