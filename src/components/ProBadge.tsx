import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/** True when the given `pro_until` timestamp is in the future. */
export const isProUntil = (proUntil?: string | null): boolean =>
  !!proUntil && new Date(proUntil).getTime() > Date.now();

type Size = 'sm' | 'md' | 'lg';

const sizeStyles: Record<Size, { wrapper: string; icon: number }> = {
  sm: { wrapper: 'text-[10px] px-1.5 py-0.5 gap-0.5', icon: 10 },
  md: { wrapper: 'text-xs px-2 py-0.5 gap-1', icon: 12 },
  lg: { wrapper: 'text-sm px-2.5 py-1 gap-1', icon: 14 },
};

const iconOnlySize: Record<Size, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

interface ProBadgeProps {
  size?: Size;
  iconOnly?: boolean;
  className?: string;
}

const ProBadge = ({ size = 'md', iconOnly = false, className }: ProBadgeProps) => {
  const { wrapper, icon } = sizeStyles[size];

  const badge = (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold align-middle',
        'bg-pro text-pro-foreground shadow-sm ring-1 ring-pro-ring',
        iconOnly ? iconOnlySize[size] : wrapper,
        className,
      )}
      aria-label="Membro JamMate Pro"
    >
      <Sparkles size={icon} className="shrink-0" />
      {!iconOnly && <span>Pro</span>}
    </span>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>Membro JamMate Pro</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ProBadge;
