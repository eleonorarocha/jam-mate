import { motion } from 'framer-motion';
import { MapPin, MessageSquare, Star } from 'lucide-react';

const features = [
  { icon: MapPin, title: 'Descubra Músicos', desc: 'Veja músicos registados no mapa próximo de si', color: 'text-primary' },
  { icon: MessageSquare, title: 'Converse e Agende', desc: 'Envie mensagens e marque jam sessions', color: 'text-accent' },
  { icon: Star, title: 'Avalie Experiências', desc: 'Deixe avaliações e construa reputação', color: 'text-primary' },
];

const FeaturesSection = () => {
  return (
    <section className="py-20 px-4 bg-secondary/30">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            Funcionalidades
          </span>
          <h2 className="text-3xl font-bold">Como funciona</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="p-8 rounded-xl bg-card border border-border text-center group hover:border-primary/30 transition-colors"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              whileHover={{ y: -6 }}
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/15 transition-colors">
                <feature.icon className={`w-7 h-7 ${feature.color}`} />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
