import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Music, Guitar, Headphones, Mic2, Piano, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';

const signUpSchema = z.object({
  firstName: z.string().min(1, 'Nome é obrigatório').max(50, 'Nome muito longo'),
  lastName: z.string().min(1, 'Sobrenome é obrigatório').max(50, 'Sobrenome muito longo'),
  phone: z.string().min(9, 'Número de telefone inválido').max(20, 'Número muito longo'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Password deve ter pelo menos 6 caracteres'),
});

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password é obrigatória'),
});

const floatingIcons = [
  { Icon: Guitar, x: '10%', y: '20%', delay: 0, size: 32 },
  { Icon: Headphones, x: '80%', y: '15%', delay: 0.5, size: 28 },
  { Icon: Mic2, x: '15%', y: '75%', delay: 1, size: 24 },
  { Icon: Piano, x: '85%', y: '70%', delay: 1.5, size: 30 },
  { Icon: Music, x: '50%', y: '85%', delay: 0.8, size: 26 },
  { Icon: Guitar, x: '70%', y: '40%', delay: 1.2, size: 22 },
];

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/map');
    });
  }, [navigate]);

  const validateForm = () => {
    setErrors({});
    try {
      if (isLogin) {
        loginSchema.parse({ email, password });
      } else {
        signUpSchema.parse({ firstName, lastName, phone, email, password });
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) newErrors[err.path[0] as string] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso.' });
        navigate('/map');
      } else {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (signUpError) throw signUpError;

        if (authData.user) {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            username: `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
            first_name: firstName,
            last_name: lastName,
            phone,
            instrument: '',
            skill_level: 'beginner',
          });
          if (profileError) throw profileError;
          toast({ title: 'Conta criada!', description: 'Complete o seu perfil para começar.' });
          navigate('/map');
        }
      }
    } catch (error: any) {
      let message = error.message;
      if (message.includes('User already registered')) {
        message = 'Este email já está registado. Tente fazer login.';
      }
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrors({ email: 'Email é obrigatório' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: 'Email enviado!', description: 'Verifique a sua caixa de entrada para redefinir a password.' });
      setShowForgotPassword(false);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, x: isLogin ? -30 : 30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
    exit: { opacity: 0, x: isLogin ? 30 : -30, transition: { duration: 0.25 } },
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden bg-background">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary/8 via-secondary/40 to-accent/8 items-center justify-center overflow-hidden">
        {floatingIcons.map(({ Icon, x, y, delay, size }, i) => (
          <motion.div
            key={i}
            className="absolute text-primary/12"
            style={{ left: x, top: y }}
            animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 5 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
          >
            <Icon size={size} />
          </motion.div>
        ))}

        <motion.div
          className="relative z-10 text-center px-12 max-w-lg"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          <motion.div
            className="w-20 h-20 bg-gradient-to-br from-primary/15 to-accent/15 rounded-full flex items-center justify-center mx-auto mb-8 ring-4 ring-primary/10"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Music className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              JamMate
            </span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Encontre músicos perto de si, organize jam sessions e faça parte de uma comunidade vibrante.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { value: '500+', label: 'Músicos' },
              { value: '1.2k', label: 'Jam Sessions' },
              { value: '4.8★', label: 'Avaliação' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.15 }}
              >
                <div className="text-2xl font-bold text-primary">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-accent/8 rounded-full blur-3xl" />
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="p-6">
          <Link to="/" className="flex items-center gap-2 w-fit hover:opacity-80 transition-opacity lg:hidden">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              JamMate
            </span>
          </Link>
          <Link to="/" className="hidden lg:block text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Voltar à página inicial
          </Link>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {showForgotPassword ? (
              <>
                <div className="text-center mb-8">
                  <motion.h2
                    className="text-3xl font-bold mb-2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    Recuperar password
                  </motion.h2>
                  <p className="text-muted-foreground">
                    Introduza o seu email para receber um link de recuperação.
                  </p>
                </div>

                <motion.form
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                  onSubmit={handleForgotPassword}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input id="reset-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={errors.email ? 'border-destructive' : ''} />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>

                  <motion.div whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      className="w-full h-11 text-base font-semibold bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] hover:opacity-90 transition-opacity"
                      style={{ boxShadow: 'var(--shadow-primary)' }}
                      disabled={loading}
                    >
                      {loading ? (
                        <motion.div
                          className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        />
                      ) : 'Enviar link de recuperação'}
                    </Button>
                  </motion.div>
                </motion.form>

                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(false); setErrors({}); }}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    ← Voltar ao login
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-8">
                  <motion.h2
                    className="text-3xl font-bold mb-2"
                    key={isLogin ? 'login-title' : 'signup-title'}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {isLogin ? 'Bem-vindo de volta' : 'Criar conta'}
                  </motion.h2>
                  <p className="text-muted-foreground">
                    {isLogin
                      ? 'Entre para encontrar músicos e jam sessions.'
                      : 'Junte-se à comunidade de músicos.'}
                  </p>
                </div>

                <AnimatePresence mode="wait">
                  <motion.form
                    key={isLogin ? 'login' : 'signup'}
                    variants={formVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onSubmit={handleAuth}
                    className="space-y-4"
                  >
                    {!isLogin && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="firstName">Nome</Label>
                            <Input id="firstName" placeholder="João" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={errors.firstName ? 'border-destructive' : ''} />
                            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="lastName">Sobrenome</Label>
                            <Input id="lastName" placeholder="Silva" value={lastName} onChange={(e) => setLastName(e.target.value)} className={errors.lastName ? 'border-destructive' : ''} />
                            {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="phone">Telefone</Label>
                          <Input id="phone" type="tel" placeholder="+351 912 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} className={errors.phone ? 'border-destructive' : ''} />
                          {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                        </div>
                      </>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={errors.email ? 'border-destructive' : ''} />
                      {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        {isLogin && (
                          <button
                            type="button"
                            onClick={() => { setShowForgotPassword(true); setErrors({}); }}
                            className="text-xs text-primary hover:underline"
                          >
                            Esqueceu a password?
                          </button>
                        )}
                      </div>
                      <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={errors.password ? 'border-destructive' : ''} />
                      {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                    </div>

                    <motion.div whileTap={{ scale: 0.98 }}>
                      <Button
                        type="submit"
                        className="w-full h-11 text-base font-semibold bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] hover:opacity-90 transition-opacity"
                        style={{ boxShadow: 'var(--shadow-primary)' }}
                        disabled={loading}
                      >
                        {loading ? (
                          <motion.div
                            className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                          />
                        ) : isLogin ? 'Entrar' : 'Criar Conta'}
                      </Button>
                    </motion.div>
                  </motion.form>
                </AnimatePresence>

                <div className="mt-6 text-center">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-background px-3 text-muted-foreground">ou</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIsLogin(!isLogin); setErrors({}); }}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {isLogin ? 'Não tem conta? ' : 'Já tem conta? '}
                    <span className="font-medium text-primary">{isLogin ? 'Criar conta' : 'Entrar'}</span>
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
