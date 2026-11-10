import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME || 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || 'Administrator';

  if (!password || password.length < 6) {
    throw new Error(
      'SEED_ADMIN_PASSWORD must be set in .env (at least 6 characters).',
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.users.upsert({
    where: { username },
    update: {},
    create: { username, password: hashedPassword, name },
  });

  console.log(`Admin user ready: ${user.username} (id=${user.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
