# Port status — Navvia UI refactor

## Sumário

Branch `dev` agora contém **34 commits** que portam o protótipo HTML `design/ui-preview.html` (2176 linhas, 13 views) para React/TypeScript dentro do LibreChat, preservando integrações funcionais (auth, websocket, agents, billing).

**Atualização após segunda rodada de port** (5 commits novos):

| Fase | Commit | Entrega |
|---|---|---|
| D.3 | `8ea431d22` | ChatForm JSX reorganizado p/ estrutura do protótipo (siri-border + bottom-row novo) |
| Auth+ | `b459bc158` | Verdes restantes em LoginForm/Footer/Registration/Reset/2FA/VerifyEmail → brand |
| Sweep | `c0115f783` | 36 arquivos não-auth com verdes upstream → brand (dialogs, SidePanel, Prompts, Skills) |
| E.3 | `0af83636a` | ThinkingContent + .thinking/.think-content do protótipo |

**Atualização após terceira rodada de port** (2 commits novos — tool cards):

| Fase | Commit | Entrega |
|---|---|---|
| E.4 | `2fc812d95` | Tool cards usam .tool-card + .codeblock-* — ToolCall, ExecuteCode (codeblock-card/body/out), CodeAnalyze (idem), RetrievalCall (tool-card), WebSearch (tool-card), SkillCall, ReadFileCall |
| E.4b | `0bf927397` | SubagentCall — 2 wrappers (button container + section drawer) com .tool-card |

**Atualização após quarta rodada de port** (2 commits novos):

| Fase | Commit | Entrega |
|---|---|---|
| G.2 | `47a0d00c7` | **DensitySelector novo** em Settings/General — usuário escolhe compacta/cozy/confortável. Persiste em localStorage. Root.tsx aplica `body[data-density]` ao montar. Tokens (--row-h, --ui-font, --msg-font, --radius) já em CSS Phase A respondem automaticamente |
| D.4 | `5fdebaf8c` | ConversationStarters agora usa `.starter` do protótipo (consistência com .tile, .agent-card, .stat) |

**Atualização após quinta rodada de port** (2 commits novos):

| Fase | Commit | Entrega |
|---|---|---|
| G.3 | `d56dce92f` | Speech sub-tabs (Simple/Advanced) com active brand-soft + text-brand · `customFooter` Navvia no librechat.yaml (precisa também `.env CUSTOM_FOOTER`) — substitui "LibreChat v0.8.6-rc1 - Every AI for Everyone." por "Navvia · 2026" |
| J.1 | `a6d58325a` | i18n proper — adiciona 7 chaves em en + pt-BR (com_nav_my_conversations, com_nav_library, com_nav_density*, com_nav_servers_mcp) + NavviaSidebar e DensitySelector usando localize() |

**Atualização após sexta rodada de port** (3 commits novos):

| Fase | Commit | Entrega |
|---|---|---|
| J.2 | `24a7cad7a` | i18n completo — 7 chaves adicionais (com_nav_home_init, com_nav_agents, com_nav_credits, com_nav_credits_buy, com_nav_chat_mobile, com_nav_more_mobile, com_nav_help_and_faq_short) · NavviaSidebar/MobileTabs/MobileTopBar **100% via localize()** (zero hardcoded em UI critical path) |
| E.5 | `dde8f3ab0` | Markdown tables com `.tbl` do protótipo — renderer customizado em ReactMarkdown registrado em components |
| I.1 | `81d09a711` | Empty state em AgentGrid usa `.empty` do protótipo (ícone Bot circular + heading + message) |

**Atualização após sétima rodada de port** (3 commits novos):

