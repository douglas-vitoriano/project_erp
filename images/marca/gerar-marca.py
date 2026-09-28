#!/usr/bin/env python3
"""
Gera os arquivos da marca BoxFlow a partir de parâmetros, não de imagem rasterizada.

O símbolo é uma caixa vista de frente com a onda do papelão atravessando-a: os lados
verticais da caixa são interrompidos exatamente onde a onda passa, e a onda transborda
para fora nos dois lados. É isso que dá o sentido do nome — o fluxo passando pela caixa.

O letreiro é convertido de Inter Bold para curvas (`<path>`), nunca para `<text>`, porque
logotipo com fonte declarada muda de forma em máquina que não tenha a fonte instalada.

Uso:  python gerar-marca.py
Saída: SVG nesta pasta + PNG em png/ (este segundo passo precisa de Node; ver render.mjs)
"""

import json
import os
import subprocess
import sys
import urllib.request

AQUI = os.path.dirname(os.path.abspath(__file__))
FONTE = os.path.join(AQUI, '.fonte', 'Inter.ttf')
FONTE_URL = 'https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf'

# ---------------------------------------------------------------- paleta

PALETA = {
    'petroleo': '#0B3C49',   # base da marca, fundo institucional
    'teal':     '#0F766E',   # apoio; é o acento legível sobre fundo claro
    'lima':     '#A3E635',   # acento de energia; só sobre fundo escuro (ver 04-MARCA §2.3)
    'cal':      '#F1FAF7',   # superfície clara e traço sobre fundo escuro
    'carvao':   '#1F2933',   # texto e alternativa de fundo escuro
}

# Sobre fundo escuro a lima funciona (contraste alto). Sobre fundo claro a lima
# tem 1,66:1 contra branco e é ilegível, então o acento vira teal.
TEMAS = {
    'escuro': {'caixa': PALETA['cal'],      'onda': PALETA['lima'],
               'box': PALETA['cal'],        'flow': PALETA['lima'],
               'fundo': PALETA['petroleo']},
    'claro':  {'caixa': PALETA['petroleo'], 'onda': PALETA['teal'],
               'box': PALETA['petroleo'],   'flow': PALETA['teal'],
               'fundo': PALETA['cal']},
    'tinta':  {'caixa': PALETA['petroleo'], 'onda': PALETA['petroleo'],
               'box': PALETA['petroleo'],   'flow': PALETA['petroleo'],
               'fundo': None},
    'reverso': {'caixa': PALETA['cal'],     'onda': PALETA['cal'],
                'box': PALETA['cal'],       'flow': PALETA['cal'],
                'fundo': None},
}

# ---------------------------------------------------------------- símbolo

