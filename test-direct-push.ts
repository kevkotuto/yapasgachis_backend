/**
 * Script de test direct pour les notifications push Expo
 * Usage: npx tsx test-direct-push.ts
 */

import expoPushService from './src/infrastructure/messaging/push/expo-push.service';

const TEST_TOKEN = 'ExponentPushToken[z2MGxQFfSvkc6AqLHNV6na]';

async function testDirectPush() {
  try {
    console.log('📱 Test d\'envoi de notification push Expo\n');
    console.log(`Token utilisé: ${TEST_TOKEN}\n`);

    // Préparer le message
    const testMessage = {
      to: TEST_TOKEN,
      title: '🎉 Test YapaGachis',
      body: 'Ceci est une notification de test envoyée depuis le backend !',
      data: {
        type: 'TEST',
        timestamp: new Date().toISOString(),
        screen: 'Home',
        message: 'Test réussi !',
      },
      sound: 'default' as const,
      priority: 'high' as const,
      badge: 1,
      channelId: 'default',
    };

    console.log('📤 Envoi de la notification...\n');

    // Envoyer la notification
    const tickets = await expoPushService.send([testMessage]);

    console.log('✅ Notification envoyée !\n');
    console.log('📊 Résultats:\n');

    tickets.forEach((ticket, index) => {
      console.log(`   Ticket ${index + 1}:`);
      console.log(`   - Status: ${ticket.status === 'ok' ? '✅ OK' : '❌ ERROR'}`);

      if (ticket.status === 'ok' && ticket.id) {
        console.log(`   - ID: ${ticket.id}`);
      }

      if (ticket.status === 'error') {
        console.log(`   - Erreur: ${ticket.message || 'Inconnue'}`);
        if (ticket.details) {
          console.log(`   - Détails: ${JSON.stringify(ticket.details, null, 2)}`);
        }
      }
    });

    // Si on a des tickets réussis, vérifier les receipts
    const successfulTicketIds = tickets
      .filter(t => t.status === 'ok' && t.id)
      .map(t => t.id!);

    if (successfulTicketIds.length > 0) {
      console.log('\n⏳ Attente de 5 secondes avant de vérifier les receipts...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      console.log('\n🔍 Vérification des receipts...\n');
      const receipts = await expoPushService.getReceipts(successfulTicketIds);

      for (const [ticketId, receipt] of Object.entries(receipts)) {
        console.log(`   Receipt pour ${ticketId}:`);
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
    console.log('\n💡 Vérifiez votre appareil pour voir la notification.');

  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
  }
}

// Exécuter le test
testDirectPush();
