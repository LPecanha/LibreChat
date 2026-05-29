import DOMPurify from 'dompurify';
import { XIcon } from 'lucide-react';
import { useRecoilState } from 'recoil';
import { Button, cn } from '@librechat/client';
import { useEffect, useMemo, useRef } from 'react';
import { useGetBannerQuery } from '~/data-provider';
import store from '~/store';

export const Banner = ({ onHeightChange }: { onHeightChange?: (height: number) => void }) => {
  const { data: banner } = useGetBannerQuery();
  const [hideBannerHint, setHideBannerHint] = useRecoilState<string[]>(store.hideBannerHint);
  const bannerRef = useRef<HTMLDivElement>(null);

  const sanitizedMessage = useMemo(() => {
    if (!banner?.message) {
      return '';
    }
    const sanitizer = DOMPurify();
    sanitizer.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });
    return sanitizer.sanitize(banner.message, {
      ALLOWED_TAGS: ['a', 'strong', 'b', 'em', 'i', 'br', 'code', 'span'],
      ALLOWED_ATTR: ['href', 'class', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: false,
    });
  }, [banner?.message]);

  useEffect(() => {
    if (onHeightChange && bannerRef.current) {
      onHeightChange(bannerRef.current.offsetHeight);
    }
  }, [banner, hideBannerHint, onHeightChange]);

  if (
    !banner ||
    (banner.bannerId && !banner.persistable && hideBannerHint.includes(banner.bannerId))
  ) {
    return null;
  }

  const onClick = () => {
    if (banner.persistable) {
      return;
    }

    setHideBannerHint([...hideBannerHint, banner.bannerId]);

    if (onHeightChange) {
      onHeightChange(0);
    }
  };

  return (
    /* [EXT] Phase I.3 Navvia — Banner global usa estilo #appBanner do
     * protótipo (linhas 275-279): bg brand-soft + text-brand + border-b
     * border-light, ícone close à direita com opacity hover. Persiste no
     * tema light/dark via tokens semânticos. */
    <div
      ref={bannerRef}
      className="sticky top-0 z-20 flex items-center gap-2 border-b border-border-light bg-brand-soft px-3.5 py-2 text-[13px] text-brand md:relative"
    >
      <div
        className={cn(
          'flex-1 truncate [&_a]:underline [&_a]:font-medium',
          !banner.persistable && 'pr-2',
        )}
        dangerouslySetInnerHTML={{ __html: sanitizedMessage }}
      />
      {!banner.persistable && (
        <button
          type="button"
          aria-label="Dismiss banner"
          onClick={onClick}
          className="grid h-6 w-6 place-items-center rounded text-brand opacity-70 transition-opacity hover:opacity-100"
        >
          <XIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
