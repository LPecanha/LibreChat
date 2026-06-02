import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useMediaQuery } from '@librechat/client';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import type t from 'librechat-data-provider';
import { useDocumentTitle, useHasAccess, useLocalize, TranslationKeys } from '~/hooks';
import { useGetEndpointsQuery, useGetAgentCategoriesQuery, useGetStartupConfig } from '~/data-provider'; // [EXT] startupConfig for dynamic app title
import MarketplaceAdminSettings from './MarketplaceAdminSettings';
import OpenSidebar from '~/components/Chat/Menus/OpenSidebar';
import { SidePanelGroup } from '~/components/SidePanel';
import CategoryTabs from './CategoryTabs';
import SearchBar from './SearchBar';
import AgentGrid from './AgentGrid';
import { cn } from '~/utils';

interface AgentMarketplaceProps {
  className?: string;
}

/**
 * AgentMarketplace - Main component for browsing and discovering agents
 *
 * Provides tabbed navigation for different agent categories,
 * search functionality, and detailed agent view through a modal dialog.
 * Uses URL parameters for state persistence and deep linking.
 */
const AgentMarketplace: React.FC<AgentMarketplaceProps> = ({ className = '' }) => {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  // Get URL parameters
  const searchQuery = searchParams.get('q') || '';

  // Animation state
  type Direction = 'left' | 'right';
  // Initialize with a default value to prevent rendering issues
  const [displayCategory, setDisplayCategory] = useState<string>(category || 'all');
  const [nextCategory, setNextCategory] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [animationDirection, setAnimationDirection] = useState<Direction>('right');

  /* [EXT] Phase J.11 Navvia: sub-tabs Destaques / Meus agentes / Da organização
   * (design/ui-preview.html linha 727-729). "Destaques" mapeia para promoted,
   * "Da organização" para all; "Meus agentes" filtra por owner client-side
   * (vai a 'all' por enquanto até existir filtro server-side). Default = promoted,
   * igual ao protótipo. */
  type AgentView = 'promoted' | 'mine' | 'org';
  const [agentView, setAgentView] = useState<AgentView>(
    () => (category === 'all' ? 'org' : 'promoted'),
  );

  // Ref for the scrollable container to enable infinite scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // [EXT] Use dynamic app title (Navvia / outros tenants white-label) em vez de "LibreChat" hardcoded
  const { data: startupConfig } = useGetStartupConfig();
  const appTitle = startupConfig?.appTitle || 'LibreChat';
  useDocumentTitle(`${localize('com_agents_marketplace')} | ${appTitle}`);

  // Ensure endpoints config is loaded first (required for agent queries)
  useGetEndpointsQuery();

  // Fetch categories using existing query pattern
  const categoriesQuery = useGetAgentCategoriesQuery({
    staleTime: 1000 * 60 * 15, // 15 minutes - categories rarely change
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  // Handle initial category when on /agents without a category
  useEffect(() => {
    if (
      !category &&
      window.location.pathname === '/agents' &&
      categoriesQuery.data &&
      displayCategory === 'all'
    ) {
      const hasPromoted = categoriesQuery.data.some((cat) => cat.value === 'promoted');
      if (hasPromoted) {
        // If promoted exists, update display to show it
        setDisplayCategory('promoted');
      }
    }
  }, [category, categoriesQuery.data, displayCategory]);

  /**
   * Handle agent card selection - updates URL for deep linking
   */
  const handleAgentSelect = (agent: t.Agent) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('agent_id', agent.id);
    setSearchParams(newParams);
  };

  /**
   * Determine ordered tabs to compute indices for direction
   */
  const orderedTabs = useMemo<string[]>(() => {
    const dynamic = (categoriesQuery.data || []).map((c) => c.value);
    // Only include values that actually exist in the categories
    const set = new Set<string>(dynamic);
    return Array.from(set);
  }, [categoriesQuery.data]);

  const getTabIndex = useCallback(
    (tab: string): number => {
      const idx = orderedTabs.indexOf(tab);
      return idx >= 0 ? idx : 0;
    },
    [orderedTabs],
  );

  /**
   * Handle category tab selection changes with directional animation
   */
  const handleTabChange = (tabValue: string) => {
    if (tabValue === displayCategory || isTransitioning) {
      // Ignore redundant or rapid clicks during transition
      return;
    }

    const currentIndex = getTabIndex(displayCategory);
    const newIndex = getTabIndex(tabValue);
    const direction: Direction = newIndex > currentIndex ? 'right' : 'left';

    setAnimationDirection(direction);
    setNextCategory(tabValue);
    setIsTransitioning(true);

    // Update URL immediately, preserving current search params
    const currentSearchParams = searchParams.toString();
    const searchParamsStr = currentSearchParams ? `?${currentSearchParams}` : '';
    if (tabValue === 'promoted') {
      navigate(`/agents${searchParamsStr}`);
    } else {
      navigate(`/agents/${tabValue}${searchParamsStr}`);
    }

    // Complete transition after 300ms
    window.setTimeout(() => {
      setDisplayCategory(tabValue);
      setNextCategory(null);
      setIsTransitioning(false);
    }, 300);
  };

  /**
   * Sync display when URL changes externally (back/forward)
   */
  useEffect(() => {
    if (category && category !== displayCategory && !isTransitioning) {
      // URL changed externally, update display without animation
      setDisplayCategory(category);
    }
  }, [category, displayCategory, isTransitioning]);

  // No longer needed with keyframes

  /**
   * Handle search query changes
   *
   * @param query - The search query string
   */
  const handleSearch = (query: string) => {
    const newParams = new URLSearchParams(searchParams);
    const currentCategory = displayCategory;

    if (query.trim()) {
      newParams.set('q', query.trim());
    } else {
      newParams.delete('q');
    }

    // Always preserve current category when searching or clearing search
    if (currentCategory === 'promoted') {
      navigate(`/agents${newParams.toString() ? `?${newParams.toString()}` : ''}`);
    } else {
      navigate(
        `/agents/${currentCategory}${newParams.toString() ? `?${newParams.toString()}` : ''}`,
      );
    }
  };

  const hasAccessToMarketplace = useHasAccess({
    permissionType: PermissionTypes.MARKETPLACE,
    permission: Permissions.USE,
  });
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (!hasAccessToMarketplace) {
      timeoutId = setTimeout(() => {
        navigate('/c/new');
      }, 1000);
    }
    return () => {
      clearTimeout(timeoutId);
    };
  }, [hasAccessToMarketplace, navigate]);

  if (!hasAccessToMarketplace) {
    return null;
  }
  return (
    <div className={`relative flex w-full grow overflow-hidden bg-presentation ${className}`}>
      <SidePanelGroup>
        <main className="flex h-full flex-col overflow-hidden" role="main">
          {/* Scrollable container */}
          <div
            ref={scrollContainerRef}
            className="scrollbar-gutter-stable relative flex h-full flex-col overflow-y-auto overflow-x-hidden"
          >
            {/* [EXT] Navvia Phase J.11: layout final do protótipo (max-w-5xl, py-10).
             * Row 1 header + Criar agente · Row 2 sub-tabs (underline) + search inline
             * · Row 3 category chips · Row 4 grid. */}
            <div className="container mx-auto max-w-5xl px-6 py-10">
              {!isSmallScreen && (
                <div className="flex items-center gap-3">
                  <div>
                    <h1 className="font-display text-[24px] font-bold tracking-tight text-text-primary">
                      {localize('com_ui_agents')}
                    </h1>
                    <p className="mt-0.5 text-[14px] text-text-secondary">
                      {localize('com_agents_marketplace_subtitle')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/c/new?createAgent=1')}
                    className="ml-auto flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-[13px] font-medium text-brand-fg transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    {localize('com_ui_create_agent')}
                  </button>
                </div>
              )}

              {/* Row 2: sub-tabs + search inline (sticky) */}
              <div className="sticky top-0 z-10 mt-5 bg-presentation">
                <div className="mx-auto mb-3 flex items-center justify-between gap-2 md:hidden">
                  <OpenSidebar />
                  <MarketplaceAdminSettings compact />
                </div>
                <div className="flex items-center gap-2 border-b border-border-light">
                  {([
                    { id: 'promoted' as const, key: 'com_agents_tab_featured' as const },
                    { id: 'mine' as const, key: 'com_agents_tab_mine' as const },
                    { id: 'org' as const, key: 'com_agents_tab_org' as const },
                  ]).map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setAgentView(sub.id);
                        const target = sub.id === 'promoted' ? 'promoted' : 'all';
                        if (target !== displayCategory) handleTabChange(target);
                      }}
                      className={cn(
                        '-mb-px border-b-2 px-1 pb-2.5 text-[13px] transition-colors',
                        agentView === sub.id
                          ? 'border-brand font-semibold text-text-primary'
                          : 'border-transparent font-medium text-text-tertiary hover:text-text-primary',
                      )}
                    >
                      {localize(sub.key)}
                    </button>
                  ))}
                  <div className="ml-auto mb-1.5 flex w-56 shrink-0 items-center gap-2">
                    <SearchBar value={searchQuery} onSearch={handleSearch} />
                    <div className="hidden md:block">
                      <MarketplaceAdminSettings />
                    </div>
                  </div>
                </div>

                {/* Row 3: category chips */}
                <div className="mt-4 pb-4">
                  <CategoryTabs
                    categories={categoriesQuery.data || []}
                    activeTab={displayCategory}
                    isLoading={categoriesQuery.isLoading}
                    onChange={handleTabChange}
                  />
                </div>
              </div>
            {/* Scrollable content area */}
            <div className="pb-8">
              {/* Two-pane animated container wrapping category header + grid */}
              <div className="relative overflow-hidden">
                {/* Current content pane */}
                <div
                  className={cn(
                    isTransitioning &&
                      (animationDirection === 'right'
                        ? 'motion-safe:animate-slide-out-left'
                        : 'motion-safe:animate-slide-out-right'),
                  )}
                  key={`pane-current-${displayCategory}`}
                >
                  {/* [EXT] Phase J.10 Navvia: subheader "Todos os Agentes" só aparece
                   * quando é uma categoria específica (não 'all' nem 'promoted'). O
                   * protótipo vai direto pros cards sem repetir o título da seção. */}
                  {!searchQuery && displayCategory !== 'all' && displayCategory !== 'promoted' && (
                    <div className="mb-4 mt-4">
                      {(() => {
                        const categoryData = categoriesQuery.data?.find(
                          (cat) => cat.value === displayCategory,
                        );
                        if (!categoryData) return null;
                        const name = categoryData.label?.startsWith('com_')
                          ? localize(categoryData.label as TranslationKeys)
                          : categoryData.label;
                        const description = categoryData.description?.startsWith('com_')
                          ? localize(categoryData.description as TranslationKeys)
                          : categoryData.description || '';
                        return (
                          <div className="text-left">
                            <h2 className="font-display text-[15px] font-semibold text-text-primary">{name}</h2>
                            {description && (
                              <p className="mt-0.5 text-[12.5px] text-text-tertiary">{description}</p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Agent grid */}
                  <AgentGrid
                    key={`grid-${displayCategory}`}
                    category={displayCategory}
                    searchQuery={searchQuery}
                    onSelectAgent={handleAgentSelect}
                    scrollElementRef={scrollContainerRef}
                  />
                </div>

                {/* Next content pane, only during transition */}
                {isTransitioning && nextCategory && (
                  <div
                    className={cn(
                      'absolute inset-0',
                      animationDirection === 'right'
                        ? 'motion-safe:animate-slide-in-right'
                        : 'motion-safe:animate-slide-in-left',
                    )}
                    key={`pane-next-${nextCategory}-${animationDirection}`}
                  >
                    {/* [EXT] Phase J.10: subheader só p/ categorias específicas (não 'all' nem 'promoted') */}
                    {!searchQuery && nextCategory !== 'all' && nextCategory !== 'promoted' && (
                      <div className="mb-4 mt-4">
                        {(() => {
                          const categoryData = categoriesQuery.data?.find(
                            (cat) => cat.value === nextCategory,
                          );
                          if (!categoryData) return null;
                          const name = categoryData.label?.startsWith('com_')
                            ? localize(categoryData.label as TranslationKeys)
                            : categoryData.label;
                          const description = categoryData.description?.startsWith('com_')
                            ? localize(categoryData.description as Parameters<typeof localize>[0])
                            : categoryData.description || '';
                          return (
                            <div className="text-left">
                              <h2 className="font-display text-[15px] font-semibold text-text-primary">{name}</h2>
                              {description && (
                                <p className="mt-0.5 text-[12.5px] text-text-tertiary">{description}</p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Agent grid */}
                    <AgentGrid
                      key={`grid-${nextCategory}`}
                      category={nextCategory}
                      searchQuery={searchQuery}
                      onSelectAgent={handleAgentSelect}
                      scrollElementRef={scrollContainerRef}
                    />
                  </div>
                )}

                {/* Note: Using Tailwind keyframes for slide in/out animations */}
              </div>
            </div>
            </div>
          </div>
        </main>
      </SidePanelGroup>
    </div>
  );
};

export default AgentMarketplace;
