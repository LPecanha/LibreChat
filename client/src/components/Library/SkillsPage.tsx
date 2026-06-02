import { useState, useMemo } from 'react';
import * as Ariakit from '@ariakit/react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronDown, Pencil, PenLine, Upload, ExternalLink, Search } from 'lucide-react';
import { DropdownPopup, Spinner } from '@librechat/client';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import type { TSkillSummary, TSkillFile } from 'librechat-data-provider';
import { useListSkillsQuery, useListSkillFilesQuery } from '~/data-provider';
import { useDebounce, useHasAccess, useLocalize } from '~/hooks';
import { CreateSkillDialog, UploadSkillDialog } from '~/components/Skills/dialogs';
import { cn } from '~/utils';
import LibraryPageLayout from './PageLayout';

/**
 * [EXT] Phase J.18 Navvia — view-skills.
 * Code-vs-code com design/ui-preview.html linhas 865-884:
 *
 *   <section view-skills max-w-4xl px-6 py-10>
 *     <header h1 "Skills" + sub + CTA "+ Criar skill" bg-brand>
 *     <list space-y-2 mt-5>
 *       <card rounded-lg border-light bg-surface-secondary>
 *         <row px-3 py-2.5: [icon h-8 w-8 bg-surface-active]
 *                           [name font-medium] [badge "fixa" brand-soft]
 *                           [count "X arquivos" text-tertiary]
 *                           [chevron toggle] [pencil edit]>
 *         <tree hidden border-t font-mono text-[12px]: file tree expandido>
 *       </card>
 *       <button dashed border-medium "+ Criar nova skill">
 *     </list>
 *
 * Reusa data layer:
 *   - useListSkillsQuery       — lista paginada
 *   - useListSkillFilesQuery   — árvore de arquivos por skill (lazy)
 *   - CreateSkillDialog        — modal de criação
 *
 * Edição abre /skills/:id/edit (rota upstream).
 */

interface TreeEntry {
  name: string;
  type: 'file' | 'folder';
  path: string;
  depth: number;
}

function flattenFileTree(files: TSkillFile[]): TreeEntry[] {
  const result: TreeEntry[] = [{ name: 'SKILL.md', type: 'file', path: 'SKILL.md', depth: 0 }];
  const folderSeen = new Set<string>();
  const sorted = [...files].sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  for (const file of sorted) {
    const segments = file.relativePath.split('/').filter(Boolean);
    if (segments.length === 0) continue;
    for (let i = 0; i < segments.length - 1; i++) {
      const folderPath = segments.slice(0, i + 1).join('/');
      if (!folderSeen.has(folderPath)) {
        folderSeen.add(folderPath);
        result.push({
          name: segments[i],
          type: 'folder',
          path: folderPath,
          depth: i,
        });
      }
    }
    result.push({
      name: segments[segments.length - 1],
      type: 'file',
      path: file.relativePath,
      depth: segments.length - 1,
    });
  }
  return result;
}

function SkillFileTree({ skillId }: { skillId: string }) {
  const localize = useLocalize();
  const filesQuery = useListSkillFilesQuery(skillId);
  const entries = useMemo(
    () => flattenFileTree(filesQuery.data?.files ?? []),
    [filesQuery.data],
  );

  if (filesQuery.isLoading) {
    return (
      <div className="border-t border-border-light px-4 py-3">
        <Spinner className="size-3 text-text-tertiary" />
      </div>
    );
  }

  if (filesQuery.isError) {
    return (
      <div className="border-t border-border-light px-4 py-2 font-mono text-[12px] text-text-destructive">
        {localize('com_ui_skill_file_load_error')}
      </div>
    );
  }

  return (
    <div className="border-t border-border-light px-4 py-2 font-mono text-[12px] text-text-secondary">
      {entries.map((entry) => (
        <div
          key={`${entry.type}-${entry.path}`}
          className="py-0.5"
          style={{ paddingLeft: `${entry.depth * 12}px` }}
        >
          {entry.type === 'folder' ? `📁 ${entry.name}/` : `📄 ${entry.name}`}
        </div>
      ))}
    </div>
  );
}

function SkillRow({ skill }: { skill: TSkillSummary }) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const hasFiles = skill.fileCount > 0;
  const filesLabel =
    skill.fileCount === 1
      ? `1 ${localize('com_ui_file').toLowerCase()}`
      : `${skill.fileCount} ${localize('com_ui_files').toLowerCase()}`;

  return (
    <div className="rounded-lg border border-border-light bg-surface-secondary">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-surface-active text-text-secondary">
          <ExternalLink className="size-[15px]" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="min-w-0 truncate font-medium text-text-primary">{skill.name}</span>
        {skill.alwaysApply === true && (
          <span
            className="shrink-0 rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-medium text-brand"
            title={localize('com_ui_skills_always_apply_pin_title')}
          >
            {localize('com_ui_skill_pinned')}
          </span>
        )}
        <span className="ml-auto shrink-0 text-[11px] text-text-tertiary">{filesLabel}</span>
        {hasFiles && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
            aria-expanded={expanded}
            aria-label={localize('com_ui_show_files')}
          >
            <ChevronDown
              className={cn('size-[14px] transition-transform', !expanded && '-rotate-90')}
              strokeWidth={1.9}
              aria-hidden="true"
            />
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate(`/skills/${skill._id}/edit`)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
          aria-label={localize('com_ui_edit')}
        >
          <Pencil className="size-[14px]" strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
      {hasFiles && expanded && <SkillFileTree skillId={skill._id} />}
    </div>
  );
}

