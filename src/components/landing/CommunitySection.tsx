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
      className="py-20 px-4"
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
          className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center mx-auto mb-6"
        >
          <Users className="w-8 h-8 text-accent" />
        </motion.div>
        <h2 className="text-3xl font-bold mb-4">Comunidade de Músicos</h2>
        <p className="text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
          Junte-se a uma comunidade vibrante de músicos apaixonados.
          Partilhe experiências, aprenda com outros e cresça musicalmente.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              className="p-5 bg-card rounded-xl border border-border hover:border-accent/30 transition-colors"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.12 }}
              whileHover={{ y: -4 }}
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <item.icon className="w-5 h-5 text-accent" />
              </div>
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
