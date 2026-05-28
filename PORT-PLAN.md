# PORT-PLAN — portar o protótipo HTML pra LibreChat real

> Diagnóstico, escopo e ordem de implementação para portar `design/ui-preview.html`
> (2176 linhas, 13 views, layout completo) pra React/TypeScript dentro do LibreChat,
> preservando integrações reais (auth, websocket, agents, artifacts, billing).

---

## Sumário executivo

O protótipo é um redesign **estrutural** da plataforma — não é só re-skin. Os 19 commits do branch `dev` aplicaram tokens Navvia em cima do LibreChat upstream, mas mantiveram a estrutura visual original. O usuário pediu o oposto: implementar o desenho do protótipo dentro do LibreChat real.

O que **fica** dos commits anteriores:
- Tokens CSS (`--brand`, `--siri-a/b/c`, `--brand-grad-start/end`) — base sólida
- Font Inter Tight carregado
- NavviaLogo / NavviaMark SVG components
- Build tooling (token drift script, baseline screenshots)
- `interface.home: dashboard` flag wired através do backend (fix necessário descoberto)

O que **vai ser substituído**:
- HomeView.tsx atual (versão MVP) → versão completa do protótipo
- UnifiedSidebar (dual-strip upstream) → sidebar-main 280px com brand header
- ChatForm atual → composer estilo protótipo
- Settings modal → estrutura do protótipo
- Mobile (sem tratamento) → drawer + bottom tabs + sheets

---

## Inventário do protótipo (referência única de verdade)

### Sistema de design

| Token / classe | Linha HTML | Onde aplicar no React |
|---|---|---|
| `--row-h`, `--ui-font`, `--msg-font`, `--radius` | 36 | `client/src/style.css :root` |
| `body.density-cozy/compact/comfortable` | 89-91 | Adicionar atributo no `<body>` controlado por Settings |
| `* { transition-timing-function: cubic-bezier(0.22,1,0.36,1); }` | 93-99 | Global em `style.css` |
| `.cta-new` (CTA gradient borda) | 65-68 | Sidebar (Nova conversa) |
| `.navitem.active` (gradient bar esquerda) | 69-71 | Sidebar nav items |
| `.lib-item` (biblioteca com ícone colorido) | 72-74 | Sidebar biblioteca |
| `.credits-card` (gradient envolvente) | 75-78 | Footer sidebar |
| `.search-pill` (pill com kbd) | 84-88 | Sidebar busca |
| `.siri / .siri-hero` (glow conic) | 144-161 | Composer (já temos parcial em Phase 5a — precisa rever opacities) |
| `.tile / .stat / .agent-card / .gallery-thumb` | 430-456 | Home view |
| `.chip` (filtros/sugestões) | 139-141 | Múltiplos lugares |
| `.tool-card / .codeblock-card / .citation / .tbl / .latex-block` | 219-246 | Renderização de mensagens |
| `.thinking` (collapsible raciocínio) | 191-196 | Assistant message |
| `.msg-toolbar` / `.msg-action` (hover actions) | 179-189 | Mensagens (já temos parcial — refactor) |
| `.tts-bar / .model-tag` | 377-385 | Mensagem assistant |
| `.toast / .skeleton / .empty / .error-card` | 280-302 | Sistema global |
| `.starter` (conversation starters) | 401-402 | Chat landing |
| `.seg / .plan / .qr` | 404-411 | Buy credits modal |
| `.rise + d1..d6` (animação cascata) | 414-416 | Tudo que precisar entrar com stagger |
| `.banner` + `.blob-1/2/3` (3 blobs floats) | 439-445 | Home banner |
| `.home-amb` (background ambient gradient) | 421-423 | Home wrapper |
| `[data-pop] > .pop` (popover system) | 121-130 | Substituir Radix Popover atual onde fizer sentido |

### Views (13 totais)

