/**
 * Script de test pour les notifications push Expo
 * Usage: npx tsx test-expo-push.ts
 */

import { PrismaClient } from '@prisma/client';
import expoPushService from './src/infrastructure/messaging/push/expo-push.service';

const prisma = new PrismaClient();

async function testExpoPush() {
  try {
    console.log('🔍 Recherche de l\'utilisateur avec le numéro 0500808585...\n');

    // Trouver l'utilisateur
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: '0500808585' },
          { phoneNumber: '+2250500808585' },
          { phoneNumber: '2250500808585' },
        ],
      },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      console.error('❌ Utilisateur non trouvé avec le numéro 0500808585');
      return;
    }

    console.log('✅ Utilisateur trouvé:');
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Nom: ${user.firstName} ${user.lastName}`);
    console.log(`   - Téléphone: ${user.phoneNumber}\n`);

    // Vérifier les tokens enregistrés
    console.log('🔍 Vérification des tokens enregistrés...\n');
    const tokens = await prisma.deviceToken.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        token: true,
        deviceType: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (tokens.length === 0) {
      console.error('❌ Aucun token trouvé pour cet utilisateur');
      return;
    }

    console.log(`✅ ${tokens.length} token(s) trouvé(s):`);
    tokens.forEach((token, index) => {
      console.log(`\n   Token ${index + 1}:`);
      console.log(`   - Token: ${token.token}`);
      console.log(`   - Type: ${token.deviceType}`);
      console.log(`   - Actif: ${token.isActive ? 'Oui' : 'Non'}`);
      console.log(`   - Dernière utilisation: ${token.lastUsedAt?.toLocaleString('fr-FR') || 'Jamais'}`);
      console.log(`   - Créé le: ${token.createdAt.toLocaleString('fr-FR')}`);
    });

    // Vérifier le token spécifique fourni
    const specificToken = 'ExponentPushToken[-iTLigPaxv3SOufx_hTlA0]';
    const tokenExists = tokens.some(t => t.token === specificToken);

    console.log('\n📱 Token spécifique fourni:');
    console.log(`   ${specificToken}`);
    console.log(`   Status: ${tokenExists ? '✅ Enregistré' : '⚠️  Non enregistré dans la base de données'}\n`);

    // Envoyer une notification de test
    console.log('📤 Envoi d\'une notification push de test...\n');

    const testMessage = {
      title: '🎉 Test de notification',
      body: 'Ceci est une notification de test envoyée depuis le backend YapaGachis !',
      data: {
        type: 'TEST',
        timestamp: new Date().toISOString(),
        screen: 'Home',
      },
      sound: 'default' as const,
      priority: 'high' as const,
    };

    const tickets = await expoPushService.sendToUser(user.id, testMessage);

    console.log('✅ Notification envoyée !');
    console.log(`\n📊 Résultats:`);
    console.log(`   - Nombre de tickets: ${tickets.length}`);

    tickets.forEach((ticket, index) => {
      console.log(`\n   Ticket ${index + 1}:`);
      console.log(`   - Status: ${ticket.status === 'ok' ? '✅ OK' : '❌ ERROR'}`);
      if (ticket.status === 'ok' && ticket.id) {
        console.log(`   - ID: ${ticket.id}`);
      }
      if (ticket.status === 'error' && ticket.message) {
        console.log(`   - Erreur: ${ticket.message}`);
        if (ticket.details) {
          console.log(`   - Détails: ${JSON.stringify(ticket.details, null, 2)}`);
        }
      }
    });

    // Si on a des tickets réussis, vérifier les receipts après quelques secondes
    const successfulTicketIds = tickets
      .filter(t => t.status === 'ok' && t.id)
      .map(t => t.id!);

    if (successfulTicketIds.length > 0) {
      console.log('\n⏳ Attente de 5 secondes avant de vérifier les receipts...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      console.log('\n🔍 Vérification des receipts...');
      const receipts = await expoPushService.getReceipts(successfulTicketIds);

      console.log('\n📊 Receipts:');
      for (const [ticketId, receipt] of Object.entries(receipts)) {
        console.log(`\n   Ticket ${ticketId}:`);
        console.log(`   - Status: ${receipt.status === 'ok' ? '✅ Délivré' : '❌ Échec'}`);
        if (receipt.status === 'error') {
          console.log(`   - Erreur: ${receipt.message || 'Inconnue'}`);
          if (receipt.details) {
            console.log(`   - Détails: ${JSON.stringify(receipt.details, null, 2)}`);
          }
        }
      }
    }

    console.log('\n✅ Test terminé avec succès !');

  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le test
testExpoPush();
