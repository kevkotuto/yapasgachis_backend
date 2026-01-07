import Link from 'next/link';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiSections } from '@/lib/api-data';
import { getIcon } from '@/lib/icons';

export default function DocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentation API YapaGachis</h1>
        <p className="text-muted-foreground mt-2">
          Bienvenue dans la documentation de l&apos;API YapaGachis. Cette API REST vous permet d&apos;integrer
          les fonctionnalites de notre plateforme anti-gaspillage alimentaire dans vos applications.
        </p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Informations de base</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Base URL Production</h3>
            <code className="text-sm bg-muted px-2 py-1 rounded mt-1 block">
              https://api.yapasgachis.com/api/v1
            </code>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Format</h3>
            <p className="text-sm mt-1">JSON (application/json)</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Authentification</h3>
            <p className="text-sm mt-1">Bearer Token (JWT)</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Rate Limiting</h3>
            <p className="text-sm mt-1">100 requetes / 15 minutes</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Codes de reponse</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Badge className="bg-green-500">200</Badge>
            <span className="text-sm">Succes</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-green-500">201</Badge>
            <span className="text-sm">Ressource creee</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-amber-500">400</Badge>
            <span className="text-sm">Requete invalide</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-amber-500">401</Badge>
            <span className="text-sm">Non authentifie</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-amber-500">403</Badge>
            <span className="text-sm">Acces refuse</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-amber-500">404</Badge>
            <span className="text-sm">Ressource non trouvee</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-red-500">429</Badge>
            <span className="text-sm">Trop de requetes</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-red-500">500</Badge>
            <span className="text-sm">Erreur serveur</span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Sections de l&apos;API</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {apiSections.map((section) => {
            const IconComponent = getIcon(section.icon);
            return (
              <Link key={section.id} href={`/docs/${section.id}`}>
                <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{section.title}</CardTitle>
                    </div>
                    <CardDescription>{section.description}</CardDescription>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {section.endpoints.length} endpoints
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
