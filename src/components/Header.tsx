import { Link } from 'react-router-dom';
import { Music } from 'lucide-react';
import UserMenu from './UserMenu';
import NotificationsDropdown from './NotificationsDropdown';
import PushNotificationToggle from './PushNotificationToggle';
import { useAuth } from '@/hooks/useAuth';

const Header = () => {
  const { user } = useAuth();

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
            <PushNotificationToggle />
            <NotificationsDropdown />
            <UserMenu />
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
