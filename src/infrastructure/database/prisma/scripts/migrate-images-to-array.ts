/**
 * Migration Script: Fix images NULL values
 * Converts all NULL images fields to empty arrays []
 * Run with: npx ts-node src/infrastructure/database/prisma/scripts/migrate-images-to-array.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationStats {
  model: string;
  totalRecords: number;
  nullRecords: number;
  updated: number;
  errors: number;
}

async function migrateModel(
  modelName: string,
  countQuery: any,
  updateQuery: any
): Promise<MigrationStats> {
  console.log(`\n🔄 Migrating ${modelName}...`);

  try {
    // Count total records
    const totalRecords = await countQuery();

    // Count records with NULL images
    const nullRecords = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "${modelName}"
      WHERE images IS NULL
    `;

    const nullCount = Number(nullRecords[0]?.count || 0);

    console.log(`  📊 Total records: ${totalRecords}`);
    console.log(`  ⚠️  NULL images: ${nullCount}`);

    if (nullCount === 0) {
      console.log(`  ✅ No migration needed for ${modelName}`);
      return {
        model: modelName,
        totalRecords,
        nullRecords: nullCount,
        updated: 0,
        errors: 0,
      };
    }

    // Update NULL to []
    const result = await updateQuery();

    console.log(`  ✅ Updated ${result.count || 0} records`);

    return {
      model: modelName,
      totalRecords,
      nullRecords: nullCount,
      updated: result.count || 0,
      errors: 0,
    };
  } catch (error) {
    console.error(`  ❌ Error migrating ${modelName}:`, error);
    return {
      model: modelName,
      totalRecords: 0,
      nullRecords: 0,
      updated: 0,
      errors: 1,
    };
  }
}

async function main() {
  console.log('🚀 Starting images NULL → [] migration...\n');
  console.log('═══════════════════════════════════════════════════');

  const stats: MigrationStats[] = [];

  try {
    // 1. Migrate SupplierStore
    stats.push(
      await migrateModel(
        'SupplierStore',
        () => prisma.supplierStore.count(),
        () =>
          prisma.$executeRaw`
          UPDATE "SupplierStore"
          SET images = '[]'::jsonb
          WHERE images IS NULL
        `
      )
    );

    // 2. Migrate Product
    stats.push(
      await migrateModel(
        'Product',
        () => prisma.product.count(),
        () =>
          prisma.$executeRaw`
          UPDATE "Product"
          SET images = '[]'::jsonb
          WHERE images IS NULL
        `
      )
    );

    // 3. Migrate Deal
    stats.push(
      await migrateModel(
        'Deal',
        () => prisma.deal.count(),
        () =>
          prisma.$executeRaw`
          UPDATE "Deal"
          SET images = '[]'::jsonb
          WHERE images IS NULL
        `
      )
    );

    // 4. Migrate DealOption
    stats.push(
      await migrateModel(
        'DealOption',
        () => prisma.dealRoom.count(),
        () =>
          prisma.$executeRaw`
          UPDATE "DealOption"
          SET images = '[]'::jsonb
          WHERE images IS NULL
        `
      )
    );

    // 5. Migrate DealRoom
    stats.push(
      await migrateModel(
        'DealRoom',
        () => prisma.dealRoom.count(),
        () =>
          prisma.$executeRaw`
          UPDATE "DealRoom"
          SET images = '[]'::jsonb
          WHERE images IS NULL
        `
      )
    );

    // 6. Migrate Review
    stats.push(
      await migrateModel(
        'Review',
        () => prisma.review.count(),
        () =>
          prisma.$executeRaw`
          UPDATE "Review"
          SET images = '[]'::jsonb
          WHERE images IS NULL
        `
      )
    );

    // 7. Migrate AssociationReport
    stats.push(
      await migrateModel(
        'AssociationReport',
        () => prisma.associationReport.count(),
        () =>
          prisma.$executeRaw`
          UPDATE "AssociationReport"
          SET images = '[]'::jsonb
          WHERE images IS NULL
        `
      )
    );

    // Print summary
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 MIGRATION SUMMARY\n');

    const totalUpdated = stats.reduce((sum, s) => sum + s.updated, 0);
    const totalErrors = stats.reduce((sum, s) => sum + s.errors, 0);

    stats.forEach((stat) => {
      const status = stat.errors > 0 ? '❌' : '✅';
      console.log(
        `${status} ${stat.model.padEnd(20)} | Total: ${stat.totalRecords.toString().padStart(5)} | NULL: ${stat.nullRecords.toString().padStart(5)} | Updated: ${stat.updated.toString().padStart(5)}`
      );
    });

    console.log('\n═══════════════════════════════════════════════════');
    console.log(`\n🎉 Migration completed!`);
    console.log(`   Total records updated: ${totalUpdated}`);
    console.log(`   Total errors: ${totalErrors}`);

    if (totalErrors > 0) {
      console.log('\n⚠️  Some models had errors. Check logs above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
main()
  .then(() => {
    console.log('\n✅ Migration script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
