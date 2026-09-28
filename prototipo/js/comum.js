/* Utilidades compartilhadas pelos quatro dispositivos do protótipo. */

const U = (() => {

  /* ---------------------------------------------------------------- DOM */
  const $  = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

  /** Escapa texto para interpolar em HTML sem risco. */
  const esc = (v) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const el = (tag, attrs = {}, html = '') => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    if (html) n.innerHTML = html;
    return n;
  };

  /* ---------------------------------------------------------------- formato */
  const nf = new Intl.NumberFormat('pt-BR');
  const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nf3 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  const num = (v) => v == null ? '—' : nf.format(v);
  const dec = (v) => v == null ? '—' : nf2.format(v);
  const dec3 = (v) => v == null ? '—' : nf3.format(v);
  const dinheiro = (v) => v == null ? '—' : 'R$ ' + nf2.format(v);
  const mm = (v) => v == null ? '—' : nf.format(v) + ' mm';
  const pct = (v) => v == null ? '—' : nf2.format(v).replace(',00', '') + '%';

  const data = (iso) => {
    if (!iso) return '—';
    const [a, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
  };
  const dataHora = (iso) => {
    if (!iso) return '—';
    const [dt, hr] = iso.split('T');
    return data(dt) + (hr ? ' ' + hr.slice(0, 5) : '');
  };
  const hhmm = (minutos) => {
    if (minutos == null) return '—';
    const h = Math.floor(minutos / 60), m = Math.round(minutos % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };
  const hhmmss = (segundos) => {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = Math.floor(segundos % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const iniciais = (nome) => String(nome || '?').trim().split(/\s+/)
    .slice(0, 2).map(p => p[0]).join('').toUpperCase();

  /* ---------------------------------------------------------- rótulos e cores */
  const ROTULOS = {
    // situação de cliente
    TOP: 'Cliente Top', ATIVO: 'Ativo', EM_ANALISE: 'Em análise', BLOQUEADO: 'Bloqueado', INATIVO: 'Inativo',
    // F.T.
    PRODUTO_FINAL: 'Produto final', AGUARDANDO_AMOSTRA: 'Aguardando amostra',
    EM_DESENVOLVIMENTO: 'Em desenvolvimento', SUSPENSA: 'Suspensa',
    // amostra
    AGUARDANDO: 'Aguardando', APROVADO: 'Aprovado', APROVADO_COM_DESVIO: 'Aprovado com desvio', REPROVADO: 'Reprovado',
    // pedido / OF / FS
    RASCUNHO: 'Rascunho', ENVIADO: 'Enviado', EM_NEGOCIACAO: 'Em negociação', CONVERTIDO: 'Convertido',
    EXPIRADO: 'Expirado', RECUSADO: 'Recusado',
    AGUARDANDO_APROVACAO: 'Aguardando aprovação', APROVADO_PEDIDO: 'Aprovado',
    EM_PRODUCAO: 'Em produção', PARCIALMENTE_FATURADO: 'Parcial. faturado', FATURADO: 'Faturado',
    ENTREGUE: 'Entregue', CANCELADO: 'Cancelado',
    AGUARDANDO_CHAPA: 'Aguardando chapa', AGUARDANDO_FERRAMENTAL: 'Aguardando ferramental',
    LIBERADA: 'Liberada', CONCLUIDA: 'Concluída', PARADA: 'Parada', PAUSADA: 'Pausada',
    EM_SETUP: 'Em setup', PROGRAMADA: 'Programada', PRONTA: 'Pronta',
    // chapa
    PENDENTE: 'Pendente', RESERVADA_ESTOQUE: 'Reservada em estoque', EM_COTACAO: 'Em cotação',
    COMPRADA: 'Comprada', RECEBIDA: 'Recebida', PARCIALMENTE_RECEBIDA: 'Parcial. recebida',
    // máquina
    DISPONIVEL: 'Disponível', EM_USO: 'Em uso', MANUTENCAO: 'Manutenção', DESATIVADA: 'Desativada',
    // título / NF
    ABERTA: 'Aberta', PAGA: 'Paga', VENCIDA: 'Vencida', AUTORIZADA: 'Autorizada', EM_DIGITACAO: 'Em digitação',
    // volume
    RESERVADO: 'Reservado', MONTAGEM: 'Montagem',
    // operação
    IMPRESSAO: 'Impressão', RISCADOR: 'Riscador', CORTE_VINCO: 'Corte e vinco', COLAGEM: 'Colagem',
    GRAMPO: 'Grampo', REFILE: 'Refile', CONFERENCIA: 'Conferência', EXPEDICAO: 'Expedição',
    MONTAGEM_OP: 'Montagem',
    // diversos
    COLA: 'Cola', INTERNA: 'Interna', EXTERNA: 'Externa', SEM_ORELHA: 'Sem orelha',
    SEM_FECHAMENTO: 'Sem fechamento', NORMAL: 'Normal', KANBAN: 'Kanban',
    CAIXA: 'Caixa', ACESSORIO: 'Acessório'
  };

  const TOM = {
    TOP: 'ok', ATIVO: 'ok', EM_ANALISE: 'alerta', BLOQUEADO: 'erro', INATIVO: '',
    PRODUTO_FINAL: 'ok', AGUARDANDO_AMOSTRA: 'alerta', EM_DESENVOLVIMENTO: 'info', SUSPENSA: 'erro',
    AGUARDANDO: 'alerta', APROVADO: 'ok', APROVADO_COM_DESVIO: 'alerta', REPROVADO: 'erro',
    RASCUNHO: '', ENVIADO: 'info', EM_NEGOCIACAO: 'alerta', CONVERTIDO: 'ok', EXPIRADO: 'erro', RECUSADO: 'erro',
    EM_PRODUCAO: 'info', PARCIALMENTE_FATURADO: 'alerta', FATURADO: 'ok', ENTREGUE: 'ok', CANCELADO: 'erro',
    AGUARDANDO_CHAPA: 'erro', AGUARDANDO_FERRAMENTAL: 'erro', LIBERADA: 'info', CONCLUIDA: 'ok',
    PARADA: 'erro', PAUSADA: 'alerta', EM_SETUP: 'alerta', PROGRAMADA: '', PRONTA: 'ok',
    PENDENTE: 'alerta', RESERVADA_ESTOQUE: 'info', EM_COTACAO: 'alerta', COMPRADA: 'info',
    RECEBIDA: 'ok', PARCIALMENTE_RECEBIDA: 'alerta',
    DISPONIVEL: 'ok', EM_USO: 'info', MANUTENCAO: 'erro', DESATIVADA: '',
    ABERTA: 'info', PAGA: 'ok', VENCIDA: 'erro', AUTORIZADA: 'ok', EM_DIGITACAO: 'alerta',
    RESERVADO: 'alerta', MONTAGEM: 'info'
  };

  const rot = (chave) => ROTULOS[chave] || String(chave || '—').replace(/_/g, ' ').toLowerCase()
    .replace(/^./, c => c.toUpperCase());

  const selo = (chave, extra = '') => {
    const tom = TOM[chave] ?? '';
    return `<span class="selo ${tom} ${extra}"><i class="ponto"></i>${esc(rot(chave))}</span>`;
  };

  /* ---------------------------------------------------------------- toast */
  function toast(mensagem, tom = '') {
    let caixa = $('#toasts');
    if (!caixa) { caixa = el('div', { id: 'toasts' }); document.body.appendChild(caixa); }
    const t = el('div', { class: `toast ${tom}` }, esc(mensagem));
    caixa.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 2600);
    setTimeout(() => t.remove(), 3000);
  }

  /* ---------------------------------------------------------------- modal */
  function modal({ titulo, corpo, acoes = [], largura = '620px', fabrica = false }) {
    const cortina = el('div', { class: fabrica ? 'fab-cortina' : 'cortina' });
    const cx = el('div', { class: fabrica ? 'fab-modal' : 'modal' });
    cx.style.maxWidth = largura;

    const cab = el('div', { class: fabrica ? 'fab-modal-cab' : 'modal-cab' });
    cab.innerHTML = `<h2>${esc(titulo)}</h2>`;
    const fechar = el('button', { class: fabrica ? 'bt fantasma' : 'bt fantasma', type: 'button' }, '✕');
    fechar.style.fontSize = '17px';
    fechar.onclick = () => cortina.remove();
    cab.appendChild(fechar);

    const corp = el('div', { class: fabrica ? 'fab-modal-corpo' : 'modal-corpo' });
    if (typeof corpo === 'string') corp.innerHTML = corpo; else corp.appendChild(corpo);

    const pe = el('div', { class: fabrica ? 'fab-modal-pe' : 'modal-pe' });
    acoes.forEach(a => {
      const b = el('button', { class: a.classe || (fabrica ? 'bt-fab' : 'bt'), type: 'button' },
        a.rotulo);
      b.onclick = () => { const r = a.acao?.(corp); if (r !== false) cortina.remove(); };
      pe.appendChild(b);
    });

    cx.append(cab, corp);
    if (acoes.length) cx.appendChild(pe);
    cortina.appendChild(cx);
    cortina.addEventListener('click', e => { if (e.target === cortina) cortina.remove(); });
    document.body.appendChild(cortina);
    return { cortina, corpo: corp, fechar: () => cortina.remove() };
  }

  /* ---------------------------------------------------------------- faixa de protótipo */
  function faixaProto(contexto) {
    return `<div class="faixa-proto">
      <span>⚠︎ <b>PROTÓTIPO NAVEGÁVEL</b> — dados fictícios, nenhuma gravação real.</span>
      <span class="t3" style="opacity:.6">${esc(contexto || '')}</span>
      <a href="index.html">trocar de dispositivo</a>
    </div>`;
  }

  /* ------------------------------------------- fila offline (simulada, mas real na UI) */
  function criarFila(aoMudar) {
    let itens = [];
    let online = true;
    const notificar = () => aoMudar?.({ pendentes: itens.length, online, itens: [...itens] });
    return {
      get online() { return online; },
      get pendentes() { return itens.length; },
      get itens() { return [...itens]; },
      definirOnline(v) {
        online = v;
        notificar();
        if (v && itens.length) this.drenar();
      },
      enfileirar(descricao) {
        itens.push({ id: crypto.randomUUID?.() || String(Math.random()), descricao, em: new Date() });
        notificar();
        if (online) setTimeout(() => this.drenar(), 700);
      },
      drenar() {
        if (!online || !itens.length) return;
        const enviados = itens.length;
        itens = [];
        notificar();
        toast(`${enviados} ${enviados === 1 ? 'operação sincronizada' : 'operações sincronizadas'}`, 'ok');
      }
    };
  }

  return {
    $, $$, el, esc, num, dec, dec3, dinheiro, mm, pct, data, dataHora, hhmm, hhmmss,
    iniciais, rot, selo, ROTULOS, TOM, toast, modal, faixaProto, criarFila
  };
})();
