import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import CalendarPanel from '@/components/CalendarPanel';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';

const CalendarPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
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
      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium mb-3">
              <Calendar className="w-3 h-3" />
              Agenda
            </div>
            <h1 className="text-3xl font-bold">Agenda</h1>
            <p className="text-muted-foreground text-sm mt-1">Veja e gerencie as suas jam sessions agendadas</p>
          </motion.div>
          <CalendarPanel onClose={() => navigate('/map')} embedded />
        </div>
      </main>
    </div>
  );
};

export default CalendarPage;
