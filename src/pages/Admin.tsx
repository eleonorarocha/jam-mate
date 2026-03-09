import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, MessageSquare, Trash2, CheckCircle, Clock, Eye, Filter, Users, BarChart3, Download, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { downloadCSV } from '@/lib/csv-export';
import AdminUsers from '@/components/AdminUsers';
import AdminStats from '@/components/AdminStats';
import Header from '@/components/Header';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface FeedbackItem {
  id: string;
  user_id: string;
  category: string;
  rating: number | null;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  profiles?: { username: string; avatar_url: string | null } | null;
}

const categoryLabels: Record<string, string> = {
  suggestion: '💡 Sugestão',
  bug: '🐛 Problema',
  review: '⭐ Avaliação',
  other: '💬 Outro',
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'outline' },
  reviewed: { label: 'Analisado', variant: 'secondary' },
  resolved: { label: 'Resolvido', variant: 'default' },
};

type FeedbackSortKey = 'username' | 'category' | 'status' | 'created_at';
type SortDir = 'asc' | 'desc';

const FeedbackSortableHead = ({ label, sortKey, currentKey, dir, onSort }: { label: string; sortKey: string; currentKey: string; dir: SortDir; onSort: (key: string) => void }) => (
  <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSort(sortKey)}>
    <span className="inline-flex items-center gap-1">
      {label}
      {currentKey === sortKey ? (
        dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-30" />
      )}
    </span>
  </TableHead>
);

