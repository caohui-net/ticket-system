import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({
    orderBy: { id: 'asc' },
  });

  console.log('Current roles in database:');
  console.log('ID\tCode\t\tName');
  console.log('-------------------------------------------');
  roles.forEach(role => {
    console.log(`${role.id}\t${role.code}\t\t${role.name}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
