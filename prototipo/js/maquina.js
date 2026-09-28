/* Tablet de fábrica. Um posto por tablet, uma Ficha de Serviço em foco.

   Regras que o protótipo respeita de propósito:
   - apontar produção custa 3 toques (botão → quantidade → confirmar);
   - nenhum apontamento é editado: correção é evento de ESTORNO, nominal e justificado;
   - parada e refugo exigem motivo de uma lista fechada, nunca texto livre;
   - sem rede, tudo continua funcionando e a fila de envio fica visível. */

(() => {
  const { $, esc, num, dec, hhmm, hhmmss, iniciais, rot, toast, modal, criarFila } = U;
  const D = Dados;

  /* Postos que existem no protótipo. O tipo decide qual tela o posto mostra. */
  const POSTOS = [
    { id: 'm1', modo: 'MAQUINA' },
    { id: 'm2', modo: 'MAQUINA' },
    { id: 'm3', modo: 'MAQUINA' },
    { id: 'm5', modo: 'MAQUINA' },
    { id: 'm6', modo: 'CONFERENCIA' },
    { id: 'm7', modo: 'EXPEDICAO' }
  ];

  /* Cópia mutável: o protótipo altera quantidade e estado sem tocar em Dados. */
  const fichas = D.fichasServico.map(f => ({ ...f, operadores: [...f.operadores] }));
  const eventos = [];

  const estado = {
    postoId: new URLSearchParams(location.search).get('posto') || 'm3',
    fsNum: null,
    operadores: ['o1', 'o2'],
    inicioCrono: null,     // marca o início do trecho em curso
    acumuladoSeg: 0,
    fase: null,            // 'SETUP' | 'PRODUCAO' | 'PARADA' | null
    conferencia: {},
    volumesCarregados: {}
  };

  const fila = criarFila(({ pendentes, online }) => {
    $('#btRede').className = `fab-rede ${online ? 'online' : 'offline'}`;
    $('#txtRede').textContent = online ? 'Conectado' : 'Sem rede — trabalhando offline';
    const chip = $('#chipFila');
    chip.classList.toggle('oculto', pendentes === 0);
    chip.textContent = `${pendentes} na fila de envio`;
  });

  const posto = () => POSTOS.find(p => p.id === estado.postoId);
  const maquina = () => D.maquina(estado.postoId);
  const fsDoPosto = () => fichas.filter(f => f.maquinaId === estado.postoId && f.status !== 'CONCLUIDA')
    .sort((a, b) => a.fila - b.fila);
  const fsAtual = () => fichas.find(f => f.numero === estado.fsNum);

  /* Registra um evento imutável e o joga na fila de sincronização. */
  function registrar(tipo, descricao, dados = {}) {
    eventos.unshift({
      id: eventos.length + 1, tipo, descricao, dados,
      fs: estado.fsNum, em: new Date(), estornado: false,
      operador: estado.operadores[0]
    });
    fila.enfileirar(descricao);
  }

  /* ---------------------------------------------------------------- cronômetro */
  function segundos() {
    return estado.acumuladoSeg + (estado.inicioCrono ? Math.floor((Date.now() - estado.inicioCrono) / 1000) : 0);
  }

  function tique() {
    $('#relogio').textContent = new Date().toLocaleTimeString('pt-BR');
    const alvo = $('#crono');
    if (alvo) alvo.textContent = hhmmss(segundos());
  }
  tique();
  setInterval(tique, 1000);

  /* ================================================================ telas */

  function render() {
    $('#opTopo').innerHTML = estado.operadores.map(id => {
      const o = D.operador(id);
      return `<div class="foto" title="${esc(o.nome)}">${iniciais(o.nome)}</div>`;
    }).join('') + `<div><div style="font-size:13px;font-weight:650">${esc(D.operador(estado.operadores[0]).nome)}</div>
      <div style="font-size:11px;color:#7c8aa3">${estado.operadores.length > 1
        ? `+${estado.operadores.length - 1} na máquina` : 'turno ' + D.operador(estado.operadores[0]).turno}</div></div>`;

    const m = posto().modo;
    if (m === 'MAQUINA') telaMaquina();
    else if (m === 'CONFERENCIA') telaConferencia();
    else telaExpedicao();

    renderFila();
  }

  /* ---------------------------------------------------------------- máquina */
  function telaMaquina() {
    const fs = fsAtual();
    if (!fs) {
      $('#principal').innerHTML = `
        <div class="fs"><div class="fs-corpo" style="text-align:center; padding:60px 20px">
          <div style="font-size:52px; margin-bottom:12px">📋</div>
          <h2 style="font-size:22px">Nenhuma Ficha de Serviço aberta</h2>
          <p style="color:#7c8aa3; font-size:15px; margin-top:8px">
            Leia o QR da FS impressa ou escolha uma da fila ao lado.</p>
          <button class="bt-fab finalizar" style="max-width:280px; margin:22px auto 0"
            onclick="MAQ.lerQR()"><span class="ic">⛶</span> Ler QR da ficha</button>
        </div></div>`;
      return;
    }

    const f = D.ficha(fs.ft), c = D.cliente(fs.clienteId), o = D.ordem(fs.of);
    const falta = Math.max(0, fs.qtdPrevista - fs.qtdProduzida);
    const p = Math.round(fs.qtdProduzida / fs.qtdPrevista * 100);
    const estadoClasse = { AGUARDANDO: 'aguardando', EM_SETUP: 'setup', EM_PRODUCAO: 'producao',
      PAUSADA: 'pausada', PARADA: 'parada', CONCLUIDA: 'concluida' }[fs.status] || 'aguardando';

    $('#principal').innerHTML = `
      <div class="fs">
        <div class="fs-cab">
          <div>
            <div class="rot">Ficha de serviço</div>
            <div class="fs-num">${fs.numero}</div>
          </div>
          <div><div class="rot">Operação</div><div class="val">${esc(rot(fs.operacao))}</div></div>
          <div><div class="rot">O.F. / Lote</div><div class="val">${fs.of} · ${esc(o.lote)}</div></div>
          <div><div class="rot">Cliente</div><div class="val">${esc(c.fantasia)}</div></div>
          <div style="margin-left:auto"><span class="fs-estado ${estadoClasse}">
            <i class="ponto"></i>${esc(rot(fs.status))}</span></div>
        </div>

        <div class="fs-corpo">
          ${fs.travaChapa ? `<div class="aviso erro" style="margin-bottom:16px; font-size:15px">
            <span style="font-size:22px">⛔</span><div><b>Chapa não chegou.</b>
            Esta FS está travada pelo PCP e não pode iniciar. Fale com o PCP antes de montar a faca.</div></div>` : ''}

          <div style="font-size:19px; font-weight:650">${esc(f.referencia)}</div>
          <div style="color:#7c8aa3; font-size:14px; margin-top:2px">
            F.T. ${f.numero} · estilo ${esc(f.estilo)} · ${esc(f.qualidadeInterna)} ${esc(f.onda)} ${num(f.gramatura)} g/m²</div>

          <div class="fab-nums">
            <div class="fab-num"><div class="rot">Previsto</div>
              <div class="val">${num(fs.qtdPrevista)}</div><div class="sub">peças</div></div>
            <div class="fab-num ok"><div class="rot">Produzido</div>
              <div class="val">${num(fs.qtdProduzida)}</div><div class="sub">${p}% da FS</div></div>
            <div class="fab-num ${fs.refugo ? 'erro' : ''}"><div class="rot">Refugo</div>
              <div class="val">${num(fs.refugo)}</div>
              <div class="sub">${fs.qtdProduzida ? dec(fs.refugo / fs.qtdProduzida * 100) + '%' : '—'}</div></div>
            <div class="fab-num crono ${estado.fase === 'PARADA' ? 'erro' : estado.fase === 'SETUP' ? 'alerta' : 'ok'}">
              <div class="rot">${estado.fase === 'PARADA' ? 'Parada' : estado.fase === 'SETUP' ? 'Setup' : 'Produção'}</div>
              <div class="val" id="crono">${hhmmss(segundos())}</div>
              <div class="sub">faltam ${num(falta)} pç</div></div>
          </div>

          <div class="fab-tec">
            <div><div class="rot">Faca</div><div class="val">${esc(f.faca || '—')}</div></div>
            <div><div class="rot">Clichê</div><div class="val">${esc(f.cliche || '—')}</div></div>
            <div><div class="rot">Cores</div><div class="val">${esc(f.cores || 'sem impressão')}</div></div>
            <div><div class="rot">Chapa</div><div class="val">${num(o.chapa.largura)} × ${num(o.chapa.comprimento)}</div></div>
            <div><div class="rot">Peças / chapa</div><div class="val">${f.pecasPorChapa}</div></div>
            <div><div class="rot">Amarrado</div><div class="val">${num(f.amarrado)} pç</div></div>
            <div style="grid-column: 1 / -1">
              <div class="rot">Riscador · ${num(f.riscador.reduce((a,b)=>a+b,0))} mm</div>
              <div class="fab-medidas">
                ${f.riscador.map(v => `<span class="cx">${v}</span>`).join('')}
                <span class="cx tot">${num(f.riscador.reduce((a,b)=>a+b,0))}</span></div>
            </div>
            <div style="grid-column: 1 / -1">
              <div class="rot">Impressão · ${num(f.impressao.reduce((a,b)=>a+b,0))} mm</div>
              <div class="fab-medidas">
                ${f.impressao.map(v => `<span class="cx">${v}</span>`).join('')}
                <span class="cx tot">${num(f.impressao.reduce((a,b)=>a+b,0))}</span></div>
            </div>
          </div>

          ${f.obsFabricacao ? `<div class="aviso alerta" style="margin-top:16px; font-size:15px">
            <span style="font-size:20px">⚠︎</span><div><b>Observação de fabricação</b><br>
            ${esc(f.obsFabricacao).replace(/\n/g, '<br>')}</div></div>` : ''}

          ${htmlAcoes(fs)}
        </div>
      </div>

      ${htmlEventos()}`;
  }

  function htmlAcoes(fs) {
    const trava = fs.travaChapa;
    const bt = (classe, ic, rotulo, sub, acao, ativo) =>
      `<button class="bt-fab ${classe}" ${ativo && !trava ? '' : 'disabled'} onclick="MAQ.${acao}">
        <span class="ic">${ic}</span>${rotulo}${sub ? `<small>${sub}</small>` : ''}</button>`;

    const s = fs.status;
    return `<div class="fab-acoes">
      ${bt('', '🔧', 'Iniciar setup', 'troca de faca e clichê', 'iniciarSetup()', s === 'AGUARDANDO')}
      ${bt('iniciar', '▶', s === 'EM_SETUP' ? 'Fim do setup e produzir' : 'Iniciar produção', '',
        'iniciarProducao()', ['AGUARDANDO', 'EM_SETUP', 'PAUSADA', 'PARADA'].includes(s))}
      ${bt('finalizar', '＋', 'Apontar produção', 'lançar peças boas', 'apontar()', s === 'EM_PRODUCAO')}
      ${bt('refugo', '🗑', 'Apontar refugo', 'exige motivo', 'refugo()', ['EM_PRODUCAO', 'PAUSADA', 'PARADA'].includes(s))}
      ${bt('pausar', '⏸', 'Parar máquina', 'exige motivo', 'parar()', s === 'EM_PRODUCAO')}
      ${bt('parar', '■', 'Encerrar FS', 'fecha e libera a máquina', 'encerrar()',
        ['EM_PRODUCAO', 'PAUSADA', 'PARADA'].includes(s) && fs.qtdProduzida > 0)}
    </div>`;
  }

  function htmlEventos() {
    if (!eventos.length) return '';
    return `<div class="fs">
      <div class="fs-cab" style="background:#222d40">
        <div><div class="rot">Apontamentos desta sessão</div>
          <div class="val">${eventos.length} evento(s) — imutáveis</div></div>
      </div>
      <div class="fs-corpo" style="padding:14px 20px">
        ${eventos.slice(0, 8).map((e, i) => `
          <div style="display:flex; align-items:center; gap:14px; padding:11px 0;
                      border-bottom:1px solid #222d40; ${e.estornado ? 'opacity:.45' : ''}">
            <span style="font-family:var(--mono); color:#7c8aa3; font-size:13px">
              ${e.em.toLocaleTimeString('pt-BR')}</span>
            <span style="flex:1; font-size:15px; ${e.estornado ? 'text-decoration:line-through' : ''}">
              ${esc(e.descricao)}</span>
            <span style="font-size:12px; color:#7c8aa3">${esc(D.operador(e.operador).nome.split(' ')[0])}</span>
            ${e.estornado
              ? '<span class="fs-estado parada" style="font-size:11px; padding:4px 10px">estornado</span>'
              : (i === 0 && e.tipo === 'PRODUCAO'
                ? `<button class="bt-fab" style="min-height:40px; font-size:13px; padding:8px 14px"
                     onclick="MAQ.estornar(${e.id})">Estornar</button>`
                : '')}
          </div>`).join('')}
        <div style="font-size:12.5px; color:#7c8aa3; margin-top:12px; line-height:1.5">
          Nenhuma dessas linhas é editável. Errou a quantidade? O estorno cria um
          <b>evento contrário</b>, com autor e motivo — e as duas linhas ficam visíveis para sempre.
        </div>
      </div>
    </div>`;
  }

  /* ---------------------------------------------------------------- conferência */
  function telaConferencia() {
    const fs = fichas.find(f => f.maquinaId === 'm6' && f.status !== 'CONCLUIDA');
    if (!fs) { $('#principal').innerHTML = '<div class="vazio">Nada para conferir</div>'; return; }
    const f = D.ficha(fs.ft), c = D.cliente(fs.clienteId), o = D.ordem(fs.of);

    const itens = [
      { id: 'medida', txt: 'Medida interna confere com a F.T.',
        sub: `${f.C} × ${f.L} × ${f.A} mm — medir 3 caixas do lote` },
      { id: 'esquadro', txt: 'Esquadro e colagem', sub: 'sem desalinhamento na aba de cola' },
      { id: 'impressao', txt: 'Impressão conforme clichê', sub: `${esc(f.cliche || 'sem clichê')} · ${esc(f.cores || '—')}` },
      { id: 'ect', txt: 'Chapa conforme especificado', sub: `${esc(f.qualidadeInterna)} · ${num(f.gramatura)} g/m²` },
      { id: 'obs', txt: 'Observação de fabricação atendida',
        sub: f.obsFabricacao ? f.obsFabricacao.split('\n')[0] : 'nenhuma observação' },
      { id: 'amarrado', txt: `Amarrado de ${num(f.amarrado)} peças`, sub: 'contagem por amostragem' },
      { id: 'etiqueta', txt: 'Etiqueta de volume aplicada', sub: 'QR com O.F., F.T. e lote' }
    ];
    const marcados = itens.filter(i => estado.conferencia[i.id]).length;
    const tudo = marcados === itens.length;

    $('#principal').innerHTML = `
      <div class="fs">
        <div class="fs-cab">
          <div><div class="rot">Conferência</div><div class="fs-num">${fs.numero}</div></div>
          <div><div class="rot">O.F. / Lote</div><div class="val">${fs.of} · ${esc(o.lote)}</div></div>
          <div><div class="rot">Cliente</div><div class="val">${esc(c.fantasia)}</div></div>
          <div><div class="rot">Quantidade</div><div class="val">${num(fs.qtdPrevista)} pç</div></div>
          <div style="margin-left:auto"><span class="fs-estado ${tudo ? 'producao' : 'setup'}">
            <i class="ponto"></i>${marcados} de ${itens.length}</span></div>
        </div>
        <div class="fs-corpo">
          <div style="font-size:18px; font-weight:650; margin-bottom:4px">${esc(f.referencia)}</div>
          <div style="color:#7c8aa3; font-size:14px; margin-bottom:18px">
            F.T. ${f.numero} · a lista sai da própria F.T., não de um roteiro genérico</div>

          <div class="chk-lista">
            ${itens.map(i => `
              <div class="chk ${estado.conferencia[i.id] ? 'marcado' : ''}" onclick="MAQ.marcar('${i.id}')">
                <div class="caixa">${estado.conferencia[i.id] ? '✓' : ''}</div>
                <div class="txt">${esc(i.txt)}<small>${esc(i.sub)}</small></div>
              </div>`).join('')}
          </div>

          <div class="fab-acoes">
            <button class="bt-fab iniciar" ${tudo ? '' : 'disabled'} onclick="MAQ.aprovarLote()">
              <span class="ic">✓</span> Aprovar lote<small>libera para expedição</small></button>
            <button class="bt-fab parar" onclick="MAQ.reprovarLote()">
              <span class="ic">✕</span> Reprovar lote<small>exige motivo e retorna à produção</small></button>
          </div>

          <div class="aviso info" style="margin-top:18px; font-size:14px">
            <span style="font-size:20px">🔒</span><div>
            Aprovar sem marcar tudo é impossível por construção — o botão só existe com a lista completa.
            É o tipo de regra que o legado deixava para a disciplina do operador.</div></div>
        </div>
      </div>
      ${htmlEventos()}`;
  }

  /* ---------------------------------------------------------------- expedição */
  function telaExpedicao() {
    const carga = D.cargas[0];
    const disponiveis = D.volumes.filter(v => ['DISPONIVEL', 'RESERVADO'].includes(v.situacao));
    const carregados = disponiveis.filter(v => estado.volumesCarregados[v.codigo]);
    const pesoCarregado = carregados.reduce((s, v) => s + v.peso, 0);

    $('#principal').innerHTML = `
      <div class="fs">
        <div class="fs-cab">
          <div><div class="rot">Carga</div><div class="fs-num">${carga.numero}</div></div>
          <div><div class="rot">Transportadora</div><div class="val">${esc(carga.transportadora)}</div></div>
          <div><div class="rot">Placa</div><div class="val">${esc(carga.placa)}</div></div>
          <div><div class="rot">Pedidos</div><div class="val">${carga.pedidos.join(', ')}</div></div>
          <div style="margin-left:auto"><span class="fs-estado ${carregados.length === disponiveis.length ? 'producao' : 'setup'}">
            <i class="ponto"></i>${carregados.length} de ${disponiveis.length} volumes</span></div>
        </div>
        <div class="fs-corpo">
          <div class="fab-nums" style="grid-template-columns:repeat(3,1fr)">
            <div class="fab-num ok"><div class="rot">Volumes no caminhão</div>
              <div class="val">${carregados.length}</div><div class="sub">de ${disponiveis.length} previstos</div></div>
            <div class="fab-num"><div class="rot">Peso embarcado</div>
              <div class="val">${dec(pesoCarregado)}</div><div class="sub">kg de ${dec(carga.peso)} kg</div></div>
            <div class="fab-num"><div class="rot">Peças</div>
              <div class="val">${num(carregados.reduce((s, v) => s + v.qtd, 0))}</div><div class="sub">conferidas</div></div>
          </div>

          <div style="font-size:15px; font-weight:650; margin:16px 0 10px">
            Leia o QR de cada volume ao colocar no caminhão</div>

          <div class="chk-lista">
            ${disponiveis.map(v => {
              const f = D.ficha(v.ft);
              return `<div class="chk ${estado.volumesCarregados[v.codigo] ? 'marcado' : ''}"
                onclick="MAQ.carregar('${v.codigo}')">
                <div class="caixa">${estado.volumesCarregados[v.codigo] ? '✓' : ''}</div>
                <div class="txt">${esc(v.codigo)} · ${num(v.qtd)} pç · ${dec(v.peso)} kg
                  <small>O.F. ${v.of} · F.T. ${v.ft} — ${esc(f.referencia)}</small></div>
              </div>`;
            }).join('')}
          </div>

          <div class="fab-acoes">
            <button class="bt-fab" onclick="MAQ.lerQR()"><span class="ic">⛶</span> Ler QR do volume</button>
            <button class="bt-fab iniciar" ${carregados.length ? '' : 'disabled'} onclick="MAQ.fecharCarga()">
              <span class="ic">🚚</span> Fechar carga<small>gera romaneio e chama o fiscal</small></button>
          </div>

          <div class="aviso info" style="margin-top:18px; font-size:14px">
            <span style="font-size:20px">🧾</span><div>
            A nota fiscal é emitida no <b>nó local</b>, que guarda o certificado, e só depois que a carga
            fecha. Numeração fiscal nunca sai de um tablet offline.</div></div>
        </div>
      </div>
      ${htmlEventos()}`;
  }

  /* ---------------------------------------------------------------- fila lateral */
  function renderFila() {
    const lista = fsDoPosto();
    $('#filaLateral').innerHTML = `
      <div class="fila-tit">Fila deste posto — ${esc(maquina().nome)}</div>
      ${lista.length ? lista.map(fs => {
        const f = D.ficha(fs.ft);
        return `<div class="fila-item ${fs.numero === estado.fsNum ? 'ativa' : ''} ${fs.travaChapa ? 'chapa' : ''}"
          onclick="MAQ.abrir(${fs.numero})">
          <div class="n">${fs.numero}</div>
          <div class="r">${esc(f.referencia)}</div>
          <div class="q">${num(fs.qtdProduzida)} / ${num(fs.qtdPrevista)} pç · ${esc(rot(fs.status))}</div>
          ${fs.travaChapa ? '<div class="q" style="color:#f19288">⛔ aguardando chapa</div>' : ''}
        </div>`;
      }).join('') : '<div class="vazio">Fila vazia</div>'}

      <div class="fila-tit" style="margin-top:20px">Turno</div>
      <div class="fila-item" style="cursor:default">
        <div class="q" style="margin:0">Peças boas no turno</div>
        <div class="n">${num(fichas.filter(f => f.maquinaId === estado.postoId)
          .reduce((s, f) => s + f.qtdProduzida, 0))}</div>
      </div>
      <button class="bt-fab" style="min-height:56px; font-size:15px; width:100%"
        onclick="MAQ.trocarOperador()"><span class="ic" style="font-size:18px">👤</span> Trocar operador</button>`;
  }

  /* ================================================================ ações */
  const MAQ = {
    abrir(n) {
      estado.fsNum = n;
      const fs = fsAtual();
      estado.acumuladoSeg = (fs.tempoProducaoMin || 0) * 60;
      estado.inicioCrono = fs.status === 'EM_PRODUCAO' ? Date.now() : null;
      estado.fase = fs.status === 'EM_PRODUCAO' ? 'PRODUCAO' : fs.status === 'EM_SETUP' ? 'SETUP' : null;
      render();
    },

    lerQR() {
      const lista = fsDoPosto();
      modal({
        fabrica: true, titulo: 'Leitura de QR', largura: '520px',
        corpo: `<div style="text-align:center">
          <div style="font-size:64px">⛶</div>
          <p style="font-size:15px; color:#a7b5cc">No tablet real a câmera lê o QR impresso na ficha
          ou na etiqueta do volume. Aqui, escolha um número:</p>
          <div class="motivos" style="margin-top:16px">
            ${lista.map(f => `<button class="bt-motivo" data-fs="${f.numero}">
              ${f.numero}<small>${esc(D.ficha(f.ft).referencia.slice(0, 26))}</small></button>`).join('')}
          </div></div>`,
        acoes: []
      }).corpo.addEventListener('click', e => {
        const b = e.target.closest('[data-fs]');
        if (!b) return;
        MAQ.abrir(Number(b.dataset.fs));
        toast(`FS ${b.dataset.fs} aberta`, 'ok');
        document.querySelector('.fab-cortina')?.remove();
      });
    },

    iniciarSetup() {
      const fs = fsAtual();
      fs.status = 'EM_SETUP';
      estado.fase = 'SETUP';
      estado.acumuladoSeg = 0;
      estado.inicioCrono = Date.now();
      registrar('SETUP', `Setup iniciado na FS ${fs.numero} (faca ${D.ficha(fs.ft).faca || '—'})`);
      render();
    },

    iniciarProducao() {
      const fs = fsAtual();
      if (estado.fase === 'SETUP') {
        fs.tempoSetupMin = Math.max(1, Math.round(segundos() / 60));
        registrar('SETUP_FIM', `Setup encerrado com ${hhmm(fs.tempoSetupMin)} na FS ${fs.numero}`);
        estado.acumuladoSeg = 0;
      }
      fs.status = 'EM_PRODUCAO';
      estado.fase = 'PRODUCAO';
      estado.inicioCrono = Date.now();
      registrar('INICIO', `Produção iniciada na FS ${fs.numero} por ${D.operador(estado.operadores[0]).nome}`);
      render();
    },

    apontar() {
      const fs = fsAtual();
      const f = D.ficha(fs.ft);
      const restante = Math.max(0, fs.qtdPrevista - fs.qtdProduzida);
      teclado({
        titulo: `Apontar produção — FS ${fs.numero}`,
        dica: `Amarrado de ${num(f.amarrado)} peças · faltam ${num(restante)}`,
        atalhos: [f.amarrado, f.amarrado * 10, f.amarrado * 50, restante].filter((v, i, a) => v > 0 && a.indexOf(v) === i),
        aoConfirmar(qtd) {
          if (!qtd) { toast('Informe a quantidade', 'alerta'); return false; }
          if (qtd > restante) {
            toast(`${num(qtd)} passa do previsto da FS (faltam ${num(restante)})`, 'erro');
            return false;
          }
          fs.qtdProduzida += qtd;
          fs.tempoProducaoMin = Math.round(segundos() / 60);
          registrar('PRODUCAO', `${num(qtd)} peças boas apontadas na FS ${fs.numero}`, { qtd });
          if (fs.qtdProduzida >= fs.qtdPrevista) toast('Quantidade prevista atingida', 'ok');
          render();
          return true;
        }
      });
    },

    refugo() {
      const fs = fsAtual();
      escolherMotivo({
        titulo: `Refugo — FS ${fs.numero}`,
        dica: 'Motivo obrigatório. A lista é fechada para o refugo virar estatística, não texto.',
        motivos: D.motivosRefugo.map(m => ({ codigo: m.codigo, desc: m.desc, sub: m.cat })),
        aoEscolher(motivo) {
          teclado({
            titulo: `Refugo por "${motivo.desc}"`,
            dica: 'Quantidade de peças refugadas',
            atalhos: [10, 50, 100, 500],
            aoConfirmar(qtd) {
              if (!qtd) { toast('Informe a quantidade', 'alerta'); return false; }
              fs.refugo += qtd;
              registrar('REFUGO', `${num(qtd)} peças refugadas na FS ${fs.numero} — ${motivo.desc}`, { qtd, motivo: motivo.codigo });
              render();
              return true;
            }
          });
        }
      });
    },

    parar() {
      const fs = fsAtual();
      escolherMotivo({
        titulo: `Parada de máquina — FS ${fs.numero}`,
        dica: 'A máquina para agora e o tempo passa a contar como parada, com este motivo.',
        motivos: D.motivosParada.map(m => ({ codigo: m.codigo, desc: m.desc,
          sub: m.planejada ? 'planejada' : 'não planejada' })),
        aoEscolher(motivo) {
          fs.tempoProducaoMin = Math.round(segundos() / 60);
          fs.status = 'PARADA';
          estado.fase = 'PARADA';
          estado.acumuladoSeg = 0;
          estado.inicioCrono = Date.now();
          registrar('PARADA', `Máquina parada na FS ${fs.numero} — ${motivo.desc}`, { motivo: motivo.codigo });
          render();
        }
      });
    },

    encerrar() {
      const fs = fsAtual();
      const sobra = fs.qtdPrevista - fs.qtdProduzida;
      modal({
        fabrica: true, titulo: `Encerrar FS ${fs.numero}?`, largura: '560px',
        corpo: `
          <div class="fab-tec" style="grid-template-columns:repeat(2,1fr)">
            <div><div class="rot">Previsto</div><div class="val">${num(fs.qtdPrevista)} pç</div></div>
            <div><div class="rot">Produzido</div><div class="val">${num(fs.qtdProduzida)} pç</div></div>
            <div><div class="rot">Refugo</div><div class="val">${num(fs.refugo)} pç</div></div>
            <div><div class="rot">Tempo de produção</div><div class="val">${hhmm(Math.round(segundos() / 60))}</div></div>
          </div>
          ${sobra > 0 ? `<div class="aviso alerta" style="margin-top:16px; font-size:14px">
            <span style="font-size:20px">⚠︎</span><div>Faltam <b>${num(sobra)} peças</b> para o previsto.
            Encerrar assim deixa a O.F. com saldo em aberto, e o PCP precisa decidir o que fazer.</div></div>`
            : `<div class="aviso ok" style="margin-top:16px; font-size:14px">
            <span style="font-size:20px">✓</span><div>Quantidade prevista atendida. A próxima operação do
            roteiro é liberada automaticamente.</div></div>`}`,
        acoes: [
          { rotulo: 'Voltar', classe: 'bt-fab' },
          { rotulo: 'Encerrar FS', classe: 'bt-fab finalizar', acao() {
            fs.status = 'CONCLUIDA';
            fs.tempoProducaoMin = Math.round(segundos() / 60);
            estado.inicioCrono = null;
            estado.fase = null;
            registrar('FIM', `FS ${fs.numero} encerrada com ${num(fs.qtdProduzida)} peças boas`);
            estado.fsNum = null;
            render();
            toast(`FS ${fs.numero} encerrada`, 'ok');
          }}
        ]
      });
    },

    estornar(id) {
      const ev = eventos.find(e => e.id === id);
      escolherMotivo({
        titulo: 'Estorno de apontamento',
        dica: `Vai estornar: "${ev.descricao}". O evento original permanece no histórico.`,
        motivos: [
          { codigo: 'DIGITACAO', desc: 'Erro de digitação', sub: 'quantidade errada' },
          { codigo: 'FS_ERRADA', desc: 'Apontado na FS errada', sub: 'troca de ficha' },
          { codigo: 'CONTAGEM', desc: 'Recontagem do lote', sub: 'divergência na conferência' }
        ],
        aoEscolher(motivo) {
          const fs = fsAtual();
          ev.estornado = true;
          fs.qtdProduzida = Math.max(0, fs.qtdProduzida - (ev.dados.qtd || 0));
          registrar('ESTORNO', `Estorno de ${num(ev.dados.qtd || 0)} peças na FS ${fs.numero} — ${motivo.desc}`);
          render();
        }
      });
    },

    marcar(id) {
      estado.conferencia[id] = !estado.conferencia[id];
      render();
    },

    aprovarLote() {
      const fs = fichas.find(f => f.maquinaId === 'm6' && f.status !== 'CONCLUIDA');
      fs.status = 'CONCLUIDA';
      registrar('CONFERENCIA_OK', `Lote da FS ${fs.numero} aprovado na conferência`);
      toast('Lote aprovado e liberado para expedição', 'ok');
      estado.conferencia = {};
      render();
    },

    reprovarLote() {
      escolherMotivo({
        titulo: 'Reprovar lote',
        dica: 'O lote volta para a produção e o motivo alimenta o indicador de qualidade.',
        motivos: D.motivosRefugo.map(m => ({ codigo: m.codigo, desc: m.desc, sub: m.cat })),
        aoEscolher(motivo) {
          registrar('CONFERENCIA_NOK', `Lote reprovado na conferência — ${motivo.desc}`);
          toast('Lote reprovado. PCP e produção notificados.', 'erro');
          render();
        }
      });
    },

    carregar(codigo) {
      estado.volumesCarregados[codigo] = !estado.volumesCarregados[codigo];
      if (estado.volumesCarregados[codigo]) registrar('EMBARQUE', `Volume ${codigo} embarcado`);
      render();
    },

    fecharCarga() {
      const qtd = Object.values(estado.volumesCarregados).filter(Boolean).length;
      registrar('CARGA', `Carga 3188 fechada com ${qtd} volume(s)`);
      modal({
        fabrica: true, titulo: 'Carga fechada', largura: '540px',
        corpo: `<div class="aviso ok" style="font-size:15px"><span style="font-size:22px">✓</span><div>
          Romaneio gerado com <b>${qtd} volume(s)</b>. O fiscal foi avisado para emitir a NF-e no nó local.
          </div></div>
          <p style="margin-top:16px; color:#a7b5cc; font-size:14px">
          O motorista assina o recebimento no tablet, e essa assinatura fica ligada à entrega —
          mesma tabela usada no protocolo de amostra do vendedor.</p>`,
        acoes: [{ rotulo: 'Entendi', classe: 'bt-fab finalizar' }]
      });
      render();
    },

    trocarOperador() {
      modal({
        fabrica: true, titulo: 'Identificação do operador', largura: '560px',
        corpo: `
          <p style="color:#a7b5cc; font-size:14px; margin-bottom:16px">
            Crachá com QR mais PIN de 4 dígitos. Operador de fábrica não digita usuário e senha —
            e o apontamento continua sendo nominal.</p>
          <div class="motivos">
            ${D.operadores.map(o => `<button class="bt-motivo" data-op="${o.id}">
              ${esc(o.nome)}<small>${esc(o.cracha)} · turno ${esc(o.turno)}</small></button>`).join('')}
          </div>`,
        acoes: []
      }).corpo.addEventListener('click', e => {
        const b = e.target.closest('[data-op]');
        if (!b) return;
        estado.operadores = [b.dataset.op];
        const fs = fsAtual();
        if (fs) fs.operadores = [b.dataset.op];
        registrar('OPERADOR', `${D.operador(b.dataset.op).nome} assumiu o posto ${maquina().nome}`);
        document.querySelector('.fab-cortina')?.remove();
        render();
      });
    }
  };
  window.MAQ = MAQ;

  /* ---------------------------------------------------------------- teclado numérico */
  function teclado({ titulo, dica, atalhos = [], aoConfirmar }) {
    let valor = '';
    const m = modal({
      fabrica: true, titulo, largura: '520px',
      corpo: `
        <p style="color:#a7b5cc; font-size:14px; margin-bottom:14px; text-align:center">${esc(dica || '')}</p>
        <div class="visor" id="visor">0</div>
        ${atalhos.length ? `<div class="motivos" style="margin-bottom:16px; grid-template-columns:repeat(${Math.min(4, atalhos.length)},1fr)">
          ${atalhos.map(a => `<button class="bt-motivo" style="min-height:54px" data-atalho="${a}">
            +${num(a)}</button>`).join('')}</div>` : ''}
        <div class="teclado">
          ${[1,2,3,4,5,6,7,8,9].map(n => `<button data-tecla="${n}">${n}</button>`).join('')}
          <button data-tecla="0">0</button>
          <button data-tecla="00">00</button>
          <button data-tecla="del">⌫</button>
        </div>`,
      acoes: [
        { rotulo: 'Cancelar', classe: 'bt-fab' },
        { rotulo: 'Confirmar', classe: 'bt-fab iniciar', acao: () => aoConfirmar(Number(valor || 0)) }
      ]
    });

    const visor = m.corpo.querySelector('#visor');
    const pinta = () => visor.textContent = valor ? num(Number(valor)) : '0';
    m.corpo.addEventListener('click', e => {
      const t = e.target.closest('[data-tecla]'), a = e.target.closest('[data-atalho]');
      if (a) { valor = String(Number(valor || 0) + Number(a.dataset.atalho)); return pinta(); }
      if (!t) return;
      const k = t.dataset.tecla;
      if (k === 'del') valor = valor.slice(0, -1);
      else if (valor.length < 8) valor += k;
      pinta();
    });
  }

  /* ---------------------------------------------------------------- motivos */
  function escolherMotivo({ titulo, dica, motivos, aoEscolher }) {
    const m = modal({
      fabrica: true, titulo, largura: '620px',
      corpo: `
        <p style="color:#a7b5cc; font-size:14px; margin-bottom:16px">${esc(dica || '')}</p>
        <div class="motivos">
          ${motivos.map((x, i) => `<button class="bt-motivo" data-i="${i}">
            ${esc(x.desc)}<small>${esc(x.sub || x.codigo)}</small></button>`).join('')}
        </div>`,
      acoes: [{ rotulo: 'Cancelar', classe: 'bt-fab' }]
    });
    m.corpo.addEventListener('click', e => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      m.fechar();
      aoEscolher(motivos[Number(b.dataset.i)]);
    });
  }

  /* ================================================================ boot */
  $('#selPosto').innerHTML = POSTOS.map(p => {
    const m = D.maquina(p.id);
    return `<option value="${p.id}" ${p.id === estado.postoId ? 'selected' : ''}>${esc(m.nome)}</option>`;
  }).join('');

  $('#selPosto').addEventListener('change', e => {
    estado.postoId = e.target.value;
    estado.fsNum = null;
    estado.inicioCrono = null;
    estado.fase = null;
    render();
    const fs = fsDoPosto().find(f => f.status === 'EM_PRODUCAO') || fsDoPosto()[0];
    if (fs && posto().modo === 'MAQUINA') MAQ.abrir(fs.numero);
  });

  $('#btRede').addEventListener('click', () => {
    fila.definirOnline(!fila.online);
    toast(fila.online ? 'Rede voltou. Fila sendo enviada.' : 'Modo offline: o apontamento continua normal.',
      fila.online ? 'ok' : 'alerta');
  });

  document.body.insertAdjacentHTML('afterbegin', U.faixaProto('Tablet de fábrica · toque grosso'));

  const inicial = fsDoPosto().find(f => f.status === 'EM_PRODUCAO') || fsDoPosto()[0];
  if (inicial && posto().modo === 'MAQUINA') MAQ.abrir(inicial.numero);
  else render();
})();
