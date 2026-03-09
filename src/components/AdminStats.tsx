import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Users, MessageSquare, Star, Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isAfter } from 'date-fns';
import { pt } from 'date-fns/locale';
import { downloadCSV } from '@/lib/csv-export';

interface Profile {
  id: string;
  created_at: string;
  instrument: string;
  skill_level: string;
  city: string | null;
}

interface FeedbackRow {
  id: string;
  category: string;
  rating: number | null;
  status: string;
  created_at: string;
}

interface BookingRow {
  id: string;
  status: string;
  created_at: string;
}

const COLORS = [
  'hsl(82, 89%, 50%)',
  'hsl(82, 89%, 35%)',
  'hsl(82, 50%, 60%)',
  'hsl(200, 60%, 50%)',
  'hsl(340, 60%, 50%)',
  'hsl(45, 80%, 55%)',
  'hsl(260, 50%, 55%)',
  'hsl(160, 50%, 45%)',
];

const categoryLabels: Record<string, string> = {
  suggestion: 'Sugestão',
  bug: 'Problema',
  review: 'Avaliação',
  other: 'Outro',
};

const skillLabels: Record<string, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermédio',
  advanced: 'Avançado',
  professional: 'Profissional',
};

const AdminStats = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [pRes, fRes, bRes] = await Promise.all([
        supabase.from('profiles').select('id, created_at, instrument, skill_level, city'),
        supabase.from('feedback').select('id, category, rating, status, created_at'),
        supabase.from('bookings').select('id, status, created_at'),
      ]);
      if (pRes.data) setProfiles(pRes.data);
      if (fRes.data) setFeedback(fRes.data as FeedbackRow[]);
      if (bRes.data) setBookings(bRes.data);
      setLoading(false);
    };
    load();
  }, []);

  // New users per month (last 6 months)
  const usersPerMonth = useMemo(() => {
    const months: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const count = profiles.filter((p) => {
        const d = parseISO(p.created_at);
        return isAfter(d, start) && !isAfter(d, end);
      }).length;
      months.push({ month: format(date, 'MMM yy', { locale: pt }), count });
    }
    return months;
  }, [profiles]);

  // Feedback by category
  const feedbackByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    feedback.forEach((f) => {
      const label = categoryLabels[f.category] || f.category;
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [feedback]);

  // Users by skill level
  const usersBySkill = useMemo(() => {
    const map: Record<string, number> = {};
    profiles.forEach((p) => {
      const label = skillLabels[p.skill_level] || p.skill_level;
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [profiles]);

  // Top instruments
  const topInstruments = useMemo(() => {
    const map: Record<string, number> = {};
    profiles.forEach((p) => {
      map[p.instrument] = (map[p.instrument] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [profiles]);

  // Bookings per month (last 6 months)
  const bookingsPerMonth = useMemo(() => {
    const months: { month: string; total: number; accepted: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const inMonth = bookings.filter((b) => {
        const d = parseISO(b.created_at);
        return isAfter(d, start) && !isAfter(d, end);
      });
      months.push({
        month: format(date, 'MMM yy', { locale: pt }),
        total: inMonth.length,
        accepted: inMonth.filter((b) => b.status === 'accepted' || b.status === 'completed').length,
      });
    }
    return months;
  }, [bookings]);

  // Top cities
  const topCities = useMemo(() => {
    const map: Record<string, number> = {};
    profiles.forEach((p) => {
      if (p.city) map[p.city] = (map[p.city] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [profiles]);

  // Average feedback rating
  const avgRating = useMemo(() => {
    const rated = feedback.filter((f) => f.rating);
    if (rated.length === 0) return 0;
    return rated.reduce((sum, f) => sum + (f.rating || 0), 0) / rated.length;
  }, [feedback]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">A carregar estatísticas...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Export buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            downloadCSV(
              profiles.map((p) => ({
                username: p.id,
                instrumento: p.instrument,
                nivel: skillLabels[p.skill_level] || p.skill_level,
                cidade: p.city || '',
                criado_em: p.created_at,
              })),
              'utilizadores'
            )
          }
        >
          <Download className="w-3.5 h-3.5" /> Utilizadores
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            downloadCSV(
              feedback.map((f) => ({
                categoria: categoryLabels[f.category] || f.category,
                rating: f.rating ?? '',
                estado: f.status,
                criado_em: f.created_at,
              })),
              'feedback'
            )
          }
        >
          <Download className="w-3.5 h-3.5" /> Feedback
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            downloadCSV(
              bookings.map((b) => ({
                estado: b.status,
                criado_em: b.created_at,
              })),
              'bookings'
            )
          }
        >
          <Download className="w-3.5 h-3.5" /> Bookings
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Utilizadores', value: profiles.length },
          { icon: MessageSquare, label: 'Feedback', value: feedback.length },
          { icon: Calendar, label: 'Bookings', value: bookings.length },
          { icon: Star, label: 'Rating médio da app', value: avgRating ? `${avgRating.toFixed(1)}★` : '—' },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <s.icon className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New users per month */}
        <ChartCard title="Novos Utilizadores por Mês" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={usersPerMonth}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Bar dataKey="count" name="Utilizadores" fill="hsl(82, 89%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Feedback by category */}
        <ChartCard title="Feedback por Categoria" icon={MessageSquare}>
          {feedbackByCategory.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={feedbackByCategory} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {feedbackByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Bookings per month */}
        <ChartCard title="Bookings por Mês" icon={Calendar}>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={bookingsPerMonth}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="total" name="Total" stroke="hsl(82, 89%, 50%)" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="accepted" name="Aceites" stroke="hsl(200, 60%, 50%)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top instruments */}
        <ChartCard title="Instrumentos Mais Populares" icon={Star}>
          {topInstruments.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topInstruments} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="name" type="category" width={90} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Bar dataKey="value" name="Músicos" fill="hsl(82, 50%, 60%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Users by skill level */}
        <ChartCard title="Nível de Experiência" icon={Users}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={usersBySkill} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {usersBySkill.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top cities */}
        <ChartCard title="Cidades com Mais Músicos" icon={TrendingUp}>
          {topCities.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topCities}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Bar dataKey="value" name="Músicos" fill="hsl(200, 60%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
};

const ChartCard = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-xl p-5">
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-primary" />
      <h3 className="font-semibold text-sm">{title}</h3>
    </div>
    {children}
  </div>
);

export default AdminStats;
