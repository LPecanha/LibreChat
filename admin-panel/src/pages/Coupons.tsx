import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X, ChevronDown, Eye, EyeOff, Ticket } from 'lucide-react';
import {
  fetchCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  type Coupon,
} from '~/lib/api';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Skeleton } from '~/components/ui/skeleton';
import { toast } from '~/hooks/useToast';
import { formatUsd, cn } from '~/lib/utils';

// ── Create dialog ─────────────────────────────────────────────────────────────

function CreateDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [credits, setCredits] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxUses, setMaxUses] = useState('');

  const mut = useMutation({
    mutationFn: () =>
      createCoupon({
        code,
        description,
        credits: Math.round(parseFloat(credits) * 1_000_000),
        expiresAt: expiresAt || undefined,
        maxUses: maxUses ? parseInt(maxUses) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
      toast({ title: 'Cupom criado' });
      onClose();
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const creditsNum = parseFloat(credits);
  const valid = code.trim().length >= 3 && !isNaN(creditsNum) && creditsNum > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-card border border-border p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-primary">Novo cupom</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Código *</label>
            <Input
              placeholder="ex: PROMO30"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoFocus
              className="uppercase"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Créditos em USD *</label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="ex: 5.00"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
            />
            {credits && !isNaN(parseFloat(credits)) && (
              <p className="mt-1 text-xs text-muted-foreground">
                = {formatUsd(Math.round(parseFloat(credits) * 1_000_000))} em créditos
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Validade</label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Máx. usos</label>
              <Input
                type="number"
                min="1"
                placeholder="Ilimitado"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
            <Button size="sm" disabled={!valid || mut.isPending} onClick={() => mut.mutate()}>
              {mut.isPending ? 'Criando…' : 'Criar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Coupon row ────────────────────────────────────────────────────────────────

function CouponRow({ coupon }: { coupon: Coupon }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const toggleMut = useMutation({
    mutationFn: (isActive: boolean) => updateCoupon(coupon.code, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteCoupon(coupon.code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
      toast({ title: 'Cupom removido' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const isExpired = coupon.expiresAt ? new Date(coupon.expiresAt) < new Date() : false;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setExpanded((v) => !v)} className="flex-1 min-w-0">
            <div className="flex items-center gap-3 text-left">
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="font-mono font-semibold text-sm text-text-primary">{coupon.code}</code>
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">{formatUsd(coupon.credits)}</span>
                  {!coupon.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">inativo</Badge>}
                  {isExpired && <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">expirado</Badge>}
                  {coupon.expiresAt && !isExpired && (
                    <span className="text-xs text-muted-foreground">
                      válido até {new Date(coupon.expiresAt).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
                {coupon.description && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{coupon.description}</p>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {coupon.totalUsages} uso{coupon.totalUsages !== 1 ? 's' : ''}
                  {coupon.maxUses != null && ` / ${coupon.maxUses}`}
                  {' · '}
                  {formatUsd(coupon.totalCreditsGranted)} concedidos
                </p>
              </div>
            </div>
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <button
              title={coupon.isActive ? 'Desativar' : 'Ativar'}
              onClick={() => toggleMut.mutate(!coupon.isActive)}
              disabled={toggleMut.isPending}
              className="rounded p-1 text-muted-foreground hover:text-text-primary"
            >
              {coupon.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={deleteMut.isPending}
              onClick={() => deleteMut.mutate()}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {expanded && coupon.usages.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usuários que resgataram</p>
            <div className="flex flex-col gap-1.5">
              {coupon.usages.map((u, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="min-w-0">
                    <span className="font-medium text-text-primary">{u.userName}</span>
                    <span className="ml-1.5 text-muted-foreground">{u.userEmail}</span>
                  </div>
                  <div className="ml-2 shrink-0 text-right">
                    <span className="font-medium text-text-primary">{formatUsd(u.creditsGranted)}</span>
                    <span className="ml-1.5 text-muted-foreground">
                      {new Date(u.usedAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {expanded && coupon.usages.length === 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">Nenhum uso registrado ainda.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function Coupons() {
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: fetchCoupons,
  });

  const coupons = data ?? [];
  const active = coupons.filter((c) => c.isActive).length;
  const totalUses = coupons.reduce((sum, c) => sum + c.totalUsages, 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Cupons</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? '…' : `${active} ativos · ${coupons.length} total · ${totalUses} usos`}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo cupom
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-surface-secondary/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
        <Ticket className="h-4 w-4 shrink-0" />
        Cada cupom só pode ser usado <strong>uma vez por usuário</strong>. Créditos são concedidos imediatamente após o resgate.
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      )}

      {!isLoading && coupons.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Ticket className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum cupom criado</p>
          <p className="text-xs text-muted-foreground mt-1">Crie um cupom para distribuir créditos aos usuários.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {coupons.map((c) => <CouponRow key={c._id} coupon={c} />)}
      </div>

      {creating && <CreateDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