| ID | Linha | Estado atual no LibreChat | Ação |
|---|---|---|---|
| `view-home` | 618-717 | `client/src/components/Home/HomeView.tsx` (MVP — ~10% do conteúdo) | **REESCREVER** linha a linha |
| `view-agents` | 720-776 | `client/src/components/Agents/Marketplace.tsx` (upstream cobre, mas card design difere) | Substituir grid/card components |
| `view-chat` | 778-843 | `client/src/components/Chat/{ChatView,Landing,ChatForm}.tsx` | Refactor pra estrutura do protótipo |
| `view-prompts` | 846-863 | `client/src/components/Prompts/PromptsView.tsx` (upstream) | Adaptar grid e card |
| `view-skills` | 866-884 | upstream tem skills mas UI diferente | Implementar a UI do protótipo |
| `view-memories` | 887-905 | `client/src/components/SidePanel/Memories/` | Reusar lógica, mudar shell visual |
| `view-files` | 907-926 | upstream tem files | Adaptar |
| `view-bookmarks` | 928-941 | `client/src/components/Nav/Bookmarks/` | Adaptar |
| `view-mcp` | 943-957 | upstream tem MCP | Adaptar |
| `view-shared` | 959-980 | `client/src/components/Chat/SharedConversation.tsx` (existe) | Adaptar header |
| `view-states` (gallery demo) | 982-1024 | não existe nem precisa em prod | **SKIP** |
| Builder side panel | 1026-1145 | `client/src/components/SidePanel/Agents/` | Visual refactor |
| Artifacts side panel | 1146-1216 | `client/src/components/Artifacts/` | Visual refactor |

### Modais

| ID | Linha | Estado | Ação |
|---|---|---|---|
| `settingsModal` | 1217-1577 | `client/src/components/Nav/Settings.tsx` (Radix Dialog 8 abas) | Refactor estrutura — header + tab strip + content layout do protótipo |
| `authScreen` | 1578-1664 | `client/src/components/Auth/AuthLayout.tsx` | Refactor — left hero gradient + right form |
| `buyModal` | 1665-1820 | `client/src/components/Nav/BuyCredits/BuyCreditsModal.tsx` | Já refeito em Phase 7b — verificar paridade com protótipo |
| `shareModal`, `exportModal`, `setKeyModal`, `editBadgesModal`, etc. | resto | dispersos no upstream | Visual refactor por dialog |

### Mobile

| Componente | Linha | Estado | Ação |
|---|---|---|---|
| `#mobileTopBar` | 500-504 | não existe | **CRIAR** |
| `#drawerBackdrop` + sidebar drawer | 305-318 | upstream tem drawer mas sem o ambient blur | Ajustar transição e backdrop |
| `#mobileTabs` (bottom 4-tab nav) | 508-513 | não existe | **CRIAR** |
| Sheets fullscreen (modais viram bottom-up) | 326-328 | parcial | CSS overrides |

---

## Ordem de implementação (10 fases)

Princípio: cada fase entrega uma view ou área completa, testável local, com paridade visual *e* funcional ao protótipo. Sem misturar áreas.

### Fase A — Foundation (base CSS + componentes primitivos)
**Duração estimada:** 1-2h
**Entregas:**
- `client/src/style.css` → adicionar todas as classes do protótipo (`.cta-new`, `.navitem`, `.lib-item`, `.credits-card`, `.search-pill`, `.tile`, `.stat`, `.agent-card`, `.chip`, `.starter`, `.tool-card`, `.codeblock-card`, `.thinking`, `.msg-toolbar`, `.toast`, `.skeleton`, `.empty`, `.error-card`, `.seg`, `.plan`, `.qr`, `.rise+d1..d6`, `.banner`, `.blob-1/2/3`, `.home-amb`). Sem misturar com classes JS.
- `client/src/style.css :root` → adicionar `--row-h`, `--ui-font`, `--msg-font`, `--space` e suportar `density-cozy/compact/comfortable` via `body[data-density="..."]`.
- `packages/client/src/components/Popover.tsx` (ou usar Radix existente) → garantir que aceita estilo `.pop` do protótipo.
- Token sync — atualizar `scripts/check-token-drift.mjs` se necessário.

