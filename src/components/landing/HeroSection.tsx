import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Music } from 'lucide-react';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="pt-32 pb-16 px-4">
      <div className="container mx-auto text-center space-y-8 max-w-4xl">
        <motion.div
          className="flex justify-center mb-8"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        >
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
            <Music className="w-12 h-12 text-primary" />
          </div>
        </motion.div>

        <motion.h1
          className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          JamMate
        </motion.h1>

        <motion.p
          className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          Encontre músicos perto de si e organize jam sessions incríveis
        </motion.p>

        <motion.div
          className="flex gap-4 justify-center pt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <Button size="lg" onClick={() => navigate('/auth')}>
            Começar Agora
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
            Já tenho conta
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
