# Plano de Refactor de UI — LibreChat (Overlay)

> Documento de planejamento. Decisões tomadas: **estratégia híbrida** (tokens + componentes-chave, mantendo merge com upstream viável), **direção visual densa/profissional** (referências Linear / Notion / Vercel), **todas as 4 superfícies** (Navegação, Composer, Mensagens, Configurações/Painéis).

---

## 1. Contexto e a tensão central

A stack de frontend **já é, na prática, "shadcn/ui"**: Radix UI primitives + Tailwind + `class-variance-authority` + `tailwind-merge` + `lucide-react`. Não falta fundação técnica — falta **design** (tokens, tipografia, densidade, hierarquia, layout).

O conflito a gerenciar é o **overlay**: hoje o repositório toca ~12 arquivos do upstream marcados `[EXT]` (ver `OVERLAY.md`) para fazer **merge** com o LibreChat original com mínimo de conflito. Um refactor que "muda tudo" tocaria centenas de arquivos do upstream → cada merge vira um campo de conflitos.

**Princípio diretor deste plano:** maximizar mudança visual por arquivo tocado. Atacar primeiro o que é **centralizado e barato de merge** (tokens), depois o que é **contido e de alta alavancagem** (primitivos compartilhados), e só então o que é **estrutural e caro** (as 4 superfícies). Tudo marcado `[EXT]` e inventariado no `OVERLAY.md`.

### Custo de rebase por tipo de mudança

| Tipo de mudança | Arquivos | Custo de merge | Alavancagem |
|---|---|---|---|
| Tokens de tema (cor/raio/sombra/espaçamento) | ~4 | **Muito baixo** | Global (app inteiro) |
| Tipografia + fontes | ~3 | Baixo | Global |
| Restyle dos primitivos compartilhados (CVA) | ~74 (contidos) | Baixo–médio (strings de classe) | Cascateia p/ ~680 componentes |
| Sistema de ícones | wrapper + N SVGs | Baixo–médio | Global |
| Redesign estrutural das 4 superfícies | dezenas | **Alto** (estrutural) | Localizado por superfície |

> **Honestidade sobre o overlay:** mesmo o caminho híbrido **expande** a superfície de rebase para além dos 12 arquivos atuais — principalmente para os arquivos de token e para `packages/client/src/components/*`. A disciplina é: marcar `[EXT]`, manter inventário no `OVERLAY.md`, e preferir mudanças de token/CVA (fáceis de mergear) a reescritas estruturais.

---

## 2. Onde mora cada coisa (mapa de arquivos)

### Tokens / tema (fonte dupla — precisa sincronizar)
- `client/src/style.css` — variáveis CSS estáticas: `:root` (paleta base), `html` (tema claro), `.dark` (tema escuro), `.gizmo` (variante). **Também** os `@font-face` (linhas ~316+) e `--font-size-*`.
- `client/src/mobile.css` — overrides mobile.
- `packages/client/src/theme/themes/default.ts` + `dark.ts` — os **mesmos** tokens como strings RGB (`'rgb-text-primary': '33 33 33'`), aplicados em runtime por `ThemeProvider` → `utils/applyTheme.ts`.
- `client/tailwind.config.cjs` — mapeia tokens CSS → classes Tailwind (`bg-surface-primary`, `text-text-primary`, etc.), `fontFamily`, `borderRadius`, keyframes/animations.

### Primitivos compartilhados (alta alavancagem)
- `packages/client/src/components/` — 74 primitivos Radix+CVA (Button, Input, Dialog, Select, Tabs, DropdownMenu, Tooltip, Switch, Checkbox, Badge, DataTable, …). Consumidos por todo o app.

### Ícones
- `packages/client/src/svgs/` — 87 SVGs custom (modelos de IA, ícones de UI).
- `lucide-react` — ícones genéricos, usados em todo lugar.

