import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ExternalLink, Loader2 } from 'lucide-react';
import { usePro } from '@/hooks/usePro';
import UpgradeProDialog from '@/components/UpgradeProDialog';
import { supabase } from '@/integrations/supabase/client';
import { getStripeEnvironment, isPaymentsConfigured } from '@/lib/stripe';
import { useToast } from '@/hooks/use-toast';

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

const SubscriptionSettings = () => {
  const { isPro, loading, subscription } = usePro();
  const { toast } = useToast();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [opening, setOpening] = useState(false);

  const planLabel = subscription?.price_id === 'pro_yearly' ? 'Anual (39,99 €/ano)' : 'Mensal (4,99 €/mês)';

  const openPortal = async () => {
    if (!isPaymentsConfigured()) {
      toast({ title: 'Pagamentos indisponíveis', description: 'A configuração de pagamentos ainda não está concluída.', variant: 'destructive' });
      return;
    }
    setOpening(true);
    const { data, error } = await supabase.functions.invoke('customer-portal', {
      body: { environment: getStripeEnvironment(), returnUrl: window.location.href },
    });
    setOpening(false);

    if (error || !data?.url) {
      toast({
        title: 'Erro',
        description: data?.error || error?.message || 'Não foi possível abrir o portal de subscrição.',
        variant: 'destructive',
      });
      return;
    }
    window.open(data.url as string, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          Subscrição
          {isPro && <Badge className="ml-1">Pro</Badge>}
        </CardTitle>
        <CardDescription>
          {isPro ? 'Gere o teu plano JamMate Pro' : 'Desbloqueia mais snippets, destaque no mapa e o selo Pro'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : isPro ? (
          <>
            <div className="text-sm space-y-1">
              <div><span className="text-muted-foreground">Plano:</span> {planLabel}</div>
              <div>
                <span className="text-muted-foreground">
                  {subscription?.cancel_at_period_end ? 'Acesso até:' : 'Renova a:'}
                </span>{' '}
                {formatDate(subscription?.current_period_end ?? null)}
              </div>
            </div>
            <Button onClick={openPortal} disabled={opening} variant="outline">
              {opening ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-2" />}
              Gerir subscrição
            </Button>
            <p className="text-xs text-muted-foreground">
              O portal abre num separador novo (não funciona dentro da pré-visualização em janela).
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Estás no plano grátis: 1 snippet de 30s.
            </p>
            <Button onClick={() => setUpgradeOpen(true)}>
              <Sparkles className="w-4 h-4 mr-2" />
              Ver planos Pro
            </Button>
          </>
        )}
      </CardContent>
      <UpgradeProDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </Card>
  );
};

export default SubscriptionSettings;
