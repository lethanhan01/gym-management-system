const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const ex = await prisma.exercise.findFirst({ where: { source: 'exercisedb' }, select: { externalId: true, name: true, description: true, instructions: true } });
  console.log('Exercise from DB:', ex);
}
main().catch(console.error).finally(() => prisma.$disconnect());
