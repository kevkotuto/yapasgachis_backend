export interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  auth?: boolean;
  roles?: string[];
  body?: Record<string, unknown>;
  query?: Record<string, string>;
  response?: string;
}

export interface ApiSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  endpoints: Endpoint[];
}

export const apiSections: ApiSection[] = [
  {
    id: 'auth',
    title: 'Authentification',
    description: 'Inscription, connexion et gestion des comptes utilisateurs',
    icon: 'Lock',
    endpoints: [
      { method: 'POST', path: '/auth/register', description: 'Inscription nouvel utilisateur', body: { phoneNumber: '+221771234567', password: 'Password123!', firstName: 'Mamadou', lastName: 'Diallo', role: 'CLIENT' } },
      { method: 'POST', path: '/auth/login', description: 'Connexion par telephone', body: { phoneNumber: '+221771234567', password: 'Password123!' } },
      { method: 'POST', path: '/auth/login/email', description: 'Connexion par email (envoie OTP)', body: { email: 'user@example.com', password: 'Password123!' } },
      { method: 'POST', path: '/auth/verify-otp', description: 'Verifier OTP telephone', body: { phoneNumber: '+221771234567', code: '123456', purpose: 'registration' } },
      { method: 'POST', path: '/auth/verify-email-otp', description: 'Verifier OTP email', body: { email: 'user@example.com', code: '123456', purpose: 'login' } },
      { method: 'POST', path: '/auth/resend-otp', description: 'Renvoyer OTP telephone' },
      { method: 'POST', path: '/auth/resend-email-otp', description: 'Renvoyer OTP email' },
      { method: 'POST', path: '/auth/forgot-password', description: 'Demander reinitialisation mot de passe' },
      { method: 'POST', path: '/auth/reset-password', description: 'Reinitialiser mot de passe avec OTP' },
      { method: 'POST', path: '/auth/change-password', description: 'Changer mot de passe', auth: true },
      { method: 'POST', path: '/auth/refresh-token', description: 'Rafraichir le token' },
      { method: 'POST', path: '/auth/logout', description: 'Deconnexion', auth: true },
      { method: 'GET', path: '/auth/me', description: 'Obtenir profil utilisateur connecte', auth: true },
      { method: 'POST', path: '/auth/google', description: 'Connexion avec Google' },
      { method: 'POST', path: '/auth/google/link', description: 'Lier compte Google', auth: true },
      { method: 'POST', path: '/auth/google/unlink', description: 'Delier compte Google', auth: true },
    ]
  },
  {
    id: 'products',
    title: 'Produits',
    description: 'Gestion des produits anti-gaspillage',
    icon: 'Package',
    endpoints: [
      { method: 'GET', path: '/products/search', description: 'Rechercher des produits', query: { query: 'legumes', category: 'FOOD', minPrice: '100', maxPrice: '5000' } },
      { method: 'GET', path: '/products/expiring-soon', description: 'Produits bientot expires' },
      { method: 'GET', path: '/products/trending', description: 'Produits tendances' },
      { method: 'GET', path: '/products/:id', description: 'Obtenir un produit par ID' },
      { method: 'GET', path: '/products/my-products', description: 'Mes produits (fournisseur)', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'POST', path: '/products', description: 'Creer un produit', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'], body: { name: 'Panier legumes', originalPrice: 5000, discountedPrice: 2500, quantity: 10, category: 'VEGETABLES' } },
      { method: 'PUT', path: '/products/:id', description: 'Modifier un produit', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'DELETE', path: '/products/:id', description: 'Supprimer un produit', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'PATCH', path: '/products/:id/stock', description: 'Mettre a jour le stock', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'POST', path: '/products/:id/images', description: 'Uploader images produit', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'DELETE', path: '/products/:id/images', description: 'Supprimer image produit', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
    ]
  },
  {
    id: 'orders',
    title: 'Commandes',
    description: 'Creation et gestion des commandes',
    icon: 'ShoppingCart',
    endpoints: [
      { method: 'GET', path: '/orders/payments/providers', description: 'Obtenir les moyens de paiement' },
      { method: 'POST', path: '/orders', description: 'Creer une commande', auth: true, roles: ['CLIENT'], body: { items: [{ productId: 'uuid', quantity: 2 }], paymentProvider: 'WAVE', deliveryType: 'PICKUP' } },
      { method: 'GET', path: '/orders/my-orders', description: 'Mes commandes (client)', auth: true, roles: ['CLIENT'] },
      { method: 'GET', path: '/orders/statistics', description: 'Statistiques commandes client', auth: true, roles: ['CLIENT'] },
      { method: 'GET', path: '/orders/supplier-orders', description: 'Commandes recues (fournisseur)', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'GET', path: '/orders/supplier-statistics', description: 'Statistiques fournisseur', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'GET', path: '/orders/:id', description: 'Obtenir une commande', auth: true },
      { method: 'POST', path: '/orders/:id/cancel', description: 'Annuler une commande', auth: true, roles: ['CLIENT'] },
      { method: 'PATCH', path: '/orders/:id/status', description: 'Mettre a jour statut', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'GET', path: '/orders/payments/:transactionId/status', description: 'Verifier statut paiement', auth: true },
    ]
  },
  {
    id: 'suppliers',
    title: 'Fournisseurs',
    description: 'Profils et gestion des fournisseurs',
    icon: 'Store',
    endpoints: [
      { method: 'GET', path: '/suppliers/search', description: 'Rechercher des fournisseurs' },
      { method: 'GET', path: '/suppliers/nearby', description: 'Fournisseurs a proximite', query: { latitude: '14.6937', longitude: '-17.4441', radius: '5' } },
      { method: 'GET', path: '/suppliers/:id', description: 'Obtenir un fournisseur' },
      { method: 'POST', path: '/suppliers/profile', description: 'Creer profil fournisseur', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'GET', path: '/suppliers/profile', description: 'Mon profil fournisseur', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'PUT', path: '/suppliers/profile', description: 'Modifier profil fournisseur', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'DELETE', path: '/suppliers/profile', description: 'Supprimer profil fournisseur', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'GET', path: '/suppliers/statistics', description: 'Statistiques fournisseur', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'POST', path: '/suppliers/subscription', description: 'Mettre a jour abonnement', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'GET', path: '/suppliers/can-create-products', description: 'Verifier limite produits', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
    ]
  },
  {
    id: 'stores',
    title: 'Magasins',
    description: 'Gestion des points de vente',
    icon: 'MapPin',
    endpoints: [
      { method: 'GET', path: '/stores', description: 'Rechercher des magasins' },
      { method: 'GET', path: '/stores/nearby', description: 'Magasins a proximite' },
      { method: 'GET', path: '/stores/:storeId', description: 'Obtenir un magasin' },
      { method: 'GET', path: '/supplier/stores', description: 'Mes magasins', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'POST', path: '/supplier/stores', description: 'Creer un magasin', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'PUT', path: '/supplier/stores/:storeId', description: 'Modifier un magasin', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'DELETE', path: '/supplier/stores/:storeId', description: 'Supprimer un magasin', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'GET', path: '/supplier/stores/:storeId/statistics', description: 'Statistiques magasin', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'POST', path: '/supplier/stores/:storeId/temporary-closure', description: 'Fermeture temporaire', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'POST', path: '/supplier/stores/:storeId/toggle-active', description: 'Activer/desactiver magasin', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
    ]
  },
  {
    id: 'deals',
    title: 'Bons Plans',
    description: 'Offres et reservations',
    icon: 'Percent',
    endpoints: [
      { method: 'GET', path: '/deals', description: 'Rechercher des bons plans' },
      { method: 'GET', path: '/deals/:dealId', description: 'Obtenir un bon plan' },
      { method: 'POST', path: '/deals/:dealId/book', description: 'Reserver un bon plan', auth: true },
      { method: 'GET', path: '/deals/bookings/my-bookings', description: 'Mes reservations', auth: true },
      { method: 'POST', path: '/deals/bookings/:bookingId/cancel', description: 'Annuler reservation', auth: true },
      { method: 'GET', path: '/deals/bookings/:bookingId/qr-code', description: 'QR code reservation', auth: true },
      { method: 'GET', path: '/supplier/deals', description: 'Mes bons plans', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'POST', path: '/supplier/deals', description: 'Creer un bon plan', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'PUT', path: '/supplier/deals/:dealId', description: 'Modifier un bon plan', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'POST', path: '/supplier/deals/:dealId/toggle-pause', description: 'Pause/reprendre deal', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'DELETE', path: '/supplier/deals/:dealId', description: 'Supprimer un bon plan', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'GET', path: '/supplier/deals/bookings', description: 'Reservations recues', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'POST', path: '/supplier/deals/bookings/validate', description: 'Valider une reservation', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
    ]
  },
  {
    id: 'subscriptions',
    title: 'Abonnements',
    description: 'Plans et codes promo',
    icon: 'CreditCard',
    endpoints: [
      { method: 'GET', path: '/subscriptions/plans', description: 'Obtenir les plans publics' },
      { method: 'POST', path: '/subscriptions/subscribe', description: 'Souscrire a un plan', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'POST', path: '/subscriptions/cancel', description: 'Annuler abonnement', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'POST', path: '/subscriptions/renew', description: 'Renouveler abonnement', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'GET', path: '/subscriptions/limits', description: 'Limites abonnement', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'POST', path: '/subscriptions/promo-codes/validate', description: 'Valider code promo', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'GET', path: '/subscriptions/promo-codes/available', description: 'Codes promo disponibles', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
    ]
  },
  {
    id: 'donations',
    title: 'Dons',
    description: 'Dons alimentaires et financiers',
    icon: 'Heart',
    endpoints: [
      { method: 'POST', path: '/donations/food', description: 'Creer don alimentaire', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'POST', path: '/donations/financial', description: 'Creer don financier', auth: true },
      { method: 'GET', path: '/donations/my-donations', description: 'Mes dons', auth: true },
      { method: 'GET', path: '/donations/my-stats', description: 'Statistiques dons', auth: true },
      { method: 'GET', path: '/donations/:donationId', description: 'Obtenir un don', auth: true },
      { method: 'POST', path: '/donations/:donationId/cancel', description: 'Annuler un don', auth: true },
      { method: 'POST', path: '/donations/:donationId/receipt', description: 'Generer recu', auth: true },
      { method: 'POST', path: '/donations/:donationId/certificate', description: 'Generer certificat', auth: true },
      { method: 'POST', path: '/donations/:donationId/schedule-pickup', description: 'Planifier collecte', auth: true, roles: ['ASSOCIATION'] },
      { method: 'POST', path: '/donations/:donationId/confirm-pickup', description: 'Confirmer collecte', auth: true, roles: ['ASSOCIATION'] },
      { method: 'PATCH', path: '/donations/:donationId/status', description: 'Mettre a jour statut', auth: true },
    ]
  },
  {
    id: 'associations',
    title: 'Associations',
    description: 'Organisations caritatives',
    icon: 'Users',
    endpoints: [
      { method: 'GET', path: '/associations', description: 'Rechercher associations' },
      { method: 'GET', path: '/associations/verified', description: 'Associations verifiees' },
      { method: 'GET', path: '/associations/nearby', description: 'Associations a proximite' },
      { method: 'GET', path: '/associations/:associationId', description: 'Obtenir une association' },
      { method: 'GET', path: '/associations/:associationId/reports', description: 'Rapports association' },
      { method: 'POST', path: '/associations/register', description: 'Enregistrer association', auth: true, roles: ['ASSOCIATION'] },
      { method: 'GET', path: '/associations/me', description: 'Mon profil association', auth: true, roles: ['ASSOCIATION'] },
      { method: 'PUT', path: '/associations/me', description: 'Modifier profil', auth: true, roles: ['ASSOCIATION'] },
      { method: 'POST', path: '/associations/me/reports', description: 'Creer rapport', auth: true, roles: ['ASSOCIATION'] },
      { method: 'GET', path: '/associations/me/reports', description: 'Mes rapports', auth: true, roles: ['ASSOCIATION'] },
      { method: 'GET', path: '/associations/donations', description: 'Dons recus', auth: true, roles: ['ASSOCIATION'] },
      { method: 'GET', path: '/associations/donations/pending-pickups', description: 'Collectes en attente', auth: true, roles: ['ASSOCIATION'] },
      { method: 'GET', path: '/associations/donations/stats', description: 'Statistiques dons', auth: true, roles: ['ASSOCIATION'] },
    ]
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Notifications push et preferences',
    icon: 'Bell',
    endpoints: [
      { method: 'POST', path: '/notifications/device-token', description: 'Enregistrer token FCM', auth: true },
      { method: 'DELETE', path: '/notifications/device-token', description: 'Supprimer token', auth: true },
      { method: 'DELETE', path: '/notifications/device-tokens', description: 'Supprimer tous les tokens', auth: true },
      { method: 'GET', path: '/notifications', description: 'Obtenir notifications', auth: true },
      { method: 'GET', path: '/notifications/unread-count', description: 'Nombre non lues', auth: true },
      { method: 'PATCH', path: '/notifications/read-all', description: 'Marquer tout comme lu', auth: true },
      { method: 'PATCH', path: '/notifications/:id/read', description: 'Marquer comme lu', auth: true },
      { method: 'DELETE', path: '/notifications', description: 'Supprimer toutes', auth: true },
      { method: 'DELETE', path: '/notifications/:id', description: 'Supprimer notification', auth: true },
      { method: 'GET', path: '/notifications/preferences', description: 'Preferences notifications', auth: true },
      { method: 'PATCH', path: '/notifications/preferences', description: 'Modifier preferences', auth: true },
    ]
  },
  {
    id: 'reviews',
    title: 'Avis',
    description: 'Avis et evaluations',
    icon: 'Star',
    endpoints: [
      { method: 'GET', path: '/reviews/product/:productId', description: 'Avis sur un produit' },
      { method: 'GET', path: '/reviews/supplier/:supplierId', description: 'Avis sur un fournisseur' },
      { method: 'POST', path: '/reviews/:id/helpful', description: 'Marquer avis utile' },
      { method: 'POST', path: '/reviews', description: 'Creer un avis', auth: true },
      { method: 'GET', path: '/reviews/my', description: 'Mes avis', auth: true },
      { method: 'PUT', path: '/reviews/:id', description: 'Modifier un avis', auth: true },
      { method: 'DELETE', path: '/reviews/:id', description: 'Supprimer un avis', auth: true },
      { method: 'POST', path: '/reviews/:id/report', description: 'Signaler un avis', auth: true },
    ]
  },
  {
    id: 'advertising',
    title: 'Publicite',
    description: 'Campagnes publicitaires',
    icon: 'Megaphone',
    endpoints: [
      { method: 'GET', path: '/advertising/ads', description: 'Obtenir publicites' },
      { method: 'POST', path: '/advertising/ads/:id/click', description: 'Tracker clic pub' },
      { method: 'POST', path: '/advertising/profile', description: 'Creer profil annonceur', auth: true },
      { method: 'GET', path: '/advertising/profile', description: 'Mon profil annonceur', auth: true },
      { method: 'PUT', path: '/advertising/profile', description: 'Modifier profil', auth: true },
      { method: 'POST', path: '/advertising/campaigns', description: 'Creer campagne', auth: true, roles: ['ADVERTISER', 'ADMIN'] },
      { method: 'GET', path: '/advertising/campaigns', description: 'Mes campagnes', auth: true, roles: ['ADVERTISER', 'ADMIN'] },
      { method: 'GET', path: '/advertising/campaigns/:id', description: 'Obtenir campagne', auth: true, roles: ['ADVERTISER', 'ADMIN'] },
      { method: 'PUT', path: '/advertising/campaigns/:id', description: 'Modifier campagne', auth: true, roles: ['ADVERTISER', 'ADMIN'] },
      { method: 'POST', path: '/advertising/campaigns/:id/submit', description: 'Soumettre campagne', auth: true, roles: ['ADVERTISER', 'ADMIN'] },
      { method: 'POST', path: '/advertising/campaigns/:id/pause', description: 'Pause campagne', auth: true, roles: ['ADVERTISER', 'ADMIN'] },
      { method: 'POST', path: '/advertising/campaigns/:id/resume', description: 'Reprendre campagne', auth: true, roles: ['ADVERTISER', 'ADMIN'] },
      { method: 'DELETE', path: '/advertising/campaigns/:id', description: 'Supprimer campagne', auth: true, roles: ['ADVERTISER', 'ADMIN'] },
      { method: 'GET', path: '/advertising/campaigns/:id/stats', description: 'Stats campagne', auth: true, roles: ['ADVERTISER', 'ADMIN'] },
    ]
  },
  {
    id: 'payments',
    title: 'Paiements',
    description: 'Webhooks et statuts paiement',
    icon: 'Wallet',
    endpoints: [
      { method: 'POST', path: '/payments/wave/webhook', description: 'Webhook Wave (public)' },
      { method: 'GET', path: '/payments/wave/success', description: 'Callback succes Wave' },
      { method: 'GET', path: '/payments/wave/error', description: 'Callback erreur Wave' },
      { method: 'GET', path: '/payments/status/:orderId', description: 'Statut paiement', auth: true },
      { method: 'POST', path: '/payments/retry/:orderId', description: 'Reessayer paiement', auth: true },
    ]
  },
  {
    id: 'admin',
    title: 'Administration',
    description: 'Routes administration et moderation',
    icon: 'Shield',
    endpoints: [
      { method: 'GET', path: '/admin/dashboard/stats', description: 'Stats tableau de bord', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/dashboard/impact', description: 'Metriques impact', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/users', description: 'Liste utilisateurs', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/users', description: 'Creer utilisateur', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/users/:id', description: 'Obtenir utilisateur', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'PATCH', path: '/admin/users/:id/status', description: 'Modifier statut user', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'PATCH', path: '/admin/users/:id/role', description: 'Modifier role user', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'PATCH', path: '/admin/users/:id/verify', description: 'Forcer verification', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'DELETE', path: '/admin/users/:id', description: 'Supprimer utilisateur', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/suppliers', description: 'Liste fournisseurs', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/suppliers/pending', description: 'Fournisseurs en attente', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'PATCH', path: '/admin/suppliers/:id/verify', description: 'Verifier fournisseur', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'PATCH', path: '/admin/suppliers/:id/reject', description: 'Rejeter fournisseur', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'PATCH', path: '/admin/suppliers/:id/commission', description: 'Modifier commission', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/suppliers/bulk-verify', description: 'Verification en masse', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/suppliers/kyc/pending', description: 'KYC en attente', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/suppliers/:id/kyc/verify', description: 'Verifier KYC', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/suppliers/:id/kyc/reject', description: 'Rejeter KYC', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/products', description: 'Liste produits', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/products/moderation', description: 'Produits a moderer', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'PATCH', path: '/admin/products/:id/approve', description: 'Approuver produit', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'PATCH', path: '/admin/products/:id/reject', description: 'Rejeter produit', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'PATCH', path: '/admin/products/:id/status', description: 'Modifier statut', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'DELETE', path: '/admin/products/:id', description: 'Supprimer produit', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/products/bulk-approve', description: 'Approbation en masse', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/reviews/reported', description: 'Avis signales', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'PATCH', path: '/admin/reviews/:id/clear-report', description: 'Effacer signalement', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'DELETE', path: '/admin/reviews/:id', description: 'Supprimer avis', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/reports/financial', description: 'Rapport financier', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/analytics/top-products', description: 'Top produits', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/analytics/top-searches', description: 'Top recherches', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/analytics/user-growth', description: 'Croissance users', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/analytics/supplier/:supplierId', description: 'Perf fournisseur', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
    ]
  },
  {
    id: 'admin-subscriptions',
    title: 'Admin Abonnements',
    description: 'Gestion des plans et codes promo',
    icon: 'Settings',
    endpoints: [
      { method: 'GET', path: '/admin/subscriptions/plans', description: 'Tous les plans', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/subscriptions/plans', description: 'Creer un plan', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'PUT', path: '/admin/subscriptions/plans/:planId', description: 'Modifier un plan', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'DELETE', path: '/admin/subscriptions/plans/:planId', description: 'Supprimer un plan', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/subscriptions/promo-codes', description: 'Codes promo', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/subscriptions/promo-codes', description: 'Creer code promo', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/subscriptions/promo-codes/bulk', description: 'Codes promo en masse', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'PUT', path: '/admin/subscriptions/promo-codes/:promoCodeId', description: 'Modifier code', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/subscriptions/promo-codes/:promoCodeId/disable', description: 'Desactiver code', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'DELETE', path: '/admin/subscriptions/promo-codes/:promoCodeId', description: 'Supprimer code', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
    ]
  },
  {
    id: 'admin-deals',
    title: 'Admin Deals',
    description: 'Moderation des bons plans',
    icon: 'Tag',
    endpoints: [
      { method: 'GET', path: '/admin/deals/pending', description: 'Deals en attente', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/deals/:dealId/approve', description: 'Approuver deal', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/deals/:dealId/reject', description: 'Rejeter deal', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
    ]
  },
  {
    id: 'admin-donations',
    title: 'Admin Dons',
    description: 'Gestion des dons',
    icon: 'Gift',
    endpoints: [
      { method: 'GET', path: '/admin/donations', description: 'Rechercher dons', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/donations/stats', description: 'Statistiques dons', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
    ]
  },
  {
    id: 'admin-associations',
    title: 'Admin Associations',
    description: 'Gestion des associations',
    icon: 'Building',
    endpoints: [
      { method: 'GET', path: '/admin/associations', description: 'Toutes associations', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/associations/pending', description: 'En attente verif', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/associations/stats', description: 'Stats associations', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/associations/:associationId/verify', description: 'Verifier association', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/associations/:associationId/reject', description: 'Rejeter association', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
    ]
  },
  {
    id: 'admin-advertising',
    title: 'Admin Publicite',
    description: 'Moderation des campagnes',
    icon: 'Tv',
    endpoints: [
      { method: 'GET', path: '/admin/advertising/advertisers', description: 'Tous annonceurs', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/advertising/campaigns', description: 'Toutes campagnes', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/advertising/campaigns/pending', description: 'Campagnes en attente', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'PATCH', path: '/admin/advertising/campaigns/:id/approve', description: 'Approuver campagne', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'PATCH', path: '/admin/advertising/campaigns/:id/reject', description: 'Rejeter campagne', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
    ]
  },
  {
    id: 'admin-payments',
    title: 'Admin Paiements',
    description: 'Gestion escrow et litiges',
    icon: 'Banknote',
    endpoints: [
      { method: 'GET', path: '/admin/payments/statistics', description: 'Stats paiements', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/payments/escrow', description: 'Transactions escrow', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/payments/escrow/:orderId', description: 'Details escrow', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/payments/escrow/:orderId/release', description: 'Liberer fonds', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/payments/escrow/:orderId/refund', description: 'Rembourser client', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/payments/escrow/:orderId/dispute/open', description: 'Ouvrir litige', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/payments/escrow/:orderId/dispute/resolve-supplier', description: 'Litige pro-fournisseur', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/payments/escrow/:orderId/dispute/resolve-client', description: 'Litige pro-client', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
    ]
  },
  {
    id: 'admin-settings',
    title: 'Admin Parametres',
    description: 'Configuration plateforme',
    icon: 'Cog',
    endpoints: [
      { method: 'GET', path: '/admin/settings', description: 'Tous les parametres', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'PATCH', path: '/admin/settings', description: 'Modifier parametres', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/settings/audit', description: 'Historique modifs', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/settings/business', description: 'Parametres business', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/settings/wave', description: 'Parametres Wave', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/settings/features', description: 'Feature flags', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/settings/invalidate-cache', description: 'Invalider cache', auth: true, roles: ['SUPER_ADMIN'] },
    ]
  },
];

export const roles = [
  { id: 'CLIENT', name: 'Client', description: 'Utilisateur standard qui peut passer des commandes' },
  { id: 'SUPPLIER_FOOD', name: 'Fournisseur Alimentaire', description: 'Commercant proposant des produits alimentaires' },
  { id: 'SUPPLIER_DEALS', name: 'Fournisseur Deals', description: 'Commercant proposant des bons plans' },
  { id: 'ASSOCIATION', name: 'Association', description: 'Organisation caritative recevant des dons' },
  { id: 'ADVERTISER', name: 'Annonceur', description: 'Entreprise gerant des campagnes publicitaires' },
  { id: 'ADMIN', name: 'Administrateur', description: 'Gestionnaire de la plateforme' },
  { id: 'SUPER_ADMIN', name: 'Super Admin', description: 'Acces complet a toutes les fonctionnalites' },
];
