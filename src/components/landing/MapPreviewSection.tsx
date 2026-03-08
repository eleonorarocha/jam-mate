import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import mapPreview from '@/assets/map-preview.jpg';

const MapPreviewSection = () => {
  const navigate = useNavigate();

  return (
    <motion.section
      className="py-16 px-4"
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.7 }}
    >
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-3xl font-bold text-center mb-4">Explore músicos perto de si</h2>
        <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
          Descubra músicos na sua zona, filtre por instrumento e nível, e encontre o parceiro ideal para a sua próxima jam.
        </p>
        <motion.div
          className="relative rounded-2xl overflow-hidden border border-border shadow-xl"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <img
            src={mapPreview}
            alt="Prévia do mapa com músicos"
            className="w-full h-[400px] object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent flex flex-col items-center justify-end pb-10 px-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-5 h-5 text-primary" />
              <span className="text-lg font-semibold">Encontre músicos na sua área</span>
            </div>
            <p className="text-sm text-muted-foreground mb-5 text-center max-w-md">
              Crie uma conta gratuita para explorar o mapa interativo, filtrar por instrumento, nível e muito mais.
            </p>
            <Button size="lg" onClick={() => navigate('/auth')}>
              Criar Conta e Explorar o Mapa
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default MapPreviewSection;
