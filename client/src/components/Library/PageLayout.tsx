import type { ReactNode } from 'react';
import { cn } from '~/utils';

/**
 * [EXT] Phase J.14 Navvia: layout reusável para as views da Biblioteca
 * (Memórias / Arquivos / Bookmarks / MCP). Bate com o padrão das seções
 * #view-memories / #view-files / #view-bookmarks / #view-mcp do protótipo
 * HTML (design/ui-preview.html linhas 887-956):
 *
 *   <section class="view h-full flex-col overflow-y-auto">
 *     <div class="mx-auto w-full max-w-{3,4,5}xl px-6 py-10">
 *       <div class="flex items-center gap-3">    <-- header row
 *         <div>
 *           <h1>Title</h1>
 *           <p>subtitle</p>
 *         </div>
 *         <button class="ml-auto bg-brand">CTA</button>
 *       </div>
 *       {children}                                <-- conteúdo
 *     </div>
 *   </section>
 *
 * Cada page wrapper passa max-w + título + CTA opcional + children.
 */
export default function LibraryPageLayout({
  title,
  subtitle,
  action,
  maxWidth = 'max-w-4xl',
  children,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  maxWidth?: 'max-w-3xl' | 'max-w-4xl' | 'max-w-5xl';
  children: ReactNode;
}) {
  return (
    <section className="view flex h-full w-full flex-col overflow-y-auto bg-presentation">
      <div className={cn('mx-auto w-full px-6 py-10', maxWidth)}>
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-display text-[24px] font-bold tracking-tight text-text-primary">
              {title}
            </h1>
            <p className="mt-0.5 text-[14px] text-text-secondary">{subtitle}</p>
          </div>
          {action && <div className="ml-auto shrink-0">{action}</div>}
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}
