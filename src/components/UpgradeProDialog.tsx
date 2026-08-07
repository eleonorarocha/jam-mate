import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, Loader2, ArrowLeft, PartyPopper } from 'lucide-react';
import { FREE_LIMITS, PRO_LIMITS, usePro } from '@/hooks/usePro';
import { PRO_PLANS, isPaymentsConfigured, isTestMode } from '@/lib/stripe';
import StripeEmbeddedCheckout from '@/components/StripeEmbeddedCheckout';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Stage = 'plans' | 'checkout' | 'activating' | 'done';

const UpgradeProDialog = ({ open, onOpenChange }: Props) => {
  const { isPro, refresh } = usePro();
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>('plans');
  const [priceId, setPriceId] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!open) {
      setStage('plans');
      setPriceId(null);
      setSlow(false);
    }
  }, [open]);

  // Stripe redirects the embedded checkout to the return URL; we detect the
  // payment on the way back and wait for the webhook to activate Pro.
  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      setStage('activating');
      params.delete('checkout');
      params.delete('session_id');
      const qs = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    }
  }, [open]);

  // Realtime handles the happy path; poll as a safety net for ~30s.
  useEffect(() => {
    if (stage !== 'activating') return;
    let cancelled = false;
    let attempts = 0;

    const tick = async () => {
      attempts += 1;
      const active = await refresh();
      if (cancelled) return;
      if (active) {
        setStage('done');
      } else if (attempts >= 10) {
        setSlow(true);
      }
    };

    const interval = setInterval(tick, 3000);
    tick();
    return () => { cancelled = true; clearInterval(interval); };
  }, [stage, refresh]);

  useEffect(() => {
    if (stage === 'activating' && isPro) setStage('done');
  }, [isPro, stage]);

  const startCheckout = (id: string) => {
    if (!isPaymentsConfigured()) {
      toast({
        title: 'Pagamentos indisponíveis',
        description: 'A configuração de pagamentos ainda não está concluída.',
        variant: 'destructive',
      });
      return;
    }
    setPriceId(id);
    setStage('checkout');
  };

  const returnUrl = `${window.location.origin}${window.location.pathname}?checkout=success&session_id={CHECKOUT_SESSION_ID}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            JamMate Pro
          </DialogTitle>
          <DialogDescription>
            {stage === 'done'
              ? 'A tua subscrição está ativa.'
              : 'Mostra mais do teu som e destaca-te no mapa.'}
          </DialogDescription>
        </DialogHeader>

        {stage === 'plans' && (
          <>
            <div className="space-y-3 py-2">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="text-sm font-semibold">Com Pro:</div>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    Até <strong className="text-foreground">{PRO_LIMITS.maxSnippets} snippets</strong> no perfil
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    Snippets até <strong className="text-foreground">{PRO_LIMITS.maxSeconds}s</strong> cada
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    Destaque no mapa e nos resultados
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    Selo Pro no teu perfil
                  </li>
                </ul>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {PRO_PLANS.map((plan) => (
                  <button
                    key={plan.priceId}
                    onClick={() => startCheckout(plan.priceId)}
                    className={`text-left rounded-lg border p-4 transition-colors hover:border-primary ${
                      plan.highlight ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{plan.label}</span>
                      {plan.highlight && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Melhor valor
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-2xl font-bold">
                      {plan.price}
                      <span className="text-sm font-normal text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.note}</p>
                  </button>
                ))}
              </div>

              <div className="text-xs text-muted-foreground">
                Plano grátis: {FREE_LIMITS.maxSnippets} snippet de {FREE_LIMITS.maxSeconds}s.
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
                Fechar
              </Button>
            </DialogFooter>
          </>
        )}

        {stage === 'checkout' && priceId && (
          <div className="space-y-3">
            {isTestMode() && (
              <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Modo de teste — usa o cartão <strong className="text-foreground">4242 4242 4242 4242</strong>,
                validade futura e qualquer CVC.
              </div>
            )}
            <StripeEmbeddedCheckout
              priceId={priceId}
              returnUrl={returnUrl}
              onError={(message) => {
                toast({ title: 'Erro no pagamento', description: message, variant: 'destructive' });
                setStage('plans');
              }}
            />
            <Button variant="ghost" onClick={() => setStage('plans')} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos planos
            </Button>
          </div>
        )}

        {stage === 'activating' && (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm font-medium">A ativar a tua subscrição…</p>
            <p className="text-xs text-muted-foreground">
              {slow
                ? 'O pagamento foi recebido. A ativação aparece em instantes — podes fechar esta janela.'
                : 'Estamos a confirmar o pagamento. Demora só alguns segundos.'}
            </p>
            {slow && (
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            )}
          </div>
        )}

        {stage === 'done' && (
          <div className="py-8 text-center space-y-3">
            <PartyPopper className="w-8 h-8 mx-auto text-primary" />
            <p className="text-sm font-medium">Bem-vindo ao JamMate Pro!</p>
            <p className="text-xs text-muted-foreground">
              Já podes carregar {PRO_LIMITS.maxSnippets} snippets de até {PRO_LIMITS.maxSeconds}s.
            </p>
            <Button onClick={() => onOpenChange(false)}>Continuar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeProDialog;
