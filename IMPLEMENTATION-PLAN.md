# Plano de Implementação — Refactor de UI (Navvia)

> Documento operacional, sucessor de `UI-REFACTOR-PLAN.md`. Incorpora tudo que evoluiu desde o plano original: identidade **Navvia**, **Home dashboard novo**, **página de Agentes dedicada**, **redesign mobile** (drawer + bottom tabs + sheets), **fluxo PIX ASAAS correto**, **dinamismo / multi-tenant**, e **8 abas de Settings com ~55 controles reais**. Tudo já validado num protótipo standalone (`design/ui-preview.html`).

---

## 1. Estratégia e contexto crítico

### Restrições intocáveis (do `OVERLAY.md` e memória do projeto)

1. **Overlay sobre upstream LibreChat:** o repo `LPecanha/LibreChat` (origin) é um fork que **faz merge regular** com `upstream/danny-avila/LibreChat`. Tocar arquivo do upstream = aumentar superfície de conflito a cada merge.
2. **Estratégia: merge, não rebase.** Rebase forçaria `git push --force`, quebrando `./deploy/navvia.sh` (que faz `git pull`) em todos os servidores. Toda mudança nossa vira merge commit limpo.
3. **`[EXT]` markers obrigatórios** em qualquer linha tocada de arquivo upstream. Inventário em `OVERLAY.md`.
4. **Tokens vivem em DUAS fontes que precisam sincronizar:** `client/src/style.css` (CSS vars estáticas) e `packages/client/src/theme/themes/{default,dark}.ts` (RGB strings aplicadas em runtime). Drift entre os dois = bugs. **Resolver na Fase 0.**
5. **Overlay de billing já toca arquivos upstream** (`AccountSettings.tsx`, `Balance.tsx`, `AgentPanel.tsx`, `ModelPanel.tsx`, `ExpandedPanel.tsx`, `Root.tsx`, `api/server/index.js`, etc) — o refactor **deve preservar** todos os `[EXT]` markers existentes e os componentes `<ExtBalance*/>`, `<CreditNavButton/>`, `<PaymentToast/>`.

### Princípio diretor

**Maximizar mudança visual por arquivo upstream tocado.** Atacar em ordem de alavancagem ↗ custo de merge:

| Tipo | Arquivos | Custo merge | Alavancagem |
|---|---|---|---|
| Tokens (cor/raio/sombra) | ~4 | Muito baixo | App inteiro |
| Tipografia + fontes | ~3 | Baixo | App inteiro |
| Restyle primitivos (CVA) | ~74 contidos | Baixo–médio | Cascateia para ~680 componentes |
| Ícones (wrapper lucide) | 1 + N SVGs | Baixo | Global |
| Redesign estrutural de surface | dezenas/surface | **Alto** | Localizado |
| **Novas views** (Home dashboard, Agents page) | poucos arquivos novos + 1–2 alterações estruturais | Médio | Diferenciação real |
| **Mobile redesign** | mobile.css + Root.tsx + componentes-chave | Médio | UX mobile |
| **White-label dinâmico** (Navvia + futuros tenants) | infra nova | Baixo (overlay-only) | Multi-tenant |

### Dinamismo da plataforma — princípios não negociáveis

A plataforma é **configurável em runtime** via `startupConfig`. O refactor **não pode hard-codear** o que hoje é dinâmico:

- **Permissões (RBAC):** `useHasAccess()`, `useAgentCapabilities()` continuam decidindo visibilidade de features.
- **`startupConfig.interface.*`** habilita/desabilita: `bookmarks`, `prompts`, `modelSelect`, `multiConvo`, `presets`, `agents`, `temporaryChat`, etc.
- **`startupConfig.modelSpecs.list`** popula o seletor (sem provider drill-down — overlay já decide isso via `[EXT]`).
- **`balance.enabled`** controla a aba Cobrança, o componente de saldo, o botão Comprar.
- **`endpoints.*.enabled`** decide quais provedores aparecem (não usamos provider tree, mas a config continua respeitada para liberar modelos).
- **i18n:** todo texto novo via `useLocalize()`. Chaves novas em `client/src/locales/en/translation.json`; pt-BR sincronizado por `scripts/sync-ptbr.mjs`.
- **RTL:** respeitar `chatDirection` (configurável em Settings → Chat).
- **Temas:** claro/escuro/sistema/`.gizmo` — paridade obrigatória.
- **Multi-tenant white-label:** a Navvia é o **primeiro** tenant. Logo, cores e nome devem vir do `whitelabel/clients/<tenant>/brand.env` + assets — **não hardcoded**. O sistema deve aceitar `whitelabel/clients/foo/` no futuro sem trocar código de UI.

