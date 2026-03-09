import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, MessageSquare, Star, Calendar, LogOut, MapPin, Image, Heart, UserPlus, LogIn, Shield } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { supabase } from '@/integrations/supabase/client';

const UserMenu = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const unreadCount = useUnreadMessages();
  const { isAdmin } = useAdmin();
  const [profile, setProfile] = useState<{ username: string; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setProfile(data);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = () => {
    if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Non-authenticated user menu
  if (!user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative h-10 w-10 rounded-full ring-2 ring-border hover:ring-primary transition-all focus:outline-none focus:ring-primary">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-muted text-muted-foreground">
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm text-muted-foreground">Bem-vindo ao JamMate</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/auth')} className="cursor-pointer">
            <UserPlus className="mr-2 h-4 w-4" />
            <span>Criar conta</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/auth')} className="cursor-pointer">
            <LogIn className="mr-2 h-4 w-4" />
            <span>Entrar</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative h-10 w-10 rounded-full ring-2 ring-border hover:ring-primary transition-all focus:outline-none focus:ring-primary">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.username || 'User'} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profile?.username || 'Utilizador'}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/map')} className="cursor-pointer">
          <MapPin className="mr-2 h-4 w-4" />
          <span>Explorar Mapa</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>Meu Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/messages')} className="cursor-pointer">
          <MessageSquare className="mr-2 h-4 w-4" />
          <span>Mensagens</span>
          {unreadCount > 0 && (
            <span className="ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/calendar')} className="cursor-pointer">
          <Calendar className="mr-2 h-4 w-4" />
          <span>Agenda</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/ratings')} className="cursor-pointer">
          <Star className="mr-2 h-4 w-4" />
          <span>Avaliações</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/gallery')} className="cursor-pointer">
          <Image className="mr-2 h-4 w-4" />
          <span>Galeria</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/favorites')} className="cursor-pointer">
          <Heart className="mr-2 h-4 w-4" />
          <span>Favoritos</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
            <Shield className="mr-2 h-4 w-4" />
            <span>Administração</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Configurações</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