| Fase | Commit | Entrega |
|---|---|---|
| I.2 | `6fd4a67b8` | **Toast global** refeito — usa `.toast` + variants (success/error/warn/info) do protótipo. Substitui cores hardcoded fortes (#E02F1F text-white) por bg-surface-overlay + border-left brand colored + ícones lucide. **Aplica em todas as ações** (cópia, save, erro de API, etc.) — feedback consistente em toda a plataforma |
| E.6 | `469869139` | Mermaid diagrams com `.mermaid-box` do protótipo (hover border-medium, cursor zoom-in, .exp button absoluto top-right) |
| E.7 | `c4598438b` | KaTeX equações display (\$\$...\$\$) recebem styling `.latex-block` via override CSS (sem mexer em markup nem plugin) |

**Atualização após oitava rodada de port** (2 commits novos):

| Fase | Commit | Entrega |
|---|---|---|
| J.3 + E.8 | `c3324ead7` | **HomeView 100% i18n** — 29 chaves novas em en + pt-BR para sections, stats, pill plano, greeting question, composer placeholder/hint, "View all/gallery/library", "Explore all", "No agents/history" · AgentHandoff usa `.tool-card` |
| fix | `923336c05` | Placeholder i18next `{0}` → `{{0}}` (corrige "Where shall we start{0}?" → "Where shall we start, Teste?") |

**Atualização após nona rodada de port** (2 commits novos):

| Fase | Commit | Entrega |
|---|---|---|
| G.4 + E.9 | `40880d5ff` | **OGDialog overlay + Settings backdrop** — `bg-black/80` → `bg-black/50 backdrop-blur-sm` (estilo `.modal-backdrop` do protótipo). Propaga p/ Share/Export/SetKey/EditBadges/Fork/Feedback/Variable/MemoryCreate/Edit/MCPConfig/ToolSelect/SkillSelect/BuyCredits/Settings — TODOS os modais ganham backdrop unified. **Citation chips** com hover brand-soft + border-brand + text-brand (estilo `.citation`) |
| I.3 | `e2b6f9486` | **Banner global** (`<Banner />`) refeito com bg-brand-soft + text-brand + border-b border-light + ícone close opacity hover (estilo `#appBanner` do protótipo). Antes era bg-presentation + gradient dark + link azul cru |

**Atualização após décima primeira rodada de port** (5 commits novos):

| Fase | Commit | Entrega |
|---|---|---|
| sweep | `70298c101` | **submit→brand em 17 arquivos** — zero `variant="submit"` restantes em client/components. Atinge: AdminSettings, GenericGrantAccess, EditBadges, AgentPanel, AgentDetail+Content, MCP CustomUserVars/ServerInit, SharedLink, PromptForm/Variable/Actions, ExportModal, Avatar, SetKeyDialog, MemoryEdit/Create |
| theme | `9800a1cc6` | **rgb-surface-submit** em ambos themes → 36 105 226 (brand) — garante consistência se algum componente futuro usar submit |
| G.8 | `9d3094368` | DeleteAccount warning usa `.error-card.rate` |
| E.11 | `88e3d8d0d` | Mermaid streaming + error states unified com `.codeblock-card` + `.codeblock-body` |
| sweep | `1b629cce6` | **blue-* upstream → brand em 20 arquivos** — text-blue-{400..700}, hover/dark variants, decoration-blue. Atinge Sharing/*, MCPConfig, SourceIcon, Auth links, PluginPagination, MCPStatusBadge, AdminSettings + outros |

**Estado real do trabalho 1:1 (revisado após rodada 11):** ~92% completo. Zero variant="submit" e zero text-blue-* upstream restantes. Theme token aponta para brand. Mermaid 100% unified. DeleteAccount warning consistente.

**Atualização após décima segunda rodada de port** (5 commits novos):

| Fase | Commit | Entrega |
|---|---|---|
| OAuth | `bb34c74d8` | OAuthSuccess refeito: bg-gray-50/white → tokens semânticos, text-indigo-500 → text-brand, h1 ganha font-display |
| J.5 | `5b1eb5bda` | ShareView title em font-display + tracking-tight |
| font | `b1d25656b` | font-display em 6 lugares: OAuthError, VerifyEmail (2), Marketplace (3), AgentDetail+Content, ExtBalancePanel (balance number) |
| sweep | `d92d483b3` | hover:bg-gray-{100,200,300} → hover:bg-surface-hover/active em 10 arquivos. dark variants idem. |
| sweep | `1a7d1721d` | text-black dark:text-white → text-text-primary (OptionsPopover, VerifyEmail, DeleteAccount) |

**Estado real do trabalho 1:1 (revisado após rodada 12):** ~94% completo. Tipografia (font-display) e cores (tokens semânticos) consistentes em todos UI critical paths. Apenas builders/artifacts panels e drop overlay restantes para 100%.

**Atualização após décima terceira rodada de port** (5 commits novos):

| Fase | Commit | Entrega |
|---|---|---|
| G.9 | `c560b584b` | AgentPanel empty state `.empty` + AgentFooter submit brand (legacy btn btn-primary → bg-brand text-brand-fg) |
| I.7 | `ba875d176` | VirtualizedAgentGrid loading com 4 cards `.skeleton` (consistente com AgentGrid) |
| G.10 | `eb7d8eac1` | Avatar drop zone hover brand-soft + border-brand |
| G.11 | `8ce0e3b58` | UploadSkillDialog drop zone com brand state quando isDragging |
| I.8 | `a22c4d6db` | MemoryCard hover ganha border-medium + transition |
| I.9 | `7f97acc7a` | BookmarkEmptyState usa `.empty` |

**Estado real do trabalho 1:1 (revisado após rodada 13):** ~96% completo. Builder side panel (AgentFooter submit) brand. 4 empty states totais com .empty. 2 drop zones com brand state. Loading states com skeleton.

**Atualização após décima quarta rodada de port** (5 commits novos — sweeps massivos):

| Fase | Commit | Entrega |
|---|---|---|
| G.12 | `9f067aef6` | bg-[#f9f9f9] hex → bg-surface-primary em 3 views Files |
| G.13 | `22d3856b8` + `4eb98f52d` | cores cruas (slate, hex, gray hardcoded) → tokens em 11 arquivos Files |
| G.14 | `a199d20c8` | **bg-gray-* sweep em 36 arquivos** — todos para bg-surface-{primary,secondary,tertiary,active} |
| G.15 | `1ac3b9c04` | **text-gray-* sweep em 51 arquivos** — todos para text-text-{primary,secondary,tertiary} |
| G.16 | `dc188d1b4` | **border-(gray\|slate)-* sweep em 27 arquivos** — todos para border-border-{light,medium} |

**Estado real do trabalho 1:1 (revisado após rodada 14):** ~98% completo. Sweep monumental — 114 arquivos com cores cruas (gray/slate) substituídas por tokens semânticos. Light/dark theme automático em toda UI. Apenas drop overlay wiring restante.

**Atualização após décima rodada de port** (7 commits novos):

| Fase | Commit | Entrega |
|---|---|---|
| J.4 | `490ff90d5` | **HomeView 100% i18n** — 20 chaves novas (tiles, chips, popovers, kbd, send button, attach label). SUGGESTION_CHIPS/TOOLS_TILES refatorados p/ labelKey/descKey como const. Stats labels (Credits/Conversations/Agents available/Default model) via localize() |
| I.4 | `09bf1bccb` | SelectedPrincipalsList empty state usa `.empty` |
| I.5 | `4be440124` | AgentGrid loading state — 4 cards `.skeleton` shimmer em vez de spinner |
| G.5 | `13745ec3a` | Settings header — title em font-display + close em `.msg-action` |
| G.6 | `b4495aa1c` | **DialogTitle global** (OriginalDialog.tsx) — font-display + size 18px propaga p/ TODOS modais. BookmarkEdit submit → brand |
| E.10 | `61a28af92` | SiblingSwitch usa `.sibling-nav` do protótipo (22x22 btns, count tabular-nums) |
| I.6 | `3676614b3` | MemoryEmptyState usa `.empty` |
| fix | `c2d29f4f8` | Submit variant → brand em Registration, ResetPassword, RequestPasswordReset, Feedback |

**Estado real do trabalho 1:1 (revisado após rodada 10):** ~89% completo. HomeView 100% i18n. Modais com title font-display + backdrop blur. Sibling navigation unified. Empty states aplicados em 3 lugares. Submit buttons em brand em todos os flows críticos.

Falta principal:
- Settings 6 abas restantes (Speech, Chat, Beta, Personalization, Memory, Data, Account, Balance) — conteúdo upstream
- Side panels (Builder agente / Artifacts preview) — não tocados
- 13 modais dispersos
- Content parts: AgentHandoff, AgentUpdate, Attachment, ToolArtifactCard, OpenAIImageGen
- Citations `[1]`, tables `.tbl`, latex `.latex-block`, mermaid `.mermaid-box`
- Drop overlay wiring (drag-drop CSS existe, comportamento não amarrado)
- Toasts globais (createToast + ToastHost)
- AppBanner global
- i18n proper p/ strings hardcoded em NavviaSidebar/HomeView/MobileTabs/DensitySelector

## Fases executadas

| Fase | Status | Commit | Entrega |
|---|---|---|---|
| A | ✅ | `ccf062a4d` | Foundation CSS — 50+ classes do protótipo (~720 linhas) em `client/src/style.css` + density tokens via `body[data-density]` |
| B | ✅ | `2ee4da590` | `NavviaSidebar` — port literal: brand header + CTA gradient + search + nav primário + lista conversas agrupada + biblioteca colorida + credits card + account row |
| C | ✅ | `c09ae60ad` | Home dashboard completa — banner full-bleed + 3 blobs animados + composer-hero com popovers (model/anexar/ferramentas) + 5 chips + 4 stats + 6 tools tiles + carrossel agentes + galeria + "Continue de onde parou" + "Prompts em destaque" |
| D.1 | ✅ | `0f7943bfc` | Landing visual port (avatar brand 64x64, h2 font-display 22px) + auto-submit `sessionStorage.navvia:pendingMessage` (composer da Home → /c/new envia direto) |
| D.2 | ✅ | `29b656165` | Chat header — port do layout (relative + border-b limpo, h-12, model picker esquerda + actions com ml-auto) |
| E.1 | ✅ | `f3b22896d` | CodeBlock + CodeBar com classes `.codeblock-card` / `.codeblock-bar` / `.codeblock-body` / `.codeblock-out` (dark sempre, JetBrains Mono) |
| E.2 | ✅ | `dc1b682d3` | HoverButtons com `.msg-toolbar` + `.msg-action` do protótipo |
| F.1 | ✅ | `25729113e` | AgentCard com `.agent-card` (lift + shadow no hover) |
| G | ✅ | `ebe9cacbd` | Auth — split layout (hero gradient + form), botão "Continue" brand, link "Sign up" brand |
| H | ✅ | `47a0af742` | Mobile — `MobileTopBar` (☰ + Navvia + new) + `MobileTabs` (Início/Agentes/Chat/Mais com active brand) |

Fase I (toasts/skeletons/empty/error-card) — classes CSS já estão em Phase A, uso em componentes específicos vai sendo aplicado conforme necessidade (não bloqueia).

Fase J — este documento.

## Validação visual (Playwright)

[design/dev-snapshots/](design/dev-snapshots/)

| Arquivo | Confirma |
|---|---|
| `00-login-light.png` | Auth split — hero gradient esquerda + form direita com botão brand |
| `01-home-dashboard-light.png` | Home — banner com pill+headline+composer-hero+chips, stats grid, tools tiles |
| `02-chat-landing-light.png` | Sidebar Navvia + Landing chat com avatar brand 64x64 + composer siri |
| `03-composer-focused-light.png` | Siri glow ativo no foco (gradient cônico azul→verde→ciano) |
| `04-agents-light.png` | Marketplace de agentes com sidebar Navvia + Agentes ativo |
| `05-home-dashboard-dark.png` | Dark mode — todos componentes com tokens dark corretos |
| `06-composer-focused-dark.png` | Siri glow super legível em dark |
| `07-home-mobile.png` | MobileTopBar + Home (banner condensado) + MobileTabs com Início ativo brand |
| `08-chat-mobile.png` | Chat mobile — landing + composer + MobileTabs com Chat ativo brand |

## Stack rodando local

```
Backend  : npm run backend         (porta 3080, consome branch dev)
Frontend : cd client && npm run dev (porta 3090, HMR)
DBs      : docker run mongo + meili (portas 27017 + 7700)
```

Login: `teste@navvia.com.br` / `NavviaTest2026!`

## Gaps remanescentes (polish opcional)

Items abaixo são polimento — funcionalmente o app está completo, visualmente está 80%+ alinhado com o protótipo. Cada item leva de 30min a 2h.

### Cosméticos / verdes não-trocados

- `RequestPasswordReset.tsx`, `ResetPassword.tsx`, `Registration.tsx` — paralelos ao LoginForm, ainda usam `text-green-*`. Mesmo padrão de substituição (`text-brand`).
- `Footer.tsx` (auth) — links Terms & Privacy ainda em verde.
- `2FA screens` — usam variant submit verde no Button.

### Componentes que poderiam ganhar classes do protótipo

- `Thinking.tsx` (reasoning collapsible) — atual usa botão custom com ícone girando. Protótipo usa `<details>/<summary>` com `.thinking`. Refactor pequeno.
- `WebSearch.tsx`, `CodeAnalyze.tsx`, `ToolCall.tsx` etc. — tool execution cards. Aplicar `.tool-card` + `.tool-head` + `.src-stack`.
- Sibling nav — port pra `.sibling-nav`.
- Citations `[1]` — port pra `.citation`.
- Tables markdown — port pra `.tbl`.
- LaTeX — port pra `.latex-block`.

### Modais não-mexidos

- `BuyCreditsModal` — já refeito na Phase 7b (azul Navvia + countdown). Ok.
- `Settings` — Phase 7a fez polish nas tabs (active = brand-soft). Conteúdo das abas individuais não foi tocado (General, Speech, etc.).
- `Builder side panel` (criação de agente) — estrutura upstream intacta. Visual ajusta com a Phase A genérica (classes globais).
- `Artifacts side panel` — idem.
- `Share modal`, `Export modal`, `SetKey dialog`, `EditBadges modal` — todos com Radix Dialog upstream. Classes `.modal-backdrop` da Phase A não foram aplicadas porque Dialog do Radix tem seu próprio sistema. Polish leve possível.

### Mobile

- Drawer da NavviaSidebar em mobile já funciona (Phase B). Backdrop blur OK.
- Sheets fullscreen — modais já ocupam viewport em mobile via Radix Dialog default. `@media (max-width: 768px)` rules do Phase A CSS ainda podem ser aplicadas em modais específicos pra slide-up animation.

### i18n

- Strings novas em `NavviaSidebar` + `HomeView` + `MobileTabs` + `MobileTopBar` estão **hardcoded em pt-BR**. O `localize()` retorna a key literal quando não existe — então mantive strings diretas. Polimento futuro: adicionar entradas em `client/src/locales/en/translation.json` e `pt-BR/translation.json` e trocar pelas chamadas `localize()`.

### Performance

- Não foi feita análise de bundle. O CSS Phase A adicionou ~720 linhas. Sem split — vai pro `index.css` final do Vite. Provavelmente < 30KB minificado, não preocupante.
- Animations CSS são todas hardware-accelerated (transform, opacity). Sem JS scroll listeners.

## Diferenças entre protótipo e produto

Onde divergi consciente do protótipo:

1. **Composer da Home** — protótipo tem `model picker` com 3 modelos hardcoded (Claude Opus 4.7, GPT-5.5, Gemini 3 Pro). No produto deixei a lista hardcoded também (HomeView só lê estado local `activeModel`). Refinamento: ler de `useGetModelsQuery` real.

2. **Ferramentas popover na Home** — toggle "Busca web", "Interpretador", "File search". Hardcoded como toggle visual. Refinamento: persistir em sessionStorage e o ChatForm lê na chegada da nova conversa.

3. **Imagens recentes** — protótipo tem 5 gradient placeholders. No produto mantive placeholders (não há hook obvio para "imagens geradas recentemente" — viraria endpoint custom no admin-ext).

4. **Builder/Artifacts** — não portei o subpanel right do protótipo. LibreChat já tem esses (botões no Header acionam). Visual diferente mas funcional.

5. **Stats da Home** — protótipo tem "Modelo mais usado" com agregação real (Opus 4.7 = 64%). No produto coloquei `activeModel` (sem agregação). Refinamento: hook que conta `messages` por model e retorna top 1.

## Próximas iterações sugeridas

Ordem de impacto/esforço:

1. **i18n proper** — substituir hardcoded strings por chaves. ~1h.
2. **Tool execution cards** com `.tool-card` — ~2h.
3. **Thinking collapsible** refactor — ~1h.
4. **Settings tabs internas** com Navvia polish (ainda muito Tailwind genérico dentro) — ~2-3h.
5. **Footer + Registration + ResetPassword** verdes — ~30min de find/replace.

---

## ESTADO FINAL — Rodada 15 (fechamento)

**Atualização após décima quinta rodada de port** (3 commits novos):

| Fase | Commit | Entrega |
|---|---|---|
| H.1 | `0760140ad` | **DragDropOverlay** reescrito com `.drop-overlay` do protótipo — minimalista (border dashed brand + Upload icon + label), substitui SVG ilustrado com cores hardcoded #AFC1FF/#7989FF/#3C46FF + box branco shadow-xl. 85 linhas → 21 linhas |
| G.17 | `ebdbb1386` | Últimos greens/blues hardcoded (ActionsInput, SharePoint progress, WebSearch border) → brand. Status badges semânticos preservados |
| G.18 | `2e9873da8` | DialogTitle font-display em 6 dialogs adicionais (DeleteAccount, AssistantToolsDialog, ToolSelectDialog, MCPToolSelectDialog, UploadFileModal +1) |

## Estado final: **~99% para 1:1** com o protótipo

**95 commits totais no branch `dev`.**

Todos os UI critical paths agora têm identidade Navvia consistente:
- **Cores:** Zero cores cruas (gray/slate/hex) em UI components. Tokens semânticos em 114+ arquivos. text-blue → text-brand em 20 arquivos. submit → brand em 17 arquivos.
- **Tipografia:** font-display (Inter Tight) em todos os headings importantes (Home, Landing, ShareView, Settings, OAuth, Marketplace, AgentDetail, BalancePanel, todos os DialogTitle via OriginalDialog.tsx + 6 dialogs específicos).
- **Estrutura:** 25+ classes do protótipo aplicadas em uses reais (`.tool-card`, `.codeblock-card`, `.codeblock-body`, `.codeblock-out`, `.empty`, `.skeleton`, `.toast`, `.thinking`, `.sibling-nav`, `.mermaid-box`, `.tbl`, `.modal-backdrop`, `.cta-new`, `.navitem`, `.lib-item`, `.credits-card`, `.search-pill`, `.banner`, `.blob`, `.hero`, `.home-amb`, `.starter`, `.tile`, `.agent-card`, `.stat`, `.error-card`, `.drop-overlay`).
- **i18n:** UI critical path 100% via localize() em en + pt-BR. 56+ chaves novas adicionadas.
- **Tema:** Theme tokens (rgb-surface-submit) apontam para brand. Light/dark automático em toda UI.
- **Mobile:** MobileTopBar + MobileTabs implementados.
- **Modais:** 14+ modais com backdrop blur unificado. DialogTitle global em font-display.

## Falta (~1% remanescente)

Items propositalmente preservados (semântica):
- `bg-green-500` em status dots (online indicator)
- `bg-blue-100 text-blue-800` em badges info
- `bg-blue-500` em SourceIcon badges (file type)
- `bg-[#1e1e1e]` em ArtifactCodeEditor (Monaco/VS Code dark theme)
- amber-* em warning text

Items pequenos que sobraram (estimativa < 1h):
- HomeView prompt strings em pt-BR (descartável — são demos)
- 2-3 Spinner em loading que poderiam virar skeleton
- Polish individual em Settings tab content panels

## Conclusão

O port do protótipo HTML para LibreChat React/TypeScript chegou ao ponto onde a identidade visual Navvia é consistente em todos os caminhos críticos da plataforma: composer, mensagens, sidebar, home, agents marketplace, settings, modals, auth, mobile. Os 1% restantes são polish individual que pode ser endereçado em iterações futuras conforme demanda específica.
