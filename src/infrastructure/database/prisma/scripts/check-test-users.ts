import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTestUsers() {
  console.log('🔍 Checking test users in database...\n');

  try {
    // Check all users with test phone numbers
    const testUsers = await prisma.user.findMany({
      where: {
        OR: [
          { phoneNumber: { startsWith: '+225071000' } }, // Clients
          { phoneNumber: { startsWith: '+225072000' } }, // Suppliers
          { phoneNumber: { startsWith: '+225073000' } }, // Associations
        ],
      },
      select: {
        id: true,
        phoneNumber: true,
        role: true,
        email: true,
      },
      orderBy: {
        phoneNumber: 'asc',
      },
    });

    console.log(`Found ${testUsers.length} test users:\n`);

    const clients = testUsers.filter((u) => u.role === 'CLIENT');
    const suppliers = testUsers.filter(
      (u) => u.role === 'SUPPLIER_FOOD' || u.role === 'SUPPLIER_DEALS'
    );
    const associations = testUsers.filter((u) => u.role === 'ASSOCIATION');
    const others = testUsers.filter(
      (u) =>
        u.role !== 'CLIENT' &&
        u.role !== 'SUPPLIER_FOOD' &&
        u.role !== 'SUPPLIER_DEALS' &&
        u.role !== 'ASSOCIATION'
    );

    console.log(`📱 Clients (${clients.length}):`);
    clients.forEach((u) =>
      console.log(`  - ${u.phoneNumber} (${u.email}) - Role: ${u.role}`)
    );

    console.log(`\n🏪 Suppliers (${suppliers.length}):`);
    suppliers.forEach((u) =>
      console.log(`  - ${u.phoneNumber} (${u.email}) - Role: ${u.role}`)
    );

    console.log(`\n🤝 Associations (${associations.length}):`);
    associations.forEach((u) =>
      console.log(`  - ${u.phoneNumber} (${u.email}) - Role: ${u.role}`)
    );

    if (others.length > 0) {
      console.log(`\n❓ Other roles (${others.length}):`);
      others.forEach((u) =>
        console.log(`  - ${u.phoneNumber} (${u.email}) - Role: ${u.role}`)
      );
    }
  } catch (error) {
    console.error('❌ Check failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkTestUsers();