# Proporções medidas no logotipo original e mantidas: caixa quadrada de lado 84,
# traço a 4,8% do lado, canto a 13% do lado, onda transbordando 19% para cada lado.
class Simbolo:
    def __init__(self, humps=9, traco=4.0, amp=9.75):
        self.x0, self.x1 = 22.0, 106.0          # caixa
        self.y0, self.y1 = 22.0, 106.0
        self.rx = 11.0
        self.traco = traco
        self.centro_y = 64.0
        self.onda_x0 = 5.5                      # onda transborda nos dois lados
        self.onda_span = 117.0
        self.humps = humps
        self.amp = amp
        # A folga do vão nos lados da caixa acompanha a amplitude da onda e o traço,
        # senão o encontro fica sujo em tamanho pequeno.
        folga = self.amp + self.traco / 2 + 2.5
        self.vao0 = self.centro_y - folga
        self.vao1 = self.centro_y + folga

    @property
    def largura_visual(self):
        return self.onda_span + self.traco

    @property
    def altura_visual(self):
        return (self.y1 - self.y0) + self.traco

    def caixa_superior(self):
        return (f'M {self.x0} {self.vao0:.2f} L {self.x0} {self.y0 + self.rx} '
                f'A {self.rx} {self.rx} 0 0 1 {self.x0 + self.rx} {self.y0} '
                f'L {self.x1 - self.rx} {self.y0} '
                f'A {self.rx} {self.rx} 0 0 1 {self.x1} {self.y0 + self.rx} '
                f'L {self.x1} {self.vao0:.2f}')

    def caixa_inferior(self):
        return (f'M {self.x0} {self.vao1:.2f} L {self.x0} {self.y1 - self.rx} '
                f'A {self.rx} {self.rx} 0 0 0 {self.x0 + self.rx} {self.y1} '
                f'L {self.x1 - self.rx} {self.y1} '
                f'A {self.rx} {self.rx} 0 0 0 {self.x1} {self.y1 - self.rx} '
                f'L {self.x1} {self.vao1:.2f}')

    def onda(self):
        w = self.onda_span / self.humps
        # Curva quadrática: o ponto de controle sobe 2x a amplitude para o ápice dar amp.
        ctrl = 2 * self.amp
        partes = [f'M {self.onda_x0} {self.centro_y}']
        for i in range(self.humps):
            dy = -ctrl if i % 2 == 0 else ctrl
            partes.append(f'q {w/2:.3f} {dy:.2f} {w:.3f} 0')
        return ' '.join(partes)

    def svg(self, tema, transform=None):
        c = TEMAS[tema]
        abre = f'<g transform="{transform}">' if transform else '<g>'
        return (f'{abre}'
                f'<g fill="none" stroke-linecap="round" stroke-linejoin="round" '
                f'stroke-width="{self.traco}">'
                f'<path stroke="{c["caixa"]}" d="{self.caixa_superior()}"/>'
                f'<path stroke="{c["caixa"]}" d="{self.caixa_inferior()}"/>'
                f'<path stroke="{c["onda"]}" d="{self.onda()}"/>'
                f'</g></g>')


# ---------------------------------------------------------------- letreiro

def baixar_fonte():
    if os.path.exists(FONTE):
        return
    os.makedirs(os.path.dirname(FONTE), exist_ok=True)
    print('baixando Inter...')
    urllib.request.urlretrieve(FONTE_URL, FONTE)


def carregar_letreiro():
    """Devolve uma função que gera o letreiro em curvas para uma altura de caixa alta."""
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    from fontTools.misc.transform import Transform

    baixar_fonte()
    fonte = TTFont(FONTE)
    fonte = instantiateVariableFont(fonte, {'wght': 700, 'opsz': 32}, inplace=True)
    glifos = fonte.getGlyphSet()
    cmap = fonte.getBestCmap()
    altura_caixa_alta = fonte['OS/2'].sCapHeight

    def gerar(texto, cap, x, baseline, tracking_rel=0.055):
        """Converte `texto` em um único path d, começando em x sobre a linha de base."""
        escala = cap / altura_caixa_alta
        tracking = tracking_rel * cap
        d = []
        cursor = x
        for ch in texto:
            nome = cmap[ord(ch)]
            caneta = SVGPathPen(glifos)
            glifos[nome].draw(TransformPen(
                caneta, Transform(escala, 0, 0, -escala, cursor, baseline)))
            d.append(caneta.getCommands())
            cursor += glifos[nome].width * escala + tracking
        largura = cursor - x - tracking      # o último tracking não conta
        return ' '.join(p for p in d if p), largura

    def medir(texto, cap, tracking_rel=0.055):
        return gerar(texto, cap, 0, 0, tracking_rel)[1]

    return gerar, medir


# ---------------------------------------------------------------- composições

CABECALHO = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
             'width="{w}" height="{h}" role="img" aria-label="{titulo}">'
             '<title>{titulo}</title>')


def envolver(corpo, w, h, titulo, fundo=None, rx=0):
    svg = CABECALHO.format(w=round(w, 2), h=round(h, 2), titulo=titulo)
    if fundo:
        svg += f'<rect width="{round(w,2)}" height="{round(h,2)}" rx="{rx}" fill="{fundo}"/>'
    return svg + corpo + '</svg>'


