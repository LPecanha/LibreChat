import React, { useMemo, useEffect } from 'react';
import { Spinner } from '@librechat/client';
import { Plus } from 'lucide-react';
import { PermissionBits } from 'librechat-data-provider';
import type t from 'librechat-data-provider';
import { useMarketplaceAgentsInfiniteQuery } from '~/data-provider/Agents';
import { useAgentCategories, useLocalize } from '~/hooks';
import { useInfiniteScroll } from '~/hooks/useInfiniteScroll';
import { useHasData } from './SmartLoader';
import ErrorDisplay from './ErrorDisplay';
import AgentCard from './AgentCard';

interface AgentGridProps {
  category: string;
  searchQuery: string;
  onSelectAgent: (agent: t.Agent) => void;
  /** [EXT] Phase J.13 Navvia: callback do tile "+ Criar agente" no empty state.
   *  Marketplace passa startCreateAgent (que abre newConversation com endpoint=agents). */
  onCreateAgent?: () => void;
  scrollElementRef?: React.RefObject<HTMLElement>;
}

/**
 * Component for displaying a grid of agent cards
 */
const AgentGrid: React.FC<AgentGridProps> = ({
  category,
  searchQuery,
  onSelectAgent,
  onCreateAgent,
  scrollElementRef,
}) => {
  const localize = useLocalize();

  // Get category data from API
  const { categories } = useAgentCategories();

  // Build query parameters based on current state
  const queryParams = useMemo(() => {
    const params: {
      requiredPermission: number;
      category?: string;
      search?: string;
      limit: number;
      promoted?: 0 | 1;
    } = {
      requiredPermission: PermissionBits.VIEW, // View permission for marketplace viewing
      limit: 6,
    };

    // Handle search
    if (searchQuery) {
      params.search = searchQuery;
      // Include category filter for search if it's not 'all' or 'promoted'
      if (category !== 'all' && category !== 'promoted') {
        params.category = category;
      }
    } else {
      // Handle category-based queries
      if (category === 'promoted') {
        params.promoted = 1;
      } else if (category !== 'all') {
        params.category = category;
      }
      // For 'all' category, no additional filters needed
    }

    return params;
  }, [category, searchQuery]);

  // Use infinite query for marketplace agents
  const {
    data,
    isLoading,
    error,
    isFetching,
    fetchNextPage,
    hasNextPage,
    refetch,
    isFetchingNextPage,
  } = useMarketplaceAgentsInfiniteQuery(queryParams);

  // Flatten all pages into a single array of agents
  const currentAgents = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data || []);
  }, [data?.pages]);

  // Check if we have meaningful data to prevent unnecessary loading states
  const hasData = useHasData(data?.pages?.[0]);

  // Set up infinite scroll
  const { setScrollElement } = useInfiniteScroll({
    hasNextPage,
    isLoading: isFetching || isFetchingNextPage,
    fetchNextPage: () => {
      if (hasNextPage && !isFetching) {
        fetchNextPage();
      }
    },
    threshold: 0.8, // Trigger when 80% scrolled
    throttleMs: 200,
  });

  // Connect the scroll element when it's provided
  useEffect(() => {
    const scrollElement = scrollElementRef?.current;
    if (scrollElement) {
      setScrollElement(scrollElement);
    }
  }, [scrollElementRef, setScrollElement]);

  /**
   * Get category display name from API data or use fallback
   */
  const getCategoryDisplayName = (categoryValue: string) => {
    const categoryData = categories.find((cat) => cat.value === categoryValue);
    if (categoryData) {
      return categoryData.label;
    }

    // Fallback for special categories or unknown categories
    if (categoryValue === 'promoted') {
      return localize('com_agents_top_picks');
    }
    if (categoryValue === 'all') {
      return 'All';
    }

    // Simple capitalization for unknown categories
    return categoryValue.charAt(0).toUpperCase() + categoryValue.slice(1);
  };

  /* [EXT] Phase I.5 Navvia: loading state usa .skeleton em vez de spinner.
   * Reduz CLS quando agentes carregam (cards já têm placeholder do tamanho). */
  const loadingSpinner = (
    <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skeleton h-32 md:h-36 lg:h-40 rounded-xl" />
      ))}
    </div>
  );

  // Handle error state with enhanced error display
  if (error) {
    return (
      <ErrorDisplay
        error={error || 'Unknown error occurred'}
        onRetry={() => refetch()}
        context={{
          searchQuery,
          category,
        }}
      />
    );
  }

  // Main content component with proper semantic structure
  const mainContent = (
    <div
      className="space-y-6"
      role="tabpanel"
      id={`category-panel-${category}`}
      aria-labelledby={`category-tab-${category}`}
      aria-live="polite"
      aria-busy={isLoading && !hasData}
    >
      {/* Handle empty results with enhanced accessibility */}
      {(!currentAgents || currentAgents.length === 0) && !isLoading && !isFetching ? (
        /* [EXT] Phase J.11 Navvia: empty state = grid com tile "+ Criar novo agente"
         * (ui-preview.html linha 772) em vez de "Nenhum agente encontrado" centralizado.
         * Quando há busca, mantém o feedback textual acima do tile. */
        <div>
          {searchQuery && (
            <p
              className="mt-5 text-center text-[13px] text-text-tertiary"
              role="status"
              aria-live="polite"
            >
              {localize('com_agents_search_empty_heading')}
            </p>
          )}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <button
              type="button"
              onClick={onCreateAgent}
              className="agent-card border-dashed text-center"
              style={{ alignItems: 'center', justifyContent: 'center' }}
              aria-label={localize('com_ui_create_agent')}
            >
              <div
                className="agent-ico"
                style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
                aria-hidden="true"
              >
                <Plus className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="font-medium">{localize('com_ui_create_agent')}</div>
              <div className="text-[12px] leading-snug text-text-tertiary">
                {localize('com_agents_create_subtitle')}
              </div>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Announcement for screen readers */}
          <div id="search-results-count" className="sr-only" aria-live="polite" aria-atomic="true">
            {localize('com_agents_grid_announcement', {
              count: currentAgents?.length || 0,
              category: getCategoryDisplayName(category),
            })}
          </div>

          {/* [EXT] Phase J.18 Navvia: grid 1/2/3 cols (proto linha 735) + tile dashed
           * "+ Criar novo agente" no fim da lista (proto linha 772). */}
          {currentAgents && currentAgents.length > 0 && (
            <div
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
              role="grid"
              aria-label={localize('com_agents_grid_announcement', {
                count: currentAgents.length,
                category: getCategoryDisplayName(category),
              })}
            >
              {currentAgents.map((agent: t.Agent, index: number) => (
                <div key={`${agent.id}-${index}`} role="gridcell">
                  <AgentCard agent={agent} onSelect={onSelectAgent} />
                </div>
              ))}
              {onCreateAgent && !hasNextPage && (
                <div role="gridcell">
                  <button
                    type="button"
                    onClick={onCreateAgent}
                    className="agent-card h-full w-full border-dashed text-center"
                    style={{ alignItems: 'center', justifyContent: 'center' }}
                    aria-label={localize('com_ui_create_agent')}
                  >
                    <div
                      className="agent-ico"
                      style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
                      aria-hidden="true"
                    >
                      <Plus className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <div className="font-medium">{localize('com_ui_create_agent')}</div>
                    <div className="text-[12px] leading-snug text-text-tertiary">
                      {localize('com_agents_create_subtitle')}
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Loading indicator when fetching more with accessibility */}
          {isFetchingNextPage && (
            <div
              className="flex justify-center py-8"
              role="status"
              aria-live="polite"
              aria-label={localize('com_agents_loading')}
            >
              <Spinner className="h-6 w-6 text-primary" />
              <span className="sr-only">{localize('com_agents_loading')}</span>
            </div>
          )}

          {/* End of results indicator */}
          {!hasNextPage && currentAgents && currentAgents.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-sm text-text-secondary">
                {localize('com_agents_no_more_results')}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (isLoading || (isFetching && !isFetchingNextPage)) {
    return loadingSpinner;
  }
  return mainContent;
};

export default AgentGrid;
