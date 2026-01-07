import { Badge } from '@/components/ui/badge';

export default function AuthenticationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Authentification</h1>
        <p className="text-muted-foreground mt-2">
          L&apos;API YapaGachis utilise des tokens JWT (JSON Web Token) pour l&apos;authentification.
        </p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Methodes d&apos;authentification</h2>
        <div className="space-y-4">
          <div className="border-l-4 border-primary pl-4">
            <h3 className="font-semibold">1. Telephone + Mot de passe</h3>
            <p className="text-sm text-muted-foreground">
              Connexion directe avec numero de telephone et mot de passe. Pas d&apos;OTP requis.
            </p>
          </div>
          <div className="border-l-4 border-primary pl-4">
            <h3 className="font-semibold">2. Email + OTP</h3>
            <p className="text-sm text-muted-foreground">
              Connexion en 2 etapes: verification des identifiants puis validation de l&apos;OTP envoye par email.
            </p>
          </div>
          <div className="border-l-4 border-primary pl-4">
            <h3 className="font-semibold">3. Google OAuth</h3>
            <p className="text-sm text-muted-foreground">
              Connexion avec un compte Google. L&apos;application mobile envoie le token ID Google.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Utilisation du token</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Incluez le token dans le header Authorization de chaque requete protegee:
        </p>
        <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
          <code>{`Authorization: Bearer <access_token>`}</code>
        </pre>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Tokens</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <Badge className="bg-green-500 mt-0.5">Access Token</Badge>
            <div>
              <p className="text-sm">Duree de vie: 15 minutes</p>
              <p className="text-sm text-muted-foreground">
                Utilise pour authentifier les requetes API
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Badge className="bg-blue-500 mt-0.5">Refresh Token</Badge>
            <div>
              <p className="text-sm">Duree de vie: 7 jours</p>
              <p className="text-sm text-muted-foreground">
                Utilise pour obtenir un nouveau access token via POST /auth/refresh-token
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Flux de connexion telephone</h2>
        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
          <code>{`POST /api/v1/auth/login
Content-Type: application/json

{
  "phoneNumber": "+221771234567",
  "password": "MonMotDePasse123!"
}

// Reponse
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}`}</code>
        </pre>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Flux de connexion email (2 etapes)</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Etape 1: Envoi OTP</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
              <code>{`POST /api/v1/auth/login/email
{
  "email": "user@example.com",
  "password": "MonMotDePasse123!"
}

// Reponse: OTP envoye par email`}</code>
            </pre>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Etape 2: Verification OTP</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
              <code>{`POST /api/v1/auth/verify-email-otp
{
  "email": "user@example.com",
  "code": "123456",
  "purpose": "login"
}

// Reponse: tokens JWT`}</code>
            </pre>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Rafraichir le token</h2>
        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
          <code>{`POST /api/v1/auth/refresh-token
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

// Reponse
{
  "success": true,
  "data": {
    "accessToken": "nouveau_access_token",
    "refreshToken": "nouveau_refresh_token"
  }
}`}</code>
        </pre>
      </div>
    </div>
  );
}