### Fase B — Sidebar (primeira coisa visível, alto impacto)
**Duração:** 2-3h
**Entregas:**
- `client/src/components/UnifiedSidebar/*` — desktructive rewrite. Substituir dual-strip por:
  - Brand header (NavviaLogo à esquerda, padding 14px)
  - CTA "Nova conversa" (cta-new com kbd ⌘K)
  - Search pill
  - Nav primário (Início, Agentes) — usando `IndexRedirect` + react-router
  - Lista conversas agrupada por data (Hoje, Ontem, etc.)
  - Biblioteca com 6 ícones coloridos (Agentes, Prompts, Skills, Arquivos, Memórias, Bookmarks, MCP)
  - Credits card no footer (gradient borda) + Account row com avatar gradient
- Estado: usar Recoil/React Query existente. Não reinventar dados.
- Mobile: sidebar vira drawer off-canvas (translate-x).
- Validar visual com Playwright.

### Fase C — Home dashboard completa
**Duração:** 3-4h
**Entregas:**
- `client/src/components/Home/HomeView.tsx` — REESCREVER. Estrutura:
  - `<section class="home-amb">` (ambient gradient bg)
  - Banner full-bleed com 3 blobs animados + pill plano + headline + subtitle
  - **Composer GRANDE** (`siri-hero`) com model picker, anexar, ferramentas, chips
  - Chips de ações sugeridas (5 chips)
  - Grid 4 stats (Créditos, Conversas, Agentes, Modelo mais usado)
  - Tools tiles (6 colunas com ícones coloridos por categoria)
  - Carrossel agentes em destaque (5+ cards horizontal scroll com snap)
  - Carrossel imagens recentes (6 thumbs gradient)
  - 2 colunas: "Continue de onde parou" + "Prompts em destaque"
- Hooks reais:
  - `useGetUserBalance` → créditos card
  - `useGetConversations` (paginated) → carrossel "continue de onde parou"
  - `useGetAgentsMap` → carrossel agentes em destaque
  - Stats: criar `useHomeStats` hook se necessário (transactions, conversations count)

### Fase D — Chat view (composer + landing + thread)
**Duração:** 3-4h
**Entregas:**
- `client/src/components/Chat/Landing.tsx` — reescrever empty state pra match protótipo (avatar 64x64 brand, title 22px, starters grid)
- `client/src/components/Chat/Input/ChatForm.tsx` — refactor:
  - Wrapper `siri` (não `siri-hero` aqui — opacities mais sutis conforme `#view-chat .siri::before/after`)
  - Composer prelude (file chips + skill chips above textarea)
  - Bottom row: anexar popover → ferramentas popover → busca-web pill ativa → mic → send/stop
  - Estado `generating` aplica `.generating` classe (botão stop substitui send)
  - Drop overlay quando drag dentro
- `client/src/components/Chat/Header.tsx` — header novo com:
  - Model picker popover (Claude/GPT/Gemini + agentes + "Explorar")
  - Badge "1M contexto"
  - Botões: Multi-conv, Temp chat, Edit agent, Artifacts toggle, Share popover
- Scroll-to-bottom FAB com classe `scroll-fab`

### Fase E — Mensagens (rendering)
**Duração:** 4-5h
**Entregas:**
- `client/src/components/Chat/Messages/MessageRender.tsx` — refactor estrutura visual
- `client/src/components/Chat/Messages/HoverButtons.tsx` — aplicar `.msg-toolbar` + `.msg-action` (acentos brand)
- `client/src/components/Chat/Messages/Content/Reasoning.tsx` → `.thinking` collapsible
- `EditMessage.tsx` → `.edit-msg-wrap`
- Sibling nav → `.sibling-nav`
- Code blocks → `.codeblock-card` com bar (lang + name + copy/edit/expand)
- Citations `[1]` → `.citation` chips
- Tables → `.tbl`
- LaTeX → `.latex-block`
- Mermaid → `.mermaid-box`
- Tool cards (web search, code analyze, etc.) → `.tool-card` com dot pulsante + sources stack
- Artifact card → `.artifact-card`
- Model tag → `.model-tag`
- TTS playback bar → `.tts-bar`

