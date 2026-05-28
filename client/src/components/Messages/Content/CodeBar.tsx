import React from 'react';
import { InfoIcon } from 'lucide-react';
import type { CodeBarProps } from '~/common';
import useCopyCode from '~/components/Messages/Content/useCopyCode';
import CopyButton from '~/components/Messages/Content/CopyButton';
import LangIcon from '~/components/Messages/Content/LangIcon';
import RunCode from '~/components/Messages/Content/RunCode';
import { useLocalize } from '~/hooks';

const CodeBar: React.FC<CodeBarProps> = React.memo(
  ({ lang, error, codeRef, blockIndex, plugin = null, allowExecution = true }) => {
    const localize = useLocalize();
    const { isCopied, handleCopy } = useCopyCode(codeRef);

    // [EXT] Phase E Navvia: usar .codeblock-bar do protótipo
    // (bg surface-tertiary, padding 6px 12px, font 11px, lang monospace)
    return (
      <div className="codeblock-bar">
        <span className="lang flex items-center gap-1.5">
          <LangIcon lang={lang} className="size-3" />
          {lang}
        </span>
        {plugin === true ? (
          <InfoIcon className="ml-auto flex h-4 w-4 gap-2 text-text-secondary" />
        ) : (
          <div className="acts">
            {allowExecution === true && (
              <RunCode lang={lang} codeRef={codeRef} blockIndex={blockIndex} />
            )}
            {error !== true && (
              <CopyButton
                isCopied={isCopied}
                onClick={handleCopy}
                label={localize('com_ui_copy_code')}
              />
            )}
          </div>
        )}
      </div>
    );
  },
);

export default CodeBar;
