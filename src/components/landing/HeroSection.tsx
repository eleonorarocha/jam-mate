import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Music, Guitar, Headphones, Mic2 } from 'lucide-react';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="pt-32 pb-16 px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/8 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />

      {/* Floating musical icons */}
      <motion.div
        animate={{ y: [0, -12, 0], rotate: [0, 8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-40 left-[10%] text-primary/10 hidden md:block"
      >
        <Guitar className="w-16 h-16" />
      </motion.div>
      <motion.div
        animate={{ y: [0, 10, 0], rotate: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute top-48 right-[12%] text-accent/15 hidden md:block"
      >
        <Headphones className="w-14 h-14" />
      </motion.div>
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-20 left-[15%] text-primary/8 hidden md:block"
      >
        <Mic2 className="w-10 h-10" />
      </motion.div>

      <div className="container mx-auto text-center space-y-8 max-w-4xl relative z-10">
        <motion.div
          className="flex justify-center mb-8"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        >
          <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center ring-4 ring-primary/10">
            <Music className="w-12 h-12 text-primary" />
          </div>
        </motion.div>

        <motion.h1
          className="text-5xl md:text-7xl font-bold"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            JamMate
          </span>
        </motion.h1>

        <motion.p
          className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
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
          <Button
            size="lg"
            onClick={() => navigate('/auth')}
            className="h-12 px-8 text-base font-semibold bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] hover:opacity-90 transition-opacity"
            style={{ boxShadow: 'var(--shadow-primary)' }}
          >
            Começar Agora
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="h-12 px-8 text-base font-semibold">
            Já tenho conta
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
