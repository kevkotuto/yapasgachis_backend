/**
 * SEED PAYMENT PROVIDERS
 *
 * Ce script crée les moyens de paiement disponibles dans la plateforme
 */

import { PrismaClient, PaymentProviderStatus } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

async function seedPaymentProviders() {
  console.log('💳 Seeding payment providers...\n');

  // Wave CI (Côte d'Ivoire)
  const wave = await prisma.paymentProvider.upsert({
    where: { slug: 'wave' },
    update: {},
    create: {
      name: 'Wave',
      slug: 'wave',
      description:
        "Service de paiement mobile rapide et sécurisé pour l'Afrique",
      logoUrl: '/images/wavecilogo.png', // Logo local
      isActive: true,
      status: PaymentProviderStatus.ACTIVE,
      paymentFeeRate: 0.01, // 1% frais de paiement
      transferFeeRate: 0.01, // 1% frais de transfert
      minAmount: 100, // Minimum 100 FCFA
      maxAmount: 1000000, // Maximum 1,000,000 FCFA
      supportedCountries: ['CI', 'SN', 'BF', 'ML', 'TG', 'BJ'], // Côte d'Ivoire, Sénégal, Burkina Faso, Mali, Togo, Bénin
      supportedCurrencies: ['XOF', 'XAF'], // Franc CFA
      displayOrder: 1,
      isFeatured: true,
      config: {
        // Configuration technique Wave (à adapter selon vos credentials)
        provider: 'wave',
        environment: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox',
      },
    },
  });

  console.log(`  ✅ Created payment provider: ${wave.name}`);

  // Orange Money (Désactivé pour le moment)
  const orangeMoney = await prisma.paymentProvider.upsert({
    where: { slug: 'orange-money' },
    update: {},
    create: {
      name: 'Orange Money',
      slug: 'orange-money',
      description: 'Paiement mobile avec Orange Money',
      isActive: false,
      status: PaymentProviderStatus.INACTIVE,
      paymentFeeRate: 0.015, // 1.5% frais de paiement
      transferFeeRate: 0.015, // 1.5% frais de transfert
      minAmount: 100,
      maxAmount: 500000,
      supportedCountries: ['CI', 'SN', 'ML', 'BF', 'NE'],
      supportedCurrencies: ['XOF', 'XAF'],
      displayOrder: 2,
      isFeatured: false,
      config: {
        provider: 'orange-money',
        environment: 'sandbox',
      },
    },
  });

  console.log(`  ✅ Created payment provider: ${orangeMoney.name} (inactive)`);

  // MTN Mobile Money (Désactivé pour le moment)
  const mtnMobileMoney = await prisma.paymentProvider.upsert({
    where: { slug: 'mtn-mobile-money' },
    update: {},
    create: {
      name: 'MTN Mobile Money',
      slug: 'mtn-mobile-money',
      description: 'Paiement mobile avec MTN Mobile Money',
      isActive: false,
      status: PaymentProviderStatus.INACTIVE,
      paymentFeeRate: 0.015,
      transferFeeRate: 0.015,
      minAmount: 100,
      maxAmount: 500000,
      supportedCountries: ['CI', 'GH', 'UG', 'CM'],
      supportedCurrencies: ['XOF', 'XAF', 'GHS', 'UGX'],
      displayOrder: 3,
      isFeatured: false,
      config: {
        provider: 'mtn-mobile-money',
        environment: 'sandbox',
      },
    },
  });

  console.log(
    `  ✅ Created payment provider: ${mtnMobileMoney.name} (inactive)`
  );

  // Moov Money (Désactivé pour le moment)
  const moovMoney = await prisma.paymentProvider.upsert({
    where: { slug: 'moov-money' },
    update: {},
    create: {
      name: 'Moov Money',
      slug: 'moov-money',
      description: 'Paiement mobile avec Moov Money',
      isActive: false,
      status: PaymentProviderStatus.INACTIVE,
      paymentFeeRate: 0.015,
      transferFeeRate: 0.015,
      minAmount: 100,
      maxAmount: 500000,
      supportedCountries: ['CI', 'BF', 'BJ', 'TG'],
      supportedCurrencies: ['XOF', 'XAF'],
      displayOrder: 4,
      isFeatured: false,
      config: {
        provider: 'moov-money',
        environment: 'sandbox',
      },
    },
  });

  console.log(`  ✅ Created payment provider: ${moovMoney.name} (inactive)`);

  console.log('\n✅ Payment providers seeded successfully!\n');
}

async function main() {
  try {
    await seedPaymentProviders();
  } catch (error) {
    console.error('❌ Error seeding payment providers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { seedPaymentProviders };
