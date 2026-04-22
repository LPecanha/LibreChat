#!/usr/bin/env python3
"""
Navvia WhiteLabel Color Generator
==================================

Gera automaticamente todas as variações de cores necessárias para o sistema
a partir de uma cor base fornecida.

Uso:
    python3 whitelabel_color_generator.py #E9562A

Autor: Sistema Navvia
Data: 24/12/2024
"""

import sys
import re
from colorsys import rgb_to_hls, hls_to_rgb


def hex_to_rgb(hex_color):
    """Converte cor hexadecimal para RGB (0-255)"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def rgb_to_hex(r, g, b):
    """Converte RGB (0-255) para hexadecimal"""
    return f"#{int(r):02x}{int(g):02x}{int(b):02x}"


def adjust_lightness(hex_color, factor):
    """
    Ajusta a luminosidade de uma cor
    factor > 1: mais clara
    factor < 1: mais escura
    """
    r, g, b = hex_to_rgb(hex_color)
    h, l, s = rgb_to_hls(r/255, g/255, b/255)
    
    # Ajusta a luminosidade
    l = max(0, min(1, l * factor))
    
    r, g, b = hls_to_rgb(h, l, s)
    return rgb_to_hex(r * 255, g * 255, b * 255)


def adjust_saturation(hex_color, factor):
    """
    Ajusta a saturação de uma cor
    factor > 1: mais saturada
    factor < 1: menos saturada
    """
    r, g, b = hex_to_rgb(hex_color)
    h, l, s = rgb_to_hls(r/255, g/255, b/255)
    
    # Ajusta a saturação
    s = max(0, min(1, s * factor))
    
    r, g, b = hls_to_rgb(h, l, s)
    return rgb_to_hex(r * 255, g * 255, b * 255)


def generate_color_palette(base_color):
    """
    Gera uma paleta completa de cores a partir de uma cor base
    Retorna um dicionário com todas as variações necessárias
    """
    palette = {
        'brand-primary': base_color,
    }
    
    # Gera variações de verde (para botões de sucesso/submit)
    # Baseado na cor primária, mas ajustado para tons de verde
    green_base = adjust_saturation(base_color, 0.8)
    palette['green-50'] = adjust_lightness(green_base, 2.5)
    palette['green-100'] = adjust_lightness(green_base, 2.2)
    palette['green-200'] = adjust_lightness(green_base, 1.9)
    palette['green-300'] = adjust_lightness(green_base, 1.6)
    palette['green-400'] = adjust_lightness(green_base, 1.3)
    palette['green-500'] = adjust_lightness(green_base, 1.1)
    palette['green-600'] = adjust_lightness(green_base, 0.9)
    palette['green-700'] = adjust_lightness(green_base, 0.7)
    palette['green-800'] = adjust_lightness(green_base, 0.5)
    palette['green-900'] = adjust_lightness(green_base, 0.3)
    palette['green-950'] = adjust_lightness(green_base, 0.15)
    
    # Gera variações de vermelho (para botões destrutivos)
    red_base = "#dc2626"  # Mantém vermelho padrão para ações destrutivas
    palette['red-50'] = '#fef2f2'
    palette['red-100'] = '#fee2e2'
    palette['red-200'] = '#fecaca'
    palette['red-300'] = '#fca5a5'
    palette['red-400'] = '#f87171'
    palette['red-500'] = '#ef4444'
    palette['red-600'] = red_base
    palette['red-700'] = '#b91c1c'
    palette['red-800'] = '#991b1b'
    palette['red-900'] = '#7f1d1d'
    palette['red-950'] = '#450a0a'
    
    # Gera variações de âmbar (para avisos)
    palette['amber-50'] = '#fffbeb'
    palette['amber-100'] = '#fef3c7'
    palette['amber-200'] = '#fde68a'
    palette['amber-300'] = '#fcd34d'
    palette['amber-400'] = '#fbbf24'
    palette['amber-500'] = '#f59e0b'
    palette['amber-600'] = '#d97706'
    palette['amber-700'] = '#b45309'
    palette['amber-800'] = '#92400e'
    palette['amber-900'] = '#78350f'
    palette['amber-950'] = '#451a03'
    
    # Variações da cor primária (baseadas na cor fornecida)
    palette['primary-50'] = adjust_lightness(base_color, 2.8)
    palette['primary-100'] = adjust_lightness(base_color, 2.4)
    palette['primary-200'] = adjust_lightness(base_color, 2.0)
    palette['primary-300'] = adjust_lightness(base_color, 1.6)
    palette['primary-400'] = adjust_lightness(base_color, 1.3)
    palette['primary-500'] = base_color
    palette['primary-600'] = adjust_lightness(base_color, 0.85)
    palette['primary-700'] = adjust_lightness(base_color, 0.7)
    palette['primary-800'] = adjust_lightness(base_color, 0.55)
    palette['primary-900'] = adjust_lightness(base_color, 0.4)
    palette['primary-950'] = adjust_lightness(base_color, 0.2)
    
    return palette


def generate_css_variables(palette):
    """Gera as variáveis CSS a partir da paleta"""
    css_vars = []
    
    css_vars.append("/* Cores Primárias da Marca */")
    css_vars.append(f"  --brand-purple: {palette['brand-primary']};")
    css_vars.append("")
    
    css_vars.append("/* Variações de Verde (Sucesso/Submit) */")
    for shade in [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]:
        css_vars.append(f"  --green-{shade}: {palette[f'green-{shade}']};")
    css_vars.append("")
    
    css_vars.append("/* Variações de Vermelho (Destrutivo) */")
    for shade in [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]:
        css_vars.append(f"  --red-{shade}: {palette[f'red-{shade}']};")
    css_vars.append("")
    
    css_vars.append("/* Variações de Âmbar (Avisos) */")
    for shade in [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]:
        css_vars.append(f"  --amber-{shade}: {palette[f'amber-{shade}']};")
    css_vars.append("")
    
    css_vars.append("/* Variações da Cor Primária */")
    for shade in [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]:
        css_vars.append(f"  --primary-{shade}: {palette[f'primary-{shade}']};")
    
    return "\n".join(css_vars)


def update_style_css(base_color, css_file='client/src/style.css'):
    """Atualiza o arquivo style.css com as novas cores"""
    
    print(f"🎨 Gerando paleta de cores a partir de: {base_color}")
    palette = generate_color_palette(base_color)
    
    print(f"📝 Lendo arquivo: {css_file}")
    try:
        with open(css_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"❌ Erro: Arquivo {css_file} não encontrado!")
        return False
    
    # Backup do arquivo original
    backup_file = css_file + '.backup'
    with open(backup_file, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"💾 Backup criado: {backup_file}")
    
    # Substitui --brand-purple
    content = re.sub(
        r'--brand-purple:\s*#[0-9a-fA-F]{6};',
        f'--brand-purple: {base_color};',
        content
    )
    
    # Substitui variações de verde
    for shade in [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]:
        pattern = f'--green-{shade}:\\s*#[0-9a-fA-F]{{6}};'
        replacement = f'--green-{shade}: {palette[f"green-{shade}"]};'
        content = re.sub(pattern, replacement, content)

    # Substitui rgba hardcoded usados pelo .btn-primary (não cobertos pelas variáveis CSS)
    # Deriva as três variantes a partir da cor base
    brand_r, brand_g, brand_b = hex_to_rgb(base_color)
    hover_r = max(0, int(brand_r * 0.8))
    hover_g = max(0, int(brand_g * 0.8))
    hover_b = max(0, int(brand_b * 0.8))
    ring_r = min(255, int(brand_r * 1.1))
    ring_g = min(255, int(brand_g * 1.1))
    ring_b = min(255, int(brand_b * 1.1))

    # rgba(16, 163, 127, …) — bg padrão (#10a37f)
    content = re.sub(r'rgba\(16,\s*163,\s*127,', f'rgba({brand_r}, {brand_g}, {brand_b},', content)
    # rgba(26, 127, 100, …) — hover
    content = re.sub(r'rgba\(26,\s*127,\s*100,', f'rgba({hover_r}, {hover_g}, {hover_b},', content)
    # rgba(25, 195, 125, …) — focus ring
    content = re.sub(r'rgba\(25,\s*195,\s*125,', f'rgba({ring_r}, {ring_g}, {ring_b},', content)

    # Salva o arquivo atualizado
    with open(css_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Arquivo {css_file} atualizado com sucesso!")
    
    # Gera relatório
    report = generate_report(base_color, palette)
    report_file = 'color_palette_report.md'
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)
    print(f"📊 Relatório gerado: {report_file}")
    
    return True


def update_tailwind_config(palette, tailwind_file='client/tailwind.config.cjs'):
    """Atualiza o arquivo tailwind.config.cjs com as novas cores"""
    
    print(f"🎨 Atualizando Tailwind config: {tailwind_file}")
    
    try:
        with open(tailwind_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"⚠️  Aviso: Arquivo {tailwind_file} não encontrado! Pulando...")
        return False
    
    # Backup do arquivo original
    backup_file = tailwind_file + '.backup'
    with open(backup_file, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"💾 Backup criado: {backup_file}")
    
    # Encontra a seção de cores green no tailwind
    green_section_pattern = r"(green:\s*\{[^}]+\})"
    
    # Cria nova seção green com as cores da paleta
    new_green_section = f"""green: {{
          50: '{palette['green-50']}',
          100: '{palette['green-100']}',
          200: '{palette['green-200']}',
          300: '{palette['green-300']}',
          400: '{palette['green-400']}',
          500: '{palette['green-500']}',
          550: '{palette['green-600']}',
          600: '{palette['green-700']}',
          700: '{palette['green-800']}',
          800: '{palette['green-900']}',
          900: '{palette['green-950']}',
        }}"""
    
    # Substitui a seção green
    content = re.sub(green_section_pattern, new_green_section, content, flags=re.DOTALL)
    
    # Salva o arquivo atualizado
    with open(tailwind_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Tailwind config atualizado com paleta de cores")
    
    return True


def update_index_html(brand_name, base_color, description, html_file='client/index.html'):
    """Atualiza o arquivo index.html com nome da marca, cor do tema e descrição"""
    
    print(f"📄 Atualizando index.html: {html_file}")
    
    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"⚠️  Aviso: Arquivo {html_file} não encontrado! Pulando...")
        return False
    
    # Backup do arquivo original
    backup_file = html_file + '.backup'
    with open(backup_file, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"💾 Backup criado: {backup_file}")
    
    # Substitui title
    content = re.sub(
        r'<title>LibreChat</title>',
        f'<title>{brand_name}</title>',
        content
    )
    
    # Substitui meta theme-color
    content = re.sub(
        r'<meta name="theme-color" content="#[0-9a-fA-F]{6}" />',
        f'<meta name="theme-color" content="{base_color}" />',
        content
    )
    
    # Substitui meta description
    content = re.sub(
        r'<meta name="description" content="[^"]*" />',
        f'<meta name="description" content="{description}" />',
        content
    )
    
    # Salva o arquivo atualizado
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ index.html atualizado: title={brand_name}, theme-color={base_color}")
    
    return True


def update_startup_tsx(brand_name, tsx_file='client/src/routes/Layouts/Startup.tsx'):
    """Atualiza o arquivo Startup.tsx com o nome da marca no document.title"""
    
    print(f"⚛️  Atualizando Startup.tsx: {tsx_file}")
    
    try:
        with open(tsx_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"⚠️  Aviso: Arquivo {tsx_file} não encontrado! Pulando...")
        return False
    
    # Backup do arquivo original
    backup_file = tsx_file + '.backup'
    with open(backup_file, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"💾 Backup criado: {backup_file}")
    
    # Substitui 'LibreChat' no document.title
    content = re.sub(
        r"document\.title\s*=\s*startupConfig\?\.appTitle\s*\|\|\s*['\"]LibreChat['\"];",
        f"document.title = startupConfig?.appTitle || '{brand_name}';",
        content
    )
    
    # Salva o arquivo atualizado
    with open(tsx_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Startup.tsx atualizado: document.title fallback = '{brand_name}'")
    
    return True


def update_vite_config(brand_name, base_color, vite_file='client/vite.config.ts'):
    """Atualiza o arquivo vite.config.ts com o nome da marca e cor do tema"""
    
    print(f"📱 Atualizando manifest PWA: {vite_file}")
    
    try:
        with open(vite_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"⚠️  Aviso: Arquivo {vite_file} não encontrado! Pulando...")
        return False
    
    # Backup do arquivo original
    backup_file = vite_file + '.backup'
    with open(backup_file, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"💾 Backup criado: {backup_file}")
    
    # Substitui name no manifest
    content = re.sub(
        r"name:\s*['\"]LibreChat['\"]",
        f"name: '{brand_name}'",
        content
    )
    
    # Substitui short_name no manifest
    content = re.sub(
        r"short_name:\s*['\"]LibreChat['\"]",
        f"short_name: '{brand_name}'",
        content
    )
    
    # Substitui theme_color no manifest
    content = re.sub(
        r"theme_color:\s*['\"]#[0-9a-fA-F]{6}['\"]",
        f"theme_color: '{base_color}'",
        content
    )
    
    # Salva o arquivo atualizado
    with open(vite_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Manifest PWA atualizado: name={brand_name}, theme_color={base_color}")
    
    return True


def generate_report(base_color, palette):
    """Gera um relatório em Markdown com a paleta de cores"""
    report = f"""# Relatório de Paleta de Cores - Navvia WhiteLabel

