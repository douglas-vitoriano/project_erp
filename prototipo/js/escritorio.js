/* App do escritório: shell + roteamento por hash + telas de cada módulo. */

(() => {
  const { $, esc, num, dec, dinheiro, mm, pct, data, dataHora, hhmm, selo, rot, toast, modal } = U;
  const D = Dados;

  /* ================================================================ menu */
  const MENU = [
    { grupo: 'Visão geral', itens: [
      { rota: 'painel', ic: '📊', txt: 'Painel' },
      { rota: 'rastreamento', ic: '🔎', txt: 'Rastrear pedido' }
    ]},
    { grupo: 'Engenharia', itens: [
      { rota: 'engenharia', ic: '📐', txt: 'Fichas técnicas' },
      { rota: 'estilos', ic: '🧩', txt: 'Estilos e fórmulas' },
      { rota: 'ferramental', ic: '🔧', txt: 'Facas e clichês' },
      { rota: 'amostras', ic: '🧪', txt: 'Amostras', contador: () => D.amostras.filter(a => a.status === 'AGUARDANDO').length }
    ]},
    { grupo: 'Comercial', itens: [
      { rota: 'clientes', ic: '🏢', txt: 'Clientes' },
      { rota: 'comercial', ic: '💼', txt: 'Orçamentos e pedidos' }
    ]},
    { grupo: 'Produção', itens: [
      { rota: 'pcp', ic: '📅', txt: 'PCP e carga-máquina' },
      { rota: 'producao', ic: '⚙️', txt: 'Fichas de serviço' },
      { rota: 'chapa', ic: '🧾', txt: 'Necessidade de chapa',
        contador: () => D.necessidadesChapa.filter(n => n.situacao === 'EM_COTACAO').length },
      { rota: 'expedicao', ic: '🚚', txt: 'Expedição' }
    ]},
    { grupo: 'Retaguarda', itens: [
      { rota: 'fiscal', ic: '🧮', txt: 'Fiscal' },
      { rota: 'financeiro', ic: '💰', txt: 'Financeiro',
        contador: () => D.titulos.filter(t => t.status === 'VENCIDA').length },
      { rota: 'sincronizacao', ic: '🔄', txt: 'Sincronização' }
    ]}
  ];

  function montarMenu() {
    const rotaAtual = (location.hash.slice(1) || 'painel').split('/')[0];
    $('#lateral').innerHTML = MENU.map(g => `
      <div class="lateral-grupo">${esc(g.grupo)}</div>
      ${g.itens.map(i => {
        const n = i.contador ? i.contador() : 0;
        return `<a href="#${i.rota}" class="${i.rota === rotaAtual ? 'ativo' : ''}">
          <span class="ic">${i.ic}</span><span>${esc(i.txt)}</span>
          ${n ? `<span class="contador">${n}</span>` : ''}
        </a>`;
      }).join('')}
    `).join('');
  }

  /* ================================================================ helpers de UI */
  const cab = (titulo, trilha, acoes = '') => `
    <div class="pagina-cab">
      <div>
        <div class="trilha">${esc(trilha)}</div>
        <h1>${esc(titulo)}</h1>
      </div>
      <div class="pagina-acoes">${acoes}</div>
    </div>`;

  const kpi = (rotulo, valor, sub, tom = '') => `
    <div class="kpi ${tom}">
      <div class="kpi-rot">${esc(rotulo)}</div>
      <div class="kpi-val">${valor}</div>
      ${sub ? `<div class="kpi-sub">${sub}</div>` : ''}
    </div>`;

  const dado = (rotulo, valor) => `
    <div class="dado"><div class="dado-rot">${esc(rotulo)}</div>
    <div class="dado-val" title="${esc(String(valor).replace(/<[^>]+>/g, ''))}">${valor || '—'}</div></div>`;

  const cartao = (titulo, corpo, acoes = '', rente = false) => `
    <div class="cartao">
      ${titulo ? `<div class="cartao-cab"><h2>${esc(titulo)}</h2><div class="linha">${acoes}</div></div>` : ''}
      <div class="cartao-corpo ${rente ? 'rente' : ''}">${corpo}</div>
    </div>`;

  const tabela = (colunas, linhas, opcoes = {}) => `
    <div class="${opcoes.rolagem === false ? '' : 'tab-rolagem'}">
      <table class="tab">
        <thead><tr>${colunas.map(c =>
          `<th ${c.dir ? 'class="dir"' : ''} ${c.largura ? `style="width:${c.largura}"` : ''}>${esc(c.t)}</th>`).join('')}</tr></thead>
        <tbody>${linhas.length ? linhas.join('') : `<tr><td colspan="${colunas.length}"><div class="vazio">Nada por aqui</div></td></tr>`}</tbody>
      </table>
    </div>`;

  const linhaMedidas = (vetor, total, destaque) => `
    <div class="medidas-linha">
      ${vetor.map(v => `<span class="cx ${v ? '' : 'zero'}">${v || 0}</span>`).join('<span class="x">×</span>')}
      <span class="tot">${num(total)}</span>
      ${destaque ? `<span class="mini t3">${esc(destaque)}</span>` : ''}
    </div>`;

  /* ================================================================ telas */
  const Telas = {};

  /* ---------------------------------------------------------------- painel */
  Telas.painel = () => {
    const aguardando = D.amostras.filter(a => a.status === 'AGUARDANDO');
    const travadas = D.ordens.filter(o => o.status === 'AGUARDANDO_CHAPA');
    const emProducao = D.ordens.filter(o => o.status === 'EM_PRODUCAO');
    const vencidos = D.titulos.filter(t => t.status === 'VENCIDA');
    const totalVencido = vencidos.reduce((s, t) => s + t.valor, 0);

    return cab('Painel', 'Visão geral · 27/09/2026') + `
      <div class="grade g4" style="margin-bottom:16px">
        ${kpi('O.F. em produção', emProducao.length, `${num(emProducao.reduce((s,o)=>s+o.qtdProduzida,0))} peças produzidas`, 'info')}
        ${kpi('Travadas por chapa', travadas.length, travadas.length ? 'Não liberam até a chapa chegar' : 'Nenhuma', travadas.length ? 'erro' : 'ok')}
        ${kpi('Amostras aguardando', aguardando.length, `${aguardando.filter(a => D.diasDesde(a.emissao) > 30).length} há mais de 30 dias`, 'alerta')}
        ${kpi('Títulos vencidos', dinheiro(totalVencido), `${vencidos.length} título(s)`, 'erro')}
      </div>

      <div class="grade g2">
        ${cartao('Ordens de fabricação', tabela(
          [{t:'O.F.'},{t:'Cliente'},{t:'Referência'},{t:'Progresso'},{t:'Situação'}],
          D.ordens.map(o => {
            const f = D.ficha(o.ft), c = D.cliente(o.clienteId);
            const p = o.qtdPrevista ? Math.round(o.qtdProduzida / o.qtdPrevista * 100) : 0;
            return `<tr class="clicavel" onclick="location.hash='rastreamento/${o.numero}'">
              <td class="mono negrito">${o.numero}</td>
              <td>${esc(c.fantasia)}</td>
              <td class="mini">${esc(f.referencia.slice(0, 34))}</td>
              <td style="min-width:120px">
                <div class="barra ${p >= 100 ? 'ok' : ''}"><i style="width:${p}%"></i></div>
                <div class="micro t3 mono">${num(o.qtdProduzida)} / ${num(o.qtdPrevista)}</div>
              </td>
              <td>${selo(o.status)}</td>
            </tr>`;
          }), { rolagem: false }), '', true)}

        ${cartao('Fila de amostras por idade', `
          <div class="empilha">
            ${[['0-7',0,7],['8-15',8,15],['16-30',16,30],['31-60',31,60],['60+',61,9999]].map(([rotulo,a,b]) => {
              const qtd = aguardando.filter(x => { const d = D.diasDesde(x.emissao); return d >= a && d <= b; }).length;
              const larg = aguardando.length ? Math.round(qtd / aguardando.length * 100) : 0;
              const tom = b <= 15 ? 'ok' : b <= 30 ? 'alerta' : 'erro';
              return `<div class="faixa-idade">
                <span class="mono t2">${rotulo} dias</span>
                <div class="barra ${tom}"><i style="width:${larg}%"></i></div>
                <span class="mono negrito dir">${qtd}</span>
              </div>`;
            }).join('')}
          </div>
          <div class="aviso alerta" style="margin-top:14px">
            <span>⚠︎</span>
            <div>No PcBoot esta fila chegou a <b>58% das amostras de 2026</b> paradas em "aguardando".
            Aqui ela é um indicador com dono e prazo, não um relatório que ninguém abre.</div>
          </div>`)}
      </div>

      <div class="grade g2" style="margin-top:16px">
        ${cartao('Máquinas', tabela(
          [{t:'Máquina'},{t:'Tipo'},{t:'Fila'},{t:'Situação'}],
          D.maquinas.map(m => {
            const fila = D.fichasServico.filter(f => f.maquinaId === m.id && ['AGUARDANDO','EM_SETUP','EM_PRODUCAO'].includes(f.status));
            return `<tr><td class="negrito">${esc(m.nome)}</td>
              <td class="mini t2">${esc(rot(m.tipo))}</td>
              <td class="mono">${fila.length}</td>
              <td>${selo(m.situacao)}</td></tr>`;
          }), { rolagem: false }), '', true)}

        ${cartao('Pedidos recentes', tabela(
          [{t:'Pedido'},{t:'Cliente'},{t:'Entrega'},{t:'Valor', dir:true},{t:'Situação'}],
          D.pedidos.map(p => `<tr class="clicavel" onclick="location.hash='comercial'">
            <td class="mono negrito">${p.numero}</td>
            <td>${esc(D.cliente(p.clienteId).fantasia)}</td>
            <td class="mono mini">${data(p.entrega)}</td>
            <td class="dir mono">${dinheiro(p.valor)}</td>
            <td>${selo(p.status)}</td></tr>`), { rolagem: false }), '', true)}
      </div>`;
  };

  /* ------------------------------------------------------- engenharia: lista */
  Telas.engenharia = () => {
    return cab('Fichas técnicas', 'Engenharia', `
      <button class="bt" onclick="U.toast('No sistema real abriria o assistente de nova F.T.')">⇱ Importar do PcBoot</button>
      <button class="bt primario" onclick="U.toast('Nova F.T. — protótipo')">+ Nova F.T.</button>`) + `

      <div class="aviso info" style="margin-bottom:16px">
        <span>💡</span>
        <div>A F.T. é a unidade central do sistema: uma caixa desenhada para um cliente, com geometria,
        material, ferramental, preço e histórico próprios. Abra a <b>F.T. 92281</b> para ver o
        motor de fórmulas recalculando ao vivo.</div>
      </div>

      ${cartao('', tabela(
        [{t:'F.T.'},{t:'Tipo'},{t:'Cliente'},{t:'Referência'},{t:'Estilo'},{t:'Medida interna'},
         {t:'Qualidade'},{t:'R$/cx', dir:true},{t:'Situação'}],
        D.fichas.map(f => {
          const c = D.cliente(f.clienteId);
          return `<tr class="clicavel" onclick="location.hash='engenharia/${f.numero}'">
            <td class="mono negrito">${f.numero}</td>
            <td><span class="selo ${f.tipo === 'CAIXA' ? 'info' : ''}">${f.tipo === 'CAIXA' ? 'Cx' : 'Ac'}</span></td>
            <td>${esc(c.fantasia)}</td>
            <td class="mini">${esc(f.referencia)}</td>
            <td class="mono mini">${esc(f.estilo)}</td>
            <td class="mono mini">${f.C}×${f.L}×${f.A}</td>
            <td class="mono mini">${esc(f.qualidadeInterna)}</td>
            <td class="dir mono">${dec(f.precoCaixa)}</td>
            <td>${selo(f.status)}</td>
          </tr>`;
        }), { rolagem: false }), '', true)}`;
  };

  /* --------------------------------------------- engenharia: detalhe da F.T. */
  Telas['engenharia/:num'] = (numero) => {
    const f = D.ficha(Number(numero));
    if (!f) return cab('F.T. não encontrada', 'Engenharia') + `<div class="vazio">Sem F.T. ${esc(numero)}</div>`;
    const c = D.cliente(f.clienteId);
    const complemento = D.fichas.find(x => x.complementoDe === f.numero);
    const base = f.complementoDe ? D.ficha(f.complementoDe) : null;

    setTimeout(() => ligarCalculadora(f), 0);

    return `
      <div class="trilha" style="margin-bottom:10px">
        <a href="#engenharia">Engenharia</a> › Fichas técnicas › F.T. ${f.numero}
      </div>

      <div class="cartao" style="margin-bottom:16px">
        <div class="ft-cab">
          <div>
            <div class="dado-rot">Ficha técnica</div>
            <div class="ft-num">${f.numero}</div>
          </div>
          <div class="sep"></div>
          ${dado('Cliente', esc(c.razao))}
          <div class="sep"></div>
          ${dado('Referência', esc(f.referencia))}
          <div class="sep"></div>
          ${dado('Situação', selo(f.status))}
          <div style="margin-left:auto" class="linha">
            ${base ? `<a class="bt mini" href="#engenharia/${base.numero}">↰ Base ${base.numero}</a>` : ''}
            ${complemento ? `<a class="bt mini" href="#engenharia/${complemento.numero}">Complemento ${complemento.numero} ↳</a>` : ''}
            <button class="bt mini" onclick="U.toast('Ficha de Impressão (FI) seria gerada em PDF')">🖨 Imprimir FI</button>
          </div>
        </div>

        <div class="abas" id="abasFt">
          <button class="aba ativa" data-aba="geo">Geometria e cálculo</button>
          <button class="aba" data-aba="mat">Material e ferramental</button>
          <button class="aba" data-aba="com">Preço e fiscal</button>
          <button class="aba" data-aba="obs">Observações</button>
          <button class="aba" data-aba="rev">Revisões (${f.revisoes?.length || 0})</button>
          <button class="aba" data-aba="hist">Histórico comercial</button>
        </div>

        <div class="cartao-corpo" id="painelFt"></div>
      </div>`;
  };

  /* O coração do protótipo: cálculo ao vivo usando o motor de fórmulas real. */
  function ligarCalculadora(f) {
    const abas = $('#abasFt'), painel = $('#painelFt');
    if (!abas) return;

    const estado = { C: f.C, L: f.L, A: f.A, S: f.S || 0, I: f.I || 0, W: f.W || 0, R: f.R || 0, estilo: f.estilo };

    const render = (aba) => {
      if (aba === 'geo') painel.innerHTML = htmlGeo(f, estado), ligarEntradas(f, estado, render);
      else if (aba === 'mat') painel.innerHTML = htmlMaterial(f);
      else if (aba === 'com') painel.innerHTML = htmlComercial(f);
      else if (aba === 'obs') painel.innerHTML = htmlObs(f);
      else if (aba === 'rev') painel.innerHTML = htmlRevisoes(f);
      else if (aba === 'hist') painel.innerHTML = htmlHistorico(f);
    };

    abas.addEventListener('click', e => {
      const b = e.target.closest('.aba');
      if (!b) return;
      abas.querySelectorAll('.aba').forEach(x => x.classList.toggle('ativa', x === b));
      render(b.dataset.aba);
    });
    render('geo');
  }

  function calcular(estado, f) {
    const est = D.estilo(estado.estilo);
    const q = D.qualidade(f.qualidadeInterna);
    const forn = q?.fornecedores?.find(x => x.preferencial) || q?.fornecedores?.[0];
    return Formulas.calcularCaixa(est, estado, {
      gramatura: q?.gramatura,
      largurasFornecedor: forn?.larguras,
      larguraFolha: forn?.larguras ? Math.max(...forn.larguras) : null,
      custoM2: forn?.custoM2,
      pecasPorChapa: f.pecasPorChapa
    });
  }

  function htmlGeo(f, estado) {
    const est = D.estilo(estado.estilo);
    const r = calcular(estado, f);
    /* Comparação com o que está gravado no PcBoot — é o teste de regressão de
       docs/02-ENGENHARIA.md §4.4 aparecendo na tela, uma F.T. por vez. */
    const legadoR = f.riscador.concat(Array(9).fill(0)).slice(0, r.larguras.length);
    const legadoI = f.impressao.concat(Array(9).fill(0)).slice(0, r.comprimentos.length);
    const confere = (a, b) => a.every((v, i) => (v || 0) === (b[i] || 0));
    const original = estado.estilo === f.estilo && estado.C === f.C && estado.L === f.L && estado.A === f.A;
    const bate = confere(legadoR, r.larguras) && confere(legadoI, r.comprimentos);
    const cotejo = !original
      ? { tom: 'info', txt: 'Simulação — medidas alteradas nesta tela' }
      : bate
        ? { tom: 'ok', txt: 'Confere com o valor gravado no PcBoot' }
        : { tom: 'alerta', txt: 'Divergente do PcBoot — precisa de triagem' };

    return `
      <div class="grade" style="grid-template-columns: 330px 1fr; gap:20px">

        <div class="empilha">
          <div class="cartao">
            <div class="cartao-cab"><h3>Entradas</h3><span class="mini t3">mm</span></div>
            <div class="cartao-corpo">
              <div class="campo" style="margin-bottom:12px">
                <label>Estilo</label>
                <select id="inEstilo">
                  ${D.estilos.map(e => `<option value="${e.id}" ${e.id === estado.estilo ? 'selected' : ''}>
                    ${esc(e.id)} — ${esc(e.descricao)}</option>`).join('')}
                </select>
              </div>
              <div class="grade g3" style="gap:10px">
                ${[['C','Compr.'],['L','Larg.'],['A','Alt.']].map(([k, nome]) => `
                  <div class="campo"><label>${k} · ${nome}</label>
                    <input type="number" id="in${k}" value="${estado[k]}" min="0" step="1"></div>`).join('')}
              </div>
              <div class="grade g2" style="gap:10px; margin-top:10px">
                ${[['S','Transp. sup.'],['I','Transp. inf.'],['W','Comp. faca'],['R','Larg. faca']]
                  .map(([k, nome]) => `
                  <div class="campo"><label>${k} · ${nome}</label>
                    <input type="number" id="in${k}" value="${estado[k]}" min="0" step="1"></div>`).join('')}
              </div>
              <div class="mini t3" style="margin-top:12px; line-height:1.5">
                As sete variáveis são as mesmas da aba <b>"Ajuda das fórmulas"</b> do PcBoot.
                Qualquer outra letra é recusada pelo motor.
              </div>
            </div>
          </div>

          <div class="cartao">
            <div class="cartao-cab"><h3>Fórmulas do estilo</h3>
              <span class="selo info">${esc(est.id)}</span></div>
            <div class="cartao-corpo" style="padding:12px 16px">
              <div class="maiusc" style="margin-bottom:6px">Largura (riscador)</div>
              ${est.slots.LARGURA.map(s => `<div class="linha mini" style="justify-content:space-between; padding:3px 0">
                <span class="mono t2">R${s.sequencia}</span>
                <code class="mono">${esc(s.expressao)}</code>
                <span class="mono negrito">${r.larguras[s.sequencia - 1] ?? 0}</span></div>`).join('')}
              <div class="maiusc" style="margin:12px 0 6px">Comprimento (impressão)</div>
              ${est.slots.COMPRIMENTO.map(s => `<div class="linha mini" style="justify-content:space-between; padding:3px 0">
                <span class="mono t2">I${s.sequencia}</span>
                <code class="mono">${esc(s.expressao)}</code>
                <span class="mono negrito">${r.comprimentos[s.sequencia - 1] ?? 0}</span></div>`).join('')}
            </div>
            <div class="cartao-pe">
              Limites da máquina: impressão ${num(est.limites.minImpressora)}–${num(est.limites.maxImpressora)} mm ·
              riscador ${num(est.limites.minRiscador)}–${num(est.limites.maxRiscador)} mm
            </div>
          </div>
        </div>

        <div class="empilha">

          ${r.erros.length ? `<div class="aviso erro"><span>⛔</span><div>
            <b>A F.T. não pode ser gravada:</b><ul style="margin:6px 0 0; padding-left:18px">
            ${r.erros.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div></div>` : ''}
          ${r.alertas.length ? `<div class="aviso alerta"><span>⚠︎</span><div>
            ${r.alertas.map(e => esc(e)).join('<br>')}</div></div>` : ''}

          <div class="cartao">
            <div class="cartao-cab"><h3>Medidas calculadas</h3>
              <span class="selo ${cotejo.tom}"><i class="ponto"></i>${esc(cotejo.txt)}</span>
            </div>
            <div class="cartao-corpo">
              <div class="maiusc" style="margin-bottom:6px">Riscador · largura</div>
              ${linhaMedidas(r.larguras.slice(0, est.slots.LARGURA.length), r.totalLargura)}
              <div class="maiusc" style="margin:16px 0 6px">Impressão · comprimento</div>
              ${linhaMedidas(r.comprimentos.slice(0, est.slots.COMPRIMENTO.length), r.totalComprimento)}

              <div class="grade g4" style="margin-top:18px; gap:10px">
                ${dado('Chapa', `<span class="mono">${num(r.chapaLargura)} × ${num(r.chapaComprimento)}</span>`)}
                ${dado('Área', `<span class="mono">${dec(r.areaM2)} m²</span>`)}
                ${dado('Peso unitário', `<span class="mono">${r.pesoGramas != null ? dec(r.pesoGramas) + ' g' : '—'}</span>`)}
                ${dado('Custo da chapa', `<span class="mono">${r.custoChapa != null ? dinheiro(r.custoChapa) : '—'}</span>`)}
                ${dado('Peças por chapa', `<span class="mono">${r.pecasPorChapa}</span>`)}
                ${dado('Cabe na folha', `<span class="mono">${r.pecasPorFolha ?? '—'}×</span>`)}
                ${dado('Aproveitamento', `<span class="mono">${r.aproveitamento != null ? pct(r.aproveitamento) : '—'}</span>`)}
                ${dado('Cálculo', r.ok ? '<span class="selo ok">Válido</span>' : '<span class="selo erro">Bloqueado</span>')}
              </div>
            </div>
          </div>

          <div class="cartao">
            <div class="cartao-cab"><h3>Plano de corte</h3>
              <span class="mini t3">gerado a partir das fórmulas, não é imagem fixa</span></div>
            <div class="cartao-corpo">
              <div class="plano">${CaixaSVG.desenhar(r.larguras, r.comprimentos, { largura: 760 })}</div>
              <div class="linha" style="margin-top:14px; gap:20px; justify-content:center">
                <div class="linha mini t2"><span style="width:14px;height:14px;background:#f6efe3;border:1px solid #a9773c;display:inline-block;border-radius:2px"></span> painel</div>
                <div class="linha mini t2"><span style="width:14px;height:14px;background:#efe2cc;border:1px solid #a9773c;display:inline-block;border-radius:2px"></span> aba</div>
                <div class="linha mini t2"><span style="width:14px;height:14px;background:#e3d0b0;border:1px solid #a9773c;display:inline-block;border-radius:2px"></span> aba de cola</div>
                <div class="linha mini t2"><span style="width:18px;border-top:2px solid #5a4223;display:inline-block"></span> corte</div>
                <div class="linha mini t2"><span style="width:18px;border-top:2px dashed #a9773c;display:inline-block"></span> vinco</div>
              </div>
            </div>
          </div>

        </div>
      </div>`;
  }

  function ligarEntradas(f, estado, render) {
    ['C','L','A','S','I','R','W'].forEach(k => {
      const inp = $('#in' + k);
      if (!inp) return;
      inp.addEventListener('input', () => {
        estado[k] = Number(inp.value || 0);
        const foco = document.activeElement?.id;
        const pos = document.activeElement?.selectionStart;
        render('geo');
        const novo = $('#' + foco);
        if (novo) { novo.focus(); try { novo.setSelectionRange(pos, pos); } catch {} }
      });
    });
    const sel = $('#inEstilo');
    if (sel) sel.addEventListener('change', () => { estado.estilo = sel.value; render('geo'); });
  }

  function htmlMaterial(f) {
    const q = D.qualidade(f.qualidadeInterna);
    return `
      <div class="grade g2">
        ${cartao('Material — especificação da engenharia', `
          <div class="dados-grade">
            ${dado('Qualidade interna', `<span class="mono">${esc(f.qualidadeInterna)}</span>`)}
            ${dado('Qualidade fornecedor', `<span class="mono">${esc(f.qualidadeFornecedor)}</span>`)}
            ${dado('Onda', esc(f.onda))}
            ${dado('Gramatura', `<span class="mono">${num(f.gramatura)} g/m²</span>`)}
            ${dado('Camadas', q?.camadas ?? '—')}
            ${dado('ECT mínimo', q?.ect ? `<span class="mono">${dec(q.ect)} kN/m</span>` : '—')}
          </div>
          <div class="aviso info" style="margin-top:14px"><span>🏭</span><div>
            A empresa <b>compra chapa pronta e converte</b>. "Qualidade interna" é o que a engenharia
            especifica; "qualidade fornecedor" é o que o fornecedor entrega. Não são sinônimos — precisam
            ser comparados no recebimento.</div></div>`)}

        ${cartao('Fornecedores desta qualidade', tabela(
          [{t:'Fornecedor'},{t:'R$/m²', dir:true},{t:'Larguras (mm)'},{t:'Lead time', dir:true}],
          (q?.fornecedores || []).map(x => `<tr>
            <td class="negrito">${esc(x.nome)} ${x.preferencial ? '<span class="selo ok">preferencial</span>' : ''}</td>
            <td class="dir mono">${dec(x.custoM2)}</td>
            <td class="mono mini">${x.larguras.join(' · ')}</td>
            <td class="dir mono">${x.leadTime} d</td></tr>`), { rolagem: false }), '', true)}
      </div>

      <div class="grade g2" style="margin-top:16px">
        ${cartao('Ferramental', `
          <div class="dados-grade">
            ${dado('Faca', f.faca ? `<span class="mono">${esc(f.faca)}</span>` : '—')}
            ${dado('Clichê', f.cliche ? `<span class="mono">${esc(f.cliche)}</span>` : '—')}
            ${dado('Cores', esc(f.cores) || '—')}
            ${dado('Fechamento', rot(f.fechamento))}
            ${dado('Tipo de orelha', rot(f.orelha))}
            ${dado('Peças por chapa', `<span class="mono">${f.pecasPorChapa}</span>`)}
          </div>`)}

        ${cartao('Embalagem e tolerância', `
          <div class="dados-grade">
            ${dado('Unidade', esc(f.unidade))}
            ${dado('Amarrado', `<span class="mono">${num(f.amarrado)} pç</span>`)}
            ${dado('Tolerância +', pct(f.tolerancia?.[0]))}
            ${dado('Tolerância −', pct(f.tolerancia?.[1]))}
            ${dado('Fator', `<span class="mono">${dec(f.fator)}</span>`)}
            ${dado('Peso unitário', `<span class="mono">${dec(f.pesoG)} g</span>`)}
          </div>`)}
      </div>`;
  }

  function htmlComercial(f) {
    return `
      <div class="grade g2">
        ${cartao('Preço', `
          <div class="dados-grade">
            ${dado('R$ / caixa', `<span class="mono negrito">${dinheiro(f.precoCaixa)}</span>`)}
            ${dado('R$ / kg', `<span class="mono">${dinheiro(f.precoKg)}</span>`)}
            ${dado('R$ / conjunto', `<span class="mono">${dinheiro(f.precoConjunto)}</span>`)}
            ${dado('Desconto', pct(0))}
          </div>
          <div class="aviso alerta" style="margin-top:14px"><span>❓</span><div>
            Questão aberta <b>D2</b> do modelo de dados: qual dessas bases é a de referência e quais são
            derivadas? Hoje as quatro convivem, como no legado.</div></div>`)}

        ${cartao('Fiscal', `
          <div class="dados-grade">
            ${dado('NCM', `<span class="mono">${esc(f.ncm)}</span>`)}
            ${dado('IPI', pct(f.ipi))}
            ${dado('Situação tributária', '<span class="mono">000</span>')}
            ${dado('Exige laudo', f.exigeLaudo ? 'Sim' : 'Não')}
          </div>
          <div class="aviso info" style="margin-top:14px"><span>🧮</span><div>
            Os campos de <b>IBS, CBS e IS</b> da reforma tributária existem no modelo desde o início, com
            vigência por data — não como adaptação posterior.</div></div>`)}
      </div>`;
  }

  function htmlObs(f) {
    const bloco = (t, v) => cartao(t, v
      ? `<div style="white-space:pre-wrap; font-size:13px; line-height:1.6">${esc(v)}</div>`
      : '<div class="vazio">Sem observação</div>');
    return `<div class="grade g3">
      ${bloco('Obs. de pedido', f.obsPedido)}
      ${bloco('Obs. de impressão', f.obsImpressao)}
      ${bloco('Obs. de fabricação', f.obsFabricacao)}
    </div>
    <div class="aviso info" style="margin-top:16px"><span>📄</span><div>
      O legado separa as observações por finalidade, e isso importa: cada uma sai impressa em um
      documento diferente (pedido, ficha de impressão, ordem de fabricação). Mantido igual.</div></div>`;
  }

  function htmlRevisoes(f) {
    return cartao('Alterações registradas', (f.revisoes?.length ? `
      <div class="pilha-rev">
        ${f.revisoes.map(r => `<div>
          <div><span class="selo info">Rev ${r.rev}</span>
            <div class="micro t3 mono" style="margin-top:3px">${esc(r.data)}</div>
            <div class="micro t2">${esc(r.usuario)}</div></div>
          <div class="de-para">
            <div class="negrito">${esc(r.campo)}</div>
            ${r.de || r.para ? `<div class="mini">
              ${r.de ? `<span class="de mono">${esc(r.de)}</span> → ` : ''}
              <span class="para mono">${esc(r.para)}</span></div>` : ''}
          </div>
        </div>`).join('')}
      </div>` : '<div class="vazio">Sem revisões</div>') + `
      <div class="aviso ok" style="margin-top:14px"><span>✓</span><div>
        Auditoria em <b>nível de campo</b>, com usuário, data e valor "de → para" — o legado já fazia isso
        bem e foi preservado na tabela <code>revisao_campo</code>, que é append-only.</div></div>`);
  }

  function htmlHistorico(f) {
    const orcs = D.orcamentos.filter(o => o.clienteId === f.clienteId);
    const peds = D.pedidos.filter(p => p.itens.some(i => i.ft === f.numero));
    const amos = D.amostras.filter(a => a.ft === f.numero);

    return `<div class="grade g3">
      ${cartao('Orçamentos', tabela([{t:'Nº'},{t:'Emissão'},{t:'Situação'}],
        orcs.map(o => `<tr><td class="mono">${o.numero}</td><td class="mono mini">${data(o.data)}</td>
        <td>${selo(o.situacao)}</td></tr>`), { rolagem: false }), '', true)}
      ${cartao('Pedidos e entregas', tabela([{t:'Pedido'},{t:'Pedida', dir:true},{t:'Baixada', dir:true},{t:'Saldo', dir:true}],
        peds.flatMap(p => p.itens.filter(i => i.ft === f.numero).flatMap(i =>
          i.entregas.map(e => `<tr><td class="mono">${p.numero}<span class="t3">/${e.seq}</span></td>
          <td class="dir mono">${num(e.prog)}</td><td class="dir mono">${num(e.baixada)}</td>
          <td class="dir mono ${e.prog - e.baixada ? 'negrito' : 't3'}">${num(e.prog - e.baixada)}</td></tr>`))),
        { rolagem: false }), '', true)}
      ${cartao('Amostras', tabela([{t:'Nº'},{t:'Emissão'},{t:'Situação'}],
        amos.map(a => `<tr><td class="mono">${a.numero}</td><td class="mono mini">${data(a.emissao)}</td>
        <td>${selo(a.status)}</td></tr>`), { rolagem: false }), '', true)}
    </div>`;
  }

  /* ---------------------------------------------------------------- estilos */
  Telas.estilos = () => cab('Estilos e fórmulas', 'Engenharia',
    `<button class="bt primario" onclick="U.toast('Novo estilo — protótipo')">+ Novo estilo</button>`) + `
    <div class="aviso info" style="margin-bottom:16px"><span>🧩</span><div>
      Este é o <b>motor que não existia no modelo de dados v0</b>: por estilo, as fórmulas de largura
      (R1..R9) e comprimento (I1..I9) mais os limites de máquina. A fórmula é <b>versionada por vigência</b>,
      então corrigir um estilo não reescreve retroativamente 20 anos de ficha.</div></div>

    <div class="grade g2">
      ${D.estilos.map(e => `
        <div class="cartao">
          <div class="cartao-cab">
            <div><h3>${esc(e.id)}</h3><div class="mini t2">${esc(e.descricao)}</div></div>
            <span class="selo info">FEFCO ${esc(e.fefco)}</span>
          </div>
          <div class="cartao-corpo">
            <div class="grade g2" style="gap:14px">
              <div>
                <div class="maiusc" style="margin-bottom:5px">Largura · riscador</div>
                ${e.slots.LARGURA.map(s => `<div class="linha mini" style="justify-content:space-between">
                  <span class="mono t3">R${s.sequencia}</span><code class="mono">${esc(s.expressao)}</code></div>`).join('')}
              </div>
              <div>
                <div class="maiusc" style="margin-bottom:5px">Comprimento · impressão</div>
                ${e.slots.COMPRIMENTO.map(s => `<div class="linha mini" style="justify-content:space-between">
                  <span class="mono t3">I${s.sequencia}</span><code class="mono">${esc(s.expressao)}</code></div>`).join('')}
              </div>
            </div>
            <div class="plano" style="margin-top:14px">
              ${CaixaSVG.desenhar(
                e.slots.LARGURA.map(s => Formulas.avaliar(s.expressao, { C: 400, L: 300, A: 200, S: 0, I: 0, W: 0, R: 0 })),
                e.slots.COMPRIMENTO.map(s => Formulas.avaliar(s.expressao, { C: 400, L: 300, A: 200, S: 0, I: 0, W: 0, R: 0 })),
                { largura: 420, cotas: false, rotulos: false })}
            </div>
            <div class="micro t3 centro" style="margin-top:6px">planificação com C=400 · L=300 · A=200</div>
          </div>
          <div class="cartao-pe">
            Impressora ${num(e.limites.minImpressora)}–${num(e.limites.maxImpressora)} mm ·
            Riscador ${num(e.limites.minRiscador)}–${num(e.limites.maxRiscador)} mm ·
            Folha ${num(e.limites.larguraFolha)} mm
          </div>
        </div>`).join('')}
    </div>`;

  /* ---------------------------------------------------------------- ferramental */
  Telas.ferramental = () => {
    const ferr = [
      { cod: 'F-004119', tipo: 'FACA', ft: 92281, forn: 'Facas Precisão ME', custo: 2480, cobrado: true, valorCob: 2480, tiragem: 184000, vida: 500000, situacao: 'EM_USO' },
      { cod: 'B-00000273', tipo: 'CLICHE', ft: 92281, forn: 'FLEXOPRINT CLICHES', custo: 280, cobrado: false, valorCob: 0, tiragem: 184000, vida: 800000, situacao: 'EM_USO' },
      { cod: 'F-002884', tipo: 'FACA', ft: 65287, forn: 'Facas Precisão ME', custo: 1960, cobrado: true, valorCob: 1960, tiragem: 612000, vida: 500000, situacao: 'EM_MANUTENCAO' },
      { cod: 'F-004402', tipo: 'FACA', ft: 92758, forn: 'Facas Precisão ME', custo: 3120, cobrado: true, valorCob: 3120, tiragem: 0, vida: 500000, situacao: 'EM_CONFECCAO' },
      { cod: 'B-00000411', tipo: 'CLICHE', ft: 92758, forn: 'FLEXOPRINT CLICHES', custo: 640, cobrado: true, valorCob: 640, tiragem: 0, vida: 800000, situacao: 'EM_CONFECCAO' }
    ];
    return cab('Facas e clichês', 'Engenharia · ferramental',
      `<button class="bt primario" onclick="U.toast('Solicitação de faca/clichê — protótipo')">+ Solicitar ferramental</button>`) + `
      <div class="aviso info" style="margin-bottom:16px"><span>🔧</span><div>
        Ferramental é entidade própria, com custo, fornecedor, <b>se é cobrado do cliente</b> e vida útil
        por tiragem. Barra vermelha = passou da vida útil prevista e precisa de inspeção.</div></div>
      ${cartao('', tabela(
        [{t:'Código'},{t:'Tipo'},{t:'F.T.'},{t:'Fornecedor'},{t:'Custo', dir:true},{t:'Cobrado do cliente', dir:true},
         {t:'Vida útil'},{t:'Situação'}],
        ferr.map(x => {
          const p = Math.min(100, Math.round(x.tiragem / x.vida * 100));
          return `<tr>
            <td class="mono negrito">${esc(x.cod)}</td>
            <td><span class="selo ${x.tipo === 'FACA' ? 'info' : ''}">${x.tipo === 'FACA' ? 'Faca' : 'Clichê'}</span></td>
            <td class="mono"><a href="#engenharia/${x.ft}">${x.ft}</a></td>
            <td class="mini">${esc(x.forn)}</td>
            <td class="dir mono">${dinheiro(x.custo)}</td>
            <td class="dir mono">${x.cobrado ? dinheiro(x.valorCob) : '<span class="t3">não</span>'}</td>
            <td style="min-width:130px">
              <div class="barra ${p >= 100 ? 'erro' : p > 80 ? 'alerta' : 'ok'}"><i style="width:${p}%"></i></div>
              <div class="micro t3 mono">${num(x.tiragem)} / ${num(x.vida)}</div></td>
            <td>${selo(x.situacao)}</td></tr>`;
        }), { rolagem: false }), '', true)}`;
  };

  /* ---------------------------------------------------------------- amostras */
  Telas.amostras = () => {
    const ag = D.amostras.filter(a => a.status === 'AGUARDANDO');
    return cab('Amostras', 'Engenharia · protocolo',
      `<button class="bt" onclick="U.toast('Exportação real em XLSX, não HTML disfarçado')">⤓ Exportar XLSX</button>
       <button class="bt primario" onclick="U.toast('Requisição de amostra — protótipo')">+ Requisição</button>`) + `
      <div class="grade g4" style="margin-bottom:16px">
        ${kpi('Aguardando', ag.length, 'sem resposta do cliente', 'alerta')}
        ${kpi('Aprovadas', D.amostras.filter(a => a.status === 'APROVADO').length, 'liberadas para produção', 'ok')}
        ${kpi('Reprovadas', D.amostras.filter(a => a.status === 'REPROVADO').length, 'exigem nova amostra', 'erro')}
        ${kpi('Mais antiga aguardando', ag.length ? Math.max(...ag.map(a => D.diasDesde(a.emissao))) + ' d' : '—',
          'dias sem resposta', 'erro')}
      </div>
      ${cartao('', tabela(
        [{t:'Amostra'},{t:'Emissão'},{t:'Idade'},{t:'Cliente'},{t:'Referência'},{t:'Estilo'},
         {t:'Qtd', dir:true},{t:'Representante'},{t:'Situação'},{t:''}],
        D.amostras.slice().sort((a, b) => b.numero - a.numero).map(a => {
          const d = D.diasDesde(a.emissao);
          const tom = a.status !== 'AGUARDANDO' ? '' : d > 30 ? 'erro' : d > 15 ? 'alerta' : 'ok';
          return `<tr>
            <td class="mono negrito">${a.numero}</td>
            <td class="mono mini">${data(a.emissao)}</td>
            <td>${a.status === 'AGUARDANDO' ? `<span class="selo ${tom}">${d} d</span>` : '<span class="t3">—</span>'}</td>
            <td>${esc(D.cliente(a.clienteId).fantasia)}</td>
            <td class="mini">${esc(a.referencia)}</td>
            <td class="mono mini">${esc(a.estilo)}</td>
            <td class="dir mono">${a.qtd}</td>
            <td class="mini t2">${esc(a.repres)}</td>
            <td>${selo(a.status)}${a.motivo ? `<div class="micro t3">${esc(a.motivo)}</div>` : ''}</td>
            <td>${a.assinadoPor ? `<button class="bt mini" onclick="verAssinatura(${a.numero})">🖋 Assinatura</button>` : ''}</td>
          </tr>`;
        }), { rolagem: false }), '', true)}`;
  };

  window.verAssinatura = (numero) => {
    const a = D.amostras.find(x => x.numero === numero);
    modal({
      titulo: `Protocolo de amostra ${a.numero} — evidências da assinatura`,
      corpo: `
        <div class="aviso ok" style="margin-bottom:14px"><span>✓</span><div>
          Assinado por <b>${esc(a.assinadoPor)}</b> (${esc(a.cargo)}) em ${data(a.dataStatus)},
          coletado no tablet do vendedor, em campo.</div></div>
        <div class="dados-grade">
          ${dado('Método', 'Manuscrita em tela')}
          ${dado('Dispositivo', 'Tablet Renato · TAB-CAMPO-03')}
          ${dado('Vendedor', esc(a.repres))}
          ${dado('Geolocalização', '−23,5614 / −46,6559 (±8 m)')}
          ${dado('Hash do documento', '<span class="mono mini">a4f1…9c2e</span>')}
          ${dado('Cadeia', '<span class="selo ok">íntegra</span>')}
        </div>
        <div style="margin-top:14px; padding:14px; background:var(--superficie-2); border:1px solid var(--borda); border-radius:8px">
          <svg viewBox="0 0 360 90" width="100%" height="90">
            <path d="M20,62 C40,20 58,72 76,44 S104,16 122,52 C138,80 152,28 172,46 C190,62 206,30 228,50 C246,66 262,34 286,48 L332,44"
              fill="none" stroke="#1b2333" stroke-width="2.2" stroke-linecap="round"/>
            <line x1="20" y1="76" x2="336" y2="76" stroke="#c3cddd"/>
          </svg>
          <div class="micro t3 centro">${esc(a.assinadoPor)} · ${esc(a.cargo)}</div>
        </div>
        <div class="mini t2" style="margin-top:12px">
          O encadeamento por hash faz com que remover ou alterar uma assinatura quebre a cadeia de forma
          detectável — é o que dá peso à evidência sem depender de ICP-Brasil.
        </div>`,
      acoes: [{ rotulo: 'Fechar', classe: 'bt primario' }]
    });
  };

  /* ---------------------------------------------------------------- clientes */
  Telas.clientes = () => cab('Clientes', 'Comercial',
    `<button class="bt primario" onclick="U.toast('Novo cliente — protótipo')">+ Novo cliente</button>`) + `
    ${cartao('', tabela(
      [{t:'Cód.'},{t:'Fantasia'},{t:'Razão social'},{t:'Cidade/UF'},{t:'Representante'},
       {t:'Limite', dir:true},{t:'Em aberto', dir:true},{t:'Atraso', dir:true},{t:'Situação'}],
      D.clientes.map(c => `<tr class="clicavel" onclick="location.hash='clientes/${c.id}'">
        <td class="mono">${c.codigo}</td>
        <td class="negrito">${esc(c.fantasia)}${c.kanban ? ' <span class="selo info">kanban</span>' : ''}</td>
        <td class="mini t2">${esc(c.razao)}</td>
        <td class="mini">${esc(c.municipio)}/${esc(c.uf)}</td>
        <td class="mini t2">${esc(c.representante)}</td>
        <td class="dir mono">${dinheiro(c.limite)}</td>
        <td class="dir mono ${c.aberto > c.limite ? 'negrito' : ''}" style="${c.aberto > c.limite ? 'color:var(--erro)' : ''}">${dinheiro(c.aberto)}</td>
        <td class="dir mono">${c.atraso ? `<span style="color:var(--erro)">${dinheiro(c.atraso)}</span>` : '<span class="t3">—</span>'}</td>
        <td>${selo(c.situacao)}</td></tr>`), { rolagem: false }), '', true)}`;

  Telas['clientes/:id'] = (id) => {
    const c = D.cliente(id);
    if (!c) return '<div class="vazio">Cliente não encontrado</div>';
    const fts = D.fichas.filter(f => f.clienteId === id);
    const peds = D.pedidos.filter(p => p.clienteId === id);
    const tits = D.titulos.filter(t => t.clienteId === id);

    return `<div class="trilha" style="margin-bottom:10px"><a href="#clientes">Clientes</a> › ${esc(c.fantasia)}</div>
      ${cab(c.razao, `Código ${c.codigo} · ${c.cnpj}`,
        `${selo(c.situacao)}<button class="bt">✎ Editar</button>`)}

      ${c.situacao === 'BLOQUEADO' ? `<div class="aviso erro" style="margin-bottom:16px"><span>⛔</span><div>
        <b>Cliente bloqueado.</b> Pedido novo é recusado pelo domínio, e a liberação exige registro nominal
        com motivo. Vale também para pedido que suba offline do tablet do vendedor.</div></div>` : ''}
      ${c.aberto > c.limite ? `<div class="aviso alerta" style="margin-bottom:16px"><span>⚠︎</span><div>
        Em aberto (${dinheiro(c.aberto)}) <b>acima do limite de crédito</b> (${dinheiro(c.limite)}).</div></div>` : ''}

      <div class="grade g2" style="margin-bottom:16px">
        ${cartao('Cadastro', `<div class="dados-grade">
          ${dado('Atividade', esc(c.atividade))}
          ${dado('Contato', esc(c.contato))}
          ${dado('Telefone', `<span class="mono">${esc(c.fone)}</span>`)}
          ${dado('Cidade/UF', `${esc(c.municipio)}/${esc(c.uf)}`)}
          ${dado('Zona', esc(c.zona))}
          ${dado('Representante', esc(c.representante))}
          ${dado('Comissão', pct(c.comissao))}
          ${dado('Cliente desde', data(c.desde))}
          ${dado('Último pedido', data(c.ultimoPedido))}
          ${dado('Kanban', c.kanban ? 'Sim' : 'Não')}
        </div>`)}
        ${cartao('Observações por finalidade', `
          <div class="empilha">
            <div><div class="maiusc">Entrega</div><div class="mini">${esc(c.obsEntrega) || '<span class="t3">—</span>'}</div></div>
            <div><div class="maiusc">Fabricação</div><div class="mini">${esc(c.obsFabricacao) || '<span class="t3">—</span>'}</div></div>
          </div>
          <div class="aviso info" style="margin-top:12px"><span>📄</span><div>
            Cada observação sai impressa em um documento diferente. Separadas como no legado.</div></div>`)}
      </div>

      <div class="grade g3">
        ${cartao(`Fichas técnicas (${fts.length})`, tabela([{t:'F.T.'},{t:'Referência'},{t:'R$/cx', dir:true}],
          fts.map(f => `<tr class="clicavel" onclick="location.hash='engenharia/${f.numero}'">
            <td class="mono">${f.numero}</td><td class="mini">${esc(f.referencia.slice(0,26))}</td>
            <td class="dir mono">${dec(f.precoCaixa)}</td></tr>`), { rolagem: false }), '', true)}
        ${cartao(`Pedidos (${peds.length})`, tabela([{t:'Pedido'},{t:'Entrega'},{t:'Situação'}],
          peds.map(p => `<tr><td class="mono">${p.numero}</td><td class="mono mini">${data(p.entrega)}</td>
            <td>${selo(p.status)}</td></tr>`), { rolagem: false }), '', true)}
        ${cartao(`Títulos (${tits.length})`, tabela([{t:'Nº'},{t:'Venc.'},{t:'Valor', dir:true},{t:''}],
          tits.map(t => `<tr><td class="mono">${t.numero}</td><td class="mono mini">${data(t.venc)}</td>
            <td class="dir mono">${dinheiro(t.valor)}</td><td>${selo(t.status)}</td></tr>`), { rolagem: false }), '', true)}
      </div>`;
  };

  /* ---------------------------------------------------------------- comercial */
  Telas.comercial = () => cab('Orçamentos e pedidos', 'Comercial',
    `<button class="bt">+ Orçamento</button><button class="bt primario">+ Pedido</button>`) + `
    <div class="aviso info" style="margin-bottom:16px"><span>💼</span><div>
      No modelo v0 o orçamento era apenas um status do pedido. Aqui é <b>entidade própria</b>, com
      numeração e revisões — porque no legado ele tem histórico independente e a maioria não vira pedido.</div></div>

    ${cartao('Orçamentos', tabela(
      [{t:'Nº'},{t:'Cliente'},{t:'Emissão'},{t:'Validade'},{t:'Itens', dir:true},{t:'Valor', dir:true},
       {t:'Representante'},{t:'Situação'}],
      D.orcamentos.map(o => `<tr>
        <td class="mono negrito">${o.numero}</td>
        <td>${esc(D.cliente(o.clienteId).fantasia)}</td>
        <td class="mono mini">${data(o.data)}</td>
        <td class="mono mini">${data(o.validade)}</td>
        <td class="dir mono">${o.itens}</td>
        <td class="dir mono">${dinheiro(o.valor)}</td>
        <td class="mini t2">${esc(o.repres)}</td>
        <td>${selo(o.situacao)}</td></tr>`), { rolagem: false }), '', true)}

    <div style="height:16px"></div>

    ${cartao('Pedidos e programação de entregas', D.pedidos.map(p => {
      const c = D.cliente(p.clienteId);
      return `<div style="border:1px solid var(--borda); border-radius:10px; margin-bottom:12px; overflow:hidden">
        <div class="cartao-cab">
          <div class="linha envolve">
            <span class="mono negrito" style="font-size:15px">${p.numero}</span>
            ${selo(p.tipo)}
            <span class="negrito">${esc(c.fantasia)}</span>
            <span class="mini t2">emitido ${data(p.data)} · entrega ${data(p.entrega)}</span>
          </div>
          ${selo(p.status)}
        </div>
        <div style="padding:0">
          ${p.itens.map(i => {
            const f = D.ficha(i.ft);
            return `<div style="padding:12px 16px; border-top:1px solid var(--borda)">
              <div class="entre" style="margin-bottom:8px">
                <div class="linha">
                  <a class="mono negrito" href="#engenharia/${f.numero}">${f.numero}</a>
                  <span class="mini">${esc(f.referencia)}</span>
                </div>
                <div class="linha mini">
                  <span class="t3">pedida</span><span class="mono negrito">${num(i.qtd)}</span>
                  <span class="t3">produzida</span><span class="mono">${num(i.produzida)}</span>
                  <span class="t3">faturada</span><span class="mono">${num(i.faturada)}</span>
                </div>
              </div>
              ${tabela([{t:'Entrega'},{t:'Data'},{t:'Programada', dir:true},{t:'Baixada', dir:true},
                        {t:'Saldo', dir:true},{t:'NF'},{t:'Situação'}],
                i.entregas.map(e => `<tr>
                  <td class="mono">${e.seq}</td>
                  <td class="mono mini">${data(e.data)}</td>
                  <td class="dir mono">${num(e.prog)}</td>
                  <td class="dir mono">${num(e.baixada)}</td>
                  <td class="dir mono negrito">${num(e.prog - e.baixada)}</td>
                  <td class="mono mini">${e.nf ? esc(e.nf) : '<span class="t3">—</span>'}</td>
                  <td>${selo(e.situacao)}</td></tr>`), { rolagem: false })}
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }).join(''))}`;

  /* ---------------------------------------------------------------- PCP */
  Telas.pcp = () => {
    const inicio = 6, fim = 22, janela = fim - inicio;
    const posicao = (h, dur) => ({ left: ((h - inicio) / janela * 100), largura: (dur / janela * 100) });

    const blocos = {
      m1: [{ h: 6, dur: 2, tipo: 'setup', txt: 'Setup 88455' }, { h: 8, dur: 6, tipo: 'producao', txt: 'FS 88455 · 92758' }],
      m2: [{ h: 6, dur: 1, tipo: 'setup', txt: 'Setup' }, { h: 7, dur: 8, tipo: 'producao', txt: 'FS 88431 · 65287' }],
      m3: [{ h: 6, dur: 7, tipo: 'producao', txt: 'FS 88412 · 92281' }, { h: 13, dur: 4, tipo: 'aguardando', txt: 'FS 88435' },
           { h: 17, dur: 3, tipo: 'chapa', txt: 'FS 88448 · sem chapa' }],
      m4: [],
      m5: [{ h: 9, dur: 5, tipo: 'aguardando', txt: 'FS 88420 · 92281' }],
      m6: [{ h: 14, dur: 4, tipo: 'aguardando', txt: 'FS 88460 · conferência' }],
      m7: [{ h: 15, dur: 3, tipo: 'aguardando', txt: 'FS 88470 · expedição' }]
    };

    return cab('PCP e carga-máquina', 'Produção · 27/09/2026',
      `<button class="bt">⇅ Sequenciar</button><button class="bt primario">+ Gerar O.F.</button>`) + `

      <div class="grade g4" style="margin-bottom:16px">
        ${kpi('O.F. abertas', D.ordens.filter(o => o.status !== 'CONCLUIDA').length, '', 'info')}
        ${kpi('Travadas por chapa', D.ordens.filter(o => o.status === 'AGUARDANDO_CHAPA').length,
          'não liberam sem material', 'erro')}
        ${kpi('Máquinas em uso', D.maquinas.filter(m => m.situacao === 'EM_USO').length + '/' + D.maquinas.length, '', 'ok')}
        ${kpi('FS na fila', D.fichasServico.filter(f => f.status === 'AGUARDANDO').length, '', 'alerta')}
      </div>

      ${cartao('Carga-máquina · hoje', `
        <div class="gantt-horas" style="margin-bottom:6px">
          <span></span>
          <div class="escala">${Array.from({length: janela/2 + 1}, (_, i) =>
            `<span>${String(inicio + i*2).padStart(2,'0')}h</span>`).join('')}</div>
        </div>
        <div class="gantt">
          ${D.maquinas.map(m => `
            <div class="gantt-linha">
              <div class="gantt-maq">${esc(m.nome)}
                <small>${esc(rot(m.tipo))} · ${num(m.capacidadeHora)}/h</small></div>
              <div class="gantt-trilha">
                ${m.situacao === 'MANUTENCAO'
                  ? `<div class="gantt-bloco" style="left:0;right:0;background:repeating-linear-gradient(45deg,#c0392b,#c0392b 8px,#8e2b20 8px,#8e2b20 16px)">EM MANUTENÇÃO</div>`
                  : (blocos[m.id] || []).map(b => {
                      const p = posicao(b.h, b.dur);
                      return `<div class="gantt-bloco ${b.tipo}" style="left:${p.left}%; width:${p.largura}%"
                        title="${esc(b.txt)}">${esc(b.txt)}</div>`;
                    }).join('')}
              </div>
            </div>`).join('')}
        </div>
        <div class="linha envolve" style="margin-top:14px; gap:16px">
          ${[['producao','Produção'],['setup','Setup'],['aguardando','Aguardando'],['chapa','Travada por chapa']]
            .map(([cls, t]) => `<div class="linha mini t2">
              <span class="gantt-bloco ${cls}" style="position:static; width:20px; height:12px; padding:0"></span> ${t}</div>`).join('')}
        </div>`)}

      <div style="height:16px"></div>

      ${cartao('Ordens de fabricação', tabela(
        [{t:'O.F.'},{t:'Prior.'},{t:'Cliente'},{t:'F.T.'},{t:'Prevista', dir:true},{t:'Produzida', dir:true},
         {t:'Refugo', dir:true},{t:'Chapa'},{t:'Início prev.'},{t:'Situação'}],
        D.ordens.map(o => {
          const f = D.ficha(o.ft);
          return `<tr class="clicavel" onclick="location.hash='rastreamento/${o.numero}'">
            <td class="mono negrito">${o.numero}</td>
            <td class="centro"><span class="selo ${o.prioridade <= 2 ? 'erro' : ''}">${o.prioridade}</span></td>
            <td>${esc(D.cliente(o.clienteId).fantasia)}</td>
            <td class="mono">${f.numero}<div class="micro t3">${esc(f.referencia.slice(0,22))}</div></td>
            <td class="dir mono">${num(o.qtdPrevista)}</td>
            <td class="dir mono">${num(o.qtdProduzida)}</td>
            <td class="dir mono ${o.refugo ? '' : 't3'}">${num(o.refugo)}</td>
            <td>${selo(o.chapa.situacao)}</td>
            <td class="mono mini">${dataHora(o.inicioPrev)}</td>
            <td>${selo(o.status)}</td></tr>`;
        }), { rolagem: false }), '', true)}`;
  };

  /* ---------------------------------------------------------------- chapa */
  Telas.chapa = () => {
    const total = D.necessidadesChapa.reduce((s, n) => s + n.custo, 0);
    return cab('Necessidade de chapa', 'Produção · suprimentos',
      `<button class="bt">⇱ Cotar</button><button class="bt primario">+ Pedido de compra</button>`) + `

      <div class="aviso info" style="margin-bottom:16px"><span>🏭</span><div>
        A tabela que existe <b>porque a chapa é comprada, não produzida</b>. O motor de fórmulas define o
        formato, o PCP calcula quantas chapas a O.F. precisa, e a compra nasce daqui. Antes de comprar, o
        sistema procura <b>sobra de formato compatível</b> em estoque.</div></div>

      <div class="grade g4" style="margin-bottom:16px">
        ${kpi('Em cotação', D.necessidadesChapa.filter(n => n.situacao === 'EM_COTACAO').length, 'sem fornecedor definido', 'erro')}
        ${kpi('Compradas', D.necessidadesChapa.filter(n => n.situacao === 'COMPRADA').length, 'aguardando chegada', 'alerta')}
        ${kpi('Recebidas', D.necessidadesChapa.filter(n => n.situacao === 'RECEBIDA').length, 'liberam a O.F.', 'ok')}
        ${kpi('Custo previsto', dinheiro(total), 'chapa em carteira', 'info')}
      </div>

      ${cartao('Necessidade por O.F.', tabela(
        [{t:'O.F.'},{t:'Qualidade'},{t:'Formato (mm)'},{t:'Chapas', dir:true},{t:'Necessidade'},
         {t:'Chegada'},{t:'Fornecedor'},{t:'Custo', dir:true},{t:'P. compra'},{t:'Situação'}],
        D.necessidadesChapa.map(n => {
          const atrasada = n.situacao === 'EM_COTACAO';
          return `<tr>
            <td class="mono negrito">${n.of}</td>
            <td class="mono">${esc(n.qualidade)}</td>
            <td class="mono mini">${num(n.largura)} × ${num(n.comprimento)}</td>
            <td class="dir mono">${num(n.chapas)}</td>
            <td class="mono mini">${data(n.necessidade)}</td>
            <td class="mono mini ${atrasada ? 'negrito' : ''}" style="${atrasada ? 'color:var(--erro)' : ''}">
              ${n.chegada ? data(n.chegada) : 'sem previsão'}</td>
            <td class="mini">${n.fornecedor ? esc(n.fornecedor) : '<span class="t3">—</span>'}</td>
            <td class="dir mono">${dinheiro(n.custo)}</td>
            <td class="mono mini">${n.pedidoCompra || '<span class="t3">—</span>'}</td>
            <td>${selo(n.situacao)}</td></tr>`;
        }), { rolagem: false }), '', true)}

      <div style="height:16px"></div>

      <div class="grade g2">
        ${cartao('Sobra de chapa reaproveitável', tabela(
          [{t:'Qualidade'},{t:'Formato (mm)'},{t:'Chapas', dir:true},{t:'O.F. origem'}],
          D.sobrasChapa.map(s => `<tr>
            <td class="mono">${esc(s.qualidade)}</td>
            <td class="mono mini">${num(s.largura)} × ${num(s.comprimento)}</td>
            <td class="dir mono negrito">${num(s.chapas)}</td>
            <td class="mono mini">${s.ofOrigem}</td></tr>`), { rolagem: false }) + `
          <div class="aviso ok" style="margin:14px"><span>♻︎</span><div>
            Com chapa comprada, sobra de formato é <b>dinheiro parado que dá para reaproveitar</b>.
            O saldo é controlado por formato justamente para permitir isso.</div></div>`, '', true)}

        ${cartao('Conferência de qualidade no recebimento', `
          <div class="empilha">
            ${[['Largura e comprimento','OK','ok'],['Gramatura (329 g/m² ±3%)','327 g/m² — OK','ok'],
               ['ECT mínimo 4,0 kN/m','4,2 — OK','ok'],['Umidade','8,1% — OK','ok'],
               ['Esquadro','OK','ok'],['Empenamento','Leve, aceito com restrição','alerta']]
              .map(([item, res, tom]) => `<div class="entre" style="padding:7px 0; border-bottom:1px dashed var(--borda)">
                <span class="mini">${esc(item)}</span><span class="selo ${tom}">${esc(res)}</span></div>`).join('')}
          </div>
          <div class="aviso info" style="margin-top:14px"><span>📋</span><div>
            É deste registro que depende qualquer <b>reclamação com o fornecedor</b>. Sem ele, a discussão
            vira "a chapa veio ruim" contra "a chapa saiu boa".</div></div>`)}
      </div>`;
  };

  /* ---------------------------------------------------------------- produção */
  Telas.producao = () => cab('Fichas de serviço', 'Produção',
    `<a class="bt primario" href="maquina.html" target="_blank">📱 Abrir visão do tablet</a>`) + `
    <div class="aviso info" style="margin-bottom:16px"><span>⚙️</span><div>
      A <b>FS é a unidade de trabalho do piso</b>: uma operação, em uma máquina, com quantidade prevista e
      QR impresso. Os eventos de apontamento são <b>imutáveis</b> — correção é evento de estorno, nominal e
      justificado, nunca um <code>UPDATE</code>.</div></div>

    ${cartao('', tabela(
      [{t:'FS'},{t:'O.F.'},{t:'Operação'},{t:'Máquina'},{t:'F.T.'},{t:'Previsto', dir:true},
       {t:'Produzido', dir:true},{t:'Refugo', dir:true},{t:'Setup'},{t:'Produção'},{t:'Parada'},
       {t:'Operadores'},{t:'Situação'}],
      D.fichasServico.slice().sort((a,b) => a.numero - b.numero).map(fs => {
        const f = D.ficha(fs.ft), m = D.maquina(fs.maquinaId);
        return `<tr>
          <td class="mono negrito">${fs.numero}</td>
          <td class="mono">${fs.of}</td>
          <td class="mini">${esc(rot(fs.operacao))}</td>
          <td class="mini">${esc(m.nome)}</td>
          <td class="mono mini"><a href="#engenharia/${f.numero}">${f.numero}</a></td>
          <td class="dir mono">${num(fs.qtdPrevista)}</td>
          <td class="dir mono">${num(fs.qtdProduzida)}</td>
          <td class="dir mono ${fs.refugo ? '' : 't3'}">${num(fs.refugo)}</td>
          <td class="mono mini">${fs.tempoSetupMin ? hhmm(fs.tempoSetupMin) : '<span class="t3">—</span>'}</td>
          <td class="mono mini">${fs.tempoProducaoMin ? hhmm(fs.tempoProducaoMin) : '<span class="t3">—</span>'}</td>
          <td class="mono mini">${fs.tempoParadaMin ? hhmm(fs.tempoParadaMin) : '<span class="t3">—</span>'}</td>
          <td class="mini">${fs.operadores.map(o => esc(D.operador(o).nome.split(' ')[0])).join(', ') || '<span class="t3">—</span>'}</td>
          <td>${selo(fs.status)}${fs.travaChapa ? '<div class="micro" style="color:var(--erro)">sem chapa</div>' : ''}</td>
        </tr>`;
      }), { rolagem: false }), '', true)}

    <div style="height:16px"></div>

    ${cartao('Homem-máquina', `
      <div class="aviso alerta" style="margin-bottom:14px"><span>👥</span><div>
        A relação <b>não é 1:1</b>, e o modelo aceita isso: uma coladeira pode ter dois operadores na saída,
        e um operador pode atender dois riscadores em paralelo. O rateio é proporcional ao tempo declarado.</div></div>
      ${tabela([{t:'Operador'},{t:'Crachá'},{t:'FS'},{t:'Máquina'},{t:'Função'},{t:'Rateio', dir:true}],
        [['Jailson Ribeiro','OP-1042','88412','Corte e Vinco Plana 01','Operador','100%'],
         ['Marcia Alves','OP-1118','88412','Corte e Vinco Plana 01','Auxiliar','100%'],
         ['Edson Carvalho','OP-0987','88431','Riscador 02','Operador','60%'],
         ['Edson Carvalho','OP-0987','88435','Corte e Vinco Plana 01','Operador','40%'],
         ['Rosana Lima','OP-1205','88401','Impressora Flexo 01','Operador','100%']]
          .map(r => `<tr><td class="negrito">${esc(r[0])}</td><td class="mono mini">${esc(r[1])}</td>
            <td class="mono">${esc(r[2])}</td><td class="mini">${esc(r[3])}</td>
            <td class="mini t2">${esc(r[4])}</td><td class="dir mono">${esc(r[5])}</td></tr>`), { rolagem: false })}`)}`;

  /* ---------------------------------------------------------------- rastreamento */
  Telas.rastreamento = () => cab('Rastrear pedido', 'Visão geral') + `
    <div class="aviso info" style="margin-bottom:16px"><span>🔎</span><div>
      É a resposta ao pedido "<b>remotamente saberemos onde está o pedido</b>". A mesma visão aparece no
      tablet do vendedor, para ele responder ao cliente sem ligar para a fábrica.</div></div>
    ${D.ordens.map(o => htmlRastreio(o)).join('<div style="height:14px"></div>')}`;

  Telas['rastreamento/:num'] = (n) => {
    const o = D.ordem(Number(n));
    if (!o) return Telas.rastreamento();
    return `<div class="trilha" style="margin-bottom:10px">
      <a href="#rastreamento">Rastrear pedido</a> › O.F. ${o.numero}</div>
      ${cab(`O.F. ${o.numero}`, `${D.cliente(o.clienteId).fantasia} · pedido ${o.pedido}`)}
      ${htmlRastreio(o, true)}`;
  };

  function htmlRastreio(o, detalhe = false) {
    const f = D.ficha(o.ft), c = D.cliente(o.clienteId);
    const p = o.qtdPrevista ? Math.round(o.qtdProduzida / o.qtdPrevista * 100) : 0;
    const ORDEM_STATUS = { CONCLUIDA: 'feito', EM_PRODUCAO: 'atual', AGUARDANDO: '' };

    const passos = [
      { rot: 'Pedido', sub: `nº ${o.pedido}`, estado: 'feito' },
      { rot: 'Chapa', sub: rot(o.chapa.situacao),
        estado: o.chapa.situacao === 'RECEBIDA' ? 'feito' : o.chapa.situacao === 'EM_COTACAO' ? 'travado' : 'atual' },
      ...o.roteiro.map(r => ({ rot: rot(r.operacao), sub: D.maquina(r.maquina)?.nome.replace(/\s\d+$/, '') || '',
        estado: ORDEM_STATUS[r.status] ?? '' })),
      { rot: 'Faturado', sub: '', estado: '' },
      { rot: 'Entregue', sub: '', estado: '' }
    ];

    return `<div class="cartao">
      <div class="cartao-cab">
        <div class="linha envolve">
          <a class="mono negrito" href="#rastreamento/${o.numero}" style="font-size:15px">O.F. ${o.numero}</a>
          <span class="negrito">${esc(c.fantasia)}</span>
          <span class="mini t2">F.T. ${f.numero} · ${esc(f.referencia)}</span>
          <span class="selo">${esc(o.lote)}</span>
        </div>
        ${selo(o.status)}
      </div>
      <div class="cartao-corpo">
        ${o.status === 'AGUARDANDO_CHAPA' ? `<div class="aviso erro" style="margin-bottom:14px"><span>⛔</span><div>
          <b>Travada aguardando chapa.</b> ${o.chapa.situacao === 'EM_COTACAO'
            ? 'A chapa ainda está em cotação — sem previsão de chegada, e a data prometida ao cliente está em risco.'
            : `Chapa comprada em ${esc(o.chapa.fornecedor)}, chegada prevista ${data(o.chapa.chegada)}.`}
          </div></div>` : ''}

        <div class="fluxo">
          ${passos.map((s, i) => `
            ${i ? `<div class="fluxo-ligacao ${passos[i-1].estado === 'feito' ? 'feito' : ''}"></div>` : ''}
            <div class="fluxo-passo ${s.estado}">
              <div class="fluxo-bola">${s.estado === 'feito' ? '✓' : s.estado === 'travado' ? '!' : i + 1}</div>
              <div class="fluxo-rot">${esc(s.rot)}</div>
              <div class="fluxo-sub">${esc(s.sub)}</div>
            </div>`).join('')}
        </div>

        <div class="grade g5" style="margin-top:20px; gap:12px">
          ${dado('Progresso', `<div class="barra ${p >= 100 ? 'ok' : ''}" style="margin-top:4px"><i style="width:${p}%"></i></div>
            <div class="micro t3 mono">${num(o.qtdProduzida)} / ${num(o.qtdPrevista)} · ${p}%</div>`)}
          ${dado('Refugo', `<span class="mono">${num(o.refugo)}</span>
            <span class="micro t3">${o.qtdProduzida ? pct(o.refugo / o.qtdProduzida * 100) : '—'}</span>`)}
          ${dado('Início previsto', `<span class="mono mini">${dataHora(o.inicioPrev)}</span>`)}
          ${dado('Fim previsto', `<span class="mono mini">${dataHora(o.fimPrev)}</span>`)}
          ${dado('Prioridade', `<span class="selo ${o.prioridade <= 2 ? 'erro' : ''}">${o.prioridade}</span>`)}
        </div>

        ${detalhe ? `<div style="margin-top:18px">
          ${tabela([{t:'Seq'},{t:'Operação'},{t:'Máquina'},{t:'FS'},{t:'Produzido', dir:true},{t:'Situação'}],
            o.roteiro.map(r => {
              const fs = D.fichasServico.find(x => x.of === o.numero && x.operacao === r.operacao);
              return `<tr><td class="mono">${r.seq}</td><td>${esc(rot(r.operacao))}</td>
                <td class="mini">${esc(D.maquina(r.maquina)?.nome || '—')}</td>
                <td class="mono">${fs ? fs.numero : '—'}</td>
                <td class="dir mono">${fs ? num(fs.qtdProduzida) : '—'}</td>
                <td>${selo(r.status)}</td></tr>`;
            }), { rolagem: false })}
        </div>` : ''}
      </div>
    </div>`;
  }

  /* ---------------------------------------------------------------- expedição */
  Telas.expedicao = () => cab('Expedição', 'Produção',
    `<a class="bt" href="maquina.html?posto=m7" target="_blank">📱 Tablet de expedição</a>
     <button class="bt primario">+ Montar carga</button>`) + `
    <div class="grade g2">
      ${cartao('Volumes prontos', tabela(
        [{t:'Volume'},{t:'Tipo'},{t:'O.F.'},{t:'F.T.'},{t:'Qtd', dir:true},{t:'Peso', dir:true},{t:'Situação'}],
        D.volumes.map(v => `<tr>
          <td class="mono negrito">${esc(v.codigo)}</td>
          <td class="mini">${esc(rot(v.tipo))}</td>
          <td class="mono">${v.of}</td>
          <td class="mono">${v.ft}</td>
          <td class="dir mono">${num(v.qtd)}</td>
          <td class="dir mono">${dec(v.peso)} kg</td>
          <td>${selo(v.situacao)}</td></tr>`), { rolagem: false }), '', true)}

      ${cartao('Cargas em montagem', D.cargas.map(cg => `
        <div class="empilha">
          <div class="entre">
            <div><div class="mono negrito" style="font-size:15px">Carga ${cg.numero}</div>
              <div class="mini t2">${esc(cg.transportadora)} · ${esc(cg.placa)}</div></div>
            ${selo(cg.situacao)}
          </div>
          <div class="dados-grade">
            ${dado('Motorista', esc(cg.motorista))}
            ${dado('Prevista', data(cg.prevista))}
            ${dado('Peso', `<span class="mono">${dec(cg.peso)} kg</span>`)}
            ${dado('Pedidos', cg.pedidos.map(p => `<span class="mono">${p}</span>`).join(', '))}
          </div>
          <div class="aviso info"><span>🖋</span><div>
            Na entrega, o comprovante é assinado no tablet e vira <b>evidência imutável</b> ligada à
            entrega — a mesma tabela <code>assinatura</code> usada no protocolo de amostra.</div></div>
        </div>`).join(''))}
    </div>`;

  /* ---------------------------------------------------------------- fiscal */
  Telas.fiscal = () => cab('Fiscal', 'Retaguarda',
    `<button class="bt primario">+ Emitir NF-e</button>`) + `
    <div class="aviso info" style="margin-bottom:16px"><span>🧮</span><div>
      A emissão fica no <b>nó local</b>, que guarda o certificado A1 — o certificado não sai da empresa e a
      emissão acompanha a expedição física. Numeração fiscal <b>nunca</b> é gerada offline em tablet.</div></div>

    <div class="grade g4" style="margin-bottom:16px">
      ${kpi('Autorizadas no mês', D.notas.filter(n => n.situacao === 'AUTORIZADA').length, '', 'ok')}
      ${kpi('Em digitação', D.notas.filter(n => n.situacao === 'EM_DIGITACAO').length, '', 'alerta')}
      ${kpi('Faturado no mês', dinheiro(D.notas.filter(n => n.situacao === 'AUTORIZADA').reduce((s,n) => s+n.valor, 0)), '', 'info')}
      ${kpi('Contingência', '0', 'nenhuma pendência de transmissão', 'ok')}
    </div>

    ${cartao('Notas fiscais', tabela(
      [{t:'Número'},{t:'Série'},{t:'Cliente'},{t:'Emissão'},{t:'Pedido'},{t:'Valor', dir:true},{t:'Situação'}],
      D.notas.map(n => `<tr>
        <td class="mono negrito">${esc(n.numero)}</td>
        <td class="mono">${esc(n.serie)}</td>
        <td>${esc(D.cliente(n.clienteId).fantasia)}</td>
        <td class="mono mini">${data(n.emissao)}</td>
        <td class="mono mini">${n.pedido || '—'}</td>
        <td class="dir mono">${dinheiro(n.valor)}</td>
        <td>${selo(n.situacao)}</td></tr>`), { rolagem: false }), '', true)}

    <div style="height:16px"></div>

    ${cartao('Reforma tributária — regras com vigência', tabela(
      [{t:'NCM'},{t:'UF destino'},{t:'CFOP'},{t:'ICMS'},{t:'IPI'},{t:'IBS'},{t:'CBS'},{t:'Vigência'}],
      [['48191000','SP','5101','18,00%','0,00%','—','—','01/01/2024 a 31/12/2026'],
       ['48191000','SP','5101','—','0,00%','8,80%','0,90%','a partir de 01/01/2027'],
       ['48191000','RS','6101','12,00%','0,00%','—','—','01/01/2024 a 31/12/2026'],
       ['48191000','RS','6101','—','0,00%','8,80%','0,90%','a partir de 01/01/2027']]
        .map(r => `<tr>${r.map((v, i) => `<td class="${i < 3 || i > 2 ? 'mono' : ''} ${i >= 3 && i <= 6 ? 'dir' : ''} mini">${esc(v)}</td>`).join('')}</tr>`),
      { rolagem: false }) + `
      <div class="aviso alerta" style="margin:14px"><span>📅</span><div>
        Os campos de <b>IBS, CBS e IS</b> entram por vigência de data, convivendo com ICMS/PIS/COFINS
        durante a transição. Não é "adaptação depois" — está no modelo desde o primeiro dia.</div></div>`, '', true)}`;

  /* ---------------------------------------------------------------- financeiro */
  Telas.financeiro = () => {
    const vencidos = D.titulos.filter(t => t.status === 'VENCIDA');
    const abertos = D.titulos.filter(t => t.status === 'ABERTA');
    return cab('Financeiro', 'Retaguarda',
      `<button class="bt">⇱ Importar OFX</button><button class="bt primario">↹ Conciliar</button>`) + `
      <div class="grade g4" style="margin-bottom:16px">
        ${kpi('A receber', dinheiro(abertos.reduce((s,t) => s+t.valor, 0)), `${abertos.length} título(s)`, 'info')}
        ${kpi('Vencido', dinheiro(vencidos.reduce((s,t) => s+t.valor, 0)), `${vencidos.length} título(s)`, 'erro')}
        ${kpi('Maior atraso', Math.max(...vencidos.map(t => D.diasDesde(t.venc))) + ' d', 'RIO CLARO · bloqueado', 'erro')}
        ${kpi('Conciliação', '96%', 'do extrato do mês', 'ok')}
      </div>
      ${cartao('Títulos a receber', tabela(
        [{t:'Título'},{t:'Cliente'},{t:'NF'},{t:'Parcela'},{t:'Vencimento'},{t:'Atraso', dir:true},
         {t:'Valor', dir:true},{t:'Situação'}],
        D.titulos.slice().sort((a,b) => a.venc.localeCompare(b.venc)).map(t => {
          const atraso = t.status === 'VENCIDA' ? D.diasDesde(t.venc) : 0;
          return `<tr>
            <td class="mono negrito">${t.numero}</td>
            <td>${esc(D.cliente(t.clienteId).fantasia)}</td>
            <td class="mono mini">${esc(t.nf)}</td>
            <td class="mono mini">${esc(t.parcela)}</td>
            <td class="mono mini">${data(t.venc)}</td>
            <td class="dir mono ${atraso ? 'negrito' : 't3'}" style="${atraso ? 'color:var(--erro)' : ''}">
              ${atraso ? atraso + ' d' : '—'}</td>
            <td class="dir mono">${dinheiro(t.valor)}</td>
            <td>${selo(t.status)}</td></tr>`;
        }), { rolagem: false }), '', true)}`;
  };

  /* ---------------------------------------------------------------- sincronização */
  Telas.sincronizacao = () => cab('Sincronização', 'Retaguarda · infraestrutura') + `
    <div class="aviso info" style="margin-bottom:16px"><span>🔄</span><div>
      Tela de operação do que está descrito em <b>ADR-0002</b>: propriedade explícita de dados em vez de
      resolução de conflito. Conflito deixa de ser rotina e passa a ser exceção auditada.</div></div>

    <div class="grade g4" style="margin-bottom:16px">
      ${kpi('Nós ativos', '2', 'fábrica + nuvem', 'ok')}
      ${kpi('Dispositivos', '11', '8 fábrica · 3 campo', 'info')}
      ${kpi('Fila de envio', '0', 'nada pendente', 'ok')}
      ${kpi('Conflitos abertos', '1', 'exige revisão humana', 'alerta')}
    </div>

    <div class="grade g2">
      ${cartao('Nós e cursores', tabela(
        [{t:'Nó'},{t:'Tipo'},{t:'Versão'},{t:'Cursor'},{t:'Último contato'},{t:'Situação'}],
        [['Fábrica Modelo','FABRICA','1.4.2','1.284.019','há 12 s','ok'],
         ['Nuvem SP','NUVEM','1.4.2','1.284.019','há 12 s','ok'],
         ['Tablet Renato','DISPOSITIVO','1.4.1','1.283.774','há 3 h','alerta'],
         ['Tablet Silvia','DISPOSITIVO','1.4.2','1.284.019','há 4 min','ok'],
         ['Tablet Corte 01','DISPOSITIVO','1.4.2','1.284.019','há 8 s','ok']]
          .map(r => `<tr><td class="negrito">${esc(r[0])}</td><td class="mini t2">${esc(r[1])}</td>
            <td class="mono mini">${esc(r[2])}</td><td class="mono mini">${esc(r[3])}</td>
            <td class="mini">${esc(r[4])}</td>
            <td><span class="selo ${r[5]}"><i class="ponto"></i>${r[5] === 'ok' ? 'Em dia' : 'Atrasado'}</span></td></tr>`),
        { rolagem: false }), '', true)}

      ${cartao('Blocos de numeração alocados', tabela(
        [{t:'Numerador'},{t:'Dispositivo'},{t:'Faixa'},{t:'Restam', dir:true}],
        [['AMOSTRA','Tablet Renato','30.900 – 30.999','58'],
         ['AMOSTRA','Tablet Silvia','31.000 – 31.099','92'],
         ['ORCAMENTO','Tablet Renato','77.200 – 77.299','74'],
         ['NOTA_FISCAL','—','sempre no nó local','—']]
          .map(r => `<tr><td class="mono negrito">${esc(r[0])}</td><td class="mini">${esc(r[1])}</td>
            <td class="mono mini">${esc(r[2])}</td>
            <td class="dir mono ${r[3] === '58' ? 'negrito' : ''}">${esc(r[3])}</td></tr>`), { rolagem: false }) + `
        <div class="aviso ok" style="margin:14px"><span>🔢</span><div>
          A não sobreposição é garantida por <b>restrição de exclusão no banco</b>
          (<code>int8range</code> + <code>gist</code>), não pela aplicação. Colisão de número é impossível,
          e é isso que permite imprimir o protocolo assinado offline, na frente do cliente.</div></div>`, '', true)}
    </div>

    <div style="height:16px"></div>

    ${cartao('Conflito detectado', `
      <div class="aviso alerta" style="margin-bottom:14px"><span>⚠︎</span><div>
        Orçamento <b>77102</b> foi alterado no escritório enquanto o tablet da Silvia estava offline com
        uma versão anterior. Venceu o <b>dono do agregado</b> (nó fábrica) — e nada foi descartado.</div></div>
      <div class="grade g2">
        <div style="padding:14px; border:2px solid var(--ok); border-radius:10px; background:var(--ok-fraco)">
          <div class="maiusc" style="color:var(--ok)">Versão mantida · dono (fábrica)</div>
          <div class="dados-grade" style="margin-top:8px">
            ${dado('Preço unitário', '<span class="mono">R$ 4,92</span>')}
            ${dado('Validade', '25/10/2026')}
            ${dado('Versão', '<span class="mono">7</span>')}
          </div>
        </div>
        <div style="padding:14px; border:2px solid var(--borda-forte); border-radius:10px; background:var(--superficie-2)">
          <div class="maiusc">Versão rejeitada · tablet (preservada)</div>
          <div class="dados-grade" style="margin-top:8px">
            ${dado('Preço unitário', '<span class="mono">R$ 4,70</span>')}
            ${dado('Validade', '20/10/2026')}
            ${dado('Versão', '<span class="mono">5</span>')}
          </div>
        </div>
      </div>`, `<button class="bt mini">Analisar</button><button class="bt mini primario">Resolver</button>`)}`;

  /* ================================================================ roteador */
  function navegar() {
    const alvo = location.hash.slice(1) || 'painel';
    const [base, param] = alvo.split('/');
    const tela = param && Telas[`${base}/:num`] ? Telas[`${base}/:num`]
               : param && Telas[`${base}/:id`] ? Telas[`${base}/:id`]
               : Telas[base];

    $('#conteudo').innerHTML = U.faixaProto('Escritório · nó fábrica') +
      (tela ? (param ? tela(param) : tela()) : `<div class="vazio">Tela "${esc(base)}" não existe no protótipo</div>`);
    $('#conteudo').scrollTop = 0;
    montarMenu();
  }

  window.addEventListener('hashchange', navegar);

  $('#buscaGlobal').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const t = e.target.value.trim();
    if (!t) return;
    const n = Number(t);
    if (D.ficha(n)) return void (location.hash = `engenharia/${n}`);
    if (D.ordem(n)) return void (location.hash = `rastreamento/${n}`);
    const c = D.clientes.find(x => x.fantasia.toLowerCase().includes(t.toLowerCase()) ||
                                   x.razao.toLowerCase().includes(t.toLowerCase()));
    if (c) return void (location.hash = `clientes/${c.id}`);
    toast(`Nada encontrado para "${t}"`, 'alerta');
  });

  navegar();
})();
