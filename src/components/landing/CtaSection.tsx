import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const CtaSection = () => {
  const navigate = useNavigate();

  return (
    <motion.section
      className="py-16 px-4"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6 }}
    >
      <div className="container mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold mb-4">Pronto para tocar?</h2>
        <p className="text-muted-foreground mb-8">
          Junte-se a centenas de músicos que já encontraram parceiros para jam sessions
        </p>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
          <Button size="lg" onClick={() => navigate('/auth')}>
            Criar Conta Gratuita
          </Button>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default CtaSection;
