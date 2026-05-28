# Baseline screenshots — pré-refactor

> 16 screenshots do **estado-alvo** (protótipo `design/ui-preview.html` com paleta Navvia + layout aprovado), capturados antes do início da implementação real no app. Servem como referência visual para comparar a cada fase do `IMPLEMENTATION-PLAN.md`.

**Captura:** Playwright (Chromium), iPhone 14 Pro (390×844 @ 3x) + desktop 1440×900 @ 1x.
**Data:** 2026-05-28
**Branch:** `dev`

## Conteúdo

### Desktop (escuro)
- `01-home-dark.png` — Home dashboard (banner Navvia + composer Siri + stats + tiles + agents + galeria + recentes)
- `02-chat-rich-dark.png` — Conversa demo com Thinking, code block, tabela, LaTeX, Mermaid, citações, artifact card
- `03-agents-dark.png` — Galeria de Agentes (3 tabs, categorias, cards completos)
- `04-settings-dark.png` — Settings com 8 abas (Geral aberto)
- `05-buy-plans-dark.png` — Compra de créditos (Assinatura/Avulso + planos + cupom)
- `06-buy-pix-dark.png` — Fluxo PIX ASAAS (valor, QR, copia-cola, countdown)
- `07-builder-dark.png` — Builder de agente (3 subpaineis)
- `08-artifacts-dark.png` — Artifacts viewer (Code/Preview + versões)
- `09-auth-dark.png` — Login split-screen Navvia

### Desktop (claro)
- `10-home-light.png` — Home modo claro
- `11-chat-light.png` — Chat modo claro

### Mobile (iPhone 14 Pro)
- `m1-home-dark.png` — Home mobile (top bar + bottom tabs)
- `m2-drawer.png` — Sidebar como drawer off-canvas
- `m3-chat.png` — Chat mobile
- `m4-buy.png` — Buy modal como bottom sheet
- `m5-pix.png` — PIX bottom sheet

## Como regerar

```bash
cd /tmp/pw-shoot && node baseline.mjs
```

(Script em `/tmp/pw-shoot/baseline.mjs` — copiar pra `scripts/baseline-screenshots.mjs` se quiser persistir.)

## Uso em cada fase

Ao final de cada fase do `IMPLEMENTATION-PLAN.md`, gerar screenshots equivalentes em `design/screenshots/<phase>/` e comparar lado a lado.