### As 4 superfícies prioritárias
- **Navegação:** `client/src/components/UnifiedSidebar/` (`UnifiedSidebar.tsx`, `Sidebar.tsx`, `ExpandedPanel.tsx`, `ConversationsSection.tsx`) + `client/src/components/Nav/` (conta, settings, ~25 arquivos).
- **Composer:** `client/src/components/Chat/Input/` (`ChatForm.tsx`, `BadgeRow.tsx`, `ModelSelect/`, `ToolsDropdown.tsx`, `Files/`, `Mention.tsx`, `AudioRecorder.tsx` — 21 arquivos).
- **Mensagens:** `client/src/components/Chat/Messages/` (`MessagesView.tsx`, `Message.tsx`, `Content/` (16), `HoverButtons.tsx`, `Feedback.tsx`, `Fork.tsx`, `MessageNav.tsx`).
- **Configurações/Painéis:** `client/src/components/Nav/SettingsTabs/`, `client/src/components/SidePanel/` (96 arquivos: agentes, arquivos, memórias, parâmetros), modais diversos.

### App shell
- `client/src/routes/Root.tsx` — layout principal (UnifiedSidebar + conteúdo).
- `client/src/components/Chat/ChatView.tsx` — Header → MessagesView → ChatForm → Landing/Footer.

---

## 3. Direção visual: "Denso / Profissional" (Linear · Notion · Vercel)

Tradução da estética escolhida em decisões concretas de token:

### Tipografia
- **UI/chrome:** base **13px** (`0.8125rem`), line-height ~1.4. **Corpo de mensagem:** 14–15px, line-height ~1.6 (leitura confortável mesmo num app denso).
- **Fonte:** manter **Inter** (excelente para UI densa, já presente) ou migrar para **Geist** (Vercel, licença OFL). Headings com **Inter Tight**/Inter Display + tracking levemente negativo. Code: **Geist Mono** ou **JetBrains Mono** (substituindo Roboto Mono, opcional).
- Escala: redefinir `--font-size-xs/sm/base/lg/xl` para uma escala mais apertada e consistente.

### Densidade & forma
- Altura de controles: **28–32px** (`h-7`/`h-8`) em vez de `h-10`. Padding compacto. Ritmo de espaçamento 4/6/8/12px.
- Raio: **6px** (`rounded-md`) em vez de 8px (`rounded-lg`) — visual mais "ferramenta", menos "consumer".
- **Separação por borda, não por sombra** (assinatura Linear): bordas 1px de baixo contraste; sombras reservadas a overlays (popover/dialog).

### Cor
- Escala de cinzas neutra com tom levemente frio; **1 cor de marca** de acento (definir). Cores semânticas (warning/destructive/success) dessaturadas.
- Bordas sutis, foco visível e consistente (anel único `--ring`).
- Revisar **contraste WCAG AA** — já há dívida conhecida (ver comentário em `Button.tsx`, variante `submit` força `text-white` por contraste).

---

## 4. Templates / referências sugeridas

> Como a base já é shadcn-compatível, dá pra **copiar/colar** componentes destes kits e re-mapear para os tokens semânticos do LibreChat. Não adotar nenhum kit "por inteiro" (brigaria com o overlay) — usar como **referência de padrão e de estilo**.

**Tema / tokens**
- **tweakcn.com** — editor visual de tema shadcn; exporta variáveis CSS. Use para **semear** a paleta (gera `--background`, `--primary`, … em HSL); depois mapeie para o conjunto semântico mais rico do LibreChat (`surface-*`, `border-*`, `text-*`).
- **ui.shadcn.com/themes** + **realtimecolors.com** — paletas base e teste rápido de contraste.

**Primitivos de chat (composer + mensagens)**
- **prompt-kit.com** — primitivos de IA estilo shadcn (PromptInput, Message, Markdown, ChatContainer, Reasoning, ScrollButton, PromptSuggestion, Loader). MIT, copy-paste. **Melhor referência** para Composer e Mensagens.
- **kibo-ui.com** — blocos de IA (AIInput, AIMessage, …) para shadcn.
- **assistant-ui.com** — runtime+primitivos de chat React; mais pesado/opinativo. Bom como referência de interação e acessibilidade do composer, **não** para adoção integral.
- **shadcn-chatbot-kit** (Blazity) — blocos de UI de chat.

**Densidade / layout**
- **Linear**, **Notion**, **Vercel dashboard** — referências diretas da estética escolhida.