---

## 2. Workflow de branch e deploy

```
upstream/main   ──●──●──●──●──●──   (LibreChat oficial — nunca commitamos)
                              ↑ merge periódico
origin/main     ──────────────●──   (estável, deploy puxa daqui via ./deploy/navvia.sh)
                              ↑ merge quando fase validada
origin/dev      ──────●──●──●─    (refactor em andamento — commits por fase)
```

**Por que branch `dev`:**
- Permite trabalhar em paralelo com `main` estável (deploys continuam funcionando)
- Cada fase = 1+ commits descritivos no `dev` (ex.: `refactor(tokens): apply Navvia palette · [EXT]`)
- Quando uma fase está validada (build + screenshots OK + smoke test), merge `dev → main`, push, deploy puxa.
- Em caso de problema, fácil reverter um commit do `dev` sem afetar `main`.

**Regras:**
- Nunca `git push --force` em `main`. Em `dev`, só se for absolutamente necessário e ninguém puxou ainda.
- Cada commit no `dev` deve passar `npm run build`. Idealmente também `cd api && npx jest <pattern>` quando houver testes relacionados.
- Merge `dev → main` é **opcional por fase**: posso acumular várias fases no `dev` e mergear de uma vez (menos churn) ou mergear por fase (rollback granular). Decisão pode ser tomada no momento.

---

## 3. Pré-requisitos (Fase 0)

Antes de qualquer refactor:

1. **Criar branch `dev`** (a partir de `main`) e push pra `origin/dev`.
2. **Capturar baseline de screenshots** via Playwright em viewport desktop (1440×900) e mobile (390×844), tema claro e escuro, das telas-chave:
   - Home / chat vazio
   - Conversa populada
   - Settings (cada aba)
   - Builder de agente
   - Cada modal/dialog principal
   - Sidebar expandida e colapsada
   - Mobile: drawer, bottom tabs
3. **Resolver o problema da fonte dupla de tokens.** Opções:
   - **A:** Eleger `style.css` como fonte única, gerar `theme/themes/*.ts` por script ao buildar.
   - **B:** Eleger `theme/themes/*.ts` como fonte única, gerar `style.css` por script.
   - **C:** Manter os dois com checklist de sincronização documentado.
   - **Decisão recomendada:** **C** com checklist (custo zero, sem build step novo) + script de validação (`node scripts/check-token-drift.mjs`) que falha se houver divergência. Pra evitar mudança estrutural agora.
4. **Atualizar `OVERLAY.md`** com seção nova: `## UI Refactor — arquivos a tocar (Navvia)` listando todos os arquivos upstream que serão alterados em cada fase. Cada arquivo recebe `[EXT]` no início.
5. **Validar comandos:** `npm run build` (todo o monorepo), `npm run frontend:dev` (dev server), `cd api && npx jest`, e `node scripts/sync-ptbr.mjs` (após mudança de strings).
6. **Snapshot do `librechat.yaml`** atual — pra garantir que feature flags atuais continuam funcionando.

---

## 4. Fases (sequência, escopo, validação)

> Cada fase é **um ou mais commits** no branch `dev`. Cada fase tem critério de aceitação claro. Estimativas em "dias úteis equivalentes" — podem ser menores em prática.

### Fase 0 — Fundação & guardrails (½–1 dia)

**Output:** branch criado, baseline capturado, OVERLAY.md atualizado, script de validação de tokens.

