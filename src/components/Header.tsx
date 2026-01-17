import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, Bell } from 'lucide-react';
import UserMenu from './UserMenu';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchPendingBookings = async () => {
      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('musician_id', user.id)
        .eq('status', 'pending');
      
      setPendingCount(count || 0);
    };

    fetchPendingBookings();

    const channel = supabase
      .channel('pending-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `musician_id=eq.${user.id}`,
        },
        () => {
          fetchPendingBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Music className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            JamMate
          </span>
        </Link>

        {user && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate('/calendar')}
            >
              <Bell className="h-5 w-5" />
              {pendingCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  variant="destructive"
                >
                  {pendingCount > 9 ? '9+' : pendingCount}
                </Badge>
              )}
            </Button>
            <UserMenu />
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
