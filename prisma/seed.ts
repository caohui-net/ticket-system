import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始初始化数据...');

  // 1. 清空现有数据（开发环境）
  console.log('📦 清空现有数据...');
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  // 2. 创建角色
  console.log('👥 创建角色...');
  const roles = await Promise.all([
    prisma.role.create({
      data: {
        code: 'CREATOR',
        name: '工单创建者',
        description: '可以创建和查看自己的工单',
        isSystem: 1,
        status: 1,
      },
    }),
    prisma.role.create({
      data: {
        code: 'HANDLER',
        name: '处理人员',
        description: '可以处理分配给自己的工单',
        isSystem: 1,
        status: 1,
      },
    }),
    prisma.role.create({
      data: {
        code: 'REVIEWER',
        name: '部门主管',
        description: '可以审核工单处理结果',
        isSystem: 1,
        status: 1,
      },
    }),
    prisma.role.create({
      data: {
        code: 'APPROVER',
        name: '分管领导',
        description: '可以进行二级审批',
        isSystem: 1,
        status: 1,
      },
    }),
    prisma.role.create({
      data: {
        code: 'ADMIN',
        name: '系统管理员',
        description: '可以管理所有工单和用户',
        isSystem: 1,
        status: 1,
      },
    }),
    prisma.role.create({
      data: {
        code: 'REPORTER',
        name: '报表查看者',
        description: '只读查看统计报表',
        isSystem: 1,
        status: 1,
      },
    }),
  ]);

  console.log(`✅ 创建了 ${roles.length} 个角色`);

  // 3. 加密密码（所有测试用户密码均为: Password123!）
  console.log('🔐 生成密码哈希...');
  const password = 'Password123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  // 4. 创建测试用户
  console.log('👤 创建测试用户...');
  const users = await Promise.all([
    prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        realName: '系统管理员',
        email: 'admin@example.com',
        phone: '13800138001',
        department: 'IT部',
        status: 1,
      },
    }),
    prisma.user.create({
      data: {
        username: 'zhangsan',
        password: hashedPassword,
        realName: '张三',
        email: 'zhangsan@example.com',
        phone: '13800138002',
        department: '技术部',
        status: 1,
      },
    }),
    prisma.user.create({
      data: {
        username: 'lisi',
        password: hashedPassword,
        realName: '李四',
        email: 'lisi@example.com',
        phone: '13800138003',
        department: '技术部',
        status: 1,
      },
    }),
    prisma.user.create({
      data: {
        username: 'wangwu',
        password: hashedPassword,
        realName: '王五',
        email: 'wangwu@example.com',
        phone: '13800138004',
        department: '市场部',
        status: 1,
      },
    }),
    prisma.user.create({
      data: {
        username: 'zhaoliu',
        password: hashedPassword,
        realName: '赵六',
        email: 'zhaoliu@example.com',
        phone: '13800138005',
        department: '人事部',
        status: 1,
      },
    }),
  ]);

  console.log(`✅ 创建了 ${users.length} 个用户`);

  // 5. 分配用户角色
  console.log('🔗 分配用户角色...');
  await Promise.all([
    // admin: 系统管理员
    prisma.userRole.create({
      data: {
        userId: users[0].id,
        roleId: roles[4].id, // ADMIN
      },
    }),
    // zhangsan: 工单创建者
    prisma.userRole.create({
      data: {
        userId: users[1].id,
        roleId: roles[0].id, // CREATOR
      },
    }),
    // lisi: 处理人员
    prisma.userRole.create({
      data: {
        userId: users[2].id,
        roleId: roles[1].id, // HANDLER
      },
    }),
    // wangwu: 部门主管
    prisma.userRole.create({
      data: {
        userId: users[3].id,
        roleId: roles[2].id, // REVIEWER
      },
    }),
    // zhaoliu: 分管领导
    prisma.userRole.create({
      data: {
        userId: users[4].id,
        roleId: roles[3].id, // APPROVER
      },
    }),
  ]);

  console.log('✅ 角色分配完成');

  // 6. 显示创建的用户信息
  console.log('\n📋 测试用户列表:');
  console.log('='.repeat(80));
  console.log('用户名\t\t真实姓名\t部门\t\t角色');
  console.log('-'.repeat(80));

  const usersWithRoles = await prisma.user.findMany({
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  usersWithRoles.forEach((user) => {
    const roleName = user.userRoles[0]?.role.name || '无角色';
    console.log(`${user.username}\t\t${user.realName}\t\t${user.department}\t${roleName}`);
  });

  console.log('='.repeat(80));
  console.log('\n🔑 所有用户的默认密码: Password123!\n');
  console.log('✨ 数据初始化完成！');
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
