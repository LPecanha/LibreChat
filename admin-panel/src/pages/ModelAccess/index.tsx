import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Users, X, Bot, Check, ShieldX } from 'lucide-react';
import {
  fetchModelPresets,
  fetchModelSpecs,
  createModelPreset,
  updateModelPreset,
  deleteModelPreset,
} from '~/lib/api';
import type { ModelPreset, ModelSpec } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Skeleton } from '~/components/ui/skeleton';
import { ModelIcon } from '~/components/ModelIcon';
import { modelProvider, PROVIDER_COLORS } from '~/lib/models';
import { toast } from '~/hooks/useToast';

// ── Provider grouping ────────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google',
  meta: 'Meta', mistral: 'Mistral', xai: 'xAI', deepseek: 'DeepSeek', unknown: 'Outros',
};

function groupByProvider(specs: ModelSpec[]): Record<string, ModelSpec[]> {
  const groups: Record<string, ModelSpec[]> = {};
  for (const spec of specs) {
    const prov = modelProvider(spec.name);
    if (!groups[prov]) groups[prov] = [];
    groups[prov].push(spec);
  }
  return groups;
}

// ── Shared Dialog wrapper ─────────────────────────────────────────────────────

function Dialog({ title, wide, onClose, children }: { title: string; wide?: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-12">
      <div className={`w-full rounded-xl bg-card border border-border p-6 shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Spec toggle list ──────────────────────────────────────────────────────────

interface SpecToggleProps {
  specs: ModelSpec[];
  blocked: Set<string>;
  onToggle: (name: string) => void;
}

function SpecToggleList({ specs, blocked, onToggle }: SpecToggleProps) {
  const groups = groupByProvider(specs);
  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([prov, items]) => (
        <div key={prov}>
          <div className="mb-2 flex items-center gap-2">
            <div
              className="flex h-4 w-4 items-center justify-center rounded-full text-white"
              style={{ background: PROVIDER_COLORS[prov as keyof typeof PROVIDER_COLORS] ?? '#6b7280' }}
            >
              <span className="text-[8px] font-bold leading-none">
                {PROVIDER_LABELS[prov]?.charAt(0) ?? '?'}
              </span>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {PROVIDER_LABELS[prov] ?? prov}
            </span>
          </div>
          <div className="space-y-1 pl-6">
            {items.map((spec) => {
              const isBlocked = blocked.has(spec.name);
              return (
                <label
                  key={spec.name}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                    isBlocked ? 'bg-destructive/10' : 'hover:bg-surface-hover'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ModelIcon model={spec.name} size={18} />
                    <span className="text-sm text-text-primary">{spec.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isBlocked && (
                      <span className="text-xs font-medium text-destructive">Bloqueado</span>
                    )}
                    <button
                      type="button"
                      onClick={() => onToggle(spec.name)}
                      className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                        isBlocked
                          ? 'border-destructive bg-destructive text-white'
                          : 'border-border bg-background hover:border-primary'
                      }`}
                    >
                      {isBlocked && <X className="h-3 w-3" />}
                    </button>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Preset editor dialog ──────────────────────────────────────────────────────

interface EditorProps {
  preset?: ModelPreset;
  specs: ModelSpec[];
  onClose: () => void;
}

function PresetEditor({ preset, specs, onClose }: EditorProps) {
  const qc = useQueryClient();
  const [name, setName] = useState(preset?.name ?? '');
  const [description, setDescription] = useState(preset?.description ?? '');
  const [agentsDisabled, setAgentsDisabled] = useState(preset?.agentsDisabled ?? false);
  const [blocked, setBlocked] = useState<Set<string>>(new Set(preset?.blockedSpecs ?? []));

  function toggleSpec(specName: string) {
    setBlocked((prev) => {
      const next = new Set(prev);
      if (next.has(specName)) next.delete(specName);
      else next.add(specName);
      return next;
    });
  }

  const mutation = useMutation({
    mutationFn: () => {
      const data = { name, description, blockedSpecs: [...blocked], agentsDisabled };
      return preset ? updateModelPreset(preset.id, data) : createModelPreset(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['model-presets'] });
      toast({ variant: 'success', title: preset ? 'Perfil atualizado' : 'Perfil criado' });
      onClose();
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro', description: err.message }),
  });

  const blockedCount = blocked.size;
  const totalSpecs = specs.length;

  return (
    <Dialog title={preset ? 'Editar perfil de acesso' : 'Novo perfil de acesso'} wide onClose={onClose}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">Nome</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Acesso Básico" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">Descrição</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-text-primary">Agentes</p>
              <p className="text-xs text-muted-foreground">Desativar acesso à aba de agentes</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAgentsDisabled((v) => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${agentsDisabled ? 'bg-destructive' : 'bg-border'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${agentsDisabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-text-primary">Modelos disponíveis</p>
            <div className="flex items-center gap-2">
              {blockedCount > 0 && (
                <Badge variant="destructive" className="text-xs">{blockedCount} bloqueados</Badge>
              )}
              <Badge variant="secondary" className="text-xs">{totalSpecs - blockedCount} / {totalSpecs} liberados</Badge>
            </div>
          </div>
          {specs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum modelo encontrado</p>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-lg border border-border p-3">
              <SpecToggleList specs={specs} blocked={blocked} onToggle={toggleSpec} />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ── Delete confirm ────────────────────────────────────────────────────────────

function DeletePresetDialog({ preset, onClose }: { preset: ModelPreset; onClose: () => void }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deleteModelPreset(preset.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['model-presets'] });
      toast({ variant: 'success', title: 'Perfil excluído' });
      onClose();
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro', description: err.message }),
  });

  return (
    <Dialog title="Excluir perfil" onClose={onClose}>
      <p className="mb-4 text-sm text-muted-foreground">
        Excluir <strong className="text-text-primary">{preset.name}</strong>?
        {preset.userCount > 0 && (
          <> Os <strong className="text-text-primary">{preset.userCount} usuário(s)</strong> associados perderão as restrições do perfil mas manterão bloqueios individuais.</>
        )}
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

// ── Preset card ───────────────────────────────────────────────────────────────

function PresetCard({ preset, specs, onEdit, onDelete }: {
  preset: ModelPreset;
  specs: ModelSpec[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const allowed = specs.filter((s) => !preset.blockedSpecs.includes(s.name));
  const groups = groupByProvider(allowed);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-sm">{preset.name}</CardTitle>
            {preset.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{preset.description}</p>
            )}
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {preset.userCount} usuário{preset.userCount !== 1 ? 's' : ''}
          </div>
          {preset.agentsDisabled && (
            <Badge variant="destructive" className="text-xs gap-1">
              <ShieldX className="h-3 w-3" />Agentes bloqueados
            </Badge>
          )}
          {preset.blockedSpecs.length > 0 ? (
            <Badge variant="secondary" className="text-xs">
              {specs.length - preset.blockedSpecs.length} / {specs.length} modelos
            </Badge>
          ) : (
            <Badge variant="success" className="text-xs gap-1">
              <Check className="h-3 w-3" />Todos os modelos
            </Badge>
          )}
        </div>
      </CardHeader>

      {allowed.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {Object.entries(groups).map(([prov, items]) => (
              <div key={prov} className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground w-16 shrink-0">{PROVIDER_LABELS[prov] ?? prov}</span>
                <div className="flex flex-wrap gap-1">
                  {items.map((s) => (
                    <div key={s.name} className="flex items-center gap-1 rounded-full border border-border bg-surface-secondary px-2 py-0.5">
                      <ModelIcon model={s.name} size={12} />
                      <span className="text-xs text-text-secondary">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ModelAccess() {
  const [showCreate, setShowCreate] = useState(false);
  const [editPreset, setEditPreset] = useState<ModelPreset | null>(null);
  const [deletePreset, setDeletePreset] = useState<ModelPreset | null>(null);

  const { data: presets = [], isLoading } = useQuery({ queryKey: ['model-presets'], queryFn: fetchModelPresets });
  const { data: specs = [] } = useQuery({ queryKey: ['model-specs'], queryFn: fetchModelSpecs });

  return (
    <div className="space-y-5">
      {(showCreate || editPreset) && (
        <PresetEditor
          preset={editPreset ?? undefined}
          specs={specs}
          onClose={() => { setShowCreate(false); setEditPreset(null); }}
        />
      )}
      {deletePreset && (
        <DeletePresetDialog preset={deletePreset} onClose={() => setDeletePreset(null)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Perfis de acesso a modelos</h2>
          <p className="text-sm text-muted-foreground">
            Defina quais modelos e recursos cada perfil pode acessar
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Novo perfil
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : presets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldX className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium text-text-primary">Nenhum perfil criado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie perfis para controlar quais modelos cada grupo de usuários pode usar.
            </p>
            <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Criar primeiro perfil
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              specs={specs}
              onEdit={() => setEditPreset(preset)}
              onDelete={() => setDeletePreset(preset)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
