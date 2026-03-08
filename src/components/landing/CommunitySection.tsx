import { motion } from 'framer-motion';
import { Users, Calendar, Star, Music } from 'lucide-react';

const items = [
  { icon: Calendar, title: 'Agende Jam Sessions', desc: 'Organize encontros musicais facilmente' },
  { icon: Star, title: 'Avaliações Verificadas', desc: 'Sistema de avaliação detalhado' },
  { icon: Music, title: 'Galeria de Jams', desc: 'Partilhe fotos e gravações' },
];

const CommunitySection = () => {
  return (
    <motion.section
      className="py-16 px-4"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6 }}
    >
      <div className="container mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <Users className="w-12 h-12 text-primary mx-auto mb-6" />
        </motion.div>
        <h2 className="text-3xl font-bold mb-4">Comunidade de Músicos</h2>
        <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
          Junte-se a uma comunidade vibrante de músicos apaixonados.
          Partilhe experiências, aprenda com outros e cresça musicalmente.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              className="p-4 bg-card rounded-lg border"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.12 }}
              whileHover={{ y: -4 }}
            >
              <item.icon className="w-6 h-6 text-primary mb-2 mx-auto" />
              <h4 className="font-medium mb-1">{item.title}</h4>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default CommunitySection;
