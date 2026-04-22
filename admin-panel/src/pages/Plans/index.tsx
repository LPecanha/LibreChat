import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Star, RefreshCw, Zap, Tag } from 'lucide-react';
import { fetchAdminPlans, createAdminPlan, updateAdminPlan, deleteAdminPlan } from '~/lib/api';
import { toast } from '~/hooks/useToast';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Skeleton } from '~/components/ui/skeleton';
import { formatUsd } from '~/lib/utils';
import type { AdminCreditPlan } from '~/lib/api';

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatUSD(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-card border border-border p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-text-primary"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-text-primary">{label}</label>
      {children}
    </div>
  );
}

interface PlanFormData {
  planId: string;
  name: string;
  type: 'subscription' | 'one_time';
  creditsUSD: string;
  pricesBRL: string;
  pricesUSD: string;
  popular: boolean;
  discountPct: string;
}

function PlanFormFields({ data, onChange, showPlanId }: {
  data: PlanFormData;
  onChange: (d: PlanFormData) => void;
  showPlanId: boolean;
}) {
  return (
    <>
      {showPlanId && (
        <FormField label="ID do plano (slug)">
          <Input value={data.planId} onChange={(e) => onChange({ ...data, planId: e.target.value })} placeholder="ex: pro-monthly" />
        </FormField>
      )}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Nome">
          <Input value={data.name} onChange={(e) => onChange({ ...data, name: e.target.value })} placeholder="ex: Pro" />
        </FormField>
        <FormField label="Tipo">
          <select
            className="rounded-md border border-border bg-surface-secondary px-3 py-2 text-sm text-text-primary"
            value={data.type}
            onChange={(e) => onChange({ ...data, type: e.target.value as 'subscription' | 'one_time' })}
          >
            <option value="subscription">Mensal (recorrente)</option>
            <option value="one_time">Avulso (único)</option>
          </select>
        </FormField>
      </div>
      <FormField label="Créditos em USD (ex: 15.00 = $15 de créditos)">
        <Input
          type="number"
          step="0.01"
          value={data.creditsUSD}
          onChange={(e) => onChange({ ...data, creditsUSD: e.target.value })}
          placeholder="ex: 15.00"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Preço BRL (centavos)">
          <Input type="number" value={data.pricesBRL} onChange={(e) => onChange({ ...data, pricesBRL: e.target.value })} placeholder="ex: 7900" />
        </FormField>
        <FormField label="Preço USD (centavos)">
          <Input type="number" value={data.pricesUSD} onChange={(e) => onChange({ ...data, pricesUSD: e.target.value })} placeholder="ex: 1599" />
        </FormField>
      </div>
      {data.type === 'subscription' && (
        <FormField label="Desconto em créditos avulsos (%)">
          <Input
            type="number"
            min="0"
            max="100"
            value={data.discountPct}
            onChange={(e) => onChange({ ...data, discountPct: e.target.value })}
            placeholder="ex: 10"
          />
        </FormField>
      )}
      <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
        <input type="checkbox" checked={data.popular} onChange={(e) => onChange({ ...data, popular: e.target.checked })} className="rounded" />
        Marcar como popular
      </label>
    </>
  );
}

function CreatePlanDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<PlanFormData>({
    planId: '', name: '', type: 'subscription', creditsUSD: '', pricesBRL: '', pricesUSD: '', popular: false, discountPct: '0',
  });

  const mutation = useMutation({
    mutationFn: () => createAdminPlan({
      planId: form.planId,
      name: form.name,
      type: form.type,
      credits: Math.round(parseFloat(form.creditsUSD) * 1_000_000),
      pricesBRL: parseInt(form.pricesBRL, 10),
      pricesUSD: parseInt(form.pricesUSD, 10),
      popular: form.popular,
      discountPct: parseInt(form.discountPct, 10) || 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-plans'] });
      toast({ variant: 'success', title: 'Plano criado' });
      onClose();
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro ao criar plano', description: err.message }),
  });

  const valid = form.planId.trim() && form.name.trim() && form.creditsUSD && form.pricesBRL && form.pricesUSD;

  return (
    <Dialog title="Novo plano" onClose={onClose}>
      <div className="space-y-3">
        <PlanFormFields data={form} onChange={setForm} showPlanId />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Criando…' : 'Criar'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function EditPlanDialog({ plan, onClose }: { plan: AdminCreditPlan; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<PlanFormData>({
    planId: plan.planId,
    name: plan.name,
    type: (plan.type as 'subscription' | 'one_time') ?? 'one_time',
    creditsUSD: String(plan.credits / 1_000_000),
    pricesBRL: String(plan.pricesBRL),
    pricesUSD: String(plan.pricesUSD),
    popular: plan.popular,
    discountPct: String(plan.discountPct ?? 0),
  });

  const mutation = useMutation({
    mutationFn: () => updateAdminPlan(plan.id, {
      name: form.name,
      credits: Math.round(parseFloat(form.creditsUSD) * 1_000_000),
      pricesBRL: parseInt(form.pricesBRL, 10),
      pricesUSD: parseInt(form.pricesUSD, 10),
      popular: form.popular,
      discountPct: parseInt(form.discountPct, 10) || 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-plans'] });
      toast({ variant: 'success', title: 'Plano atualizado' });
      onClose();
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro ao atualizar', description: err.message }),
  });

  return (
    <Dialog title="Editar plano" onClose={onClose}>
      <div className="space-y-3">
        <PlanFormFields data={form} onChange={setForm} showPlanId={false} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function DeletePlanDialog({ plan, onClose }: { plan: AdminCreditPlan; onClose: () => void }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deleteAdminPlan(plan.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-plans'] });
      toast({ variant: 'success', title: 'Plano excluído' });
      onClose();
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message }),
  });

  return (
    <Dialog title="Excluir plano" onClose={onClose}>
      <p className="mb-4 text-sm text-muted-foreground">
        Tem certeza que deseja excluir o plano <strong className="text-text-primary">{plan.name}</strong>?
        Assinaturas ativas usando este plano não serão afetadas imediatamente.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button variant="destructive" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Excluindo…' : 'Excluir'}
        </Button>
      </div>
    </Dialog>
  );
}

function PlanRow({ plan, onEdit, onDelete, onToggle, toggling }: {
  plan: AdminCreditPlan;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  toggling: boolean;
}) {
  const isSubscription = plan.type === 'subscription';
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {isSubscription ? <RefreshCw className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-text-primary">{plan.name}</p>
            {plan.popular && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />}
            <Badge variant={plan.active ? 'default' : 'secondary'} className="text-xs">{plan.active ? 'Ativo' : 'Inativo'}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatUsd(plan.credits)} · {formatBRL(plan.pricesBRL)} / {formatUSD(plan.pricesUSD)}
            {isSubscription && ' /mês'}
            {isSubscription && (plan.discountPct ?? 0) > 0 && (
              <span className="ml-2 inline-flex items-center gap-0.5 text-green-600">
                <Tag className="h-2.5 w-2.5" />
                {plan.discountPct}% desc. avulso
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          className="rounded px-2 py-1 text-xs text-muted-foreground border border-border hover:bg-surface-hover"
          onClick={onToggle}
          disabled={toggling}
        >
          {plan.active ? 'Desativar' : 'Ativar'}
        </button>
        <button className="rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-text-primary" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button className="rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function Plans() {
  const [tab, setTab] = useState<'subscription' | 'one_time'>('subscription');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminCreditPlan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCreditPlan | null>(null);
  const qc = useQueryClient();

  const { data: allPlans = [], isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: fetchAdminPlans,
  });

  const plans = allPlans.filter((p) => (p.type ?? 'one_time') === tab);

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateAdminPlan(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-plans'] }),
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro', description: err.message }),
  });

  return (
    <div className="space-y-4">
      {showCreate && <CreatePlanDialog onClose={() => setShowCreate(false)} />}
      {editTarget && <EditPlanDialog plan={editTarget} onClose={() => setEditTarget(null)} />}
      {deleteTarget && <DeletePlanDialog plan={deleteTarget} onClose={() => setDeleteTarget(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Planos</h2>
          <p className="text-sm text-muted-foreground">{allPlans.length} planos cadastrados</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Novo plano
        </Button>
      </div>

      <div className="flex rounded-lg border border-border-light bg-surface-secondary p-0.5 w-fit">
        <button
          className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'subscription' ? 'bg-card text-text-primary shadow-sm' : 'text-muted-foreground hover:text-text-primary'}`}
          onClick={() => setTab('subscription')}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Planos mensais
        </button>
        <button
          className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'one_time' ? 'bg-card text-text-primary shadow-sm' : 'text-muted-foreground hover:text-text-primary'}`}
          onClick={() => setTab('one_time')}
        >
          <Zap className="h-3.5 w-3.5" />
          Créditos avulsos
        </button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-px p-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)}</div>
          ) : plans.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Nenhum plano cadastrado nesta categoria</div>
          ) : (
            <div className="divide-y divide-border">
              {plans.map((plan) => (
                <PlanRow
                  key={plan.id}
                  plan={plan}
                  onEdit={() => setEditTarget(plan)}
                  onDelete={() => setDeleteTarget(plan)}
                  onToggle={() => toggleActiveMutation.mutate({ id: plan.id, active: !plan.active })}
                  toggling={toggleActiveMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