**Arquivos novos (overlay-only, zero conflito):**
- `scripts/check-token-drift.mjs` — valida sincronia style.css ↔ theme/themes/*.ts
- `design/baseline/` — screenshots iniciais
- `design/refactor-checklist.md` — checklist por fase

**Validação:** screenshots no commit; `node scripts/check-token-drift.mjs` passa.

---

### Fase 1 — Design tokens (Navvia palette) (½–1 dia)

**Arquivos tocados upstream (com `[EXT]`):**
- `client/src/style.css` — reescrever `:root`, `html` (claro), `.dark`, `.gizmo`
- `packages/client/src/theme/themes/default.ts` — sincronizar RGB strings
- `packages/client/src/theme/themes/dark.ts` — idem
- `client/tailwind.config.cjs` — ajustar `--radius` 7px, escala de sombras refinada, mapeamentos novos (`brand-grad-start`, `brand-grad-end`, etc.)

**Novos tokens (paleta Navvia):**
```
--brand: #2469E2
--brand-grad-start: #2469E2
--brand-grad-end: #11B38D
--brand-soft: rgba(36,105,226,0.13)
--siri-a / --siri-b: gradient pair
```

Mais paleta de surface/border/text refinada para a estética "densa profissional" (Linear/Notion-like).

**Validação:** `npm run build` passa; screenshot diff vs Fase 0 mostra re-skin global; `check-token-drift` passa; `.gizmo` ainda funciona.

---

### Fase 2 — Tipografia & ícones (½–1 dia)

**Arquivos tocados:**
- `client/src/style.css` — `--font-size-*` scale apertada, line-heights
- `client/tailwind.config.cjs` — `fontFamily` extend (Inter Tight como `display`)
- `packages/client/src/svgs/NavviaLogo.tsx` (**novo**) — componente do wordmark SVG, lendo o symbol `#navvia-wm` global
- Wrapper `client/src/components/svg/Icon.tsx` (**novo**) — padroniza lucide-react com `strokeWidth` default 1.75

**Inter Tight** carregada via Google Fonts (`@font-face` em `style.css`) ou local (`client/public/fonts/`). Decisão: usar local (consistência com Inter local) — adicionar arquivos woff2.

**Validação:** build limpo; tipografia consistente em screenshots.

---

### Fase 3 — Restyle primitivos shadcn (CVA) (2–3 dias)

**Arquivos tocados (74 primitivos em `packages/client/src/components/`):**
- Prioridade alta: `Button.tsx`, `Input.tsx`, `Textarea.tsx`, `Select.tsx`, `DropdownMenu.tsx`, `Dialog.tsx`, `Tabs.tsx`, `Switch.tsx`, `Checkbox.tsx`, `Badge.tsx`, `Tooltip.tsx`, `Combobox.tsx`, `MultiSelect.tsx`
- Prioridade média: `Accordion.tsx`, `HoverCard.tsx`, `Popover.tsx`, `Slider.tsx`, `Toast.tsx`, `ThemeSelector.tsx`, `DataTable/*`
- Restantes: ajuste de classes apenas

**Tipo de mudança:** strings CVA — heights (`h-7`/`h-8`), padding compacto, `rounded-lg` → `rounded-md`, anel de foco unificado, bordas sutis.

**Risco de merge:** médio — strings CVA conflitam fácil se upstream também mexer. Mitigação: commits **um por arquivo** (ou pequenos grupos) com mensagem clara para facilitar resolução de conflito.

**Validação:** `npm run build`; visual de cada componente conforme protótipo; cascateia automaticamente pros 680+ componentes do app.

---

### Fase 4 — Home dashboard + Sidebar + Agents page (NOVAS VIEWS) (4–6 dias)

**Mais arriscada — toca arquivos estruturais e adiciona rotas.**

#### 4a. Home dashboard (rota nova)
**Arquivos novos:**
- `client/src/routes/Home.tsx` — view dashboard (banner + composer hero + stats + tiles + agents carousel + galeria + recentes + prompts)
- `client/src/components/Home/*` — sub-componentes do dashboard

**Arquivos tocados:**
- `client/src/routes/Root.tsx` — adicionar rota `/home` ou redirecionar `/` se `interface.home === 'dashboard'`
- `client/src/components/Chat/Landing.tsx` — possivelmente substituído pela Home em modo dashboard

**Dinâmico:**
- `interface.home: 'dashboard' | 'chat'` em `librechat.yaml` controla se o usuário vê o dashboard ou cai direto no chat (comportamento upstream)
- Tenants conservadores ficam em `chat`; Navvia usa `dashboard`

#### 4b. Sidebar redesign
**Arquivos tocados:**
- `client/src/components/UnifiedSidebar/UnifiedSidebar.tsx`
- `client/src/components/UnifiedSidebar/Sidebar.tsx`
- `client/src/components/UnifiedSidebar/ExpandedPanel.tsx` (já tem `[EXT]` do `<CreditNavButton/>`)
- `client/src/components/UnifiedSidebar/ConversationsSection.tsx`

**Mudanças:**
- Logo Navvia + collapse hover-on-edge
- CTA "Nova conversa" com gradient border
- Search pill
- Nav primário (Início, Agentes)
- Conversas com bolinhas indicadoras
- Biblioteca com ícones coloridos por item
- Card de créditos com gradient border (envolve `<CreditNavButton/>` existente)
- Avatar com gradient ring

#### 4c. Agents page (rota nova)
**Arquivos novos:**
- `client/src/routes/Agents.tsx` — galeria com tabs (Destaques/Meus/Org) + categorias + cards completos
- `client/src/components/Agents/AgentCard.tsx`, `AgentGrid.tsx`

#### 4d. Empty/landing por agente
**Arquivos tocados:**
- `client/src/components/Chat/Landing.tsx` — adicionar variante "agent landing" com avatar + descrição + conversation starters

**Dinâmico:** starters vêm do campo `conversation_starters` do agente (ou default se ausente).

**Validação:** screenshots; smoke test de cada rota; verificar que `interface.home: 'chat'` ainda funciona (sem dashboard); permissões respeitadas.

---

### Fase 5 — Composer (com Siri glow + FLIP animation + estados) (2–3 dias)

**Arquivos tocados:**
- `client/src/components/Chat/Input/ChatForm.tsx`
- `client/src/components/Chat/Input/BadgeRow.tsx`
- `client/src/components/Chat/Input/Files/FilePreview.tsx`, `FileRow.tsx`
- `client/src/components/Chat/Input/AudioRecorder.tsx` — estados visuais (idle/recording/processing)
- `client/src/components/Chat/Input/EditBadges.tsx`
- `client/src/components/Chat/Input/PendingManualSkillsChips.tsx`
- `client/src/components/Chat/Input/StopButton.tsx`
- Novo: `client/src/components/Chat/Input/SiriBorder.tsx` — wrapper com glow gradient animado

**CSS novo em `style.css`:**
- `@property --siri-angle` + animação de conic gradient
- `.siri` / `.siri:focus-within` / `.siri.generating` estados

**FLIP Home → Chat:**
- JS no `Root.tsx` ou componente Home: medir bounding box do composer na Home, ao enviar fazer FLIP pra posição do composer do chat

**Drag-drop overlay, scroll-to-bottom FAB:** componentes adicionais.

**Dinâmico:**
- Permissões pra cada tool (web_search, code, file_search, etc.) via `useAgentCapabilities`
- `interface.commands.@/+//$` controla atalhos
- Audio recorder respeita `speech.engineSTT` config

**Validação:** todos os estados visuais funcionando; FLIP suave; build limpo.

---

### Fase 6 — Mensagens & conteúdo (2–3 dias)

**Arquivos tocados:**
- `client/src/components/Chat/Messages/HoverButtons.tsx` — adicionar TTS bar inline (não só botão)
- `client/src/components/Chat/Messages/Fork.tsx` — visual do popover
- `client/src/components/Chat/Messages/Feedback.tsx` — dialog com tags
- `client/src/components/Chat/Messages/SiblingSwitch.tsx` — visual ◀ N/M ▶
- `client/src/components/Chat/Messages/MessageNav.tsx` — indicador lateral
- `client/src/components/Chat/Messages/Content/Reasoning.tsx` — restyle do "Thoughts"
- `client/src/components/Chat/Messages/Content/Summary.tsx`
- `client/src/components/Chat/Messages/Content/Parts/WebSearch.tsx` — favicons empilhados
- `client/src/components/Chat/Messages/Content/Parts/OpenAIImageGen/*`
- `client/src/components/Chat/Messages/Content/Parts/CodeAnalyze.tsx`, `ExecuteCode.tsx`, `ToolCall.tsx`, `RetrievalCall.tsx`, `SkillCall.tsx`, `SubagentCall.tsx`, `AgentHandoff.tsx`
- `client/src/components/Messages/Content/CodeBar.tsx` — language + filename + copy + run
- `client/src/components/Messages/Content/Mermaid/*` — incluindo dialog fullscreen
- `client/src/components/Chat/AddedConvo.tsx` — multi-convo header
- Multi-conversation: ajustar layout em `Presentation.tsx`

**Model badge per message:** componente novo `MessageModelTag` posicionado próximo à toolbar.

**Edit message UI:** já existe em `EditMessage.tsx` — restilizar.

**Validação:** screenshots; renderização de cada content type; multi-conv split.

---

### Fase 7 — Painéis & Diálogos (3–4 dias)

#### 7a. Settings (8 abas, ~55 controles)
**Arquivos tocados:**
- `client/src/components/Nav/SettingsTabs/General/*` — adicionar Densidade, Markdown user msg, Keep awake, New chat → history, Archived chats
- `client/src/components/Nav/SettingsTabs/Chat/*` — todos os ~18 toggles (Always Make Prod, Auto Send Prompts, Save Drafts, Modular, etc.)
- `client/src/components/Nav/SettingsTabs/Speech/*` — modo Simples/Avançado, slider de dB, taxa de reprodução
- **Novo:** `client/src/components/Nav/SettingsTabs/Commands/*` — aba nova (atalhos @, /, +, $)
- `client/src/components/Nav/SettingsTabs/Personalization.tsx` — expandir
- `client/src/components/Nav/SettingsTabs/Data/*` — Set Key Dialog acessível daqui
- `client/src/components/Nav/SettingsTabs/Account/*` — Avatar editor full, 2FA multi-step
- `client/src/components/Nav/SettingsTabs/Balance/Balance.tsx` (já `[EXT]`) — preservar `<ExtBalancePanel/>` e adicionar renovação automática, alerta de saldo baixo, método de pagamento

**Mobile:** aba sidebar vira scroll-x horizontal.

#### 7b. Agent Builder (3 subpaineis)
**Arquivos tocados:**
- `client/src/components/SidePanel/Agents/AgentPanel.tsx` (já `[EXT]`)
- `client/src/components/SidePanel/Agents/AgentConfig.tsx`
- `client/src/components/SidePanel/Agents/ModelPanel.tsx` (já `[EXT]`)
- `client/src/components/SidePanel/Agents/Advanced/*`
- Reorganizar em 3 subpaineis claros (Builder/Modelo/Avançado)

#### 7c. Artifacts viewer
**Arquivos tocados:**
- `client/src/components/Artifacts/*` — header com tabs + nav + actions, versões strip, refinar

#### 7d. Buy Credits modal (overlay billing)
**Arquivos tocados:**
- `client/src/components/Nav/BuyCredits/BuyCreditsModal.tsx` (admin-ext frontend, sem conflito upstream)
- Refazer fluxo PIX: valor visível, QR + copia-cola, countdown 30 min, polling automático (sem botão "Já paguei"), success step
- Coupon section
- Tabs Assinatura/Avulso com planos reais

**Backend toque em `admin-ext/src/routes/payment/asaas.ts`?**  
Possivelmente — verificar se a UI precisa de campo novo. Provavelmente não, só ajustes de UX.

#### 7e. Diálogos restantes
- Set Key Dialog: `client/src/components/Input/SetKeyDialog/SetKeyDialog.tsx`
- Bookmark edit: `client/src/components/Bookmarks/BookmarkEditDialog.tsx`
- Memory create/edit: `client/src/components/SidePanel/Memories/MemoryCreateDialog.tsx`, `MemoryEditDialog.tsx`
- MCP config: `client/src/components/MCP/MCPConfigDialog.tsx`
- Tool Select / Skill Select / MCP Tool Select dialogs
- Avatar editor: `client/src/components/Nav/SettingsTabs/Account/Avatar.tsx` (zoom/rotate/reset já existe — só restyle)
- 2FA multi-step: `client/src/components/Nav/SettingsTabs/Account/TwoFactorPhases/*` (já tem fluxo — restyle)
- Variables dialog: `client/src/components/Prompts/dialogs/VariableDialog.tsx`
- Image lightbox + Mermaid fullscreen
- Feedback dialog
- Share / Export modals

**Validação:** cada dialog funcional + visual.

---

### Fase 8 — Mobile / webapp (2–3 dias)

**Arquivos tocados:**
- `client/src/mobile.css` — adicionar todas as media queries (drawer transform, sheets fullscreen, bottom tabs, grids 1-col)
- `client/src/routes/Root.tsx` — adicionar `<MobileTopBar/>`, `<DrawerBackdrop/>`, `<MobileTabs/>`
- `client/src/components/Layout/MobileTopBar.tsx` (**novo**)
- `client/src/components/Layout/MobileTabs.tsx` (**novo**)
- `client/src/components/UnifiedSidebar/UnifiedSidebar.tsx` — comportamento off-canvas em mobile
- `client/src/components/Chat/ChatView.tsx` — esconder botões secundários em mobile

**Hooks:**
- `client/src/hooks/useDrawer.ts` (**novo**) — estado do drawer + auto-close ao navegar

**PWA:** validar `vite-plugin-pwa` (já configurado), garantir manifest com cores Navvia.

**Validação:** Playwright em iPhone 14 Pro / Pixel 7 / iPad — todos OK.

---

### Fase 9 — White-label dinâmico (consolidar Navvia + abrir pro futuro) (1–2 dias)

Hoje a Navvia está em `whitelabel/clients/navvia/`. Vamos consolidar como **sistema multi-tenant real**:

**Arquivos novos:**
- `packages/client/src/svgs/TenantLogo.tsx` — componente que renderiza a wordmark do tenant atual (lê de `whitelabel/clients/<tenant>/assets/logo.svg` por path resolution no build)
- `scripts/apply-tenant.mjs` — script que lê `whitelabel/clients/<tenant>/brand.env` e injeta no `style.css` (cores) + `translation.json` (BRAND_NAME) + assets

**Workflow de novo tenant:**
1. Criar `whitelabel/clients/<nome>/brand.env` e `assets/`
2. Rodar `node scripts/apply-tenant.mjs <nome>`
3. Build → app fica com a marca do tenant

**Documentação:** `whitelabel/README.md` com passo-a-passo.

---

### Fase 10 — QA, a11y, i18n, perf, dry-run de merge (2–3 dias)

**Checklist final:**

1. **Screenshot regression** vs baseline da Fase 0 — toda diferença justificada.
2. **WCAG AA contrast** — auditar todo o app. Densidade + bordas sutis aumentam risco. Ferramenta: `axe-core` ou Lighthouse a11y audit.
3. **i18n pt-BR overflow** — rodar `node scripts/sync-ptbr.mjs`, validar telas com textos longos. Strings novas idealmente curtas.
4. **RTL** — testar com chatDirection RTL ligado.
5. **Lighthouse perf** — Core Web Vitals (LCP, INP, CLS) iguais ou melhores que baseline. Bundle size sob controle (`vite-plugin-compression2` já configurado).
6. **Tests** — `cd api && npx jest` ; `cd client && npx jest` ; verificar nada quebrou em testes existentes.
7. **Dry-run de merge contra `upstream/main`**:
   ```bash
   git fetch upstream
   git checkout -b sync/upstream-DRYRUN
   git merge upstream/main --no-commit --no-ff
   # examinar conflitos sem commitar
   git merge --abort
   git branch -D sync/upstream-DRYRUN
   ```
   Anotar quantos arquivos conflitam e quanto trabalho de resolução teria. Atualizar `OVERLAY.md` com estimativa.
8. **Atualizar `OVERLAY.md`** com inventário final de arquivos tocados, marcados `[EXT]`.
9. **Smoke test manual** completo: login, novo chat, agente, prompts, skills, memórias, upload, buy credits, share, settings cada aba, mobile.

**Critério de "pronto pra merge em main":** todos os 9 itens acima OK.

---

## 5. Riscos & mitigações

| Risco | Mitigação |
|---|---|
| Drift tokens style.css ↔ themes/*.ts | `scripts/check-token-drift.mjs` rodando em pre-commit |
| Conflito de merge upstream em primitivos CVA | Commits granulares (1 arquivo ou pequeno grupo), `[EXT]` marker, OVERLAY.md atualizado |
| Quebrar tema `.gizmo` | Manter `.gizmo` na Fase 1, validar em screenshot |
| WCAG contrast regressão | Auditoria Fase 10 com axe-core; ajustar densidade onde necessário |
| Mobile quebrado | Playwright em viewports reais em cada fase relevante |
| i18n pt-BR overflow | Strings novas curtas; teste em viewport pequeno |
| Overlay billing quebrado | Preservar `[EXT]` markers existentes religiosamente; smoke test buy credits após Fase 7 |
| Permissions / startupConfig hard-coded | Code review pra garantir `useHasAccess()` e config flags respeitados nas novas views |
| Deploy quebrado por merge ruim em main | Sempre testar build no `dev` antes; merge to main só com build verde |

---

## 6. Cronograma estimado

| Fase | Esforço (dias úteis equiv.) | Acumulado |
|---|---|---|
| 0 — Fundação | 0.5–1 | 1 |
| 1 — Tokens | 0.5–1 | 2 |
| 2 — Tipografia + ícones | 0.5–1 | 3 |
| 3 — Primitivos CVA | 2–3 | 6 |
| 4 — Home + Sidebar + Agents page | 4–6 | 12 |
| 5 — Composer | 2–3 | 15 |
| 6 — Mensagens | 2–3 | 18 |
| 7 — Painéis & Diálogos | 3–4 | 22 |
| 8 — Mobile | 2–3 | 25 |
| 9 — White-label dinâmico | 1–2 | 27 |
| 10 — QA | 2–3 | 30 |

**Total:** ~20–30 dias úteis (4–6 semanas). Entregas parciais a cada fase permitem validação progressiva.

**Caminho crítico:** Fases 0 → 1 → 2 → 3 (~5 dias) entregam ~60% da percepção visual com baixo custo de merge. **Validar com usuários antes** de avançar pras estruturais (4+).

---

## 7. Próximos passos imediatos

1. ✅ Aprovação deste plano pelo usuário
2. Criar branch `dev` (a partir de `main`) e push pra `origin/dev`
3. Commit inicial: `chore(refactor): add IMPLEMENTATION-PLAN.md`
4. **Iniciar Fase 0** (baseline + scripts + OVERLAY.md update)

---

## 8. Notas operacionais

- **Commits no `dev` devem ter prefixo claro:** `refactor(tokens):`, `refactor(sidebar):`, `feat(home):`, `feat(mobile):`, `fix(...)`, `chore(...)`.
- **Nunca commitar `.env`, chaves, ou credenciais.**
- **`[EXT]` marker** no início de cada bloco modificado em arquivo upstream (segue o padrão atual do overlay).
- **Após cada fase:** atualizar `OVERLAY.md` se novo arquivo tocado; rodar `scripts/check-token-drift.mjs` se mexeu em tokens; rodar `scripts/sync-ptbr.mjs` se mexeu em strings.
- **Protótipo `design/ui-preview.html`** continua sendo a fonte de verdade visual durante a implementação — sempre comparar.
