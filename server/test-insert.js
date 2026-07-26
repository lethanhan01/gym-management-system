const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const instructions = ["Step 1", "Step 2"];
  const instructionsStr = JSON.stringify(instructions);
  
  await prisma.$executeRaw`
    INSERT INTO "exercises" (
      "name", "source", "catalog_visible", "instructions"
    ) VALUES (
      'test-insert', 'manual'::"exercise_source", true, ${instructionsStr}
    )
  `;

  const ex = await prisma.exercise.findFirst({ where: { name: 'test-insert' } });
  console.log("Inserted:", ex.instructions);
}
main().catch(console.error).finally(() => prisma.$disconnect());
