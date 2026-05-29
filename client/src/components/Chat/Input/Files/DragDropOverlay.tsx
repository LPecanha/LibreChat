import { memo } from 'react';
import { Upload } from 'lucide-react';
import { useLocalize } from '~/hooks';

interface DragDropOverlayProps {
  isActive: boolean;
}

/* [EXT] Phase H.1 Navvia — DragDropOverlay refeito para usar .drop-overlay
 * do protótipo (linhas 207-209): inset 8px, border 2.5px dashed brand,
 * bg brand-soft, backdrop blur. Conteúdo central: ícone Upload + label.
 *
 * Anterior: overlay full-bleed black/40 + SVG ilustrado com cores
 * hardcoded (#AFC1FF / #7989FF / #3C46FF) + box branco com shadow.
 *
 * Novo: visual minimalista alinhado com o protótipo. Apenas border
 * dashed brand pulsante e ícone Upload central + label "Solte aqui
 * para anexar".
 */
const DragDropOverlay = memo(({ isActive }: DragDropOverlayProps) => {
  const localize = useLocalize();
  return (
    <div
      className={`drop-overlay ${isActive ? 'on' : ''}`}
      aria-hidden={!isActive}
    >
      <div className="flex flex-col items-center gap-2 text-brand">
        <Upload className="h-8 w-8" strokeWidth={1.6} aria-hidden="true" />
        <span className="font-medium">{localize('com_ui_drag_drop')}</span>
        <span className="text-[11px] text-text-tertiary">{localize('com_ui_upload_files')}</span>
      </div>
    </div>
  );
});

DragDropOverlay.displayName = 'DragDropOverlay';

export default DragDropOverlay;
