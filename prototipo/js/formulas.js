/* Motor de fórmulas de caixa — implementação de demonstração do que está descrito em
   docs/02-ENGENHARIA.md §4.

   Gramática deliberadamente pobre: números, as 7 variáveis, + - * / e parênteses.
   Nada de função, nada de condicional. Fórmula de caixa não precisa de linguagem,
   e linguagem embutida em ERP vira dívida eterna.

   Variáveis aceitas (idênticas à aba "Ajuda das fórmulas" do PcBoot):
     C = comprimento          L = largura           A = altura
     S = transpasse superior  I = transpasse inferior
     W = comprimento da faca  R = largura da faca
   Qualquer outro identificador é RECUSADO, como no legado. */

const Formulas = (() => {

  const VARIAVEIS = {
    C: 'Comprimento',
    L: 'Largura',
    A: 'Altura',
    S: 'Transpasse superior',
    I: 'Transpasse inferior',
    W: 'Comprimento da faca',
    R: 'Largura da faca'
  };

  class ErroFormula extends Error {
    constructor(mensagem, posicao) {
      super(mensagem);
      this.posicao = posicao;
    }
  }

  /* ------------------------------------------------------------------ léxico */
  function tokenizar(texto) {
    const tokens = [];
    let i = 0;
    while (i < texto.length) {
      const c = texto[i];

      if (c === ' ' || c === '\t') { i++; continue; }

      if (c >= '0' && c <= '9' || c === '.' || c === ',') {
        let j = i;
        let visto = '';
        while (j < texto.length && (texto[j] >= '0' && texto[j] <= '9' || texto[j] === '.' || texto[j] === ',')) {
          visto += texto[j] === ',' ? '.' : texto[j];
          j++;
        }
        if ((visto.match(/\./g) || []).length > 1) {
          throw new ErroFormula(`Número inválido "${visto}"`, i);
        }
        tokens.push({ tipo: 'num', valor: parseFloat(visto), pos: i });
        i = j;
        continue;
      }

      if (/[A-Za-z_]/.test(c)) {
        let j = i, nome = '';
        while (j < texto.length && /[A-Za-z_0-9]/.test(texto[j])) { nome += texto[j]; j++; }
        const maiusc = nome.toUpperCase();
        if (nome.length > 1 || !(maiusc in VARIAVEIS)) {
          // Mesma recusa do legado, mas dizendo QUAL token foi rejeitado.
          throw new ErroFormula(
            `"${nome}" não é uma variável válida. Use apenas: ${Object.keys(VARIAVEIS).join(', ')}`, i);
        }
        tokens.push({ tipo: 'var', valor: maiusc, pos: i });
        i = j;
        continue;
      }

      if ('+-*/()'.includes(c)) {
        tokens.push({ tipo: c, pos: i });
        i++;
        continue;
      }

      throw new ErroFormula(`Caractere não permitido "${c}"`, i);
    }
    return tokens;
  }

  /* ------------------------------------------- parser descendente recursivo -> AST */
  function analisar(tokens, textoOriginal) {
    let p = 0;
    const olhar = () => tokens[p];
    const consumir = (tipo) => {
      const t = tokens[p];
      if (!t || t.tipo !== tipo) {
        throw new ErroFormula(`Esperado "${tipo}" em "${textoOriginal}"`, t ? t.pos : textoOriginal.length);
      }
      p++;
      return t;
    };

    function expressao() {            // soma e subtração
      let no = termo();
      while (olhar() && (olhar().tipo === '+' || olhar().tipo === '-')) {
        const op = tokens[p++].tipo;
        no = { tipo: 'bin', op, esq: no, dir: termo() };
      }
      return no;
    }

    function termo() {                // multiplicação e divisão
      let no = unario();
      while (olhar() && (olhar().tipo === '*' || olhar().tipo === '/')) {
        const op = tokens[p++].tipo;
        no = { tipo: 'bin', op, esq: no, dir: unario() };
      }
      return no;
    }

    function unario() {
      if (olhar() && olhar().tipo === '-') { p++; return { tipo: 'neg', arg: unario() }; }
      if (olhar() && olhar().tipo === '+') { p++; return unario(); }
      return primario();
    }

    function primario() {
      const t = olhar();
      if (!t) throw new ErroFormula(`Fórmula incompleta: "${textoOriginal}"`, textoOriginal.length);
      if (t.tipo === 'num') { p++; return { tipo: 'num', valor: t.valor }; }
      if (t.tipo === 'var') { p++; return { tipo: 'var', nome: t.valor }; }
      if (t.tipo === '(') {
        p++;
        const dentro = expressao();
        consumir(')');
        return dentro;
      }
      throw new ErroFormula(`Não esperava "${t.tipo}" aqui`, t.pos);
    }

    const arvore = expressao();
    if (p < tokens.length) {
      throw new ErroFormula(`Sobrou "${textoOriginal.slice(tokens[p].pos)}" no fim da fórmula`, tokens[p].pos);
    }
    return arvore;
  }

  /* ------------------------------------------------------------------ avaliação */
  function avaliarNo(no, vars) {
    switch (no.tipo) {
      case 'num': return no.valor;
      case 'var': {
        const v = vars[no.nome];
        if (v === undefined || v === null || v === '' || isNaN(v)) {
          throw new ErroFormula(`A variável ${no.nome} (${VARIAVEIS[no.nome]}) não foi informada`);
        }
        return Number(v);
      }
      case 'neg': return -avaliarNo(no.arg, vars);
      case 'bin': {
        const a = avaliarNo(no.esq, vars);
        const b = avaliarNo(no.dir, vars);
        switch (no.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/':
            if (b === 0) throw new ErroFormula('Divisão por zero na fórmula');
            return a / b;
        }
      }
    }
    throw new ErroFormula('Nó desconhecido na fórmula');
  }

  /* ------------------------------------------ cache de AST compilada por fórmula */
  const cache = new Map();

  function compilar(texto) {
    if (cache.has(texto)) return cache.get(texto);
    const ast = analisar(tokenizar(texto), texto);
    cache.set(texto, ast);
    return ast;
  }

  /** Avalia uma fórmula. Arredondamento explícito por slot, nunca implícito. */
  function avaliar(texto, vars, arredondamento = 'INTEIRO') {
    const bruto = avaliarNo(compilar(texto), vars);
    switch (arredondamento) {
      case 'INTEIRO':   return Math.round(bruto);
      case 'MEIO':      return Math.round(bruto * 2) / 2;
      case 'CENTESIMO': return Math.round(bruto * 100) / 100;
      default:          return bruto;
    }
  }

  function validarTexto(texto) {
    try { compilar(texto); return { ok: true }; }
    catch (e) { return { ok: false, erro: e.message, posicao: e.posicao }; }
  }

  /* ---------------------------------------------- cálculo completo de uma caixa */
  /**
   * @param estilo  { slots: { LARGURA: [...], COMPRIMENTO: [...] }, limites: {...} }
   * @param vars    { C, L, A, S, I, W, R }
   * @returns resultado com vetores, totais, chapa, peso, aproveitamento e validações
   */
  function calcularCaixa(estilo, vars, material = {}) {
    const res = {
      larguras: [], comprimentos: [],
      totalLargura: 0, totalComprimento: 0,
      erros: [], alertas: [], ok: true
    };

    const eixos = [['LARGURA', 'larguras', 'totalLargura'], ['COMPRIMENTO', 'comprimentos', 'totalComprimento']];

    for (const [eixo, campo, campoTotal] of eixos) {
      const slots = (estilo.slots && estilo.slots[eixo]) || [];
      for (const slot of slots) {
        if (!slot.expressao) { res[campo].push(0); continue; }
        try {
          const v = avaliar(slot.expressao, vars, slot.arredondamento || 'INTEIRO');
          if (v < 0) {
            res.erros.push(`${eixo === 'LARGURA' ? 'R' : 'I'}${slot.sequencia} resultou negativo (${v} mm)`);
            res.ok = false;
          }
          res[campo].push(v);
        } catch (e) {
          res.erros.push(`${eixo === 'LARGURA' ? 'R' : 'I'}${slot.sequencia}: ${e.message}`);
          res.ok = false;
          res[campo].push(0);
        }
      }
      while (res[campo].length < 9) res[campo].push(0);
      res[campoTotal] = res[campo].reduce((a, b) => a + b, 0);
    }

    // A chapa é o retângulo que envolve o plano de corte.
    res.chapaLargura = res.totalLargura;
    res.chapaComprimento = res.totalComprimento;
    res.areaM2 = (res.chapaLargura / 1000) * (res.chapaComprimento / 1000);

    // Validação contra os limites de máquina do estilo (bloqueia a gravação da F.T.)
    const lim = estilo.limites || {};
    const checa = (valor, min, max, nome) => {
      if (min && valor && valor < min) { res.erros.push(`${nome}: ${valor} mm abaixo do mínimo de ${min} mm`); res.ok = false; }
      if (max && valor && valor > max) { res.erros.push(`${nome}: ${valor} mm acima do máximo de ${max} mm`); res.ok = false; }
    };
    checa(res.totalComprimento, lim.minImpressora, lim.maxImpressora, 'Total de impressão');
    checa(res.totalLargura, lim.minRiscador, lim.maxRiscador, 'Total de riscador');

    // Restrição de PROJETO e não de máquina: a chapa tem que existir no fornecedor.
    if (material.largurasFornecedor && material.largurasFornecedor.length) {
      const cabe = material.largurasFornecedor.some(l => res.chapaLargura <= l);
      if (!cabe) {
        res.erros.push(
          `Chapa de ${res.chapaLargura} mm de largura não é fornecida ` +
          `(máximo disponível: ${Math.max(...material.largurasFornecedor)} mm)`);
        res.ok = false;
      }
    }

    // Peso e fator a partir da gramatura
    if (material.gramatura) {
      res.pesoGramas = Math.round(res.areaM2 * material.gramatura * 1000) / 1000;
      res.pesoKg = res.pesoGramas / 1000;
    }
    res.pecasPorChapa = material.pecasPorChapa || 1;
    if (material.larguraFolha && res.chapaLargura) {
      const porFolha = Math.floor(material.larguraFolha / res.chapaLargura);
      res.aproveitamento = porFolha > 0
        ? Math.round((porFolha * res.chapaLargura / material.larguraFolha) * 1000) / 10
        : 0;
      res.pecasPorFolha = porFolha;
      if (res.aproveitamento && res.aproveitamento < 85) {
        res.alertas.push(`Aproveitamento de ${res.aproveitamento}% na folha de ${material.larguraFolha} mm — avaliar outro formato`);
      }
    }
    if (material.custoM2 && res.areaM2) {
      res.custoChapa = Math.round(res.areaM2 * material.custoM2 * 10000) / 10000;
    }

    return res;
  }

  return { VARIAVEIS, avaliar, validarTexto, calcularCaixa, compilar, ErroFormula };
})();
