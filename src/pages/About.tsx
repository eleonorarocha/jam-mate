import { useState } from 'react';
import { motion } from 'framer-motion';
import { Music, MapPin, Users, Star, Heart, MessageSquare, ArrowLeft, Send, CheckCircle, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const values = [
  {
    icon: MapPin,
    title: 'Conexão Local',
    desc: 'Encontra músicos perto de ti através do nosso mapa interativo. A música é melhor quando partilhada ao vivo.',
  },
  {
    icon: Users,
    title: 'Comunidade',
    desc: 'Uma comunidade acolhedora onde músicos de todos os níveis se encontram, aprendem e crescem juntos.',
  },
  {
    icon: Star,
    title: 'Confiança',
    desc: 'Sistema de avaliações detalhado para que possas escolher os melhores parceiros musicais com segurança.',
  },
  {
    icon: Heart,
    title: 'Paixão pela Música',
    desc: 'Criado por músicos, para músicos. Cada funcionalidade foi pensada para facilitar jam sessions incríveis.',
  },
];

const stats = [
  { label: 'Instrumentos suportados', value: '20+' },
  { label: 'Funcionalidades', value: '15+' },
  { label: 'Critérios de avaliação', value: '4' },
];

const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => onChange(star)}
        className="transition-colors"
      >
        <Star
          className={`w-6 h-6 ${star <= value ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`}
        />
      </button>
    ))}
  </div>
);

const About = () => {
  const { user } = useAuth();
  const [category, setCategory] = useState('suggestion');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Precisas de estar autenticado para enviar feedback.');
      return;
    }
    const trimmed = message.trim();
    if (!trimmed || trimmed.length > 2000) {
      toast.error('A mensagem deve ter entre 1 e 2000 caracteres.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('feedback').insert({
      user_id: user.id,
      category,
      rating: rating || null,
      message: trimmed,
    });
    setSubmitting(false);
    if (error) {
      toast.error('Erro ao enviar feedback. Tenta novamente.');
    } else {
      setSubmitted(true);
      setMessage('');
      setRating(0);
      setCategory('suggestion');
      toast.success('Obrigado pelo teu feedback!');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20 pb-16">
        {/* Hero */}
        <section className="container mx-auto px-4 max-w-4xl text-center py-16">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-6"
          >
            <Music className="w-10 h-10 text-primary" />
          </motion.div>

          <motion.h1
            className="text-4xl md:text-5xl font-bold mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Sobre o{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              JamMate
            </span>
          </motion.h1>

          <motion.p
            className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            O JamMate é a plataforma que liga músicos na mesma cidade para
            criarem jam sessions memoráveis. Quer sejas iniciante ou
            profissional, aqui encontras o parceiro ideal.
          </motion.p>
        </section>

        {/* Stats */}
        <section className="container mx-auto px-4 max-w-3xl mb-16">
          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center p-4 rounded-xl bg-card border border-border"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <p className="text-3xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Mission */}
        <section className="container mx-auto px-4 max-w-4xl mb-16">
          <motion.div
            className="bg-card border border-border rounded-2xl p-8 md:p-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold mb-4">A Nossa Missão</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Acreditamos que a música une pessoas. O JamMate nasceu da
              frustração de encontrar músicos compatíveis na mesma zona — seja
              para uma jam casual num fim de semana ou para formar uma banda.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              A nossa missão é eliminar barreiras e tornar cada cidade num palco
              aberto, onde qualquer músico pode encontrar o parceiro certo em
              minutos. Com filtros inteligentes, agendamento integrado e
              avaliações verificadas, fazemos da colaboração musical algo simples
              e seguro.
            </p>
          </motion.div>
        </section>

        {/* Values */}
        <section className="container mx-auto px-4 max-w-4xl mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Os Nossos Valores</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                className="p-6 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                whileHover={{ y: -4 }}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <v.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{v.title}</h3>
                <p className="text-sm text-muted-foreground">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="container mx-auto px-4 max-w-4xl mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Como Funciona</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '1', icon: MapPin, title: 'Explora o Mapa', desc: 'Procura músicos na tua zona com filtros por instrumento, nível e disponibilidade.' },
              { step: '2', icon: MessageSquare, title: 'Envia uma Proposta', desc: 'Agenda uma jam session diretamente pela plataforma com data e hora.' },
              { step: '3', icon: Star, title: 'Avalia a Experiência', desc: 'Após a jam, avalia o teu parceiro em 4 critérios para ajudar a comunidade.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                className="relative p-6 bg-card rounded-xl border border-border text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {item.step}
                </span>
                <item.icon className="w-8 h-8 text-primary mx-auto mt-3 mb-3" />
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Feedback Form */}
        <section className="container mx-auto px-4 max-w-2xl mb-16">
          <motion.div
            className="bg-card border border-border rounded-2xl p-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold mb-2">Envia-nos o teu Feedback</h2>
            <p className="text-muted-foreground mb-6">
              A tua opinião ajuda-nos a melhorar o JamMate. Partilha sugestões, reporta problemas ou avalia a app.
            </p>

            {!user ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">Precisas de estar autenticado para enviar feedback.</p>
                <Button asChild>
                  <Link to="/auth">Entrar / Criar conta</Link>
                </Button>
              </div>
            ) : submitted ? (
              <motion.div
                className="text-center py-8"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <CheckCircle className="w-12 h-12 text-primary mx-auto mb-3" />
                <p className="font-semibold text-lg mb-1">Obrigado!</p>
                <p className="text-muted-foreground mb-4">O teu feedback foi enviado com sucesso.</p>
                <Button variant="outline" onClick={() => setSubmitted(false)}>
                  Enviar outro
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suggestion">💡 Sugestão</SelectItem>
                      <SelectItem value="bug">🐛 Reportar problema</SelectItem>
                      <SelectItem value="review">⭐ Avaliar a app</SelectItem>
                      <SelectItem value="other">💬 Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {category === 'review' && (
                  <div>
                    <Label>Avaliação da app</Label>
                    <div className="mt-1.5">
                      <StarRating value={rating} onChange={setRating} />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="feedback-message">Mensagem</Label>
                  <Textarea
                    id="feedback-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escreve aqui o teu feedback..."
                    className="mt-1.5 min-h-[120px]"
                    maxLength={2000}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {message.length}/2000
                  </p>
                </div>

                <Button type="submit" disabled={submitting || !message.trim()} className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? 'A enviar...' : 'Enviar Feedback'}
                </Button>
              </form>
            )}
          </motion.div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 max-w-2xl text-center">
          <motion.div
            className="bg-primary/5 border border-primary/20 rounded-2xl p-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl font-bold mb-2">Pronto para encontrar o teu JamMate?</h2>
            <p className="text-muted-foreground mb-6">
              Junta-te a uma comunidade de músicos apaixonados.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <ArrowLeft className="w-4 h-4" />
              Explorar o Mapa
            </Link>
          </motion.div>
        </section>
      </main>
    </div>
  );
};

export default About;
