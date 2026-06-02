import React, { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce, useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface SearchBarProps {
  /** Current search query value */
  value: string;
  /** Callback fired when the search query changes */
  onSearch: (query: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * [EXT] Phase J.12 Navvia: SearchBar dense alinhado com o protótipo
 * (design/ui-preview.html linha 730):
 *
 *   <div class="ctrl ml-auto mb-1.5 flex w-56 items-center gap-2
 *               rounded-md border border-border-medium bg-surface-primary
 *               px-2.5 text-text-tertiary">
 *     <svg width=13 height=13 stroke-width=1.9 />
 *     <input placeholder="Buscar agentes" class="bg-transparent
 *                text-[12.5px] placeholder:text-text-tertiary" />
 *   </div>
 *
 * O `.ctrl` define height: var(--row-h) = 32px. Container w-56 (224px),
 * border-medium (#d6dae0), bg-surface-primary. Sem shadow, sem h-12.
 * Search com 300ms debounce — mantém UX upstream.
 */
const SearchBar: React.FC<SearchBarProps> = ({ value, onSearch, className = '' }) => {
  const localize = useLocalize();
  const [searchTerm, setSearchTerm] = useState(value);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    if (debouncedSearchTerm !== value && debouncedSearchTerm === searchTerm) {
      onSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onSearch, value, searchTerm]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleClear = useCallback(() => {
    onSearch('');
    setSearchTerm('');
  }, [onSearch]);

  return (
    <div
      className={cn(
        'flex h-8 w-56 items-center gap-2 rounded-md border border-border-medium bg-surface-primary px-2.5 text-text-tertiary',
        className,
      )}
      role="search"
    >
      <label htmlFor="agent-search" className="sr-only">
        {localize('com_agents_search_instructions')}
      </label>
      <Search className="h-[13px] w-[13px] shrink-0" strokeWidth={1.9} aria-hidden="true" />
      <input
        id="agent-search"
        type="text"
        value={searchTerm}
        onChange={handleChange}
        placeholder={localize('com_agents_search_placeholder')}
        className="w-full bg-transparent text-[12.5px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
        aria-label={localize('com_agents_search_aria')}
        aria-describedby="search-instructions search-results-count"
        autoComplete="off"
        spellCheck="false"
      />
      <div id="search-instructions" className="sr-only">
        {localize('com_agents_search_instructions')}
      </div>
      {searchTerm && (
        <button
          type="button"
          onClick={handleClear}
          className="grid h-4 w-4 shrink-0 place-items-center rounded text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
          aria-label={localize('com_agents_clear_search')}
          title={localize('com_agents_clear_search')}
        >
          <X className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