**Polish (opcional, com moderação — a direção densa pede contenção)**
- **originui.com** — componentes shadcn refinados (inputs, selects, menus).
- **Aceternity** — flourishes para landing/empty-state.

**Fontes**
- **Inter** (manter) ou **Geist** (vercel.com/font, OFL). Mono: **Geist Mono** / **JetBrains Mono**.

**Ícones**
- Manter **lucide-react** (já onipresente + 87 SVGs custom → migrar de set seria caro). Padronizar via wrapper: `size` e `strokeWidth` default (≈1.5–1.75) consistentes. Auditar os 87 SVGs custom para alinhar peso de traço.

---

## 5. Fases (sequência, complexidade, risco, custo de rebase)

> Legenda — Complexidade: ◐ baixa · ◑ média · ● alta. Risco e Rebase idem.

### Fase 0 — Fundação & guardrails  ·  Compl. ◐ · Risco ◐ · Rebase ◐
- Definir o **design system** (paleta, escala tipográfica, densidade, raios, sombras) no tweakcn / planilha de tokens antes de tocar código.
- **Baseline de regressão visual:** capturar screenshots das telas-chave (Playwright) em claro/escuro/mobile, antes de qualquer mudança, para comparar a cada fase.
- Resolver a **fonte dupla de tokens**: documentar o mapeamento `style.css` ↔ `theme/themes/*.ts` e, idealmente, gerar um a partir do outro (script) para eliminar drift. Decidir a fonte de verdade.
- Atualizar `OVERLAY.md` com a nova seção "UI refactor — arquivos tocados".

### Fase 1 — Tokens de cor/raio/sombra/espaçamento  ·  Compl. ◐ · Risco ◐ · Rebase ◐  ← **o ganho de ~60%**
- Reescrever a paleta em `style.css` (`html`, `.dark`, `.gizmo`) **e** em `theme/themes/default.ts` + `dark.ts` (manter sincronizado).
- Ajustar `--radius`, escala de sombra e (se necessário) espaçamento no `tailwind.config.cjs`.
- **Entrega:** o app inteiro re-skinado, mesmo layout. Reversível, validável com usuários antes de seguir.

### Fase 2 — Tipografia & ícones  ·  Compl. ◑ · Risco ◐ · Rebase ◐
- Fontes: confirmar Inter ou adicionar Geist/Inter Tight em `client/public/fonts/` + `@font-face` em `style.css` + `fontFamily` no tailwind. Definir `--font-size-*` e line-heights.
- Ícones: wrapper de `lucide` com `size`/`strokeWidth` padrão; auditoria de consistência dos 87 SVGs custom (substituir os mais destoantes).

### Fase 3 — Restyle dos primitivos compartilhados  ·  Compl. ◑ · Risco ◑ · Rebase ◑
- Editar as strings CVA dos 74 primitivos em `packages/client/src/components/`: alturas/padding (densidade), `rounded-lg`→`rounded-md`, anéis de foco, bordas. Prioridade: Button, Input, Textarea, Select, DropdownMenu, Dialog, Tabs, Tooltip, Switch, Checkbox, Badge, DataTable.
- **Alta alavancagem:** cascateia para os ~680 componentes do app sem tocá-los.
- Marcar cada arquivo `[EXT]`; inventariar.

### Fase 4 — Superfície: Navegação / Sidebar  ·  Compl. ● · Risco ● · Rebase ●  ← **a dor relatada dos usuários**
- Wireframe primeiro (definir a hierarquia que confunde hoje). Redesenhar `UnifiedSidebar/`: densidade das linhas de conversa (28–32px), **agrupamento por data**, cabeçalhos de seção claros, menu de conta. Revisar `Nav/`.
- Estrutural → edições in-place + wrappers onde possível. **Maior custo de rebase** — fazer com disciplina e marcação `[EXT]`.

### Fase 5 — Superfície: Composer  ·  Compl. ● · Risco ◑ · Rebase ●
- Redesenhar `Chat/Input/ChatForm.tsx` e companhia: seletor de modelo, anexos, ferramentas/MCP, badges, botão de envio. Padrões de referência: prompt-kit / kibo-ui.

