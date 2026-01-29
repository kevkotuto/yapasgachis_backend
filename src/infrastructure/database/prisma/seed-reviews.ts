/**
 * SEED REVIEWS
 *
 * Ce script crée des avis (reviews) pour les produits et deals
 * avec des utilisateurs fictifs
 */

import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('⭐ Starting reviews seeding...\n');

  const password = await bcrypt.hash('Client@2024!', 12);

  // ==================== 1. CRÉER DES UTILISATEURS FICTIFS ====================
  console.log('👥 Creating fictional users...');

  const users = [
    {
      email: 'kouame.yao@example.com',
      phoneNumber: '+2250710000001',
      firstName: 'Yao',
      lastName: 'Kouamé',
    },
    {
      email: 'aya.bamba@example.com',
      phoneNumber: '+2250710000002',
      firstName: 'Aya',
      lastName: 'Bamba',
    },
    {
      email: 'koffi.nguessan@example.com',
      phoneNumber: '+2250710000003',
      firstName: 'Koffi',
      lastName: "N'Guessan",
    },
    {
      email: 'adjoua.kouadio@example.com',
      phoneNumber: '+2250710000004',
      firstName: 'Adjoua',
      lastName: 'Kouadio',
    },
    {
      email: 'amani.toure@example.com',
      phoneNumber: '+2250710000005',
      firstName: 'Amani',
      lastName: 'Touré',
    },
    {
      email: 'akissi.beugre@example.com',
      phoneNumber: '+2250710000006',
      firstName: 'Akissi',
      lastName: 'Beugré',
    },
  ];

  const createdUsers = [];
  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        role: UserRole.CLIENT,
        status: UserStatus.ACTIVE,
        passwordHash: password,
        emailVerified: true,
        phoneVerified: true,
        city: 'Abidjan',
        commune: ['Cocody', 'Plateau', 'Marcory', 'Yopougon'][
          Math.floor(Math.random() * 4)
        ],
        language: 'fr',
      },
    });
    createdUsers.push(user);
  }

  console.log(`  ✅ Created ${createdUsers.length} users`);

  // ==================== 2. RÉCUPÉRER LES PRODUITS ET DEALS ====================
  console.log('📦 Fetching products and deals...');

  const products = await prisma.product.findMany();
  const deals = await prisma.deal.findMany();

  console.log(
    `  ✅ Found ${products.length} products and ${deals.length} deals`
  );

  // ==================== 3. CRÉER DES REVIEWS POUR LES PRODUITS ====================
  console.log('⭐ Creating product reviews...');

  const productReviews = [
    // Reviews pour produit 1
    {
      userId: createdUsers[0].id,
      productId: products[0]?.id,
      rating: 5,
      comment:
        'Excellent panier ! Beaucoup de nourriture pour le prix. Les plats étaient encore chauds à la récupération.',
      images: [
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
      ],
      isVerified: true,
      helpful: 12,
    },
    {
      userId: createdUsers[1].id,
      productId: products[0]?.id,
      rating: 4,
      comment:
        "Très bon rapport qualité-prix. J'ai été surprise par la quantité. Le seul bémol c'est qu'il manquait un peu de sauce.",
      images: [],
      isVerified: true,
      helpful: 8,
    },
    {
      userId: createdUsers[2].id,
      productId: products[0]?.id,
      rating: 5,
      comment:
        "Super initiative ! Cela permet de réduire le gaspillage et c'est délicieux. Je recommande vivement.",
      images: [],
      isVerified: true,
      helpful: 15,
    },

    // Reviews pour produit 2
    {
      userId: createdUsers[3].id,
      productId: products[1]?.id,
      rating: 5,
      comment:
        "Attiéké frais et poisson bien grillé. J'adore ! C'est devenu mon plat préféré pour le déjeuner.",
      images: [
        'https://images.unsplash.com/photo-1580959375944-26d6fc0fa6d0?w=400',
        'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400',
      ],
      isVerified: true,
      helpful: 20,
    },
    {
      userId: createdUsers[4].id,
      productId: products[1]?.id,
      rating: 4,
      comment:
        'Très bon mais un peu épicé pour moi. Sinon la portion est généreuse.',
      images: [],
      isVerified: true,
      helpful: 5,
    },
    {
      userId: createdUsers[0].id,
      productId: products[1]?.id,
      rating: 5,
      comment:
        "Authentique et savoureux ! C'est comme chez maman. Le prix est imbattable.",
      images: [],
      isVerified: true,
      helpful: 18,
    },
    {
      userId: createdUsers[5].id,
      productId: products[1]?.id,
      rating: 3,
      comment:
        "Correct mais j'attendais un peu plus. Le poisson était petit par rapport à d'autres fois.",
      images: [],
      isVerified: true,
      helpful: 2,
    },

    // Reviews pour produit 3
    {
      userId: createdUsers[1].id,
      productId: products[2]?.id,
      rating: 5,
      comment:
        'Le meilleur garba de la ville ! Toujours frais et bien assaisonné.',
      images: [
        'https://images.unsplash.com/photo-1485962398705-ef6a13c41e8f?w=400',
      ],
      isVerified: true,
      helpful: 25,
    },
    {
      userId: createdUsers[2].id,
      productId: products[2]?.id,
      rating: 5,
      comment:
        "Délicieux ! Le thon est de qualité et l'attiéké est bien fin. Je prends souvent.",
      images: [],
      isVerified: true,
      helpful: 11,
    },
    {
      userId: createdUsers[3].id,
      productId: products[2]?.id,
      rating: 4,
      comment: 'Très bon garba, mais parfois la quantité varie un peu.',
      images: [],
      isVerified: true,
      helpful: 4,
    },

    // Reviews pour les autres produits
    {
      userId: createdUsers[4].id,
      productId: products[3]?.id,
      rating: 5,
      comment:
        'Tacos XXL vraiment énorme ! Je recommande pour les gros appétits.',
      images: [
        'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400',
      ],
      isVerified: true,
      helpful: 9,
    },
    {
      userId: createdUsers[5].id,
      productId: products[3]?.id,
      rating: 4,
      comment: 'Très bon mais un peu trop copieux pour moi. À partager !',
      images: [],
      isVerified: true,
      helpful: 6,
    },
    {
      userId: createdUsers[0].id,
      productId: products[4]?.id,
      rating: 5,
      comment:
        'Excellent panier surprise de la boulangerie ! Pain frais et viennoiseries délicieuses.',
      images: [
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
      ],
      isVerified: true,
      helpful: 14,
    },
    {
      userId: createdUsers[1].id,
      productId: products[4]?.id,
      rating: 4,
      comment:
        "Très bonne qualité de pâtisseries. J'ai eu croissants et pains au chocolat.",
      images: [],
      isVerified: true,
      helpful: 7,
    },
    {
      userId: createdUsers[2].id,
      productId: products[5]?.id,
      rating: 5,
      comment:
        'Menu burger excellent ! Frites croustillantes et burger bien garni.',
      images: [
        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
      ],
      isVerified: true,
      helpful: 16,
    },
    {
      userId: createdUsers[3].id,
      productId: products[5]?.id,
      rating: 4,
      comment: 'Bon burger mais livraison un peu longue.',
      images: [],
      isVerified: true,
      helpful: 3,
    },
  ];

  let productReviewCount = 0;
  for (const reviewData of productReviews) {
    if (reviewData.productId) {
      await prisma.review.create({ data: reviewData });
      productReviewCount++;
    }
  }

  console.log(`  ✅ Created ${productReviewCount} product reviews`);

  // ==================== 4. CRÉER DES REVIEWS POUR LES DEALS ====================
  console.log('⭐ Creating deal reviews...');

  const dealReviews = [
    // Reviews pour deal piscine
    {
      userId: createdUsers[0].id,
      dealId: deals[0]?.id,
      rating: 5,
      comment:
        "Superbe piscine ! Eau propre, personnel accueillant. Le deal est vraiment avantageux. J'y retournerai sans hésiter.",
      images: [
        'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=400',
        'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=400',
      ],
      isVerified: true,
      helpful: 28,
    },
    {
      userId: createdUsers[1].id,
      dealId: deals[0]?.id,
      rating: 4,
      comment:
        'Très agréable ! Belle vue sur la lagune. Seul bémol, un peu de monde le vendredi après-midi.',
      images: [],
      isVerified: true,
      helpful: 10,
    },
    {
      userId: createdUsers[2].id,
      dealId: deals[0]?.id,
      rating: 5,
      comment:
        'Excellent rapport qualité/prix ! 5000 FCFA au lieu de 15000 pour une journée complète, je suis ravi.',
      images: [],
      isVerified: true,
      helpful: 22,
    },
    {
      userId: createdUsers[4].id,
      dealId: deals[0]?.id,
      rating: 4,
      comment:
        'Piscine bien entretenue, serviettes fournies comme indiqué. Petit point négatif : casiers un peu petits.',
      images: [],
      isVerified: true,
      helpful: 6,
    },

    // Reviews pour deal spa
    {
      userId: createdUsers[3].id,
      dealId: deals[1]?.id,
      rating: 5,
      comment:
        "Moment de détente absolue ! La masseuse était très professionnelle. Le sauna et la tisane après c'était le top !",
      images: [
        'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400',
      ],
      isVerified: true,
      helpful: 35,
    },
    {
      userId: createdUsers[4].id,
      dealId: deals[1]?.id,
      rating: 5,
      comment:
        'Magnifique spa, très propre. Le massage suédois était parfait. Je recommande à 200% !',
      images: [],
      isVerified: true,
      helpful: 19,
    },
    {
      userId: createdUsers[5].id,
      dealId: deals[1]?.id,
      rating: 4,
      comment:
        'Très bonne prestation, ambiance relaxante. Juste un peu court pour 1h (avec douche et sauna).',
      images: [],
      isVerified: true,
      helpful: 8,
    },

    // Reviews pour deal aparthotel
    {
      userId: createdUsers[0].id,
      dealId: deals[2]?.id,
      rating: 5,
      comment:
        "Appartement spacieux et bien équipé. Kitchenette pratique. L'emplacement au Plateau est idéal.",
      images: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
      ],
      isVerified: true,
      helpful: 17,
    },
    {
      userId: createdUsers[1].id,
      dealId: deals[2]?.id,
      rating: 4,
      comment:
        'Bon rapport qualité/prix pour un séjour de quelques jours. WiFi un peu lent par contre.',
      images: [],
      isVerified: true,
      helpful: 5,
    },
    {
      userId: createdUsers[2].id,
      dealId: deals[2]?.id,
      rating: 5,
      comment:
        "Excellent aparthotel ! Propre, calme, personnel aux petits soins. J'ai passé un excellent séjour.",
      images: [],
      isVerified: true,
      helpful: 23,
    },

    // Reviews pour deal restaurant Hyde Park
    {
      userId: createdUsers[3].id,
      dealId: deals[3]?.id,
      rating: 4,
      comment:
        'Bonne promotion pour le restaurant. Plats bien présentés et savoureux.',
      images: [
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400',
      ],
      isVerified: true,
      helpful: 11,
    },
    {
      userId: createdUsers[5].id,
      dealId: deals[3]?.id,
      rating: 5,
      comment:
        'Menu excellent ! Service rapide et efficace. Le deal à 7500 au lieu de 10000 est vraiment intéressant.',
      images: [],
      isVerified: true,
      helpful: 14,
    },
    {
      userId: createdUsers[0].id,
      dealId: deals[3]?.id,
      rating: 4,
      comment:
        "Très bon restaurant, ambiance sympa. La réduction rend l'addition très correcte.",
      images: [],
      isVerified: true,
      helpful: 9,
    },
  ];

  let dealReviewCount = 0;
  for (const reviewData of dealReviews) {
    if (reviewData.dealId) {
      await prisma.review.create({ data: reviewData });
      dealReviewCount++;
    }
  }

  console.log(`  ✅ Created ${dealReviewCount} deal reviews`);

  // ==================== SUMMARY ====================
  console.log('\n========================================');
  console.log('🎉 Reviews seeding completed!\n');
  console.log('📊 Summary:');
  console.log(`  - ${createdUsers.length} fictional users created`);
  console.log(`  - ${productReviewCount} product reviews created`);
  console.log(`  - ${dealReviewCount} deal reviews created`);
  console.log(`  - Total: ${productReviewCount + dealReviewCount} reviews`);
  console.log('\n✨ Reviews include:');
  console.log('  - Varied ratings (3-5 stars)');
  console.log('  - Realistic French comments');
  console.log('  - Some with Unsplash images');
  console.log('  - All marked as verified purchases');
  console.log('  - Helpful votes added');
  console.log('========================================\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Reviews seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
