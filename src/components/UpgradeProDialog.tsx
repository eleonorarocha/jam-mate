import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Check } from 'lucide-react';
import { FREE_LIMITS, PRO_LIMITS } from '@/hooks/usePro';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UpgradeProDialog = ({ open, onOpenChange }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            JamMate Pro
          </DialogTitle>
          <DialogDescription>
            Mostra mais do teu som e destaca-te no mapa.
          </DialogDescription>
        </DialogHeader>

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
                Mais destaque no mapa (em breve)
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                Badge de músico verificado (em breve)
              </li>
            </ul>
          </div>

          <div className="text-xs text-muted-foreground">
            Plano grátis: {FREE_LIMITS.maxSnippets} snippet de {FREE_LIMITS.maxSeconds}s.
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button disabled className="w-full">
            <Sparkles className="w-4 h-4 mr-2" />
            Em breve — checkout a chegar
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeProDialog;
