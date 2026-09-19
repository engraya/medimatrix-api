import { env } from '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';
import { logger } from '../src/lib/logger.js';
const doctors = [
  'John Green',
  'Leila Cameron',
  'David Livingston',
  'Evan Peter',
  'Jane Powell',
  'Alex Ramirez',
  'Jasmine Lee',
  'Alyana Cruz',
  'Hardik Sharma',
];
try {
  for (const name of doctors) {
    const slug = name.toLowerCase().replace(/ /g, '-');
    await prisma.doctor.upsert({
      where: { slug },
      update: {},
      create: {
        name,
        slug,
        imageUrl: `/assets/images/dr-${name.split(' ')[0]!.toLowerCase()}.png`,
      },
    });
  }
  if (env.NODE_ENV !== 'production' && env.SEED_ADMIN_EMAIL && env.SEED_ADMIN_PASSWORD) {
    if (env.SEED_ADMIN_PASSWORD.length < 12)
      throw new Error('SEED_ADMIN_PASSWORD requires at least 12 characters');
    await prisma.user.upsert({
      where: { email: env.SEED_ADMIN_EMAIL },
      update: {},
      create: {
        name: 'Development Admin',
        email: env.SEED_ADMIN_EMAIL,
        phone: '+2348000000000',
        role: 'ADMIN',
        passwordHash: await hashPassword(env.SEED_ADMIN_PASSWORD),
        emailVerifiedAt: new Date(),
      },
    });
  }
  logger.info({ doctors: doctors.length }, 'Seed complete');
} finally {
  await prisma.$disconnect();
}