**Data:** {__import__('datetime').datetime.now().strftime('%d/%m/%Y %H:%M:%S')}  
**Cor Base:** `{base_color}`

---

## 🎨 Paleta Gerada

### Cor Primária da Marca
- **Brand Primary:** `{palette['brand-primary']}`

### Variações de Verde (Sucesso/Submit)
"""
    
    for shade in [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]:
        color = palette[f'green-{shade}']
        report += f"- **Green {shade}:** `{color}`\n"
    
    report += "\n### Variações de Vermelho (Destrutivo)\n"
    for shade in [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]:
        color = palette[f'red-{shade}']
        report += f"- **Red {shade}:** `{color}`\n"
    
    report += "\n### Variações de Âmbar (Avisos)\n"
    for shade in [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]:
        color = palette[f'amber-{shade}']
        report += f"- **Amber {shade}:** `{color}`\n"
    
    report += "\n### Variações da Cor Primária\n"
    for shade in [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]:
        color = palette[f'primary-{shade}']
        report += f"- **Primary {shade}:** `{color}`\n"
    
    report += """
---

## 📋 Aplicação

As cores foram aplicadas automaticamente no arquivo `client/src/style.css`.

### Arquivos Modificados
- ✅ `client/src/style.css` - Variáveis CSS atualizadas
- 💾 `client/src/style.css.backup` - Backup do arquivo original

