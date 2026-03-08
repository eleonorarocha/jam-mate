import { motion } from 'framer-motion';
import { MapPin, MessageSquare, Star } from 'lucide-react';

const features = [
  { icon: MapPin, title: 'Descubra Músicos', desc: 'Veja músicos registados no mapa próximo de si' },
  { icon: MessageSquare, title: 'Converse e Agende', desc: 'Envie mensagens e marque jam sessions' },
  { icon: Star, title: 'Avalie Experiências', desc: 'Deixe avaliações e construa reputação' },
];

const FeaturesSection = () => {
  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <motion.h2
          className="text-3xl font-bold text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          Como funciona
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="p-6 rounded-lg bg-card border border-border text-center"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              whileHover={{ y: -6, boxShadow: '0 12px 24px -8px hsl(var(--primary) / 0.15)' }}
            >
              <feature.icon className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
