import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck, Ban } from 'lucide-react';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';

const BlockedUsersList = () => {
  const { blockedUsers, loading, unblockUser } = useBlockedUsers();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Utilizadores Bloqueados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ban className="h-5 w-5" />
          Utilizadores Bloqueados
        </CardTitle>
        <CardDescription>
          Estes utilizadores não podem contactá-lo nem fazer pedidos de jam.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {blockedUsers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Não tem utilizadores bloqueados.
          </p>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map((block) => (
              <div
                key={block.id}
                className="flex items-center justify-between p-3 rounded-lg bg-accent/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={block.profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {block.profile?.username?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{block.profile?.username || 'Utilizador'}</p>
                    <p className="text-sm text-muted-foreground">
                      {block.profile?.instrument || 'Instrumento desconhecido'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unblockUser(block.blocked_id)}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Desbloquear
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BlockedUsersList;
