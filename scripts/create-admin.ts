import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { z, email, name, phone, password } from '../src/utils/zod.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';
const rl = createInterface({ input: stdin, output: stdout });
try {
  const input = z
    .object({ email, name, phone, password })
    .parse({
      email: await rl.question('Admin email: '),
      name: await rl.question('Admin name: '),
      phone: await rl.question('Admin phone (+countrycode): '),
      password: process.env.ADMIN_PASSWORD,
    });
  const { password: secret, ...identity } = input;
  await prisma.user.create({
    data: {
      ...identity,
      role: 'ADMIN',
      passwordHash: await hashPassword(secret),
      emailVerifiedAt: new Date(),
    },
  });
  stdout.write('Administrator created.\n');
} finally {
  delete process.env.ADMIN_PASSWORD;
  rl.close();
  await prisma.$disconnect();
}
