import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * 创建第一阶段测试用户
 * 每个角色至少创建一个测试用户
 */
async function seedTestUsers() {
  console.log('开始创建测试用户...');

  const password = await bcrypt.hash('Test1234', 10);

  // 获取角色ID映射
  const roles = await prisma.role.findMany({
    where: {
      code: {
        in: [
          'REPORTER',
          'VICE_DIRECTOR',
          'DEPT_MANAGER',
          'VICE_LEADER',
          'TOP_LEADER',
          'CONTRACTOR',
        ],
      },
    },
  });

  const roleMap: Record<string, bigint> = {};
  roles.forEach((r) => {
    roleMap[r.code] = r.id;
  });

  // 定义测试用户
  const testUsers = [
    {
      username: 'reporter1',
      realName: '张三（报修人）',
      email: 'reporter1@example.com',
      phone: '13800000001',
      department: '教学楼管理',
      roleCode: 'REPORTER',
      isExternal: false,
    },
    {
      username: 'vice_director1',
      realName: '李四（副主任）',
      email: 'vice_director1@example.com',
      phone: '13800000002',
      department: '后勤处',
      roleCode: 'VICE_DIRECTOR',
      isExternal: false,
    },
    {
      username: 'dept_manager1',
      realName: '王五（部门主管）',
      email: 'dept_manager1@example.com',
      phone: '13800000003',
      department: '后勤处',
      roleCode: 'DEPT_MANAGER',
      isExternal: false,
    },
    {
      username: 'vice_leader1',
      realName: '赵六（分管领导）',
      email: 'vice_leader1@example.com',
      phone: '13800000004',
      department: '校领导',
      roleCode: 'VICE_LEADER',
      isExternal: false,
    },
    {
      username: 'top_leader1',
      realName: '孙七（一把手）',
      email: 'top_leader1@example.com',
      phone: '13800000005',
      department: '校领导',
      roleCode: 'TOP_LEADER',
      isExternal: false,
    },
    {
      username: 'contractor1',
      realName: '周八（乙方）',
      email: 'contractor1@example.com',
      phone: '13800000006',
      organization: '华建维修公司',
      roleCode: 'CONTRACTOR',
      isExternal: true,
    },
  ];

  // 创建用户
  for (const userData of testUsers) {
    try {
      // 检查用户是否已存在
      const existing = await prisma.user.findUnique({
        where: { username: userData.username },
      });

      if (existing) {
        console.log(`⚠ 用户 ${userData.username} 已存在，跳过`);
        continue;
      }

      // 创建用户
      const user = await prisma.user.create({
        data: {
          username: userData.username,
          password: password,
          realName: userData.realName,
          email: userData.email,
          phone: userData.phone,
          department: userData.department,
          organization: userData.organization,
          isExternal: userData.isExternal,
          status: 1,
        },
      });

      // 分配角色
      const roleId = roleMap[userData.roleCode];
      if (roleId) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: roleId,
          },
        });
      }

      console.log(
        `✓ 用户 ${userData.username} (${userData.realName}) 创建成功`,
      );
    } catch (error) {
      console.error(`✗ 创建用户 ${userData.username} 失败:`, error.message);
    }
  }

  console.log('\n测试用户创建完成！');
  console.log('\n登录信息：');
  console.log('用户名: reporter1, vice_director1, dept_manager1, vice_leader1, top_leader1, contractor1');
  console.log('密码: Test1234');
}

// 执行初始化
seedTestUsers()
  .then(() => {
    console.log('\n✅ 测试用户初始化成功！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 初始化失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
