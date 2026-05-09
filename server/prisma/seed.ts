import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'please-change-password';
  const exists = await prisma.user.findUnique({ where: { username } });

  if (!exists) {
    await prisma.user.create({
      data: {
        username,
        passwordHash: await bcrypt.hash(password, 12),
      },
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