/**
 * Dropdown que oferece "Escrever instruções" e "Importar" — mantém o caminho
 * de upload de skills (.zip / .skill) que existe no LibreChat vanilla via
 * `CreateSkillMenu`. Reusado tanto no botão azul do header quanto no botão
 * dashed do fim da lista.
 */
function CreateSkillButton({
  variant,
  onWrite,
  onUpload,
}: {
  variant: 'brand' | 'dashed';
  onWrite: () => void;
  onUpload: () => void;
}) {
  const localize = useLocalize();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = `skills-create-menu-${variant}`;

  const triggerClass =
    variant === 'brand'
      ? 'flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-[13px] font-medium text-brand-fg transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand'
      : 'flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-medium py-3 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-hover';

  const label =
    variant === 'brand'
      ? localize('com_ui_create_skill')
      : localize('com_ui_create_new_skill');

  return (
    <DropdownPopup
      menuId={menuId}
      isOpen={menuOpen}
      setIsOpen={setMenuOpen}
      portal
      trigger={
        <Ariakit.MenuButton aria-label={label} className={triggerClass}>
          <Plus className="h-[15px] w-[15px]" strokeWidth={2} aria-hidden="true" />
          {label}
        </Ariakit.MenuButton>
      }
      items={[
        {
          id: 'write',
          label: localize('com_ui_skill_write_instructions'),
          icon: <PenLine className="size-4 text-text-primary" aria-hidden="true" />,
          onClick: () => {
            setMenuOpen(false);
            onWrite();
          },
        },
        {
          id: 'upload',
          label: localize('com_ui_skill_upload'),
          icon: <Upload className="size-4 text-text-primary" aria-hidden="true" />,
          onClick: () => {
            setMenuOpen(false);
            onUpload();
          },
        },
      ]}
      className="min-w-[220px]"
    />
  );
}

export default function SkillsPage() {
  const localize = useLocalize();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 250);
  const [writeOpen, setWriteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const hasUseAccess = useHasAccess({
    permissionType: PermissionTypes.SKILLS,
    permission: Permissions.USE,
  });
  const hasCreateAccess = useHasAccess({
    permissionType: PermissionTypes.SKILLS,
    permission: Permissions.CREATE,
  });

  const listQuery = useListSkillsQuery(
    { search: debouncedSearch || undefined, limit: 50 },
    { enabled: hasUseAccess },
  );

  const skills = useMemo(() => listQuery.data?.skills ?? [], [listQuery.data]);

  const cta = hasCreateAccess && (
    <CreateSkillButton
      variant="brand"
      onWrite={() => setWriteOpen(true)}
      onUpload={() => setUploadOpen(true)}
    />
  );

  return (
    <LibraryPageLayout
      title={localize('com_ui_skills')}
      subtitle={localize('com_ui_skills_subtitle')}
      maxWidth="max-w-4xl"
      action={cta}
    >
      {skills.length > 5 && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-border-medium bg-surface-primary px-2.5 text-text-tertiary">
          <Search className="size-3.5" strokeWidth={1.9} aria-hidden="true" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={localize('com_ui_search_skills')}
            aria-label={localize('com_ui_search_skills')}
            className="h-8 w-full bg-transparent text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
        </div>
      )}

      {listQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="text-text-tertiary" />
        </div>
      ) : skills.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-medium bg-surface-secondary p-10 text-center">
          <p className="text-sm font-medium text-text-primary">
            {localize('com_ui_skills_empty')}
          </p>
          {hasCreateAccess && (
            <CreateSkillButton
              variant="brand"
              onWrite={() => setWriteOpen(true)}
              onUpload={() => setUploadOpen(true)}
            />
          )}
        </div>
      ) : (
        <div className="space-y-2" role="list" aria-label={localize('com_ui_skills')}>
          {skills.map((skill) => (
            <div key={skill._id} role="listitem">
              <SkillRow skill={skill} />
            </div>
          ))}
          {hasCreateAccess && (
            <CreateSkillButton
              variant="dashed"
              onWrite={() => setWriteOpen(true)}
              onUpload={() => setUploadOpen(true)}
            />
          )}
        </div>
      )}

      <CreateSkillDialog isOpen={writeOpen} setIsOpen={setWriteOpen} />
      <UploadSkillDialog isOpen={uploadOpen} setIsOpen={setUploadOpen} />
    </LibraryPageLayout>
  );
}
