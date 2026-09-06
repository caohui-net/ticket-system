import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 预置权限配置
const permissions = [
  // 工单权限
  { resource: 'ticket', action: 'create', code: 'ticket:create', description: '创建工单' },
  { resource: 'ticket', action: 'read', code: 'ticket:read', description: '查看工单' },
  { resource: 'ticket', action: 'update', code: 'ticket:update', description: '更新工单' },
  { resource: 'ticket', action: 'delete', code: 'ticket:delete', description: '删除工单' },
  { resource: 'ticket', action: 'assign', code: 'ticket:assign', description: '分配工单' },
  { resource: 'ticket', action: 'close', code: 'ticket:close', description: '关闭工单' },
  { resource: 'ticket', action: '*', code: 'ticket:*', description: '工单所有权限' },

  // 评论权限
  { resource: 'comment', action: 'create', code: 'comment:create', description: '创建评论' },
  { resource: 'comment', action: 'read', code: 'comment:read', description: '查看评论' },
  { resource: 'comment', action: 'update', code: 'comment:update', description: '更新评论' },
  { resource: 'comment', action: 'delete', code: 'comment:delete', description: '删除评论' },
  { resource: 'comment', action: '*', code: 'comment:*', description: '评论所有权限' },

  // 用户管理权限
  { resource: 'user', action: 'manage', code: 'user:manage', description: '管理用户' },
  { resource: 'user', action: 'read', code: 'user:read', description: '查看用户' },

  // 角色管理权限
  { resource: 'role', action: 'manage', code: 'role:manage', description: '管理角色' },
  { resource: 'role', action: 'read', code: 'role:read', description: '查看角色' },

  // 统计权限
  { resource: 'statistics', action: 'view', code: 'statistics:view', description: '查看统计' },

  // 超级权限
  { resource: '*', action: '*', code: '*:*', description: '所有权限' },
];

// 角色权限映射
const rolePermissionsMap = {
  // 系统管理员 - 所有权限
  ADMIN: [
    '*:*',
  ],

  // 工单创建者 - 创建和管理自己的工单
  CREATOR: [
    'ticket:create',
    'ticket:read',
    'ticket:update',
    'comment:create',
    'comment:read',
    'comment:update',
    'comment:delete',
  ],

  // 处理人员 - 处理工单的权限
  HANDLER: [
    'ticket:read',
    'ticket:update',
    'ticket:assign',
    'ticket:close',
    'comment:create',
    'comment:read',
    'comment:update',
    'comment:delete',
    'user:read',
    'statistics:view',
  ],

  // 报表查看者 - 只读权限
  REPORTER: [
    'ticket:read',
    'comment:read',
    'statistics:view',
  ],

  // 部门主管 - 审核和管理部门内工单
  REVIEWER: [
    'ticket:read',
    'ticket:update',
    'ticket:assign',
    'ticket:close',
    'comment:create',
    'comment:read',
    'comment:update',
    'user:read',
    'statistics:view',
  ],

  // 分管领导 - 高级审批和查看权限
  APPROVER: [
    'ticket:read',
    'ticket:update',
    'ticket:close',
    'comment:create',
    'comment:read',
    'user:read',
    'statistics:view',
  ],
};

async function seedPermissions() {
  console.log('Starting permissions seeding...');

  try {
    // 1. 创建所有权限
    console.log('Creating permissions...');
    for (const permission of permissions) {
      await prisma.permission.upsert({
        where: { code: permission.code },
        update: permission,
        create: permission,
      });
      console.log(`✓ Permission created/updated: ${permission.code}`);
    }

    // 2. 获取所有角色
    const roles = await prisma.role.findMany();
    console.log(`Found ${roles.length} roles`);

    // 3. 为每个角色分配权限
    for (const role of roles) {
      const permissionCodes = rolePermissionsMap[role.code];

      if (!permissionCodes) {
        console.log(`⚠ No permission mapping found for role: ${role.code}`);
        continue;
      }

      console.log(`\nAssigning permissions to role: ${role.name} (${role.code})`);

      // 获取权限IDs
      const permissionsToAssign = await prisma.permission.findMany({
        where: {
          code: { in: permissionCodes },
        },
      });

      // 删除现有权限关联
      await prisma.rolePermission.deleteMany({
        where: { roleId: role.id },
      });

      // 创建新的权限关联
      for (const permission of permissionsToAssign) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
        console.log(`  ✓ ${permission.code}`);
      }

      console.log(`✓ Role ${role.code} permissions assigned (${permissionsToAssign.length} permissions)`);
    }

    console.log('\n✅ Permissions seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    throw error;
  }
}

async function main() {
  await seedPermissions();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
