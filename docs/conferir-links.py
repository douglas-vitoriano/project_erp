#!/usr/bin/env python3
"""
Confere a documentação: links relativos, âncoras de seção e acentuação.

Existe porque as três coisas já quebraram neste repositório: link apontando para
seção renomeada, arquivo referenciado antes de ser criado, e um README que perdeu
143 acentos numa gravação com codificação errada.

Uso:  python docs/conferir-links.py
Saída: código 0 se está tudo certo, 1 se há problema. Roda no CI.
"""
import io
import os
import re
import sys
import unicodedata

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IGNORAR = ('.git', 'node_modules', 'Print PcBoot', '.fonte')


def ancora(titulo):
    """Reproduz a regra do GitHub: minúsculas, remove o que não for letra, dígito,
    espaço, hífen ou sublinhado, e troca espaço por hífen. Letra acentuada permanece."""
    t = re.sub(r'<[^>]+>', '', titulo.strip().lower())
    t = ''.join(c for c in t if c.isalnum() or c in ' -_')
    return unicodedata.normalize('NFC', t.replace(' ', '-'))


def markdowns():
    for pasta, _, arquivos in os.walk(RAIZ):
        if any(p in pasta for p in IGNORAR):
            continue
        for a in sorted(arquivos):
            if a.endswith('.md'):
                yield os.path.join(pasta, a)


def main():
    arquivos = list(markdowns())
    ancoras = {}
    for caminho in arquivos:
        txt = io.open(caminho, encoding='utf-8').read()
        ancoras[os.path.normpath(caminho)] = {
            ancora(m.group(2)) for m in re.finditer(r'^(#{1,6})\s+(.+)$', txt, re.M)
        }

    problemas = []
    for caminho in arquivos:
        rel = os.path.relpath(caminho, RAIZ).replace(os.sep, '/')
        txt = io.open(caminho, encoding='utf-8').read()

        # Acento destruído aparece como '?' entre letras. Query string de URL também,
        # por isso a vizinhança tem que estar livre de sinal de endereço.
        for m in re.finditer(r'\w\?\w', txt):
            volta = txt[max(0, m.start() - 40):m.end() + 40]
            if any(s in volta for s in ('/', '=', '`', 'http')):
                continue
            problemas.append(f'[acento]  {rel}: ...{volta.strip()}...')

        for m in re.finditer(r'\[[^\]]*\]\(([^)]+)\)', txt):
            destino = m.group(1)
            if destino.startswith(('http://', 'https://', 'mailto:', '#')):
                continue
            arquivo, _, frag = destino.partition('#')
            if not arquivo:
                continue
            alvo = os.path.normpath(os.path.join(os.path.dirname(caminho), arquivo))
            if not os.path.exists(alvo):
                problemas.append(f'[arquivo] {rel} -> {destino}')
                continue
            if frag and alvo in ancoras:
                if unicodedata.normalize('NFC', frag.lower()) not in ancoras[alvo]:
                    problemas.append(f'[ancora]  {rel} -> {destino}')

    print(f'{len(arquivos)} arquivos markdown conferidos')
    if problemas:
        print(f'{len(problemas)} problema(s):')
        for p in problemas:
            print('  ' + p)
        return 1
    print('ok: nenhum link, ancora ou acento quebrado')
    return 0


if __name__ == '__main__':
    sys.exit(main())
