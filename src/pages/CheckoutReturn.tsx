import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, PartyPopper, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePro } from '@/hooks/usePro';

const CheckoutReturn = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isPro, refresh } = usePro();
  const [slow, setSlow] = useState(false);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    let attempts = 0;
    let cancelled = false;
    const tick = async () => {
      attempts += 1;
      const active = await refresh();
      if (cancelled) return;
      if (!active && attempts >= 10) setSlow(true);
    };
    const interval = setInterval(tick, 3000);
    tick();
    return () => { cancelled = true; clearInterval(interval); };
  }, [refresh]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full text-center space-y-4">
        {isPro ? (
          <>
            <PartyPopper className="w-10 h-10 mx-auto text-primary" />
            <h1 className="text-xl font-bold">Bem-vindo ao JamMate Pro!</h1>
            <p className="text-sm text-muted-foreground">A tua subscrição está ativa.</p>
            <Button onClick={() => navigate('/profile')}>Ir para o perfil</Button>
          </>
        ) : slow ? (
          <>
            <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-bold">Pagamento recebido</h1>
            <p className="text-sm text-muted-foreground">
              A ativação aparece em instantes. Podes continuar a usar a app normalmente.
            </p>
            <Button variant="outline" onClick={() => navigate('/profile')}>Continuar</Button>
          </>
        ) : (
          <>
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
            <h1 className="text-xl font-bold">A ativar a tua subscrição…</h1>
            <p className="text-sm text-muted-foreground">
              {sessionId ? 'Estamos a confirmar o pagamento.' : 'Sem informação da sessão de pagamento.'}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default CheckoutReturn;
