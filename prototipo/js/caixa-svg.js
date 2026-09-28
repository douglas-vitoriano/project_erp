/* Desenho do plano de corte a partir dos vetores de riscador e impressão.

   O retângulo total é a chapa. As linhas verticais são os cortes/vincos ao longo do
   comprimento (vetor de impressão I1..I9) e as horizontais são os vincos do riscador
   (vetor R1..R9). Para o estilo 0201 isso produz exatamente a planificação conhecida:
   abas em cima e embaixo, painéis C-L-C-L no meio e a aba de cola na ponta. */

const CaixaSVG = (() => {

  const COR_PAINEL = '#f6efe3';
  const COR_ABA    = '#efe2cc';
  const COR_COLA   = '#e3d0b0';
  const COR_LINHA  = '#a9773c';
  const COR_CORTE  = '#5a4223';
  const COR_COTA   = '#8d97a8';

  /**
   * @param larguras      [R1..Rn] em mm (de cima para baixo)
   * @param comprimentos  [I1..In] em mm (da esquerda para a direita)
   * @param opcoes        { rotulos: bool, cotas: bool, alturaMax: px, estilo: '0201'|... }
   */
  function desenhar(larguras, comprimentos, opcoes = {}) {
    const R = larguras.filter(v => v > 0);
    const I = comprimentos.filter(v => v > 0);
    if (!R.length || !I.length) {
      return `<div class="vazio">Informe as medidas para ver o plano de corte</div>`;
    }

    const totalR = R.reduce((a, b) => a + b, 0);
    const totalI = I.reduce((a, b) => a + b, 0);

    const margem = opcoes.cotas === false ? 14 : 46;
    const larguraUtil = opcoes.largura || 820;
    const escala = (larguraUtil - margem * 2) / totalI;
    const alturaDesenho = totalR * escala;
    const largura = totalI * escala + margem * 2;
    const altura = alturaDesenho + margem * 2;

    const p = [];
    p.push(`<svg viewBox="0 0 ${largura.toFixed(0)} ${altura.toFixed(0)}" width="${largura.toFixed(0)}" height="${altura.toFixed(0)}" role="img" aria-label="Plano de corte da caixa">`);
    p.push(`<defs><pattern id="onda" width="6" height="6" patternUnits="userSpaceOnUse">
      <path d="M0 3 q1.5 -3 3 0 t3 0" fill="none" stroke="${COR_LINHA}" stroke-width=".6" opacity=".35"/>
    </pattern></defs>`);

    // painéis
    const ehAba = (iR) => R.length >= 3 && (iR === 0 || iR === R.length - 1);
    const ehCola = (iI) => I.length >= 4 && (iI === 0 || iI === I.length - 1) && I[iI] < totalI / I.length * .6;

    let y = margem;
    R.forEach((r, iR) => {
      let x = margem;
      I.forEach((i, iI) => {
        const w = i * escala, h = r * escala;
        let cor = COR_PAINEL;
        if (ehCola(iI)) cor = COR_COLA;
        else if (ehAba(iR)) cor = COR_ABA;

        p.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${cor}" stroke="none"/>`);
        if (!ehAba(iR) && !ehCola(iI)) {
          p.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#onda)"/>`);
        }

        // rótulo da medida dentro do painel, se couber
        if (opcoes.rotulos !== false && w > 34 && h > 18) {
          p.push(`<text x="${(x + w / 2).toFixed(1)}" y="${(y + h / 2 + 4).toFixed(1)}" text-anchor="middle"
            font-family="ui-monospace, monospace" font-size="11" fill="${COR_CORTE}" opacity=".62">${i}</text>`);
        }
        x += w;
      });
      y += r * escala;
    });

    // contorno externo (corte)
    p.push(`<rect x="${margem}" y="${margem}" width="${(totalI * escala).toFixed(1)}" height="${alturaDesenho.toFixed(1)}"
      fill="none" stroke="${COR_CORTE}" stroke-width="2.2"/>`);

    // vincos horizontais (riscador)
    let acc = margem;
    R.slice(0, -1).forEach(r => {
      acc += r * escala;
      p.push(`<line x1="${margem}" y1="${acc.toFixed(1)}" x2="${(margem + totalI * escala).toFixed(1)}" y2="${acc.toFixed(1)}"
        stroke="${COR_LINHA}" stroke-width="1.4" stroke-dasharray="7 4"/>`);
    });

    // vincos verticais (impressão / painéis)
    acc = margem;
    I.slice(0, -1).forEach(i => {
      acc += i * escala;
      p.push(`<line x1="${acc.toFixed(1)}" y1="${margem}" x2="${acc.toFixed(1)}" y2="${(margem + alturaDesenho).toFixed(1)}"
        stroke="${COR_LINHA}" stroke-width="1.4" stroke-dasharray="7 4"/>`);
    });

    // cortes das abas: nos vincos verticais, dentro das faixas de aba
    if (R.length >= 3) {
      const hAbaSup = R[0] * escala;
      const hAbaInf = R[R.length - 1] * escala;
      acc = margem;
      I.slice(0, -1).forEach((i, idx) => {
        acc += i * escala;
        if (idx === 0 && ehCola(0)) return;
        p.push(`<line x1="${acc.toFixed(1)}" y1="${margem}" x2="${acc.toFixed(1)}" y2="${(margem + hAbaSup).toFixed(1)}"
          stroke="${COR_CORTE}" stroke-width="2.2"/>`);
        p.push(`<line x1="${acc.toFixed(1)}" y1="${(margem + alturaDesenho - hAbaInf).toFixed(1)}" x2="${acc.toFixed(1)}" y2="${(margem + alturaDesenho).toFixed(1)}"
          stroke="${COR_CORTE}" stroke-width="2.2"/>`);
      });
    }

    // cotas
    if (opcoes.cotas !== false) {
      const yc = margem + alturaDesenho + 22;
      p.push(`<line x1="${margem}" y1="${yc}" x2="${(margem + totalI * escala).toFixed(1)}" y2="${yc}"
        stroke="${COR_COTA}" stroke-width="1"/>`);
      p.push(`<text x="${(margem + totalI * escala / 2).toFixed(1)}" y="${yc + 15}" text-anchor="middle"
        font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#5b6472">${totalI} mm</text>`);

      const xc = margem - 24;
      p.push(`<line x1="${xc}" y1="${margem}" x2="${xc}" y2="${(margem + alturaDesenho).toFixed(1)}"
        stroke="${COR_COTA}" stroke-width="1"/>`);
      p.push(`<text x="${xc - 6}" y="${(margem + alturaDesenho / 2).toFixed(1)}" text-anchor="middle"
        transform="rotate(-90 ${xc - 6} ${(margem + alturaDesenho / 2).toFixed(1)})"
        font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#5b6472">${totalR} mm</text>`);
    }

    p.push('</svg>');
    return p.join('\n');
  }

  /** Miniatura 3D isométrica simples da caixa montada — só para dar contexto visual. */
  function isometrico(C, L, A, opcoes = {}) {
    const lado = opcoes.tamanho || 150;
    const maior = Math.max(C, L, A) || 1;
    const k = (lado * 0.42) / maior;
    const c = C * k, l = L * k * 0.55, a = A * k;
    const cx = lado / 2, cy = lado / 2 + a / 4;

    const topo = `${cx - c / 2},${cy - a / 2} ${cx - c / 2 + l},${cy - a / 2 - l * .8} ${cx + c / 2 + l},${cy - a / 2 - l * .8} ${cx + c / 2},${cy - a / 2}`;
    const frente = `${cx - c / 2},${cy - a / 2} ${cx + c / 2},${cy - a / 2} ${cx + c / 2},${cy + a / 2} ${cx - c / 2},${cy + a / 2}`;
    const lateral = `${cx + c / 2},${cy - a / 2} ${cx + c / 2 + l},${cy - a / 2 - l * .8} ${cx + c / 2 + l},${cy + a / 2 - l * .8} ${cx + c / 2},${cy + a / 2}`;

    return `<svg viewBox="0 0 ${lado} ${lado}" width="${lado}" height="${lado}" role="img" aria-label="Caixa montada">
      <polygon points="${lateral}" fill="#d9c09a" stroke="${COR_CORTE}" stroke-width="1.4"/>
      <polygon points="${topo}" fill="#eddfc6" stroke="${COR_CORTE}" stroke-width="1.4"/>
      <polygon points="${frente}" fill="#f6efe3" stroke="${COR_CORTE}" stroke-width="1.6"/>
      <line x1="${cx}" y1="${cy - a / 2}" x2="${cx + l}" y2="${cy - a / 2 - l * .8}" stroke="${COR_LINHA}" stroke-width="1" stroke-dasharray="4 3"/>
    </svg>`;
  }

  return { desenhar, isometrico };
})();
