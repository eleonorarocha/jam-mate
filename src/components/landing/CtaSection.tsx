import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Music } from 'lucide-react';

const CtaSection = () => {
  const navigate = useNavigate();

  return (
    <motion.section
      className="py-20 px-4 relative overflow-hidden"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="container mx-auto max-w-2xl text-center relative z-10">
        <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center mx-auto mb-6">
          <Music className="w-6 h-6 text-accent" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Pronto para tocar?</h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Junte-se a centenas de músicos que já encontraram parceiros para jam sessions
        </p>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
          <Button
            size="lg"
            onClick={() => navigate('/auth')}
            className="h-12 px-8 text-base font-semibold bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] hover:opacity-90 transition-opacity"
            style={{ boxShadow: 'var(--shadow-primary)' }}
          >
            Criar Conta Gratuita
          </Button>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default CtaSection;