### Fase 6 — Superfície: Mensagens / leitura  ·  Compl. ◑ · Risco ◑ · Rebase ◑
- `Chat/Messages/`: distinção de papel (usuário/assistente), chrome de markdown/código, ações de hover, feedback, navegação de branches. Tipografia de corpo confortável dentro da estética densa.

### Fase 7 — Configurações / Painéis  ·  Compl. ◑ · Risco ◐ · Rebase ◑
- `Nav/SettingsTabs/`, `SidePanel/` (agentes/arquivos/memórias), modais. Boa parte se resolve "de graça" com Fases 1–3; aqui são limpezas de layout pontuais e ajustes de densidade. **Atenção:** este é o overlay já tocado em `Balance.tsx`/`AccountSettings.tsx`/`AgentPanel.tsx`/`ModelPanel.tsx` — coordenar com os componentes do overlay (`admin-ext`/`admin-panel`).

### Fase 8 — QA, a11y, polish, dry-run de rebase  ·  Compl. ◑ · Risco ◑ · Rebase —
- Diff de regressão visual vs. baseline da Fase 0.
- Paridade claro/escuro/`.gizmo`; **contraste WCAG AA**; responsivo/`mobile.css`.
- **i18n:** textos pt-BR são mais longos que en — checar overflow/quebra nos novos layouts densos.
- Performance (densidade não pode regredir virtualização das listas).
- **Dry-run de merge** contra `upstream/main` para medir o custo real de conflito introduzido; atualizar `OVERLAY.md`.

---

## 6. Riscos transversais (atenção contínua)

1. **Drift da fonte dupla de tokens** (`style.css` ↔ `theme/themes/*.ts`) — resolver na Fase 0, idealmente com geração automática.
2. **Variante `.gizmo`** — tema extra além de claro/escuro; precisa ser atualizado junto ou descontinuado conscientemente.
3. **Contraste WCAG** — dívida já existente (ver `Button.tsx`); a direção densa com bordas sutis aumenta o risco de baixo contraste.
4. **`mobile.css` + responsivo** — densidade desktop não pode quebrar o mobile (overlay de sidebar usa transform).
5. **i18n (pt-BR/long strings)** — layouts apertados estouram com textos longos; rodar `scripts/sync-ptbr.mjs` e validar.
6. **87 SVGs custom** — inconsistência de peso de traço com lucide; auditar.
7. **Expansão da superfície de rebase** — `packages/client/src/components/*` e os arquivos de token passam a ser pontos de conflito; manter inventário religiosamente no `OVERLAY.md`.
8. **Acoplamento com o overlay de billing** — `AccountSettings.tsx`, `Balance.tsx`, `AgentPanel.tsx`, `ModelPanel.tsx`, `ExpandedPanel.tsx` já são tocados pelo overlay; o redesign precisa preservar os pontos `[EXT]` e os componentes `<ExtBalance*/>`, `<CreditNavButton/>`, `<PaymentToast/>`.

---

## 7. Estimativa de complexidade (resumo)

- **Esforço total:** alto, mas **incremental e entregável por fase**. As Fases 0–3 entregam ~60–70% da percepção "ficou outro produto, e melhor" com **baixo** custo de rebase. As Fases 4–7 (estruturais) são o grosso do esforço e do custo de merge.
- **Caminho recomendado:** fechar Fases 0→1→2→3 e **validar com usuários reais** antes de investir nas superfícies estruturais. Se o ganho de token+primitivos já resolver a percepção de "fora do padrão / confuso", as fases estruturais podem ser feitas com calma, uma superfície por vez, atrás de uma base visual já melhor.

---

## 8. Próximos passos imediatos

1. Definir a **cor de marca** e a fonte (Inter vs. Geist) — destrava a Fase 1/2.
2. Montar a **planilha/arquivo de tokens** (paleta claro+escuro, escala tipográfica, densidade, raios) — pode ser semeada no tweakcn.
3. Capturar o **baseline de screenshots** (Playwright) das telas-chave.
4. Executar a **Fase 1** num branch e revisar o re-skin global antes de prosseguir.
