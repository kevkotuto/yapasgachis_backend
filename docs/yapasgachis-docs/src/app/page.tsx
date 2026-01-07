import Link from 'next/link';
import { ArrowRight, Book, Code, Download, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">Y</span>
            </div>
            <span className="font-semibold text-xl">YapaGachis</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/docs" className="text-sm font-medium hover:text-primary">
              Documentation
            </Link>
            <Button asChild size="sm">
              <Link href="/docs">
                Commencer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
            API <span className="text-primary">YapaGachis</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Documentation complete de l&apos;API de la plateforme anti-gaspillage alimentaire pan-africaine.
            Integrez facilement les fonctionnalites YapaGachis dans vos applications.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button asChild size="lg">
              <Link href="/docs">
                <Book className="mr-2 h-5 w-5" />
                Lire la documentation
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="https://api.yapasgachis.com/api/v1" target="_blank" rel="noopener noreferrer">
                <Zap className="mr-2 h-5 w-5" />
                Base URL API
              </a>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-16">
          <Card>
            <CardHeader>
              <Code className="h-10 w-10 text-primary mb-2" />
              <CardTitle>RESTful API</CardTitle>
              <CardDescription>
                API REST complete avec endpoints bien structures pour toutes les fonctionnalites de la plateforme.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Zap className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Authentification JWT</CardTitle>
              <CardDescription>
                Systeme d&apos;authentification securise avec tokens JWT, OTP par SMS/Email et OAuth Google.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Download className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Collection Postman</CardTitle>
              <CardDescription>
                Importez notre collection Postman complete pour tester rapidement tous les endpoints.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="bg-card rounded-lg border p-8 mb-16">
          <h2 className="text-2xl font-bold mb-4">Demarrage rapide</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold">Base URL</h3>
                <code className="text-sm bg-muted px-2 py-1 rounded">https://api.yapasgachis.com/api/v1</code>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold">Authentification</h3>
                <p className="text-muted-foreground text-sm">
                  Utilisez le header <code className="bg-muted px-1 rounded">Authorization: Bearer &lt;token&gt;</code>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold">Format</h3>
                <p className="text-muted-foreground text-sm">
                  Toutes les requetes et reponses sont en JSON
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Pret a commencer?</h2>
          <p className="text-muted-foreground mb-6">
            Explorez notre documentation complete pour integrer YapaGachis dans votre application.
          </p>
          <Button asChild size="lg">
            <Link href="/docs">
              Explorer la documentation
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </main>

      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>&copy; 2024 YapaGachis. Plateforme anti-gaspillage alimentaire pan-africaine.</p>
        </div>
      </footer>
    </div>
  );
}
