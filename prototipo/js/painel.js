/* Painel de fábrica. Nenhuma interação: é uma TV na parede.
   Tudo aqui é consequência do apontamento feito nos tablets — nada é digitado à parte. */

(() => {
  const { $, esc, num, dec, hhmm, rot } = U;
  const D = Dados;

  const META_TURNO = 60000;      // peças boas previstas para o turno

  const pecasTurno = () => D.fichasServico.reduce((s, f) => s + f.qtdProduzida, 0);
  const refugoTurno = () => D.fichasServico.reduce((s, f) => s + f.refugo, 0);

  function oeeDe(m) {
    const o = D.oee.find(x => x.maquinaId === m.id);
    if (!o || !o.disp) return null;
    return { ...o, total: Math.round(o.disp * o.perf * o.qual / 10000) };
  }

  function estadoPosto(m) {
    if (m.situacao === 'MANUTENCAO') return { classe: 'manutencao', txt: 'Manutenção' };
    const fs = D.fichasServico.find(f => f.maquinaId === m.id && f.status === 'EM_PRODUCAO');
    if (fs) return { classe: 'producao', txt: 'Produzindo', fs };
    const espera = D.fichasServico.find(f => f.maquinaId === m.id && f.status === 'AGUARDANDO');
    if (espera && espera.travaChapa) return { classe: 'parada', txt: 'Sem chapa', fs: espera };
    if (espera) return { classe: 'setup', txt: 'Aguardando', fs: espera };
    return { classe: 'livre', txt: 'Livre' };
  }

  function render() {
    const pecas = pecasTurno(), refugo = refugoTurno();
    const atingido = Math.round(pecas / META_TURNO * 100);
    const travadas = D.ordens.filter(o => o.status === 'AGUARDANDO_CHAPA');
    const oees = D.maquinas.map(oeeDe).filter(Boolean);
    const oeeMedio = oees.length ? Math.round(oees.reduce((s, o) => s + o.total, 0) / oees.length) : 0;
    const refugoPct = pecas ? refugo / pecas * 100 : 0;

    $('#pnlCorpo').innerHTML = `
      <div class="pnl-metas">
        <div class="pnl-meta ${atingido >= 90 ? 'ok' : atingido >= 70 ? 'alerta' : 'erro'}">
          <div class="rot">Peças boas no turno</div>
          <div class="val">${num(pecas)}</div>
          <div class="sub">${atingido}% da meta de ${num(META_TURNO)}</div>
        </div>
        <div class="pnl-meta ${refugoPct <= 1 ? 'ok' : refugoPct <= 2 ? 'alerta' : 'erro'}">
          <div class="rot">Refugo</div>
          <div class="val">${dec(refugoPct)}%</div>
          <div class="sub">${num(refugo)} peças</div>
        </div>
        <div class="pnl-meta ${oeeMedio >= 75 ? 'ok' : oeeMedio >= 60 ? 'alerta' : 'erro'}">
          <div class="rot">OEE médio</div>
          <div class="val">${oeeMedio}%</div>
          <div class="sub">${oees.length} máquinas ativas</div>
        </div>
        <div class="pnl-meta ${travadas.length ? 'erro' : 'ok'}">
          <div class="rot">O.F. sem chapa</div>
          <div class="val">${travadas.length}</div>
          <div class="sub">${travadas.length ? 'não podem iniciar' : 'material em dia'}</div>
        </div>
        <div class="pnl-meta info">
          <div class="rot">Entregas de hoje</div>
          <div class="val">${D.pedidos.filter(p => p.itens.some(i =>
            i.entregas.some(e => e.situacao === 'PRONTA' || e.situacao === 'EM_PRODUCAO'))).length}</div>
          <div class="sub">carga 3188 em montagem</div>
        </div>
      </div>

      <div class="pnl-colunas">
        <div class="pnl-bloco">
          <div class="pnl-bloco-cab"><span>Postos de trabalho</span>
            <span>${D.maquinas.filter(m => estadoPosto(m).classe === 'producao').length} produzindo</span></div>
          <div class="pnl-bloco-corpo">
            ${D.maquinas.map(m => {
              const e = estadoPosto(m);
              const fs = e.fs;
              const p = fs && fs.qtdPrevista ? Math.round(fs.qtdProduzida / fs.qtdPrevista * 100) : 0;
              const tom = e.classe === 'parada' || e.classe === 'manutencao' ? 'erro'
                        : e.classe === 'producao' ? 'ok' : 'alerta';
              return `<div class="pnl-posto">
                <div>
                  <div class="nome">${esc(m.nome)}</div>
                  <div class="fs">${fs
                    ? `FS ${fs.numero} · ${esc(D.cliente(fs.clienteId).fantasia)} · ${esc(D.ficha(fs.ft).referencia.slice(0, 40))}`
                    : 'sem ficha de serviço aberta'}</div>
                  <div class="pnl-barra ${tom}" style="margin-top:7px"><i style="width:${p}%"></i></div>
                </div>
                <div class="qtd">${fs ? num(fs.qtdProduzida) : '—'}
                  <small>${fs ? 'de ' + num(fs.qtdPrevista) + ' pç' : ''}</small></div>
                <span class="pnl-estado ${e.classe}"><i class="ponto"></i>${esc(e.txt)}</span>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="pnl-bloco">
          <div class="pnl-bloco-cab"><span>OEE por máquina</span><span>hoje</span></div>
          <div class="pnl-bloco-corpo">
            ${D.maquinas.map(m => {
              const o = oeeDe(m);
              if (!o) return '';
              const tom = o.total >= 75 ? 'ok' : o.total >= 60 ? 'alerta' : 'erro';
              return `<div class="oee-linha">
                <div class="oee-nome">${esc(m.nome)}<small>${esc(rot(m.tipo))}</small></div>
                <div class="oee-pilha">
                  ${[['Disp', o.disp], ['Perf', o.perf], ['Qual', o.qual]].map(([r, v]) => `
                    <div><div class="rot">${r}</div>
                      <div class="pnl-barra ${v >= 85 ? 'ok' : v >= 70 ? 'alerta' : 'erro'}">
                        <i style="width:${v}%"></i></div>
                      <div class="rot" style="margin:3px 0 0; color:#a7b5cc">${dec(v)}%</div></div>`).join('')}
                </div>
                <div class="oee-total ${tom}">${o.total}%</div>
              </div>`;
            }).join('')}

            <div class="pnl-bloco-cab" style="margin:16px -20px 0; padding-left:20px; padding-right:20px;
                 border-top:2px solid #222d40; border-bottom:none">Precisa de decisão</div>
            ${alertas().map(a => `
              <div class="pnl-alerta">
                <span class="ic">${a.ic}</span>
                <div class="txt">${esc(a.txt)}<small>${esc(a.sub)}</small></div>
              </div>`).join('')}
          </div>
        </div>
      </div>`;

    $('#pnlRodape').innerHTML = [
      ['Coladeira 01', 'em manutenção desde 07:40'],
      ['O.F. 40250', 'chapa NCC60BC ainda em cotação'],
      ['Amostras', `${D.amostras.filter(a => a.status === 'AGUARDANDO').length} aguardando resposta do cliente`],
      ['Carga 3188', 'Rodoexpresso · saída prevista amanhã'],
      ['Sincronização', 'nuvem em dia · nenhum tablet atrasado']
    ].map(([k, v]) => `<div class="item"><b>${esc(k)}</b> ${esc(v)}</div>`).join('');
  }

  /* O painel não lista tudo: lista o que exige alguém levantar da cadeira. */
  function alertas() {
    const lista = [];

    D.ordens.filter(o => o.status === 'AGUARDANDO_CHAPA').forEach(o => lista.push({
      ic: '⛔',
      txt: `O.F. ${o.numero} travada por falta de chapa`,
      sub: o.chapa.chegada
        ? `${esc(o.chapa.fornecedor)} · chegada ${o.chapa.chegada.split('-').reverse().join('/')}`
        : 'ainda em cotação — sem data de chegada'
    }));

    D.maquinas.filter(m => m.situacao === 'MANUTENCAO').forEach(m => lista.push({
      ic: '🔧', txt: `${m.nome} parada para manutenção`,
      sub: `carga desviada para a outra coladeira · ${num(m.capacidadeHora)} pç/h fora do ar`
    }));

    const antigas = D.amostras.filter(a => a.status === 'AGUARDANDO' && D.diasDesde(a.emissao) > 60);
    if (antigas.length) lista.push({
      ic: '🧪', txt: `${antigas.length} amostra(s) há mais de 60 dias sem resposta`,
      sub: 'a mais antiga é a ' + antigas.sort((a, b) => a.numero - b.numero)[0].numero
    });

    const setupLongo = D.fichasServico.filter(f => f.tempoSetupMin > 45);
    if (setupLongo.length) lista.push({
      ic: '⏱', txt: `Setup acima de 45 min na FS ${setupLongo[0].numero}`,
      sub: `${hhmm(setupLongo[0].tempoSetupMin)} de acerto em ${esc(D.maquina(setupLongo[0].maquinaId).nome)}`
    });

    return lista;
  }

  function relogio() {
    const d = new Date();
    $('#pnlHora').textContent = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    $('#pnlData').textContent = d.toLocaleDateString('pt-BR',
      { weekday: 'long', day: '2-digit', month: 'long' });
  }

  document.body.insertAdjacentHTML('afterbegin', U.faixaProto('Painel de fábrica · leitura a 5 metros'));
  relogio();
  render();
  setInterval(relogio, 1000);
  setInterval(render, 20000);
})();
