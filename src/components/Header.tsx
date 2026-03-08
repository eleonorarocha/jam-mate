import { Link, useLocation } from 'react-router-dom';
import { Music, MapPin, MessageSquare, Calendar } from 'lucide-react';
import UserMenu from './UserMenu';
import NotificationsDropdown from './NotificationsDropdown';
import PushNotificationToggle from './PushNotificationToggle';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { cn } from '@/lib/utils';

const navLinks = [
  { to: '/map', label: 'Mapa', icon: MapPin },
  { to: '/messages', label: 'Mensagens', icon: MessageSquare },
  { to: '/calendar', label: 'Agenda', icon: Calendar },
];

const Header = () => {
  const { user } = useAuth();
  const location = useLocation();
  const unreadCount = useUnreadMessages();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-primary/15 to-accent/15 rounded-full flex items-center justify-center ring-2 ring-primary/10">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent hidden sm:inline">
              JamMate
            </span>
          </Link>

          {user && (
            <nav className="flex items-center gap-1">
              {navLinks.map(({ to, label, icon: Icon }) => {
                const isActive = location.pathname === to;
                const showBadge = to === '/messages' && unreadCount > 0;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      'relative flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden md:inline">{label}</span>
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user && (
            <>
              <PushNotificationToggle />
              <NotificationsDropdown />
              <UserMenu />
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
