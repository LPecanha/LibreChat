import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

function copy(text: string, setCopied: (v: boolean) => void) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  });
}

function CopyableCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 rounded-md border border-border bg-muted px-3 py-1.5 text-xs text-text-primary break-all">
        {value}
      </code>
      <button
        onClick={() => copy(value, setCopied)}
        className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-text-primary"
      >
        {copied ? 'Copiado!' : 'Copiar'}
      </button>
    </div>
  );
}

export function Settings() {
  const extUrl = `${window.location.protocol}//${window.location.hostname}:3092`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Sistema</h2>
        <p className="text-sm text-muted-foreground">Referência de configuração da instância</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">URL do admin-ext</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">Configure como <code className="text-xs">EXT_URL</code> no .env do LibreChat para habilitar a integração.</p>
          <CopyableCode value={extUrl} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Variáveis .env necessárias</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-surface-secondary p-4 space-y-1 text-xs text-muted-foreground font-mono">
            <p>MONGO_URI=mongodb://mongodb:27017/LibreChat</p>
            <p>JWT_SECRET=&lt;mesmo valor do LibreChat&gt;</p>
            <p>EXT_URL=http://admin-ext:3092</p>
            <p>STRIPE_SECRET_KEY=sk_...</p>
            <p>STRIPE_WEBHOOK_SECRET=whsec_...</p>
            <p>PAGARME_API_KEY=ak_...</p>
            <p>PAGARME_WEBHOOK_SECRET=...</p>
            <p>CREDIT_SCHEDULER_CRON=0 * * * *</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Endpoints de webhook</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-text-primary">Stripe</p>
            <CopyableCode value={`${extUrl}/ext/payment/stripe/webhook`} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-text-primary">Pagar.me</p>
            <CopyableCode value={`${extUrl}/ext/payment/pagarme/webhook`} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