def simbolo_svg(tema, com_fundo=False):
    s = Simbolo()
    margem = 8
    w = s.largura_visual + 2 * margem
    h = s.altura_visual + 2 * margem
    # Move o desenho para que a área visual encoste na margem.
    dx = margem - (s.onda_x0 - s.traco / 2)
    dy = margem - (s.y0 - s.traco / 2)
    corpo = s.svg(tema, f'translate({dx:.2f} {dy:.2f})')
    fundo = TEMAS[tema]['fundo'] if com_fundo else None
    return envolver(corpo, w, h, 'BoxFlow', fundo, rx=14)


def horizontal_svg(gerar, medir, tema):
    s = Simbolo()
    c = TEMAS[tema]
    cap = 0.52 * (s.y1 - s.y0)                  # 43,7 — proporção do logotipo original
    margem = 8
    largura_box = medir('BOX', cap)
    largura_flow = medir('FLOW', cap)
    tracking = 0.055 * cap
    vao = 0.60 * cap                            # respiro entre símbolo e letreiro

    dx = margem - (s.onda_x0 - s.traco / 2)
    dy = margem - (s.y0 - s.traco / 2)
    x_texto = margem + s.largura_visual + vao
    # Caixa alta centrada opticamente na linha média do símbolo.
    baseline = dy + s.centro_y + cap / 2

    d_box, _ = gerar('BOX', cap, x_texto, baseline)
    d_flow, _ = gerar('FLOW', cap, x_texto + largura_box + tracking, baseline)

    w = x_texto + largura_box + tracking + largura_flow + margem
    h = s.altura_visual + 2 * margem
    corpo = (s.svg(tema, f'translate({dx:.2f} {dy:.2f})')
             + f'<path fill="{c["box"]}" d="{d_box}"/>'
             + f'<path fill="{c["flow"]}" d="{d_flow}"/>')
    return envolver(corpo, w, h, 'BoxFlow')


def vertical_svg(gerar, medir, tema):
    s = Simbolo()
    c = TEMAS[tema]
    # Caixa alta menor que na versão horizontal: empilhado, o letreiro fica largo
    # e rouba presença do símbolo se usar a mesma proporção.
    cap = 0.40 * (s.y1 - s.y0)
    margem = 10
    largura_box = medir('BOX', cap)
    largura_flow = medir('FLOW', cap)
    tracking = 0.055 * cap
    largura_texto = largura_box + tracking + largura_flow
    vao = 0.55 * cap

    w = max(s.largura_visual, largura_texto) + 2 * margem
    h = s.altura_visual + vao + cap + 2 * margem

    dx = (w - s.largura_visual) / 2 - (s.onda_x0 - s.traco / 2)
    dy = margem - (s.y0 - s.traco / 2)
    baseline = margem + s.altura_visual + vao + cap
    x_texto = (w - largura_texto) / 2

    d_box, _ = gerar('BOX', cap, x_texto, baseline)
    d_flow, _ = gerar('FLOW', cap, x_texto + largura_box + tracking, baseline)
    corpo = (s.svg(tema, f'translate({dx:.2f} {dy:.2f})')
             + f'<path fill="{c["box"]}" d="{d_box}"/>'
             + f'<path fill="{c["flow"]}" d="{d_flow}"/>')
    return envolver(corpo, w, h, 'BoxFlow')


def badge_svg(tema):
    s = Simbolo()
    c = TEMAS[tema]
    w = h = 150.0
    # A onda quase encosta no anel, como no logotipo original: folga de ~10 unidades.
    escala = 0.95
    dx = w / 2 - s.centro_y * escala            # o símbolo é quadrado: centro (64,64)
    dy = h / 2 - s.centro_y * escala
    anel = (f'<circle cx="{w/2}" cy="{h/2}" r="{w/2 - 5}" fill="none" '
            f'stroke="{c["caixa"]}" stroke-width="{s.traco}"/>')
    corpo = anel + s.svg(tema, f'translate({dx:.2f} {dy:.2f}) scale({escala})')
    return envolver(corpo, w, h, 'BoxFlow')