### Fase F — Outras views (Agents, Prompts, Skills, Memories, Files, Bookmarks, MCP, Shared)
**Duração:** 4-6h (cada view ~30-45min)
**Entregas:**
- 8 views — cada uma com header (title + subtitle + CTA "Criar X") + filter chips + grid
- `view-agents`: cards `.agent-card` 3 cols
- `view-prompts`: cards `.agent-card` 3 cols com categorias
- `view-skills`: lista compacta com tree files expandível
- `view-memories`, `view-files`, `view-bookmarks`, `view-mcp`: padrão similar
- `view-shared`: header `.shared-header` + thread read-only

### Fase G — Modais (Settings, Auth, Buy, Builder, Artifacts, dialogs)
**Duração:** 3-4h
**Entregas:**
- Settings modal: header (title + close) + sidebar tabs vertical + content panel, com 8 abas reais (General, Speech, Beta, Personalization, Memory, Chat, Account, Data)
- Auth: split layout — left hero gradient (com Navvia wordmark XL + tagline opcional) + right form
- Buy Credits: já feito em Phase 7b — verificar paridade
- Builder side panel: tabs (Info, Conhecimento, Skills, Permissões) — adapter da estrutura upstream
- Artifacts side panel: tabs (Preview, Código) + lista de versões
- Share modal, Export modal, Set Key modal, Edit Badges modal, etc.

### Fase H — Mobile (drawer + bottom tabs + sheets)
**Duração:** 2-3h
**Entregas:**
- `client/src/components/Layout/MobileTopBar.tsx` (sticky top, 52px, menu+logo+new chat)
- `client/src/components/Layout/MobileTabs.tsx` (4 tabs bottom: Início, Agentes, Chat, Mais)
- Sidebar drawer: off-canvas translate-x com backdrop blur + close on outside click
- Sheets fullscreen: modais viram bottom-up em mobile (CSS override)
- Builder/Artifacts: slide-in da direita em mobile, fullscreen

### Fase I — Toasts + banners + empty/skeleton/error states (UI feedback)
**Duração:** 1-2h
**Entregas:**
- Toast system global (`client/src/components/Toast/`)
- App banner (info/warn/error) — slot no topo do app
- Skeleton loaders em todas as listas
- Empty states com ícone + heading + descrição
- Error cards (rate-limit, key expired, file too large)

### Fase J — QA visual + dry-run merge upstream + a11y + i18n
**Duração:** 2-3h
**Entregas:**
- Re-rodar Playwright e capturar todas as views
- Comparar pixel-a-pixel com baseline do protótipo
- Lighthouse run para verificar a11y/perf
- Validar contraste em dark mode
- Validar i18n (pt-BR + en) em todos os strings novos
- Dry-run `git merge main` upstream e resolver conflitos antecipadamente

---

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Quebrar funcionalidade do LibreChat ao refatorar componentes | Manter hooks/queries upstream intactos. Mudar SÓ a árvore JSX e classes. |
| HMR não recarregar mudanças em rotas/router | Rebuild completo após mudar `routes/`, sem confiar em HMR |
| Conflito com upstream merges futuros | Marcar todo bloco refeito com `// [EXT]` e atualizar `OVERLAY.md` |
| Sidebar quebrar mobile | Cada fase termina com teste mobile (viewport 375px) antes de aprovar |
| Tokens conflitarem com `apply.sh` (whitelabel) | apply.sh só toca `--brand-purple` legado, nossos `--brand` ficam intactos |

---

## Métricas de sucesso por fase

Cada fase só fecha quando:
1. `npm run build` passa sem warnings
2. `node scripts/check-token-drift.mjs` passa
3. Visual confirmado via Playwright contra a referência do protótipo
4. Funcionalidade testada manualmente no stack local (login → uso da feature)
5. Commit no `dev` com mensagem `feat(<area>): Phase <X> — <título> · [EXT]`

---

## Estimativa total

~25-30 horas de trabalho focado, 10 fases sequenciais. Se rodar em sessões de 4h, são ~7 sessões.
Primeira entrega de valor visível: **Fase B (Sidebar)** ou **Fase C (Home)** — qualquer das duas já muda completamente a percepção da plataforma.

---

## Próximo passo

Aguardar aprovação do plano. Se OK, começar pela **Fase A (Foundation)** e seguir.
Se prefere começar por outra fase (ex: pular A e ir direto pra C/Home pra ter visual rápido), me diga.
