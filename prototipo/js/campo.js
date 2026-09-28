/* App do vendedor. É o aparelho que responde à pergunta do projeto:
   "os vendedores trabalham na rua e não vão conseguir usar o servidor remotamente".

   A resposta que este app encena: ele não depende do servidor para funcionar.
   Tudo que o vendedor precisa em campo está no aparelho, a assinatura do cliente
   é coletada offline e a sincronização acontece quando houver sinal.

   Use o interruptor "modo avião" na barra superior: nada deixa de funcionar. */

(() => {
  const { $, esc, num, dec, dinheiro, pct, data, dataHora, iniciais, rot, selo, toast, modal, criarFila } = U;
  const D = Dados;

  const VENDEDOR = 'RENATO BORGES';
  const MINHA_CARTEIRA = D.clientes.filter(c => c.representante === VENDEDOR);

  /* Cópia local: no aparelho real isso é um SQLite dentro do navegador. */
  const local = {
    amostras: D.amostras.map(a => ({ ...a })),
    assinaturas: [],
    ultimaSinc: new Date('2026-09-27T16:12:00'),
    blocoAmostra: { inicio: 30900, proximo: 30942, fim: 30999 }
  };

  const estado = { tela: 'carteira', param: null, pilha: [] };

  const fila = criarFila(({ pendentes, online }) => {
    pintarBarra(pendentes, online);
    pintarMenu();
  });

  /* ---------------------------------------------------------------- navegação */
  function ir(tela, param = null, empilhar = true) {
    if (empilhar && (estado.tela !== tela || estado.param !== param)) {
      estado.pilha.push({ tela: estado.tela, param: estado.param });
    }
    estado.tela = tela;
    estado.param = param;
    render();
  }
  function voltar() {
    const anterior = estado.pilha.pop() || { tela: 'carteira', param: null };
    estado.tela = anterior.tela;
    estado.param = anterior.param;
    render();
  }
  window.CAMPO = { ir, voltar };

  /* ---------------------------------------------------------------- cabeçalho */
  function pintarBarra(pendentes = fila.pendentes, online = fila.online) {
    const b = $('#barraSinc');
    b.className = `cmp-sinc ${online ? 'online' : 'offline'}`;
    const min = Math.round((Date.now() - local.ultimaSinc) / 60000);
    b.innerHTML = online
      ? `<i class="ponto"></i><span>Sincronizado agora</span>
         ${pendentes ? `<span class="pend">${pendentes} enviando</span>` : ''}
         <div class="dir">${interruptor(online)}</div>`
      : `<span>✈</span><span>Sem conexão — dados de ${dataHora(isoLocal(local.ultimaSinc))}
         (${min} min atrás)</span>
         ${pendentes ? `<span class="pend">${pendentes} na fila</span>` : ''}
         <div class="dir">${interruptor(online)}</div>`;
    b.querySelector('#chkOffline').addEventListener('change', e => {
      const aviao = e.target.checked;
      if (!aviao) local.ultimaSinc = new Date();
      fila.definirOnline(!aviao);
      toast(aviao
        ? 'Modo avião: continue trabalhando, nada se perde.'
        : 'Conectado. Fila enviada na ordem em que foi criada.', aviao ? 'alerta' : 'ok');
    });
  }

  /* ISO local (sem UTC): o aparelho do vendedor mostra a hora do relógio dele. */
  const isoLocal = (d) => {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  const interruptor = (online) => `
    <label class="interruptor" title="Simular perda de sinal">
      <input type="checkbox" id="chkOffline" ${online ? '' : 'checked'}>
      <span class="trilho"></span> modo avião
    </label>`;

  const MENU = [
    { id: 'carteira', ic: '👥', txt: 'Carteira' },
    { id: 'pedidos', ic: '📦', txt: 'Pedidos' },
    { id: 'amostras', ic: '🧪', txt: 'Amostras',
      bolha: () => local.amostras.filter(a => a.status === 'AGUARDANDO' && dono(a)).length },
    { id: 'catalogo', ic: '📐', txt: 'Catálogo' },
    { id: 'sinc', ic: '🔄', txt: 'Sincronizar', bolha: () => fila.pendentes }
  ];

  const dono = (x) => MINHA_CARTEIRA.some(c => c.id === x.clienteId);

  function pintarMenu() {
    $('#menu').innerHTML = MENU.map(m => {
      const n = m.bolha ? m.bolha() : 0;
      return `<button class="${estado.tela === m.id ? 'ativo' : ''}" onclick="CAMPO.ir('${m.id}')">
        <span class="ic">${m.ic}</span>${esc(m.txt)}
        ${n ? `<span class="bolha">${n}</span>` : ''}</button>`;
    }).join('');
  }

  function titulo(t, sub) {
    $('#titulo').innerHTML = `${esc(t)}${sub ? `<small>${esc(sub)}</small>` : ''}`;
    $('#btVoltar').classList.toggle('oculto', estado.pilha.length === 0);
  }

  /* ================================================================ telas */
  const Telas = {};

  Telas.carteira = () => {
    titulo('Carteira', `${MINHA_CARTEIRA.length} clientes · ${VENDEDOR}`);
    const pedidosAbertos = (id) => D.pedidos.filter(p => p.clienteId === id &&
      !['ENTREGUE', 'CANCELADO'].includes(p.status)).length;

    return `
      <div class="secao-tit">Meus clientes</div>
      ${MINHA_CARTEIRA.map(c => `
        <div class="cmp-item" onclick="CAMPO.ir('cliente','${c.id}')">
          <div class="inicial">${iniciais(c.fantasia)}</div>
          <div class="corpo">
            <div class="nome">${esc(c.fantasia)}</div>
            <div class="sub">
              ${selo(c.situacao)}
              <span>${esc(c.municipio)}/${esc(c.uf)}</span>
              ${pedidosAbertos(c.id) ? `<span>${pedidosAbertos(c.id)} pedido(s) em aberto</span>` : ''}
            </div>
          </div>
          <div class="seta">›</div>
        </div>`).join('')}

      <div class="secao-tit">O que está no aparelho</div>
      <div class="cartao"><div class="cartao-corpo">
        <div class="dados-grade">
          <div class="dado"><div class="dado-rot">Clientes</div><div class="dado-val">${MINHA_CARTEIRA.length}</div></div>
          <div class="dado"><div class="dado-rot">Fichas técnicas</div>
            <div class="dado-val">${D.fichas.filter(f => dono(f)).length}</div></div>
          <div class="dado"><div class="dado-rot">Preços</div><div class="dado-val">vigentes</div></div>
          <div class="dado"><div class="dado-rot">Amostras</div>
            <div class="dado-val">${local.amostras.filter(dono).length}</div></div>
        </div>
        <div class="aviso info" style="margin-top:14px">
          <span>📥</span><div>Só a <b>carteira deste vendedor</b> desce para o aparelho — não o banco da
          empresa. Menos dado no aparelho é menos exposição se ele for perdido, e menos coisa para
          sincronizar quando o sinal é ruim.</div></div>
      </div></div>`;
  };

  Telas.cliente = (id) => {
    const c = D.cliente(id);
    titulo(c.fantasia, `${c.municipio}/${c.uf} · cód. ${c.codigo}`);
    const fts = D.fichas.filter(f => f.clienteId === id);
    const peds = D.pedidos.filter(p => p.clienteId === id);
    const amos = local.amostras.filter(a => a.clienteId === id);

    return `
      ${c.situacao === 'BLOQUEADO' || c.aberto > c.limite ? `
        <div class="aviso ${c.situacao === 'BLOQUEADO' ? 'erro' : 'alerta'}" style="margin-bottom:14px">
          <span>${c.situacao === 'BLOQUEADO' ? '⛔' : '⚠︎'}</span>
          <div>${c.situacao === 'BLOQUEADO'
            ? '<b>Cliente bloqueado.</b> Não tire pedido: ele será recusado quando o aparelho sincronizar.'
            : `<b>Crédito no limite.</b> Em aberto ${dinheiro(c.aberto)} de ${dinheiro(c.limite)}.`}
          </div></div>` : ''}

      <div class="cartao" style="margin-bottom:12px"><div class="cartao-corpo">
        <div class="dados-grade">
          <div class="dado"><div class="dado-rot">Contato</div><div class="dado-val">${esc(c.contato)}</div></div>
          <div class="dado"><div class="dado-rot">Telefone</div><div class="dado-val mono">${esc(c.fone)}</div></div>
          <div class="dado"><div class="dado-rot">Limite</div><div class="dado-val mono">${dinheiro(c.limite)}</div></div>
          <div class="dado"><div class="dado-rot">Em aberto</div><div class="dado-val mono">${dinheiro(c.aberto)}</div></div>
          <div class="dado"><div class="dado-rot">Último pedido</div><div class="dado-val">${data(c.ultimoPedido)}</div></div>
          <div class="dado"><div class="dado-rot">Comissão</div><div class="dado-val">${pct(c.comissao)}</div></div>
        </div>
        ${c.obsEntrega ? `<div class="aviso alerta" style="margin-top:14px"><span>🚚</span>
          <div><b>Entrega:</b> ${esc(c.obsEntrega)}</div></div>` : ''}
      </div></div>

      <div class="linha" style="gap:9px; margin-bottom:14px">
        <button class="bt-grande" onclick="CAMPO.ir('novaAmostra','${c.id}')">🧪 Pedir amostra</button>
        <button class="bt-grande contorno" onclick="U.toast('Novo orçamento — protótipo')">💼 Orçamento</button>
      </div>

      <div class="secao-tit">Pedidos — onde está cada um</div>
      ${peds.length ? peds.map(p => {
        const o = D.ordens.find(x => x.pedido === p.numero);
        return `<div class="cmp-item" onclick="CAMPO.ir('pedido', ${p.numero})">
          <div class="inicial" style="background:var(--papel-100); color:var(--papel-900)">📦</div>
          <div class="corpo">
            <div class="nome">Pedido ${p.numero} · ${dinheiro(p.valor)}</div>
            <div class="sub">${selo(p.status)}<span>entrega ${data(p.entrega)}</span>
              ${o ? `<span>O.F. ${o.numero}</span>` : ''}</div>
          </div><div class="seta">›</div></div>`;
      }).join('') : '<div class="vazio">Sem pedido em aberto</div>'}

      <div class="secao-tit">Amostras</div>
      ${amos.length ? amos.map(a => `
        <div class="cmp-item" onclick="CAMPO.ir('amostra', ${a.numero})">
          <div class="inicial" style="background:var(--alerta-fraco); color:#7a5307">🧪</div>
          <div class="corpo">
            <div class="nome">${a.numero} · ${esc(a.referencia)}</div>
            <div class="sub">${selo(a.status)}<span>emitida ${data(a.emissao)}</span>
              ${a.status === 'AGUARDANDO' ? `<span>${D.diasDesde(a.emissao)} dias esperando</span>` : ''}</div>
          </div><div class="seta">›</div></div>`).join('')
        : '<div class="vazio">Nenhuma amostra</div>'}

      <div class="secao-tit">Fichas técnicas do cliente</div>
      ${fts.map(f => `
        <div class="cmp-item" onclick="CAMPO.ir('ficha', ${f.numero})">
          <div class="inicial" style="background:var(--papel-100); color:var(--papel-900)">📐</div>
          <div class="corpo">
            <div class="nome">F.T. ${f.numero} · ${dinheiro(f.precoCaixa)}/cx</div>
            <div class="sub"><span>${esc(f.referencia)}</span></div>
            <div class="sub"><span class="mono">${f.C}×${f.L}×${f.A} mm</span>
              <span class="mono">${esc(f.estilo)}</span></div>
          </div><div class="seta">›</div></div>`).join('')}`;
  };

  Telas.pedidos = () => {
    titulo('Pedidos', 'posição em tempo quase real');
    const meus = D.pedidos.filter(dono);
    return `
      <div class="aviso info" style="margin-bottom:14px"><span>🔎</span><div>
        Esta é a tela que evita o telefonema para a fábrica. A posição vem do apontamento que o operador
        fez no tablet da máquina, e chega aqui na última sincronização.</div></div>
      ${meus.map(p => htmlPedido(p, false)).join('')}`;
  };

  Telas.pedido = (numero) => {
    const p = D.pedidos.find(x => x.numero === Number(numero));
    const c = D.cliente(p.clienteId);
    titulo(`Pedido ${p.numero}`, c.fantasia);
    return htmlPedido(p, true);
  };

  function htmlPedido(p, detalhe) {
    const c = D.cliente(p.clienteId);
    const o = D.ordens.find(x => x.pedido === p.numero);
    const prog = o && o.qtdPrevista ? Math.round(o.qtdProduzida / o.qtdPrevista * 100) : 0;

    const etapas = ['Pedido', 'Chapa', 'Impressão', 'Corte', 'Colagem', 'Conferência', 'Expedição'];
    const feitas = o ? 1 + (o.chapa.situacao === 'RECEBIDA' ? 1 : 0) +
      o.roteiro.filter(r => r.status === 'CONCLUIDA').length : 1;

    return `<div class="cartao" style="margin-bottom:12px">
      <div class="cartao-cab">
        <div><div class="dado-rot">Pedido</div>
          <div style="font-family:var(--mono); font-size:17px; font-weight:700">${p.numero}</div></div>
        ${selo(p.status)}
      </div>
      <div class="cartao-corpo">
        ${detalhe ? '' : `<div style="font-weight:650; margin-bottom:6px">${esc(c.fantasia)}</div>`}
        ${o && o.status === 'AGUARDANDO_CHAPA' ? `<div class="aviso erro" style="margin-bottom:12px">
          <span>⛔</span><div><b>Parado esperando chapa.</b>
          ${o.chapa.chegada ? `Chegada prevista ${data(o.chapa.chegada)}.`
            : 'Ainda em cotação, sem data. Avise o cliente antes que ele ligue.'}
          </div></div>` : ''}

        <div class="linha" style="gap:4px; margin-bottom:10px; flex-wrap:wrap">
          ${etapas.map((e, i) => `<span class="selo ${i < feitas ? 'ok' : ''}"
            style="font-size:10px">${i < feitas ? '✓ ' : ''}${esc(e)}</span>`).join('')}
        </div>

        <div class="barra ${prog >= 100 ? 'ok' : ''}"><i style="width:${prog}%"></i></div>
        <div class="mini t2" style="margin-top:5px">
          ${o ? `${num(o.qtdProduzida)} de ${num(o.qtdPrevista)} peças produzidas (${prog}%)`
             : 'ainda não entrou em produção'}
          · entrega ${data(p.entrega)}</div>

        ${detalhe ? p.itens.map(i => {
          const f = D.ficha(i.ft);
          return `<div style="margin-top:16px; padding-top:14px; border-top:1px solid var(--borda)">
            <div style="font-weight:650">F.T. ${f.numero} — ${esc(f.referencia)}</div>
            <div class="mini t2" style="margin-top:2px">
              ${num(i.qtd)} pç × ${dinheiro(i.preco)} = ${dinheiro(i.qtd * i.preco)}</div>
            <div class="secao-tit" style="margin:12px 0 6px">Entregas programadas</div>
            ${i.entregas.map(e => `<div class="entre" style="padding:8px 0; border-bottom:1px dashed var(--borda)">
              <div><div style="font-weight:600; font-size:13px">${data(e.data)}</div>
                <div class="micro t3">${e.nf ? 'NF ' + esc(e.nf) : 'sem nota'}</div></div>
              <div class="dir"><div class="mono mini">${num(e.prog)} pç</div>
                ${selo(e.situacao)}</div></div>`).join('')}`;
        }).join('') : ''}
      </div>
      ${detalhe ? '' : `<div class="cartao-pe" style="cursor:pointer"
        onclick="CAMPO.ir('pedido', ${p.numero})">ver entregas e detalhes ›</div>`}
    </div>`;
  }

  Telas.amostras = () => {
    titulo('Amostras', 'protocolo e assinatura do cliente');
    const meus = local.amostras.filter(dono).sort((a, b) => b.numero - a.numero);
    return `
      <div class="aviso info" style="margin-bottom:14px"><span>🖋</span><div>
        O cliente assina o protocolo <b>no aparelho, na hora</b> — com ou sem sinal. O número do protocolo
        sai de um bloco reservado para este tablet, então nunca colide com o do escritório.</div></div>

      ${meus.map(a => `
        <div class="cmp-item" onclick="CAMPO.ir('amostra', ${a.numero})">
          <div class="inicial" style="background:${a.status === 'APROVADO' ? 'var(--ok-fraco)'
            : a.status === 'REPROVADO' ? 'var(--erro-fraco)' : 'var(--alerta-fraco)'}">
            ${a.status === 'APROVADO' ? '✓' : a.status === 'REPROVADO' ? '✕' : '⏳'}</div>
          <div class="corpo">
            <div class="nome">${a.numero} · ${esc(D.cliente(a.clienteId).fantasia)}</div>
            <div class="sub"><span>${esc(a.referencia)}</span></div>
            <div class="sub">${selo(a.status)}
              ${a.status === 'AGUARDANDO'
                ? `<span>${D.diasDesde(a.emissao)} dias sem resposta</span>`
                : `<span>${data(a.dataStatus)}</span>`}
              ${a.assinaturaLocal ? '<span class="selo info">assinada no tablet</span>' : ''}</div>
          </div><div class="seta">›</div></div>`).join('')}

      <div class="secao-tit">Bloco de numeração deste aparelho</div>
      <div class="cartao"><div class="cartao-corpo">
        <div class="dados-grade">
          <div class="dado"><div class="dado-rot">Faixa</div>
            <div class="dado-val mono">${local.blocoAmostra.inicio} – ${local.blocoAmostra.fim}</div></div>
          <div class="dado"><div class="dado-rot">Próximo</div>
            <div class="dado-val mono">${local.blocoAmostra.proximo}</div></div>
          <div class="dado"><div class="dado-rot">Restam</div>
            <div class="dado-val mono">${local.blocoAmostra.fim - local.blocoAmostra.proximo + 1}</div></div>
        </div>
        <div class="aviso ok" style="margin-top:14px"><span>🔢</span><div>
          O bloco é reservado no banco com uma restrição que <b>impede sobreposição de faixas</b>.
          Por isso o protocolo pode ser numerado, impresso e assinado sem internet.</div></div>
      </div></div>`;
  };

  Telas.amostra = (numero) => {
    const a = local.amostras.find(x => x.numero === Number(numero));
    const c = D.cliente(a.clienteId);
    titulo(`Amostra ${a.numero}`, c.fantasia);

    return `
      <div class="doc-preview" style="margin-bottom:14px">
        <div class="cab"><h3>PROTOCOLO DE AMOSTRAS Nº ${a.numero}</h3>
          <div class="micro t2">EMBALAGENS MODELO · emitido em ${data(a.emissao)}</div></div>
        <div class="lin"><span>Cliente</span><span>${esc(c.razao)}</span></div>
        <div class="lin"><span>Referência</span><span>${esc(a.referencia)}</span></div>
        <div class="lin"><span>Estilo</span><span>${esc(a.estilo)} · ${esc(a.qualidade)}</span></div>
        <div class="lin"><span>Medida</span><span>${esc(a.medida)} mm</span></div>
        <div class="lin"><span>Quantidade</span><span>${a.qtd} peça(s)</span></div>
        <div class="lin"><span>Representante</span><span>${esc(a.repres)}</span></div>
        <div class="rodape">A aprovação desta amostra autoriza a produção em série com estas medidas,
          este material e esta impressão. Alterações posteriores geram nova amostra.</div>
      </div>

      ${a.assinaturaLocal ? `
        <div class="cartao" style="margin-bottom:14px">
          <div class="cartao-cab"><h3>Assinatura coletada</h3>${selo(a.status)}</div>
          <div class="cartao-corpo">
            <img src="${a.assinaturaLocal.imagem}" alt="assinatura"
              style="width:100%; max-height:150px; object-fit:contain; background:#fff">
            <div class="centro mini negrito">${esc(a.assinaturaLocal.nome)}</div>
            <div class="centro micro t3">${esc(a.assinaturaLocal.cargo)} · ${dataHora(a.assinaturaLocal.em)}</div>
            <div class="dados-grade" style="margin-top:14px">
              <div class="dado"><div class="dado-rot">Coletada</div>
                <div class="dado-val">${a.assinaturaLocal.online ? 'com sinal' : 'offline'}</div></div>
              <div class="dado"><div class="dado-rot">Hash</div>
                <div class="dado-val mono mini">${esc(a.assinaturaLocal.hash)}</div></div>
              <div class="dado"><div class="dado-rot">Envio</div>
                <div class="dado-val">${a.assinaturaLocal.enviada ? 'sincronizada' : 'na fila'}</div></div>
            </div>
          </div>
        </div>` : ''}

      ${a.status === 'AGUARDANDO' ? `
        <div class="secao-tit">Resposta do cliente</div>
        <div class="opcoes" id="opcoes">
          <div class="opcao ok" data-r="APROVADO"><div class="marca">✓</div>
            <div class="txt">Aprovado<small>libera a produção em série</small></div></div>
          <div class="opcao" data-r="APROVADO_COM_DESVIO"><div class="marca">✓</div>
            <div class="txt">Aprovado com desvio<small>o desvio aceito fica registrado na F.T.</small></div></div>
          <div class="opcao erro" data-r="REPROVADO"><div class="marca">✕</div>
            <div class="txt">Reprovado<small>exige motivo e gera nova amostra</small></div></div>
        </div>
        <button class="bt-grande" style="margin-top:14px" id="btAssinar" disabled>
          🖋 Coletar assinatura do cliente</button>`
      : `<button class="bt-grande contorno" onclick="U.toast('PDF do protocolo — protótipo')">
          ⤓ Baixar protocolo em PDF</button>`}`;
  };

  Telas.novaAmostra = (clienteId) => {
    const c = D.cliente(clienteId);
    titulo('Requisição de amostra', c.fantasia);
    return `
      <div class="aviso info" style="margin-bottom:14px"><span>📝</span><div>
        Preenchido na frente do cliente. Ganha o número ${local.blocoAmostra.proximo} do bloco deste
        aparelho e já pode ser assinado — mesmo sem sinal.</div></div>
      <div class="cartao"><div class="cartao-corpo">
        <div class="grade" style="gap:12px">
          <div class="campo"><label>Referência / o que é a caixa</label>
            <input id="nvRef" placeholder="CX MASTER 12 UNIDADES" value=""></div>
          <div class="grade g3" style="gap:10px">
            <div class="campo"><label>Compr. (mm)</label><input id="nvC" type="number" value="400"></div>
            <div class="campo"><label>Larg. (mm)</label><input id="nvL" type="number" value="300"></div>
            <div class="campo"><label>Alt. (mm)</label><input id="nvA" type="number" value="200"></div>
          </div>
          <div class="grade g2" style="gap:10px">
            <div class="campo"><label>Estilo</label><select id="nvEstilo">
              ${D.estilos.map(e => `<option value="${e.id}">${esc(e.id)} — ${esc(e.descricao)}</option>`).join('')}
            </select></div>
            <div class="campo"><label>Qualidade</label><select id="nvQual">
              ${D.qualidades.map(q => `<option value="${q.id}">${esc(q.id)} · ${esc(q.onda)} · ${num(q.gramatura)} g/m²</option>`).join('')}
            </select></div>
          </div>
          <div class="grade g2" style="gap:10px">
            <div class="campo"><label>Quantidade de amostras</label><input id="nvQtd" type="number" value="2" min="1"></div>
            <div class="campo"><label>Prazo prometido</label><input id="nvPrazo" type="date" value="2026-10-08"></div>
          </div>
          <div class="campo"><label>Observação para a engenharia</label>
            <textarea id="nvObs" rows="3" placeholder="Ex.: cliente precisa de furo de respiro"></textarea></div>
        </div>
        <button class="bt-grande" style="margin-top:16px" id="btCriarAmostra">
          🧪 Criar requisição ${local.blocoAmostra.proximo}</button>
      </div></div>`;
  };

  Telas.catalogo = () => {
    titulo('Catálogo', 'para mostrar ao cliente');
    return `
      <div class="aviso info" style="margin-bottom:14px"><span>📐</span><div>
        A mesma geometria que a fábrica usa, em formato de apresentação. O vendedor mostra o desenho,
        confirma medida e material, e a amostra já nasce certa.</div></div>
      ${D.fichas.filter(dono).map(f => `
        <div class="cartao" style="margin-bottom:12px" onclick="CAMPO.ir('ficha', ${f.numero})">
          <div class="cartao-cab">
            <div><div class="dado-rot">F.T. ${f.numero}</div>
              <div style="font-weight:650; font-size:14px">${esc(f.referencia)}</div></div>
            <div class="dir"><div class="mono negrito">${dinheiro(f.precoCaixa)}</div>
              <div class="micro t3">por caixa</div></div>
          </div>
          <div class="cartao-corpo" style="padding:10px; background:var(--papel-100)">
            ${CaixaSVG.desenhar(f.riscador, f.impressao, { largura: 420, cotas: false })}
          </div>
        </div>`).join('')}`;
  };

  Telas.ficha = (numero) => {
    const f = D.ficha(Number(numero));
    const c = D.cliente(f.clienteId);
    titulo(`F.T. ${f.numero}`, c.fantasia);
    return `
      <div class="cartao" style="margin-bottom:12px">
        <div class="cartao-corpo" style="padding:10px; background:var(--papel-100)">
          ${CaixaSVG.desenhar(f.riscador, f.impressao, { largura: 640 })}
        </div>
        <div class="cartao-pe">
          Plano de corte gerado pelas fórmulas do estilo ${esc(f.estilo)} — o mesmo desenho que vai para a máquina.
        </div>
      </div>

      <div class="cartao" style="margin-bottom:12px"><div class="cartao-corpo">
        <div style="font-weight:650; margin-bottom:10px">${esc(f.referencia)}</div>
        <div class="dados-grade">
          <div class="dado"><div class="dado-rot">Medida interna</div>
            <div class="dado-val mono">${f.C} × ${f.L} × ${f.A}</div></div>
          <div class="dado"><div class="dado-rot">Estilo</div><div class="dado-val mono">${esc(f.estilo)}</div></div>
          <div class="dado"><div class="dado-rot">Material</div>
            <div class="dado-val mono">${esc(f.qualidadeInterna)} ${esc(f.onda)}</div></div>
          <div class="dado"><div class="dado-rot">Gramatura</div>
            <div class="dado-val mono">${num(f.gramatura)} g/m²</div></div>
          <div class="dado"><div class="dado-rot">Peso da caixa</div>
            <div class="dado-val mono">${dec(f.pesoG)} g</div></div>
          <div class="dado"><div class="dado-rot">Amarrado</div>
            <div class="dado-val mono">${num(f.amarrado)} pç</div></div>
          <div class="dado"><div class="dado-rot">Preço / caixa</div>
            <div class="dado-val mono negrito">${dinheiro(f.precoCaixa)}</div></div>
          <div class="dado"><div class="dado-rot">Impressão</div>
            <div class="dado-val">${esc(f.cores || 'sem impressão')}</div></div>
        </div>
      </div></div>

      <button class="bt-grande" onclick="CAMPO.ir('novaAmostra','${f.clienteId}')">
        🧪 Pedir amostra desta caixa</button>`;
  };

  Telas.sinc = () => {
    titulo('Sincronização', 'o que ainda não subiu');
    const pend = fila.itens;
    return `
      <div class="cartao" style="margin-bottom:14px"><div class="cartao-corpo">
        <div class="dados-grade">
          <div class="dado"><div class="dado-rot">Estado</div>
            <div class="dado-val">${fila.online ? 'Conectado' : 'Sem conexão'}</div></div>
          <div class="dado"><div class="dado-rot">Última sincronização</div>
            <div class="dado-val">${dataHora(isoLocal(local.ultimaSinc))}</div></div>
          <div class="dado"><div class="dado-rot">Na fila</div>
            <div class="dado-val">${pend.length}</div></div>
          <div class="dado"><div class="dado-rot">Assinaturas</div>
            <div class="dado-val">${local.assinaturas.length}</div></div>
        </div>
      </div></div>

      <div class="secao-tit">Fila de envio</div>
      ${pend.length ? pend.map(i => `
        <div class="cmp-item" style="cursor:default">
          <div class="inicial" style="background:var(--alerta-fraco); color:#7a5307">↑</div>
          <div class="corpo"><div class="nome" style="white-space:normal">${esc(i.descricao)}</div>
            <div class="sub"><span>criado ${i.em.toLocaleTimeString('pt-BR')}</span>
              <span>aguardando sinal</span></div></div>
        </div>`).join('')
      : `<div class="aviso ok"><span>✓</span><div>Nada pendente. Tudo o que foi feito neste aparelho
         já está no nó da fábrica.</div></div>`}

      <div class="secao-tit">Como funciona</div>
      <div class="cartao"><div class="cartao-corpo" style="font-size:13px; line-height:1.65">
        <p>O aparelho <b>nunca conversa direto com o servidor da fábrica</b>. Ele fala com um nó em nuvem,
        e é a fábrica que abre a conexão de dentro para fora. Não existe porta aberta para a internet nem
        VPN para o vendedor configurar.</p>
        <p>Cada operação feita aqui sobe como <b>intenção de negócio</b> ("aprovar amostra 30801"), não como
        linha de tabela. Reenviar a mesma intenção duas vezes não duplica nada, porque ela carrega uma
        chave de idempotência.</p>
        <p style="margin:0">Cadastro, preço e posição de pedido <b>só descem</b>. Quem manda neles é a
        fábrica, e é por isso que praticamente não existe conflito para resolver.</p>
      </div></div>

      <button class="bt-grande ${fila.online ? '' : 'contorno'}" style="margin-top:14px"
        onclick="CAMPO.sincronizar()" ${fila.online ? '' : 'disabled'}>🔄 Sincronizar agora</button>`;
  };

  /* ---------------------------------------------------------------- assinatura */
  function telaAssinatura(amostra, resposta) {
    const c = D.cliente(amostra.clienteId);
    const m = modal({
      titulo: 'Assinatura do cliente', largura: '560px',
      corpo: `
        <div class="aviso ${resposta === 'REPROVADO' ? 'erro' : 'ok'}" style="margin-bottom:14px">
          <span>${resposta === 'REPROVADO' ? '✕' : '✓'}</span>
          <div>Amostra <b>${amostra.numero}</b> — ${esc(rot(resposta))}<br>
          <span class="mini">${esc(amostra.referencia)}</span></div></div>

        <div class="grade g2" style="gap:10px; margin-bottom:12px">
          <div class="campo"><label>Quem assina</label>
            <input id="asNome" placeholder="Nome completo" value="${esc(c.contato)}"></div>
          <div class="campo"><label>Cargo</label>
            <input id="asCargo" placeholder="Cargo" value="Comprador"></div>
        </div>
        ${resposta === 'REPROVADO' ? `
          <div class="campo" style="margin-bottom:12px"><label>Motivo da reprovação</label>
            <input id="asMotivo" placeholder="Ex.: cor fora do Pantone aprovado"></div>` : ''}

        <div class="assin-area" id="areaAssin">
          <canvas id="cvAssin"></canvas>
          <div class="assin-linha"></div>
          <div class="assin-dica">assine com o dedo ou a caneta</div>
        </div>
        <div class="entre" style="margin-top:10px">
          <button class="bt mini" id="btLimpar">↺ Limpar</button>
          <span class="mini t3">${fila.online ? 'com sinal' : 'offline — será enviada depois'}</span>
        </div>`,
      acoes: [
        { rotulo: 'Cancelar', classe: 'bt' },
        { rotulo: 'Confirmar assinatura', classe: 'bt primario', acao: () => confirmar() }
      ]
    });

    const cv = m.corpo.querySelector('#cvAssin');
    const area = m.corpo.querySelector('#areaAssin');
    const ctx = cv.getContext('2d');
    let desenhou = false, desenhando = false;

    /* Canvas em pixels reais do aparelho: assinatura fina não pode sair serrilhada. */
    function dimensionar() {
      const r = cv.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const imagem = desenhou ? ctx.getImageData(0, 0, cv.width, cv.height) : null;
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1b2333';
      if (imagem) ctx.putImageData(imagem, 0, 0);
    }
    requestAnimationFrame(dimensionar);

    const ponto = (ev) => {
      const r = cv.getBoundingClientRect();
      return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    };

    cv.addEventListener('pointerdown', ev => {
      cv.setPointerCapture(ev.pointerId);
      desenhando = true;
      const p = ponto(ev);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ev.preventDefault();
    });
    cv.addEventListener('pointermove', ev => {
      if (!desenhando) return;
      const p = ponto(ev);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      if (!desenhou) { desenhou = true; area.classList.add('assinada'); }
      ev.preventDefault();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(e =>
      cv.addEventListener(e, () => { desenhando = false; }));

    m.corpo.querySelector('#btLimpar').addEventListener('click', () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      desenhou = false;
      area.classList.remove('assinada');
    });

    function confirmar() {
      const nome = m.corpo.querySelector('#asNome').value.trim();
      const cargo = m.corpo.querySelector('#asCargo').value.trim();
      const motivo = m.corpo.querySelector('#asMotivo')?.value.trim();
      if (!desenhou) { toast('O cliente precisa assinar na área indicada', 'alerta'); return false; }
      if (!nome) { toast('Informe quem está assinando', 'alerta'); return false; }
      if (resposta === 'REPROVADO' && !motivo) { toast('Reprovação exige motivo', 'alerta'); return false; }

      const imagem = cv.toDataURL('image/png');
      const assinatura = {
        nome, cargo, imagem, em: isoLocal(new Date()), online: fila.online,
        hash: hashCurto(imagem + nome + amostra.numero), enviada: fila.online
      };
      amostra.assinaturaLocal = assinatura;
      amostra.status = resposta;
      amostra.dataStatus = isoLocal(new Date()).slice(0, 10);
      amostra.assinadoPor = nome;
      amostra.cargo = cargo;
      if (motivo) amostra.motivo = motivo;
      local.assinaturas.push({ amostra: amostra.numero, ...assinatura });

      fila.enfileirar(`Amostra ${amostra.numero} ${rot(resposta).toLowerCase()} e assinada por ${nome}`);
      toast(fila.online ? 'Assinatura registrada e enviada' : 'Assinatura guardada no aparelho', 'ok');
      render();
    }
  }

  /* Hash curto só para a demonstração visual da cadeia de evidência. */
  function hashCurto(texto) {
    let h = 0x811c9dc5;
    for (let i = 0; i < texto.length; i++) {
      h ^= texto.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0').replace(/(.{4})/, '$1…');
  }

  /* ---------------------------------------------------------------- ações */
  window.CAMPO.sincronizar = () => {
    if (!fila.online) return toast('Sem conexão. A fila sobe sozinha quando houver sinal.', 'alerta');
    local.ultimaSinc = new Date();
    local.assinaturas.forEach(a => a.enviada = true);
    local.amostras.forEach(a => { if (a.assinaturaLocal) a.assinaturaLocal.enviada = true; });
    fila.drenar();
    render();
    toast('Sincronizado com o nó da fábrica', 'ok');
  };

  /* ---------------------------------------------------------------- render */
  function render() {
    const tela = Telas[estado.tela] || Telas.carteira;
    $('#corpo').innerHTML = tela(estado.param);
    $('#corpo').scrollTop = 0;
    pintarBarra();
    pintarMenu();
    ligarTela();
  }

  /* Liga o comportamento das telas que têm interação de verdade. */
  function ligarTela() {
    if (estado.tela === 'amostra') {
      const a = local.amostras.find(x => x.numero === Number(estado.param));
      const caixa = $('#opcoes');
      if (!caixa) return;
      let escolha = null;
      caixa.addEventListener('click', e => {
        const o = e.target.closest('.opcao');
        if (!o) return;
        caixa.querySelectorAll('.opcao').forEach(x => x.classList.toggle('escolhida', x === o));
        escolha = o.dataset.r;
        $('#btAssinar').disabled = false;
      });
      $('#btAssinar').addEventListener('click', () => telaAssinatura(a, escolha));
    }

    if (estado.tela === 'novaAmostra') {
      $('#btCriarAmostra').addEventListener('click', () => {
        const ref = $('#nvRef').value.trim();
        if (!ref) return toast('Descreva a referência da caixa', 'alerta');
        const nova = {
          numero: local.blocoAmostra.proximo,
          clienteId: estado.param,
          ft: null,
          referencia: ref.toUpperCase(),
          estilo: $('#nvEstilo').value,
          qualidade: $('#nvQual').value,
          medida: `${$('#nvC').value} x ${$('#nvL').value} x ${$('#nvA').value}`,
          qtd: Number($('#nvQtd').value || 1),
          emissao: isoLocal(new Date()).slice(0, 10),
          status: 'AGUARDANDO',
          dataStatus: null,
          repres: VENDEDOR,
          obs: $('#nvObs').value.trim()
        };
        local.amostras.unshift(nova);
        local.blocoAmostra.proximo++;
        fila.enfileirar(`Requisição de amostra ${nova.numero} para ${D.cliente(nova.clienteId).fantasia}`);
        toast(`Amostra ${nova.numero} criada${fila.online ? '' : ' offline'}`, 'ok');
        ir('amostra', nova.numero);
      });
    }
  }

  /* ================================================================ boot */
  $('#btVoltar').addEventListener('click', voltar);
  document.body.insertAdjacentHTML('afterbegin', U.faixaProto('Tablet do vendedor · offline-first'));
  render();
})();