def favicon_svg():
    # Em 16 px a onda de 9 cristas vira borrão: o favicon usa 5 cristas e traço mais grosso.
    s = Simbolo(humps=5, traco=6.5, amp=11.0)
    c = TEMAS['escuro']
    w = h = 128.0
    escala = 0.80
    dx = w / 2 - 64 * escala
    dy = h / 2 - 64 * escala
    corpo = (f'<rect width="{w}" height="{h}" rx="28" fill="{PALETA["petroleo"]}"/>'
             + s.svg('escuro', f'translate({dx:.2f} {dy:.2f}) scale({escala})'))
    return envolver(corpo, w, h, 'BoxFlow')


def paleta_svg():
    largura_swatch = 150.0
    h = 220.0
    ordem = ['petroleo', 'teal', 'lima', 'cal', 'carvao']
    w = largura_swatch * len(ordem)
    corpo = ''
    for i, chave in enumerate(ordem):
        x = i * largura_swatch
        cor = PALETA[chave]
        # Texto sobre o swatch precisa inverter em cima da cal e da lima.
        tinta = PALETA['petroleo'] if chave in ('cal', 'lima') else PALETA['cal']
        corpo += (f'<rect x="{x}" y="0" width="{largura_swatch}" height="{h}" fill="{cor}"/>'
                  f'<text x="{x + 16}" y="{h - 42}" fill="{tinta}" font-size="19" '
                  f'font-family="Inter, Segoe UI, Arial, sans-serif" font-weight="700">'
                  f'{chave.upper()}</text>'
                  f'<text x="{x + 16}" y="{h - 18}" fill="{tinta}" font-size="17" '
                  f'font-family="Inter, Segoe UI, Arial, monospace" opacity="0.85">'
                  f'{cor}</text>')
    return envolver(corpo, w, h, 'Paleta BoxFlow')


# ---------------------------------------------------------------- execução

ARQUIVOS = {}


def registrar(nome, conteudo):
    ARQUIVOS[nome] = conteudo
    caminho = os.path.join(AQUI, nome)
    with open(caminho, 'w', encoding='utf-8', newline='\n') as f:
        f.write(conteudo + '\n')
    print(f'  {nome}')


def main():
    gerar, medir = carregar_letreiro()
    print('gerando SVG:')
    for tema in ('escuro', 'claro'):
        registrar(f'simbolo-{tema}.svg', simbolo_svg(tema))
        registrar(f'horizontal-{tema}.svg', horizontal_svg(gerar, medir, tema))
        registrar(f'vertical-{tema}.svg', vertical_svg(gerar, medir, tema))
        registrar(f'badge-{tema}.svg', badge_svg(tema))
    registrar('horizontal-mono-tinta.svg', horizontal_svg(gerar, medir, 'tinta'))
    registrar('horizontal-mono-reverso.svg', horizontal_svg(gerar, medir, 'reverso'))
    registrar('simbolo-mono-tinta.svg', simbolo_svg('tinta'))
    registrar('simbolo-mono-reverso.svg', simbolo_svg('reverso'))
    registrar('favicon.svg', favicon_svg())
    registrar('paleta.svg', paleta_svg())

    # PNG: o render é feito por render.mjs, que usa resvg (Rust, sem dependência de sistema).
    tarefas = [
        ('horizontal-escuro.svg', 'png/horizontal-escuro.png', 1400),
        ('horizontal-claro.svg', 'png/horizontal-claro.png', 1400),
        ('vertical-escuro.svg', 'png/vertical-escuro.png', 800),
        ('simbolo-escuro.svg', 'png/simbolo-escuro.png', 512),
        ('simbolo-claro.svg', 'png/simbolo-claro.png', 512),
        ('badge-escuro.svg', 'png/badge-escuro.png', 512),
        ('favicon.svg', 'png/favicon-32.png', 32),
        ('favicon.svg', 'png/favicon-180.png', 180),
        ('favicon.svg', 'png/favicon-512.png', 512),
        ('paleta.svg', 'png/paleta.png', 900),
    ]
    with open(os.path.join(AQUI, 'render.json'), 'w', encoding='utf-8') as f:
        json.dump(tarefas, f, indent=2)
    print('manifesto de PNG em render.json — rode: node render.mjs')


if __name__ == '__main__':
    sys.exit(main())