### Próximos Passos
1. Revisar as cores geradas no arquivo CSS
2. Testar a interface com as novas cores
3. Ajustar manualmente se necessário
4. Fazer commit das alterações

---

**Gerado por:** Navvia WhiteLabel Color Generator v1.0
"""
    
    return report


def validate_hex_color(color):
    """Valida se a string é uma cor hexadecimal válida"""
    pattern = r'^#[0-9A-Fa-f]{6}$'
    return bool(re.match(pattern, color))


def main():
    """Função principal"""
    print("=" * 60)
    print("  Navvia WhiteLabel Color Generator")
    print("=" * 60)
    print()
    
    if len(sys.argv) < 2 or len(sys.argv) > 4:
        print("❌ Uso incorreto!")
        print()
        print("Uso: python3 whitelabel_color_generator.py <COR_HEX> [NOME_MARCA]")
        print()
        print("Exemplos:")
        print("  python3 whitelabel_color_generator.py #E9562A")
        print("  python3 whitelabel_color_generator.py #E9562A Navvia")
        print()
        sys.exit(1)
    
    base_color = sys.argv[1].upper()
    brand_name = sys.argv[2] if len(sys.argv) >= 3 else "Navvia"
    description = sys.argv[3] if len(sys.argv) >= 4 else f"{brand_name} - A Plataforma Multi IA"

    if not validate_hex_color(base_color):
        print(f"❌ Erro: '{base_color}' não é uma cor hexadecimal válida!")
        print()
        print("Formato esperado: #RRGGBB (ex: #E9562A)")
        sys.exit(1)

    print(f"🎨 Cor base fornecida: {base_color}")
    print(f"🏷️  Nome da marca: {brand_name}")
    print()
    
    # Gera paleta de cores
    print(f"🎨 Gerando paleta de cores a partir de: {base_color}")
    palette = generate_color_palette(base_color)
    
    # Atualiza style.css
    css_success = update_style_css(base_color)
    
    # Atualiza vite.config.ts
    vite_success = update_vite_config(brand_name, base_color)
    
    # Atualiza tailwind.config.cjs
    tailwind_success = update_tailwind_config(palette)
    
    # Atualiza index.html
    html_success = update_index_html(brand_name, base_color, description)
    
    # Atualiza Startup.tsx
    tsx_success = update_startup_tsx(brand_name)
    
    if css_success:
        print()
        print("=" * 60)
        print("✅ Processo concluído com sucesso!")
        print("=" * 60)
        print()
        print("📁 Arquivos gerados:")
        print("  • client/src/style.css (atualizado)")
        print("  • client/src/style.css.backup (backup)")
        if vite_success:
            print("  • client/vite.config.ts (atualizado)")
            print("  • client/vite.config.ts.backup (backup)")
        if tailwind_success:
            print("  • client/tailwind.config.cjs (atualizado)")
            print("  • client/tailwind.config.cjs.backup (backup)")
        if html_success:
            print("  • client/index.html (atualizado)")
            print("  • client/index.html.backup (backup)")
        if tsx_success:
            print("  • client/src/routes/Layouts/Startup.tsx (atualizado)")
            print("  • client/src/routes/Layouts/Startup.tsx.backup (backup)")
        print("  • color_palette_report.md (relatório)")
        print()
    else:
        print()
        print("=" * 60)
        print("❌ Processo falhou!")
        print("=" * 60)
        sys.exit(1)


if __name__ == '__main__':
    main()