'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Copy, Check, Lock, ChevronDown, ChevronUp, Info, AlertCircle } from 'lucide-react';
import type { Endpoint } from '@/lib/api-data';

interface EndpointCardProps {
  endpoint: Endpoint;
}

const methodColors: Record<string, { bg: string; text: string; border: string }> = {
  GET: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  POST: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
  PUT: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  PATCH: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/30' },
  DELETE: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/30' },
};

const methodBadgeColors: Record<string, string> = {
  GET: 'bg-emerald-500 hover:bg-emerald-600',
  POST: 'bg-blue-500 hover:bg-blue-600',
  PUT: 'bg-amber-500 hover:bg-amber-600',
  PATCH: 'bg-violet-500 hover:bg-violet-600',
  DELETE: 'bg-red-500 hover:bg-red-600',
};

export function EndpointCard({ endpoint }: EndpointCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const colors = methodColors[endpoint.method];
  const fullPath = `https://api.yapasgachis.com/api/v1${endpoint.path}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasDetails = endpoint.body || endpoint.query || endpoint.responseExample || endpoint.notes;

  return (
    <Card className={`mb-4 border-l-4 ${colors.border} transition-all hover:shadow-md`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Badge className={`${methodBadgeColors[endpoint.method]} text-white font-mono text-xs px-2.5 py-1 font-semibold`}>
            {endpoint.method}
          </Badge>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="font-mono text-sm break-all">
                {endpoint.path}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </Button>
            </div>
            <CardDescription className="mt-1.5 text-sm">
              {endpoint.description}
            </CardDescription>
            {endpoint.details && (
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                {endpoint.details}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          {endpoint.auth ? (
            <Badge variant="outline" className="text-xs gap-1 border-amber-500/50 text-amber-600 dark:text-amber-400">
              <Lock className="h-3 w-3" />
              Authentification requise
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/50">
              Public
            </Badge>
          )}
          {endpoint.roles?.map((role) => (
            <Badge key={role} variant="secondary" className="text-xs font-medium">
              {role}
            </Badge>
          ))}
        </div>
      </CardHeader>

      {hasDetails && (
        <>
          <Separator />
          <CardContent className="pt-4">
            {!expanded ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(true)}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className="h-4 w-4 mr-2" />
                Voir les details
              </Button>
            ) : (
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(false)}
                  className="w-full text-muted-foreground hover:text-foreground mb-2"
                >
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Masquer les details
                </Button>

                {endpoint.notes && endpoint.notes.length > 0 && (
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        {endpoint.notes.map((note, i) => (
                          <p key={i} className="text-xs text-blue-700 dark:text-blue-300">{note}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {endpoint.body && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Corps de la requete (Body)
                    </h4>
                    <div className="relative">
                      <pre className="text-xs overflow-x-auto p-4 rounded-lg bg-slate-950 text-slate-50 dark:bg-slate-900">
                        <code>{JSON.stringify(endpoint.body, null, 2)}</code>
                      </pre>
                    </div>
                  </div>
                )}

                {endpoint.query && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                      Parametres de requete (Query)
                    </h4>
                    <div className="rounded-lg border bg-muted/50 p-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 font-semibold">Parametre</th>
                            <th className="text-left py-2 font-semibold">Exemple</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(endpoint.query).map(([key, value]) => (
                            <tr key={key} className="border-b last:border-0">
                              <td className="py-2 font-mono text-blue-600 dark:text-blue-400">{key}</td>
                              <td className="py-2 text-muted-foreground">{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {endpoint.responseExample && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Exemple de reponse
                    </h4>
                    <pre className="text-xs overflow-x-auto p-4 rounded-lg bg-slate-950 text-slate-50 dark:bg-slate-900">
                      <code>{JSON.stringify(endpoint.responseExample, null, 2)}</code>
                    </pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
}
