import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Users, Search, Shield, ShieldOff, Eye, Star, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { downloadCSV } from '@/lib/csv-export';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface UserProfile {
  id: string;
  username: string;
  first_name: string | null;
  avatar_url: string | null;
  instrument: string;
  skill_level: string;
  city: string | null;
  country: string | null;
  average_rating: number | null;
  total_ratings: number | null;
  created_at: string;
  onboarding_completed: boolean;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
}

const skillLabels: Record<string, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermédio',
  advanced: 'Avançado',
  professional: 'Profissional',
};

const ITEMS_PER_PAGE = 10;

const AdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [usersRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('id, username, first_name, avatar_url, instrument, skill_level, city, country, average_rating, total_ratings, created_at, onboarding_completed').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('*'),
    ]);
    if (usersRes.data) setUsers(usersRes.data);
    if (rolesRes.data) setRoles(rolesRes.data);
    setLoading(false);
  };

  const getUserRoles = (userId: string) => roles.filter((r) => r.user_id === userId);

  const toggleAdminRole = async (userId: string) => {
    const existing = roles.find((r) => r.user_id === userId && r.role === 'admin');
    if (existing) {
      const { error } = await supabase.from('user_roles').delete().eq('id', existing.id);
      if (error) {
        toast.error('Erro ao remover role.');
      } else {
        toast.success('Role de admin removido.');
        setRoles((prev) => prev.filter((r) => r.id !== existing.id));
      }
    } else {
      const { data, error } = await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' } as any).select().single();
      if (error) {
        toast.error('Erro ao atribuir role.');
      } else if (data) {
        toast.success('Role de admin atribuído.');
        setRoles((prev) => [...prev, data as unknown as UserRole]);
      }
    }
  };

  const filtered = users.filter((u) => {
    const matchesSearch = !search || u.username.toLowerCase().includes(search.toLowerCase()) || (u.first_name || '').toLowerCase().includes(search.toLowerCase()) || (u.city || '').toLowerCase().includes(search.toLowerCase());
    if (filterRole === 'admin') return matchesSearch && roles.some((r) => r.user_id === u.id && r.role === 'admin');
    if (filterRole === 'user') return matchesSearch && !roles.some((r) => r.user_id === u.id && r.role === 'admin');
    return matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedUsers = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [search, filterRole]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">A carregar utilizadores...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Users className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold">{users.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Shield className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold">{roles.filter((r) => r.role === 'admin').length}</p>
          <p className="text-xs text-muted-foreground">Admins</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Star className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold">
            {users.filter((u) => (u.average_rating || 0) >= 4).length}
          </p>
          <p className="text-xs text-muted-foreground">Rating ≥ 4★</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, username ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
            <SelectItem value="user">Utilizadores</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            downloadCSV(
              filtered.map((u) => ({
                username: u.username,
                nome: u.first_name || '',
                instrumento: u.instrument,
                nivel: skillLabels[u.skill_level] || u.skill_level,
                cidade: u.city || '',
                pais: u.country || '',
                rating: u.average_rating ? Number(u.average_rating).toFixed(1) : '',
                avaliacoes: u.total_ratings || 0,
                admin: roles.some((r) => r.user_id === u.id && r.role === 'admin') ? 'Sim' : 'Não',
                registo: u.created_at,
              })),
              'utilizadores'
            )
          }
        >
          <Download className="w-3.5 h-3.5" /> Exportar CSV
        </Button>
        <p className="text-sm text-muted-foreground ml-auto">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum utilizador encontrado.</div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Instrumento</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Registo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => {
                  const userRoles = getUserRoles(user.id);
                  const isAdmin = userRoles.some((r) => r.role === 'admin');
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {user.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{user.username}</p>
                            {user.first_name && (
                              <p className="text-xs text-muted-foreground">{user.first_name}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{user.instrument}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {skillLabels[user.skill_level] || user.skill_level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.city || '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.average_rating ? `${Number(user.average_rating).toFixed(1)}★` : '—'}
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Badge variant="default" className="text-xs">Admin</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Utilizador</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(user.created_at), 'dd MMM yyyy', { locale: pt })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedUser(user)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleAdminRole(user.id)} title={isAdmin ? 'Remover admin' : 'Tornar admin'}>
                            {isAdmin ? <ShieldOff className="w-4 h-4 text-destructive" /> : <Shield className="w-4 h-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => (
                    <span key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-muted-foreground">…</span>}
                      <Button variant={p === currentPage ? 'default' : 'outline'} size="icon" className="h-8 w-8 text-xs" onClick={() => setCurrentPage(p)}>
                        {p}
                      </Button>
                    </span>
                  ))}
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Utilizador</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback>{selectedUser.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedUser.username}</p>
                  {selectedUser.first_name && (
                    <p className="text-sm text-muted-foreground">{selectedUser.first_name}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-0.5">Instrumento</p>
                  <p className="font-medium">{selectedUser.instrument}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-0.5">Nível</p>
                  <p className="font-medium">{skillLabels[selectedUser.skill_level] || selectedUser.skill_level}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-0.5">Localização</p>
                  <p className="font-medium">{[selectedUser.city, selectedUser.country].filter(Boolean).join(', ') || '—'}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-0.5">Rating</p>
                  <p className="font-medium">
                    {selectedUser.average_rating ? `${Number(selectedUser.average_rating).toFixed(1)}★ (${selectedUser.total_ratings})` : 'Sem avaliações'}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-0.5">Registo</p>
                  <p className="font-medium">{format(new Date(selectedUser.created_at), 'dd MMM yyyy', { locale: pt })}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-0.5">Onboarding</p>
                  <p className="font-medium">{selectedUser.onboarding_completed ? '✅ Completo' : '⏳ Pendente'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">Role de administrador</p>
                <Button
                  variant={getUserRoles(selectedUser.id).some((r) => r.role === 'admin') ? 'destructive' : 'default'}
                  size="sm"
                  onClick={() => {
                    toggleAdminRole(selectedUser.id);
                  }}
                >
                  {getUserRoles(selectedUser.id).some((r) => r.role === 'admin') ? (
                    <>
                      <ShieldOff className="w-4 h-4 mr-1" /> Remover Admin
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-1" /> Tornar Admin
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
