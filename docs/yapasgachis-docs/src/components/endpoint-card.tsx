'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Endpoint } from '@/lib/api-data';

interface EndpointCardProps {
  endpoint: Endpoint;
}

const methodColors: Record<string, string> = {
  GET: 'bg-green-500 hover:bg-green-600',
  POST: 'bg-blue-500 hover:bg-blue-600',
  PUT: 'bg-amber-500 hover:bg-amber-600',
  PATCH: 'bg-violet-500 hover:bg-violet-600',
  DELETE: 'bg-red-500 hover:bg-red-600',
};

export function EndpointCard({ endpoint }: EndpointCardProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Badge className={`${methodColors[endpoint.method]} text-white font-mono text-xs px-2 py-1`}>
            {endpoint.method}
          </Badge>
          <div className="flex-1 min-w-0">
            <CardTitle className="font-mono text-sm break-all">
              {endpoint.path}
            </CardTitle>
            <CardDescription className="mt-1">
              {endpoint.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {endpoint.auth && (
            <Badge variant="outline" className="text-xs">
              Auth requise
            </Badge>
          )}
          {endpoint.roles?.map((role) => (
            <Badge key={role} variant="secondary" className="text-xs">
              {role}
            </Badge>
          ))}
        </div>
        {endpoint.body && (
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Corps de la requete
            </h4>
            <pre className="text-xs overflow-x-auto p-3 rounded-lg bg-muted">
              <code>{JSON.stringify(endpoint.body, null, 2)}</code>
            </pre>
          </div>
        )}
        {endpoint.query && (
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Parametres de requete
            </h4>
            <pre className="text-xs overflow-x-auto p-3 rounded-lg bg-muted">
              <code>{JSON.stringify(endpoint.query, null, 2)}</code>
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
