import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 初始化方案B第一阶段所需的角色和权限
 */
async function seedRolesPhase1() {
  console.log('开始初始化第一阶段角色...');

  // 定义新角色
  const roles = [
    {
      code: 'REPORTER',
      name: '报修人',
      description: '创建报修单',
      isSystem: 1,
      status: 1,
    },
    {
      code: 'VICE_DIRECTOR',
      name: '副主任/主管',
      description: '审核报修、预算，发起立项',
      isSystem: 1,
      status: 1,
    },
    {
      code: 'DEPT_MANAGER',
      name: '部门主管',
      description: '立项一级审核',
      isSystem: 1,
      status: 1,
    },
    {
      code: 'VICE_LEADER',
      name: '分管领导',
      description: '立项二级审核',
      isSystem: 1,
      status: 1,
    },
    {
      code: 'TOP_LEADER',
      name: '一把手',
      description: '立项终审',
      isSystem: 1,
      status: 1,
    },
    {
      code: 'CONTRACTOR',
      name: '乙方维修人员',
      description: '编制预算，上传签证',
      isSystem: 1,
      status: 1,
    },
  ];

  // 创建或更新角色
  for (const role of roles) {
    const result = await prisma.role.upsert({
      where: { code: role.code },
      update: role,
      create: role,
    });
    console.log(`✓ 角色 ${result.name} (${result.code}) 已创建/更新`);
  }

  console.log('角色初始化完成\n');

  // 定义新权限
  console.log('开始初始化权限...');

  const permissions = [
    {
      resource: 'repair',
      action: 'review',
      code: 'repair:review',
      description: '审核报修单',
    },
    {
      resource: 'budget',
      action: 'create',
      code: 'budget:create',
      description: '创建预算单',
    },
    {
      resource: 'budget',
      action: 'review',
      code: 'budget:review',
      description: '审核预算单',
    },
    {
      resource: 'project',
      action: 'create',
      code: 'project:create',
      description: '发起立项',
    },
    {
      resource: 'project',
      action: 'approve_level1',
      code: 'project:approve_level1',
      description: '立项一级审核',
    },
    {
      resource: 'project',
      action: 'approve_level2',
      code: 'project:approve_level2',
      description: '立项二级审核',
    },
    {
      resource: 'project',
      action: 'approve_level3',
      code: 'project:approve_level3',
      description: '立项终审',
    },
    {
      resource: 'approval',
      action: 'view',
      code: 'approval:view',
      description: '查看审批流程',
    },
    {
      resource: 'approval',
      action: 'approve',
      code: 'approval:approve',
      description: '审批通过',
    },
    {
      resource: 'approval',
      action: 'reject',
      code: 'approval:reject',
      description: '审批驳回',
    },
  ];

  // 创建或更新权限
  for (const perm of permissions) {
    const result = await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: perm.resource,
          action: perm.action,
        },
      },
      update: perm,
      create: perm,
    });
    console.log(`✓ 权限 ${result.resource}:${result.action} 已创建/更新`);
  }

  console.log('权限初始化完成\n');

  // 分配权限给角色
  console.log('开始分配权限给角色...');

  // 获取角色和权限的ID映射
  const rolesMap = await prisma.role.findMany({
    where: { code: { in: roles.map((r) => r.code) } },
  });

  const permsMap = await prisma.permission.findMany({
    where: {
      OR: permissions.map((p) => ({
        resource: p.resource,
        action: p.action,
      })),
    },
  });

  // 构建角色ID和权限ID的映射
  const roleIdMap: Record<string, bigint> = {};
  rolesMap.forEach((r) => {
    roleIdMap[r.code] = r.id;
  });

  const permIdMap: Record<string, bigint> = {};
  permsMap.forEach((p) => {
    permIdMap[`${p.resource}:${p.action}`] = p.id;
  });

  // 定义角色权限关系
  const rolePermissions = [
    // 报修人权限
    {
      roleCode: 'REPORTER',
      permissions: ['approval:view'],
    },
    // 副主任权限
    {
      roleCode: 'VICE_DIRECTOR',
      permissions: [
        'repair:review',
        'budget:review',
        'project:create',
        'approval:view',
        'approval:approve',
        'approval:reject',
      ],
    },
    // 部门主管权限
    {
      roleCode: 'DEPT_MANAGER',
      permissions: [
        'project:approve_level1',
        'approval:view',
        'approval:approve',
        'approval:reject',
      ],
    },
    // 分管领导权限
    {
      roleCode: 'VICE_LEADER',
      permissions: [
        'project:approve_level2',
        'approval:view',
        'approval:approve',
        'approval:reject',
      ],
    },
    // 一把手权限
    {
      roleCode: 'TOP_LEADER',
      permissions: [
        'project:approve_level3',
        'approval:view',
        'approval:approve',
        'approval:reject',
      ],
    },
    // 乙方权限
    {
      roleCode: 'CONTRACTOR',
      permissions: ['budget:create', 'approval:view'],
    },
  ];

  // 分配权限
  for (const rp of rolePermissions) {
    const roleId = roleIdMap[rp.roleCode];
    if (!roleId) {
      console.warn(`⚠ 角色 ${rp.roleCode} 未找到，跳过`);
      continue;
    }

    for (const permKey of rp.permissions) {
      const permId = permIdMap[permKey];
      if (!permId) {
        console.warn(`⚠ 权限 ${permKey} 未找到，跳过`);
        continue;
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roleId,
            permissionId: permId,
          },
        },
        update: {},
        create: {
          roleId: roleId,
          permissionId: permId,
        },
      });
    }

    console.log(`✓ 角色 ${rp.roleCode} 的权限已分配`);
  }

  console.log('\n权限分配完成！');
}

// 执行初始化
seedRolesPhase1()
  .then(() => {
    console.log('\n✅ 第一阶段角色和权限初始化成功！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 初始化失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
