/**
 * Script de migration : Génère les codes de parrainage manquants
 * pour tous les utilisateurs existants
 *
 * Utilisation:
 * npx ts-node src/infrastructure/database/prisma/scripts/generate-missing-referral-codes.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Générer un code unique
async function generateUniqueCode(
  firstName: string,
  userId: string
): Promise<string> {
  const CODE_LENGTH = 8;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  // Créer un code basé sur le prénom
  let baseCode = '';
  if (firstName) {
    baseCode = firstName
      .substring(0, 4)
      .toUpperCase()
      .replace(/[^A-Z]/g, ''); // Retirer les caractères spéciaux
  }

  // Compléter avec des caractères aléatoires
  let code = baseCode;
  for (let i = code.length; i < CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Vérifier l'unicité
  const exists = await prisma.referralCode.findUnique({
    where: { code },
  });

  if (exists) {
    // Si le code existe, générer un code complètement aléatoire
    code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Vérifier à nouveau (récursif si nécessaire)
    const stillExists = await prisma.referralCode.findUnique({
      where: { code },
    });

    if (stillExists) {
      // Utiliser l'ID utilisateur comme fallback
      code = userId.substring(0, CODE_LENGTH).toUpperCase();
    }
  }

  return code;
}

async function generateMissingReferralCodes() {
  console.log('🚀 Démarrage de la génération des codes de parrainage...\n');

  try {
    // 1. Récupérer tous les utilisateurs
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
      },
    });

    console.log(`📊 Total d'utilisateurs trouvés: ${allUsers.length}\n`);

    // 2. Récupérer les utilisateurs qui ont déjà un code
    const usersWithCodes = await prisma.referralCode.findMany({
      select: {
        userId: true,
      },
    });

    const userIdsWithCodes = new Set(usersWithCodes.map((c) => c.userId));

    // 3. Filtrer les utilisateurs sans code
    const usersWithoutCodes = allUsers.filter(
      (user) => !userIdsWithCodes.has(user.id)
    );

    console.log(`✅ Utilisateurs avec code: ${userIdsWithCodes.size}`);
    console.log(`⚠️  Utilisateurs sans code: ${usersWithoutCodes.length}\n`);

    if (usersWithoutCodes.length === 0) {
      console.log('✨ Tous les utilisateurs ont déjà un code de parrainage!');
      return;
    }

    // 4. Générer les codes manquants
    console.log('🔄 Génération des codes de parrainage...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const user of usersWithoutCodes) {
      try {
        const code = await generateUniqueCode(user.firstName, user.id);

        await prisma.referralCode.create({
          data: {
            userId: user.id,
            code,
            isActive: true,
          },
        });

        console.log(
          `✅ Code créé: ${code} - ${user.firstName} ${user.lastName || ''} (${user.phoneNumber || user.email})`
        );
        successCount++;
      } catch (error) {
        console.error(
          `❌ Erreur pour ${user.firstName}: ${(error as Error).message}`
        );
        errorCount++;
      }
    }

    console.log('\n📊 Résumé:');
    console.log(`   ✅ Codes créés avec succès: ${successCount}`);
    console.log(`   ❌ Erreurs: ${errorCount}`);
    console.log(`   📈 Total: ${usersWithoutCodes.length}\n`);

    // 5. Vérification finale
    const totalCodesAfter = await prisma.referralCode.count();
    console.log(
      `🎉 Total de codes de parrainage dans la base: ${totalCodesAfter}`
    );
  } catch (error) {
    console.error('❌ Erreur lors de la génération:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
generateMissingReferralCodes()
  .then(() => {
    console.log('\n✨ Script terminé avec succès!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script échoué:', error);
    process.exit(1);
  });
