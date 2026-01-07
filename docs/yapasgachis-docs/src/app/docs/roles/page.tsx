import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { roles } from '@/lib/api-data';

export default function RolesPage() {
  const roleColors: Record<string, string> = {
    CLIENT: 'bg-blue-500',
    SUPPLIER_FOOD: 'bg-green-500',
    SUPPLIER_DEALS: 'bg-emerald-500',
    ASSOCIATION: 'bg-purple-500',
    ADVERTISER: 'bg-orange-500',
    ADMIN: 'bg-red-500',
    SUPER_ADMIN: 'bg-red-700',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roles Utilisateurs</h1>
        <p className="text-muted-foreground mt-2">
          YapaGachis utilise un systeme de roles pour controler l&apos;acces aux differentes fonctionnalites de l&apos;API.
        </p>
      </div>

      <div className="grid gap-4">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge className={`${roleColors[role.id]} text-white`}>
                  {role.id}
                </Badge>
                <CardTitle className="text-lg">{role.name}</CardTitle>
              </div>
              <CardDescription>{role.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Permissions par role</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Badge className="bg-blue-500">CLIENT</Badge>
            </h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>Rechercher et consulter les produits</li>
              <li>Passer des commandes</li>
              <li>Reserver des bons plans</li>
              <li>Laisser des avis</li>
              <li>Faire des dons financiers</li>
              <li>Gerer ses notifications</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Badge className="bg-green-500">SUPPLIER_FOOD</Badge>
              <Badge className="bg-emerald-500">SUPPLIER_DEALS</Badge>
            </h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>Gerer son profil fournisseur</li>
              <li>Creer et gerer des produits</li>
              <li>Creer et gerer des magasins</li>
              <li>Creer et gerer des bons plans</li>
              <li>Recevoir et traiter des commandes</li>
              <li>Faire des dons alimentaires</li>
              <li>Gerer son abonnement</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Badge className="bg-purple-500">ASSOCIATION</Badge>
            </h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>Gerer son profil association</li>
              <li>Recevoir des dons</li>
              <li>Planifier et confirmer les collectes</li>
              <li>Creer des rapports d&apos;activite</li>
              <li>Consulter les statistiques de dons</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Badge className="bg-orange-500">ADVERTISER</Badge>
            </h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>Gerer son profil annonceur</li>
              <li>Creer et gerer des campagnes publicitaires</li>
              <li>Consulter les statistiques de campagne</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Badge className="bg-red-500">ADMIN</Badge>
              <Badge className="bg-red-700">SUPER_ADMIN</Badge>
            </h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>Gerer tous les utilisateurs</li>
              <li>Verifier et moderer les fournisseurs</li>
              <li>Moderer les produits et avis</li>
              <li>Gerer les abonnements et codes promo</li>
              <li>Consulter les rapports et analytics</li>
              <li>Gerer les paiements et litiges</li>
              <li>Configurer les parametres de la plateforme</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
