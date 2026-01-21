import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Ban, UserCheck } from 'lucide-react';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';

interface BlockUserButtonProps {
  userId: string;
  username: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
}

const BlockUserButton = ({
  userId,
  username,
  variant = 'ghost',
  size = 'sm',
  showText = true,
}: BlockUserButtonProps) => {
  const { isBlocked, blockUser, unblockUser } = useBlockedUsers();
  const [loading, setLoading] = useState(false);
  const blocked = isBlocked(userId);

  const handleBlock = async () => {
    setLoading(true);
    await blockUser(userId);
    setLoading(false);
  };

  const handleUnblock = async () => {
    setLoading(true);
    await unblockUser(userId);
    setLoading(false);
  };

  if (blocked) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleUnblock}
        disabled={loading}
      >
        <UserCheck className="h-4 w-4" />
        {showText && <span className="ml-2">Desbloquear</span>}
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={loading}
          className="text-destructive hover:text-destructive"
        >
          <Ban className="h-4 w-4" />
          {showText && <span className="ml-2">Bloquear</span>}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bloquear {username}?</AlertDialogTitle>
          <AlertDialogDescription>
            Este utilizador não poderá enviar-lhe mensagens ou fazer pedidos de jam.
            Pode desbloquear a qualquer momento nas definições.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Bloquear
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BlockUserButton;
