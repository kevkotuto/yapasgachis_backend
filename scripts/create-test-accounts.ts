import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestAccounts() {
  console.log('Creating test accounts for Google Play & Apple App Store review...\n');

  const passwordHash = await bcrypt.hash('TestReview@2024!', 12);

  // Google Play Store review account
  const googleReviewer = await prisma.user.upsert({
    where: { phoneNumber: '+2250700000010' },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      phoneVerified: true,
      emailVerified: true,
    },
    create: {
      email: 'google-review@yapasgachis.com',
      phoneNumber: '+2250700000010',
      firstName: 'Google',
      lastName: 'Reviewer',
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerified: true,
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Cocody',
      language: 'fr',
    },
  });

  await prisma.notificationPreference.upsert({
    where: { userId: googleReviewer.id },
    update: {},
    create: {
      userId: googleReviewer.id,
      pushEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
      orderUpdates: true,
      paymentAlerts: true,
      promotions: true,
      productAlerts: true,
      systemAnnouncements: true,
    },
  });

  // Apple App Store review account
  const appleReviewer = await prisma.user.upsert({
    where: { phoneNumber: '+2250700000020' },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      phoneVerified: true,
      emailVerified: true,
    },
    create: {
      email: 'apple-review@yapasgachis.com',
      phoneNumber: '+2250700000020',
      firstName: 'Apple',
      lastName: 'Reviewer',
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerified: true,
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Cocody',
      language: 'fr',
    },
  });

  await prisma.notificationPreference.upsert({
    where: { userId: appleReviewer.id },
    update: {},
    create: {
      userId: appleReviewer.id,
      pushEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
      orderUpdates: true,
      paymentAlerts: true,
      promotions: true,
      productAlerts: true,
      systemAnnouncements: true,
    },
  });

  console.log('========================================');
  console.log('Test accounts created successfully!\n');
  console.log('GOOGLE PLAY STORE review account:');
  console.log('  Phone: +2250700000010');
  console.log('  Password: TestReview@2024!');
  console.log('  Email: google-review@yapasgachis.com\n');
  console.log('APPLE APP STORE review account:');
  console.log('  Phone: +2250700000020');
  console.log('  Password: TestReview@2024!');
  console.log('  Email: apple-review@yapasgachis.com');
  console.log('========================================');
}

createTestAccounts()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Failed to create test accounts:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