const Admin = () => {
  const { isAdmin, loading } = useAdmin();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [fbSortKey, setFbSortKey] = useState<FeedbackSortKey>('created_at');
  const [fbSortDir, setFbSortDir] = useState<SortDir>('desc');

  const handleFbSort = (key: string) => {
    if (key === fbSortKey) {
      setFbSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setFbSortKey(key as FeedbackSortKey);
      setFbSortDir('asc');
    }
    setFeedbackPage(1);
  };

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/');
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) loadFeedback();
  }, [isAdmin]);

  const loadFeedback = async () => {
    setLoadingData(true);
    const { data, error } = await supabase
      .from('feedback')
      .select('*, profiles:user_id(username, avatar_url)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFeedback(data as unknown as FeedbackItem[]);
    }
    setLoadingData(false);
  };

  const handleUpdateStatus = async () => {
    if (!selectedItem) return;
    const { error } = await supabase
      .from('feedback')
      .update({ status: newStatus, admin_notes: adminNotes || null })
      .eq('id', selectedItem.id);

    if (error) {
      toast.error('Erro ao atualizar feedback.');
    } else {
      toast.success('Feedback atualizado.');
      setSelectedItem(null);
      loadFeedback();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('feedback').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao eliminar feedback.');
    } else {
      toast.success('Feedback eliminado.');
      setFeedback((prev) => prev.filter((f) => f.id !== id));
    }
  };

  const filtered = useMemo(() => {
    let result = feedback.filter((f) => {
      if (filterCategory !== 'all' && f.category !== filterCategory) return false;
      if (filterStatus !== 'all' && f.status !== filterStatus) return false;
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (fbSortKey) {
        case 'username':
          cmp = ((a.profiles as any)?.username || '').localeCompare((b.profiles as any)?.username || '');
          break;
        case 'category':
          cmp = a.category.localeCompare(b.category);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return fbSortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [feedback, filterCategory, filterStatus, fbSortKey, fbSortDir]);

  const FEEDBACK_PER_PAGE = 10;
  const feedbackTotalPages = Math.max(1, Math.ceil(filtered.length / FEEDBACK_PER_PAGE));
  const paginatedFeedback = filtered.slice((feedbackPage - 1) * FEEDBACK_PER_PAGE, feedbackPage * FEEDBACK_PER_PAGE);

  useEffect(() => { setFeedbackPage(1); }, [filterCategory, filterStatus]);

  const stats = {
    total: feedback.length,
    pending: feedback.filter((f) => f.status === 'pending').length,
    resolved: feedback.filter((f) => f.status === 'resolved').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-16 container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Painel de Administração</h1>
            <p className="text-muted-foreground text-sm">Gerir feedback e utilizadores</p>
          </div>
        </motion.div>

        <Tabs defaultValue="stats" className="space-y-6">
          <TabsList>
            <TabsTrigger value="stats" className="gap-1.5">
              <BarChart3 className="w-4 h-4" /> Estatísticas
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-1.5">
              <MessageSquare className="w-4 h-4" /> Feedback
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="w-4 h-4" /> Utilizadores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats">
            <AdminStats />
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total', value: stats.total, icon: MessageSquare },
            { label: 'Pendentes', value: stats.pending, icon: Clock },
            { label: 'Resolvidos', value: stats.resolved, icon: CheckCircle },
          ].map((s) => (
            <motion.div
              key={s.label}
              className="bg-card border border-border rounded-xl p-4 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <s.icon className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              <SelectItem value="suggestion">Sugestão</SelectItem>
              <SelectItem value="bug">Problema</SelectItem>
              <SelectItem value="review">Avaliação</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos estados</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="reviewed">Analisado</SelectItem>
              <SelectItem value="resolved">Resolvido</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground ml-auto">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              downloadCSV(
                filtered.map((f) => ({
                  utilizador: (f.profiles as any)?.username || 'Anónimo',
                  categoria: categoryLabels[f.category] || f.category,
                  mensagem: f.message,
                  rating: f.rating ?? '',
                  estado: statusConfig[f.status]?.label || f.status,
                  notas_admin: f.admin_notes || '',
                  data: f.created_at,
                })),
                'feedback'
              )
            }
          >
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </Button>
        </div>

        {/* Table */}
        {loadingData ? (
          <div className="text-center py-12 text-muted-foreground">A carregar...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhum feedback encontrado.</div>
        ) : (
          <>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <FeedbackSortableHead label="Utilizador" sortKey="username" currentKey={fbSortKey} dir={fbSortDir} onSort={handleFbSort} />
                  <FeedbackSortableHead label="Categoria" sortKey="category" currentKey={fbSortKey} dir={fbSortDir} onSort={handleFbSort} />
                  <TableHead>Mensagem</TableHead>
                  <FeedbackSortableHead label="Estado" sortKey="status" currentKey={fbSortKey} dir={fbSortDir} onSort={handleFbSort} />
                  <FeedbackSortableHead label="Data" sortKey="created_at" currentKey={fbSortKey} dir={fbSortDir} onSort={handleFbSort} />
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFeedback.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {(item.profiles as any)?.username || 'Anónimo'}
                    </TableCell>
                    <TableCell>{categoryLabels[item.category] || item.category}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{item.message}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[item.status]?.variant || 'outline'}>
                        {statusConfig[item.status]?.label || item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(item.created_at), 'dd MMM yyyy', { locale: pt })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedItem(item); setNewStatus(item.status); setAdminNotes(item.admin_notes || ''); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {feedbackTotalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Página {feedbackPage} de {feedbackTotalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={feedbackPage <= 1} onClick={() => setFeedbackPage((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: feedbackTotalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === feedbackTotalPages || Math.abs(p - feedbackPage) <= 1)
                  .map((p, idx, arr) => (
                    <span key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-muted-foreground">…</span>}
                      <Button variant={p === feedbackPage ? 'default' : 'outline'} size="icon" className="h-8 w-8 text-xs" onClick={() => setFeedbackPage(p)}>
                        {p}
                      </Button>
                    </span>
                  ))}
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={feedbackPage >= feedbackTotalPages} onClick={() => setFeedbackPage((p) => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalhes do Feedback</DialogTitle>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {(selectedItem.profiles as any)?.username || 'Anónimo'} ·{' '}
                    {format(new Date(selectedItem.created_at), 'dd MMM yyyy HH:mm', { locale: pt })}
                  </span>
                  <Badge variant="outline">{categoryLabels[selectedItem.category]}</Badge>
                </div>

                {selectedItem.rating && (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} className={i < selectedItem.rating! ? 'text-primary' : 'text-muted-foreground/30'}>★</span>
                    ))}
                  </div>
                )}

                <div className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed">
                  {selectedItem.message}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Estado</label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="reviewed">Analisado</SelectItem>
                      <SelectItem value="resolved">Resolvido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Notas de administração</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Notas internas..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedItem(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateStatus}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

          </TabsContent>

          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
