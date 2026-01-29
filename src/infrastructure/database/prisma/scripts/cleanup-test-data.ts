import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...\n');

  try {
    // Get test user IDs first
    const testClients = await prisma.user.findMany({
      where: {
        phoneNumber: {
          startsWith: '+225071000',
        },
        role: 'CLIENT',
      },
      select: { id: true },
    });

    const testSuppliers = await prisma.user.findMany({
      where: {
        phoneNumber: {
          startsWith: '+225072000',
        },
        role: {
          in: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'],
        },
      },
      select: { id: true },
    });

    const testAssociations = await prisma.user.findMany({
      where: {
        phoneNumber: {
          startsWith: '+225073000',
        },
        role: 'ASSOCIATION',
      },
      select: { id: true },
    });

    const clientIds = testClients.map((c) => c.id);
    const supplierIds = testSuppliers.map((s) => s.id);
    const associationIds = testAssociations.map((a) => a.id);

    console.log(
      `Found ${clientIds.length} clients, ${supplierIds.length} suppliers, ${associationIds.length} associations\n`
    );

    // Delete donations related to test users
    const deletedDonations = await prisma.donation.deleteMany({
      where: {
        OR: [
          { donorId: { in: clientIds } },
          { associationId: { in: associationIds } },
        ],
      },
    });
    console.log(`  ✅ Deleted ${deletedDonations.count} donations`);

    // Delete deal rooms
    const deletedDealRooms = await prisma.dealRoom.deleteMany({
      where: {
        deal: {
          supplierId: { in: supplierIds },
        },
      },
    });
    console.log(`  ✅ Deleted ${deletedDealRooms.count} deal rooms`);

    // Delete deals
    const deletedDeals = await prisma.deal.deleteMany({
      where: {
        supplierId: { in: supplierIds },
      },
    });
    console.log(`  ✅ Deleted ${deletedDeals.count} deals`);

    // Delete products
    const deletedProducts = await prisma.product.deleteMany({
      where: {
        supplierId: { in: supplierIds },
      },
    });
    console.log(`  ✅ Deleted ${deletedProducts.count} products`);

    // Get supplier stores for test suppliers
    const supplierStores = await prisma.supplierStore.findMany({
      where: {
        supplier: {
          userId: { in: supplierIds },
        },
      },
      select: { id: true, supplierId: true },
    });

    const storeSupplierIds = supplierStores.map((s) => s.supplierId);

    // Delete supplier stores
    const deletedStores = await prisma.supplierStore.deleteMany({
      where: {
        supplierId: { in: storeSupplierIds },
      },
    });
    console.log(`  ✅ Deleted ${deletedStores.count} supplier stores`);

    // Delete users (cascade will handle supplier and association deletion)
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        id: { in: [...clientIds, ...supplierIds, ...associationIds] },
      },
    });
    console.log(`  ✅ Deleted ${deletedUsers.count} users`);

    console.log('\n✨ Test data cleanup completed!\n');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTestData();
