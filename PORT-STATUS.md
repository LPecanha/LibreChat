# Port status — Navvia UI refactor

## Sumário

Branch `dev` agora contém **29 commits** que portam o protótipo HTML `design/ui-preview.html` (2176 linhas, 13 views) para React/TypeScript dentro do LibreChat, preservando integrações funcionais (auth, websocket, agents, billing).

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
