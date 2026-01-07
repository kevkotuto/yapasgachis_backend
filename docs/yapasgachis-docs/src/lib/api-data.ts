export interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  details?: string;
  auth?: boolean;
  roles?: string[];
  body?: Record<string, unknown>;
  query?: Record<string, string>;
  response?: string;
  responseExample?: Record<string, unknown>;
  notes?: string[];
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
      {
        method: 'POST',
        path: '/auth/register',
        description: 'Inscription nouvel utilisateur',
        details: 'Cree un nouveau compte utilisateur. Un OTP est envoye par SMS pour verification. Les roles disponibles sont: CLIENT, SUPPLIER_FOOD, SUPPLIER_DEALS, ASSOCIATION, ADVERTISER.',
        body: { phoneNumber: '+221771234567', password: 'Password123!', firstName: 'Mamadou', lastName: 'Diallo', role: 'CLIENT' },
        notes: ['Le mot de passe doit contenir au moins 8 caracteres avec majuscule, minuscule et chiffre', 'Le numero de telephone doit etre au format international (+XXX...)'],
        responseExample: { success: true, message: 'OTP envoye', data: { userId: 'uuid', phoneNumber: '+221771234567' } }
      },
      {
        method: 'POST',
        path: '/auth/login',
        description: 'Connexion par telephone',
        details: 'Authentifie un utilisateur avec son numero de telephone et mot de passe. Retourne un access token (15min) et refresh token (7 jours).',
        body: { phoneNumber: '+221771234567', password: 'Password123!' },
        responseExample: { success: true, data: { accessToken: 'jwt...', refreshToken: 'jwt...', user: { id: 'uuid', firstName: 'Mamadou', role: 'CLIENT' } } }
      },
      {
        method: 'POST',
        path: '/auth/login/email',
        description: 'Connexion par email (envoie OTP)',
        details: 'Premiere etape de connexion par email. Verifie le mot de passe puis envoie un OTP par email pour double authentification.',
        body: { email: 'user@example.com', password: 'Password123!' },
        notes: ['L\'OTP est valide pendant 10 minutes', 'Utilisez /auth/verify-email-otp pour completer la connexion']
      },
      {
        method: 'POST',
        path: '/auth/verify-otp',
        description: 'Verifier OTP telephone',
        details: 'Verifie le code OTP envoye par SMS. Le parametre "purpose" indique le contexte: registration, login, password_reset.',
        body: { phoneNumber: '+221771234567', code: '123456', purpose: 'registration' }
      },
      {
        method: 'POST',
        path: '/auth/verify-email-otp',
        description: 'Verifier OTP email',
        details: 'Complete l\'authentification par email en verifiant l\'OTP. Retourne les tokens d\'acces apres verification.',
        body: { email: 'user@example.com', code: '123456', purpose: 'login' }
      },
      { method: 'POST', path: '/auth/resend-otp', description: 'Renvoyer OTP telephone', details: 'Renvoie un nouveau code OTP par SMS. Limite a 3 tentatives par heure.' },
      { method: 'POST', path: '/auth/resend-email-otp', description: 'Renvoyer OTP email', details: 'Renvoie un nouveau code OTP par email. Limite a 3 tentatives par heure.' },
      { method: 'POST', path: '/auth/forgot-password', description: 'Demander reinitialisation mot de passe', details: 'Envoie un OTP pour reinitialiser le mot de passe. Peut etre envoye par SMS ou email selon le parametre fourni.' },
      { method: 'POST', path: '/auth/reset-password', description: 'Reinitialiser mot de passe avec OTP', details: 'Definit un nouveau mot de passe apres verification de l\'OTP recu.' },
      { method: 'POST', path: '/auth/change-password', description: 'Changer mot de passe', auth: true, details: 'Permet a l\'utilisateur connecte de changer son mot de passe. Necessite l\'ancien mot de passe.' },
      {
        method: 'POST',
        path: '/auth/refresh-token',
        description: 'Rafraichir le token',
        details: 'Genere un nouveau access token a partir du refresh token. Utilisez cette route quand l\'access token expire.',
        notes: ['Le refresh token doit etre passe dans le header Authorization ou dans le body', 'Un nouveau refresh token est egalement genere']
      },
      { method: 'POST', path: '/auth/logout', description: 'Deconnexion', auth: true, details: 'Invalide la session active et les tokens associes.' },
      {
        method: 'GET',
        path: '/auth/me',
        description: 'Obtenir profil utilisateur connecte',
        auth: true,
        details: 'Retourne les informations completes de l\'utilisateur connecte incluant son role, profil et preferences.',
        responseExample: { success: true, data: { id: 'uuid', firstName: 'Mamadou', lastName: 'Diallo', phoneNumber: '+221771234567', role: 'CLIENT', isVerified: true } }
      },
      { method: 'POST', path: '/auth/google', description: 'Connexion avec Google', details: 'Authentification OAuth2 avec Google. Envoyez l\'idToken obtenu du SDK Google.' },
      { method: 'POST', path: '/auth/google/link', description: 'Lier compte Google', auth: true, details: 'Associe un compte Google a un compte existant pour permettre la connexion via Google.' },
      { method: 'POST', path: '/auth/google/unlink', description: 'Delier compte Google', auth: true, details: 'Dissocie le compte Google du compte utilisateur.' },
    ]
  },
  {
    id: 'products',
    title: 'Produits',
    description: 'Gestion des produits anti-gaspillage',
    icon: 'Package',
    endpoints: [
      {
        method: 'GET',
        path: '/products/search',
        description: 'Rechercher des produits',
        details: 'Recherche de produits avec filtres multiples. Supporte la pagination et le tri par prix, date ou popularite. Les resultats sont ordonnes par pertinence.',
        query: { query: 'legumes', category: 'FOOD', minPrice: '100', maxPrice: '5000', page: '1', limit: '20', sortBy: 'createdAt', sortOrder: 'desc' },
        notes: ['Categories disponibles: VEGETABLES, FRUITS, BAKERY, DAIRY, MEAT, BEVERAGES, PREPARED, OTHER', 'Les coordonnees (lat/lng) permettent de trier par distance']
      },
      {
        method: 'GET',
        path: '/products/expiring-soon',
        description: 'Produits bientot expires',
        details: 'Liste les produits dont la date de peremption approche (dans les 48h). Ideal pour les promotions de derniere minute.',
        notes: ['Les produits sont tries par date d\'expiration croissante']
      },
      {
        method: 'GET',
        path: '/products/trending',
        description: 'Produits tendances',
        details: 'Retourne les produits les plus populaires bases sur les ventes recentes, vues et favoris.'
      },
      {
        method: 'GET',
        path: '/products/:id',
        description: 'Obtenir un produit par ID',
        details: 'Retourne les details complets d\'un produit incluant le fournisseur, magasin, images et avis.',
        responseExample: { success: true, data: { id: 'uuid', name: 'Panier legumes', originalPrice: 5000, discountedPrice: 2500, discount: 50, quantity: 10, supplier: { name: 'Bio Market' } } }
      },
      {
        method: 'GET',
        path: '/products/my-products',
        description: 'Mes produits (fournisseur)',
        auth: true,
        roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'],
        details: 'Liste tous les produits du fournisseur connecte avec leurs statistiques de vente.'
      },
      {
        method: 'POST',
        path: '/products',
        description: 'Creer un produit',
        auth: true,
        roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'],
        details: 'Cree un nouveau produit. Le nombre de produits est limite selon le plan d\'abonnement du fournisseur.',
        body: { name: 'Panier legumes', originalPrice: 5000, discountedPrice: 2500, quantity: 10, category: 'VEGETABLES', expiresAt: '2025-01-15T23:59:59Z', storeId: 'uuid' },
        notes: ['Le prix reduit doit etre inferieur au prix original', 'La date d\'expiration est obligatoire', 'Un magasin doit etre associe au produit']
      },
      {
        method: 'PUT',
        path: '/products/:id',
        description: 'Modifier un produit',
        auth: true,
        roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'],
        details: 'Met a jour les informations d\'un produit existant. Seul le proprietaire peut modifier.'
      },
      {
        method: 'DELETE',
        path: '/products/:id',
        description: 'Supprimer un produit',
        auth: true,
        roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'],
        details: 'Supprime definitivement un produit. Impossible si des commandes sont en cours.',
        notes: ['La suppression est irreversible', 'Les produits avec commandes actives ne peuvent pas etre supprimes']
      },
      {
        method: 'PATCH',
        path: '/products/:id/stock',
        description: 'Mettre a jour le stock',
        auth: true,
        roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'],
        details: 'Modifie rapidement la quantite disponible d\'un produit.',
        body: { quantity: 5 }
      },
      {
        method: 'POST',
        path: '/products/:id/images',
        description: 'Uploader images produit',
        auth: true,
        roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'],
        details: 'Ajoute des images au produit. Maximum 5 images par produit. Formats acceptes: JPG, PNG, WebP.',
        notes: ['Taille max: 5MB par image', 'Les images sont optimisees automatiquement']
      },
      {
        method: 'DELETE',
        path: '/products/:id/images',
        description: 'Supprimer image produit',
        auth: true,
        roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'],
        details: 'Supprime une image specifique du produit.',
        body: { imageUrl: 'https://...' }
      },
    ]
  },
  {
    id: 'orders',
    title: 'Commandes',
    description: 'Creation et gestion des commandes',
    icon: 'ShoppingCart',
    endpoints: [
      {
        method: 'GET',
        path: '/orders/payments/providers',
        description: 'Obtenir les moyens de paiement',
        details: 'Liste les methodes de paiement disponibles: Wave, Orange Money, MTN Mobile Money, carte bancaire.',
        responseExample: { success: true, data: [{ id: 'WAVE', name: 'Wave', enabled: true, fees: '1%' }, { id: 'ORANGE_MONEY', name: 'Orange Money', enabled: true }] }
      },
      {
        method: 'POST',
        path: '/orders',
        description: 'Creer une commande',
        auth: true,
        roles: ['CLIENT'],
        details: 'Cree une nouvelle commande. Le paiement est initie automatiquement. Le systeme utilise un escrow pour securiser la transaction.',
        body: { items: [{ productId: 'uuid', quantity: 2 }], paymentProvider: 'WAVE', deliveryType: 'PICKUP' },
        notes: ['deliveryType: PICKUP (retrait sur place) ou DELIVERY (livraison)', 'Les frais Wave (1%) et les frais de transfert (1%) sont calcules automatiquement', 'Le paiement est place en escrow jusqu\'a confirmation de reception']
      },
      {
        method: 'GET',
        path: '/orders/my-orders',
        description: 'Mes commandes (client)',
        auth: true,
        roles: ['CLIENT'],
        details: 'Historique des commandes du client avec statut et details de paiement.',
        query: { status: 'PENDING', page: '1', limit: '10' }
      },
      {
        method: 'GET',
        path: '/orders/statistics',
        description: 'Statistiques commandes client',
        auth: true,
        roles: ['CLIENT'],
        details: 'Resume des commandes: total depense, nombre de commandes, economies realisees grace aux promotions.'
      },
      {
        method: 'GET',
        path: '/orders/supplier-orders',
        description: 'Commandes recues (fournisseur)',
        auth: true,
        roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'],
        details: 'Liste des commandes recues par le fournisseur avec filtres par statut et date.'
      },
      {
        method: 'GET',
        path: '/orders/supplier-statistics',
        description: 'Statistiques fournisseur',
        auth: true,
        roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'],
        details: 'Tableau de bord: ventes, revenus, commandes par periode, produits populaires.',
        responseExample: { success: true, data: { totalOrders: 150, totalRevenue: 750000, avgOrderValue: 5000, topProducts: [] } }
      },
      {
        method: 'GET',
        path: '/orders/:id',
        description: 'Obtenir une commande',
        auth: true,
        details: 'Details complets d\'une commande: produits, client/fournisseur, statut paiement, historique.'
      },
      {
        method: 'POST',
        path: '/orders/:id/cancel',
        description: 'Annuler une commande',
        auth: true,
        roles: ['CLIENT'],
        details: 'Annule une commande en attente. Le remboursement est automatique si le paiement a ete effectue.',
        notes: ['Impossible d\'annuler une commande deja preparee', 'Le remboursement est credite sous 24-48h']
      },
      {
        method: 'PATCH',
        path: '/orders/:id/status',
        description: 'Mettre a jour statut',
        auth: true,
        roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'],
        details: 'Change le statut de la commande: PENDING -> CONFIRMED -> PREPARING -> READY -> COMPLETED.',
        body: { status: 'READY' },
        notes: ['Le client est notifie a chaque changement de statut', 'Le passage a COMPLETED declenche le paiement au fournisseur']
      },
      {
        method: 'GET',
        path: '/orders/payments/:transactionId/status',
        description: 'Verifier statut paiement',
        auth: true,
        details: 'Verifie l\'etat d\'une transaction de paiement en temps reel.'
      },
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
  {
    id: 'kyc',
    title: 'KYC Fournisseur',
    description: 'Verification d\'identite des fournisseurs',
    icon: 'FileCheck',
    endpoints: [
      { method: 'POST', path: '/kyc/submit', description: 'Soumettre documents KYC', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'], body: { documentType: 'ID_CARD', documentNumber: 'SN123456', businessRegistration: 'NINEA123' } },
      { method: 'GET', path: '/kyc/status', description: 'Obtenir statut KYC', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
    ]
  },
  {
    id: 'admin-kyc',
    title: 'Admin KYC',
    description: 'Gestion des verifications KYC',
    icon: 'ShieldCheck',
    endpoints: [
      { method: 'GET', path: '/admin/kyc/stats', description: 'Statistiques KYC', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/kyc/pending', description: 'KYC en attente de review', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/kyc/attempts', description: 'Toutes les tentatives KYC', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'GET', path: '/admin/kyc/attempts/:attemptId', description: 'Details tentative KYC', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/kyc/attempts/:attemptId/review', description: 'Approuver/rejeter KYC', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'], body: { decision: 'APPROVED', notes: 'Documents valides' } },
      { method: 'POST', path: '/admin/kyc/suppliers/:supplierId/force-verify', description: 'Verification forcee', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'] },
      { method: 'POST', path: '/admin/kyc/suppliers/:supplierId/request-resubmission', description: 'Demander resoumission', auth: true, roles: ['ADMIN', 'SUPER_ADMIN'], body: { reason: 'Document illisible', requiredDocuments: ['ID_CARD'] } },
    ]
  },
  {
    id: 'store-staff',
    title: 'Gestion du Personnel',
    description: 'Systeme de gestion du personnel des magasins',
    icon: 'UserCog',
    endpoints: [
      { method: 'GET', path: '/staff/my-stores', description: 'Magasins ou je suis staff', auth: true },
      { method: 'GET', path: '/staff/invitations', description: 'Mes invitations en attente', auth: true },
      { method: 'POST', path: '/staff/invitations/:token/accept', description: 'Accepter une invitation', auth: true },
      { method: 'POST', path: '/staff/invitations/:token/reject', description: 'Refuser une invitation', auth: true },
      { method: 'POST', path: '/staff/stores/:storeId/invite', description: 'Inviter un staff', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'], body: { email: 'staff@example.com', role: 'MANAGER', permissions: ['manage_products', 'view_orders'] } },
      { method: 'GET', path: '/staff/stores/:storeId', description: 'Liste du personnel', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'GET', path: '/staff/stores/:storeId/my-role', description: 'Mon role sur ce magasin', auth: true },
      { method: 'PATCH', path: '/staff/stores/:storeId/members/:userId', description: 'Modifier un membre', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
      { method: 'DELETE', path: '/staff/stores/:storeId/members/:userId', description: 'Retirer un membre', auth: true, roles: ['SUPPLIER_FOOD', 'SUPPLIER_DEALS'] },
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
