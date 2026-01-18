import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const PushNotificationToggle = () => {
  const { isSupported, isSubscribed, permission, requestPermission } = usePushNotifications();

  if (!isSupported) {
    return null;
  }

  const handleClick = () => {
    if (permission === 'default') {
      requestPermission();
    }
  };

  const getIcon = () => {
    if (permission === 'denied') {
      return <BellOff className="h-5 w-5 text-muted-foreground" />;
    }
    if (isSubscribed) {
      return <BellRing className="h-5 w-5 text-primary" />;
    }
    return <Bell className="h-5 w-5" />;
  };

  const getTooltipText = () => {
    if (permission === 'denied') {
      return 'Notificações bloqueadas - ative nas definições do navegador';
    }
    if (isSubscribed) {
      return 'Notificações push ativas';
    }
    return 'Ativar notificações push';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            disabled={permission === 'denied'}
            className={isSubscribed ? 'text-primary' : ''}
          >
            {getIcon()}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PushNotificationToggle;
