import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X, GripVertical, Eye, EyeOff } from 'lucide-react';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type AgentCategory,
} from '~/lib/api';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Skeleton } from '~/components/ui/skeleton';
import { toast } from '~/hooks/useToast';

// ── Create dialog ─────────────────────────────────────────────────────────────

function CreateDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  const mut = useMutation({
    mutationFn: () => createCategory({ label, description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Categoria criada' });
      onClose();
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-card border border-border p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-primary">Nova categoria</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nome *</label>
            <Input
              placeholder="ex: Marketing"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus
            />
            {label && (
              <p className="mt-1 text-xs text-muted-foreground">
                Slug: <code>{label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}</code>
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Descrição</label>
            <Input
              placeholder="Opcional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
            <Button
              size="sm"
              disabled={!label.trim() || mut.isPending}
              onClick={() => mut.mutate()}
            >
              {mut.isPending ? 'Criando…' : 'Criar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Category row ──────────────────────────────────────────────────────────────

function CategoryRow({ cat }: { cat: AgentCategory }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(cat.label);
  const [description, setDescription] = useState(cat.description);

  const toggleMut = useMutation({
    mutationFn: (active: boolean) => updateCategory(cat.value, { isActive: active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const saveMut = useMutation({
    mutationFn: () => updateCategory(cat.value, { label, description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Salvo' });
      setEditing(false);
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteCategory(cat.value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Categoria removida' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return (
    <Card>
      <CardContent className="p-4">
        {editing ? (
          <div className="flex flex-col gap-3">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nome" />
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setLabel(cat.label); setDescription(cat.description); }}>
                Cancelar
              </Button>
              <Button size="sm" disabled={!label.trim() || saveMut.isPending} onClick={() => saveMut.mutate()}>
                {saveMut.isPending ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{cat.label}</span>
                <code className="text-xs text-muted-foreground bg-surface-secondary px-1 rounded">{cat.value}</code>
                {cat.custom && <Badge variant="secondary" className="text-xs">custom</Badge>}
                {!cat.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">oculta</Badge>}
              </div>
              {cat.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{cat.description}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                title={cat.isActive ? 'Ocultar do marketplace' : 'Exibir no marketplace'}
                onClick={() => toggleMut.mutate(!cat.isActive)}
                disabled={toggleMut.isPending}
                className="rounded p-1 text-muted-foreground hover:text-text-primary"
              >
                {cat.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Editar</Button>
              {cat.custom && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={deleteMut.isPending}
                  onClick={() => deleteMut.mutate()}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function Categories() {
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const categories = (data ?? []).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  const active = categories.filter((c) => c.isActive).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Categorias do Marketplace</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? '…' : `${active} ativas · ${categories.length} total`}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova categoria
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-surface-secondary/30 p-3 text-xs text-muted-foreground">
        Categorias <strong>padrão</strong> não podem ser deletadas, mas podem ser ocultadas com o botão olho.
        Categorias <Badge variant="secondary" className="text-xs align-middle">custom</Badge> podem ser deletadas.
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      )}

      {!isLoading && categories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma categoria encontrada</p>
          <p className="text-xs text-muted-foreground mt-1">As categorias padrão são criadas pelo LibreChat na primeira inicialização.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {categories.map((cat) => <CategoryRow key={cat.value} cat={cat} />)}
      </div>

      {creating && <CreateDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
