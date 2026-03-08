import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import ProfilePanel from '@/components/ProfilePanel';
import { motion } from 'framer-motion';
import { Music, Guitar, Headphones } from 'lucide-react';

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-xl mx-auto">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8 text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium mb-3">
              <Music className="w-3 h-3" />
              O teu espaço
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Meu Perfil
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie as suas informações e mostre quem é como músico
            </p>
          </motion.div>

          {/* Decorative floating icons */}
          <div className="relative">
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -left-8 top-4 text-primary/10 hidden lg:block"
            >
              <Guitar className="w-12 h-12" />
            </motion.div>
            <motion.div
              animate={{ y: [0, 8, 0], rotate: [0, -5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute -right-8 top-20 text-accent/20 hidden lg:block"
            >
              <Headphones className="w-10 h-10" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-card rounded-xl border border-border shadow-sm p-6 sm:p-8"
            >
              <ProfilePanel onClose={() => navigate('/map')} embedded />
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
