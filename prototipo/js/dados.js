/* Dados de demonstração.
   A geometria, os estilos e as medidas vêm dos prints reais do PcBoot coletados no
   levantamento (F.T. 92281, estilo 0201-B, riscador 122/116/122 = 360,
   impressão 30/463/243/463/241 = 1440, protocolo de amostra 30063).
   Isso deixa o protótipo reconhecível para quem usa o sistema hoje.

   Razões sociais, nomes fantasia, CNPJ, telefones e nomes de pessoas são FICTÍCIOS:
   foram anonimizados porque este repositório é público. O que permanece fiel ao legado
   é o vocabulário de fábrica e os números de geometria, que não identificam ninguém.

   NÃO é dado de produção: é amostra pequena, congelada, para navegação. */

const Dados = (() => {

  /* ---------------------------------------------------------------- estilos */
  const estilos = [
    {
      id: '0201-B', fefco: '0201', onda: 'B',
      descricao: '0201 MALETA ONDA NORMAL INTEIRA',
      limites: { minImpressora: 50, maxImpressora: 2650, minRiscador: 50, maxRiscador: 2650, larguraFolha: 1600, numeroPorImpressao: 1 },
      /* Estas expressões reproduzem exatamente o riscador 122/116/122 = 360 e a
         impressão 30/463/243/463/241 = 1440 gravados na F.T. 92281 do PcBoot. */
      slots: {
        LARGURA: [
          { sequencia: 1, expressao: '(L/2)+2' },
          { sequencia: 2, expressao: 'A+6' },
          { sequencia: 3, expressao: '(L/2)+2' }
        ],
        COMPRIMENTO: [
          { sequencia: 1, expressao: '30' },
          { sequencia: 2, expressao: 'C+3' },
          { sequencia: 3, expressao: 'L+3' },
          { sequencia: 4, expressao: 'C+3' },
          { sequencia: 5, expressao: 'L+1' }
        ]
      }
    },
    {
      id: '0201-C', fefco: '0201', onda: 'C',
      descricao: '0201 MALETA ONDA C INTEIRA',
      limites: { minImpressora: 50, maxImpressora: 2650, minRiscador: 50, maxRiscador: 2650, larguraFolha: 1600, numeroPorImpressao: 1 },
      slots: {
        LARGURA: [
          { sequencia: 1, expressao: '(L/2)+3' },
          { sequencia: 2, expressao: 'A+8' },
          { sequencia: 3, expressao: '(L/2)+3' }
        ],
        COMPRIMENTO: [
          { sequencia: 1, expressao: '30' },
          { sequencia: 2, expressao: 'C+4' },
          { sequencia: 3, expressao: 'L+4' },
          { sequencia: 4, expressao: 'C+4' },
          { sequencia: 5, expressao: 'L+2' }
        ]
      }
    },
    {
      id: '0427', fefco: '0427', onda: 'C',
      descricao: '0427 CAIXA COLADA TIPO BANDEJA',
      limites: { minImpressora: 50, maxImpressora: 2650, minRiscador: 50, maxRiscador: 2200, larguraFolha: 1600, numeroPorImpressao: 1 },
      slots: {
        LARGURA: [
          { sequencia: 1, expressao: 'A+6' },
          { sequencia: 2, expressao: 'L+6' },
          { sequencia: 3, expressao: 'A+6' }
        ],
        COMPRIMENTO: [
          { sequencia: 1, expressao: 'A+6' },
          { sequencia: 2, expressao: 'C+6' },
          { sequencia: 3, expressao: 'A+6' },
          { sequencia: 4, expressao: '40' }
        ]
      }
    },
    {
      id: '0930-B', fefco: '0930', onda: 'B',
      descricao: '0930 DIVISORIA 4 CORTES',
      limites: { minImpressora: 50, maxImpressora: 2650, minRiscador: 50, maxRiscador: 2650, larguraFolha: 1600, numeroPorImpressao: 1 },
      slots: {
        LARGURA: [{ sequencia: 1, expressao: 'A' }],
        COMPRIMENTO: [
          { sequencia: 1, expressao: '(C/2)+0.5' },
          { sequencia: 2, expressao: '(C/2)+0.5' },
          { sequencia: 3, expressao: '(L/2)+0.5' },
          { sequencia: 4, expressao: '(L/2)+0.5' }
        ]
      }
    },
    {
      id: '0008', fefco: '0008', onda: 'C',
      descricao: '0008 FOLHA DE ROSTO / TAMPA',
      limites: { minImpressora: 50, maxImpressora: 2650, minRiscador: 50, maxRiscador: 2650, larguraFolha: 1600, numeroPorImpressao: 1 },
      slots: {
        LARGURA: [{ sequencia: 1, expressao: 'L' }],
        COMPRIMENTO: [{ sequencia: 1, expressao: 'C' }]
      }
    }
  ];

  /* ---------------------------------------------------------- qualidade de chapa */
  const qualidades = [
    { id: 'NCC40B', onda: 'B', gramatura: 329, camadas: 3, ect: 4.0, reciclado: false,
      fornecedores: [
        { nome: 'Papelão Brasil S/A', custoM2: 2.94, larguras: [1200, 1400, 1600], leadTime: 4, preferencial: true },
        { nome: 'Onduflex Embalagens', custoM2: 3.08, larguras: [1200, 1500], leadTime: 6, preferencial: false }
      ] },
    { id: 'B2CH4', onda: 'B', gramatura: 315, camadas: 3, ect: 3.6, reciclado: false,
      fornecedores: [{ nome: 'Papelão Brasil S/A', custoM2: 2.71, larguras: [1200, 1400, 1600], leadTime: 4, preferencial: true }] },
    { id: 'NCC60BC', onda: 'BC', gramatura: 612, camadas: 5, ect: 7.2, reciclado: true,
      fornecedores: [{ nome: 'Onduflex Embalagens', custoM2: 5.42, larguras: [1400, 1600, 1800], leadTime: 8, preferencial: true }] },
    { id: 'BMSK/C', onda: 'C', gramatura: 450, camadas: 3, ect: 5.1, reciclado: false,
      fornecedores: [{ nome: 'Kraft Sul Papéis', custoM2: 3.86, larguras: [1300, 1600], leadTime: 5, preferencial: true }] }
  ];

  /* ---------------------------------------------------------------- clientes */
  const clientes = [
    { id: 'c1', codigo: 11, razao: 'MASSAS SERRA AZUL IND DE ALIMENTOS LTDA', fantasia: 'SERRA AZUL',
      cnpj: '11.222.333/0001-44', situacao: 'TOP', limite: 180000, aberto: 42380.5, atraso: 0,
      atividade: 'ALIMENTOS', municipio: 'SÃO PAULO', uf: 'SP', zona: 'LESTE',
      contato: 'BRUNO ALMEIDA', fone: '(11) 4000-1001', representante: 'RENATO BORGES', comissao: 5,
      kanban: false, desde: '2006-04-12', ultimoPedido: '2026-09-16',
      obsEntrega: 'Recebimento seg a sex, 08:00 às 11:00. Exige agendamento por e-mail.',
      obsFabricacao: 'Cliente não aceita caixa com emenda de colagem visível na aba.' },
    { id: 'c2', codigo: 77, razao: 'VOLTAMAR SISTEMAS P/ VEICULOS COMERCIAIS', fantasia: 'VOLTAMAR',
      cnpj: '11.222.334/0001-41', situacao: 'TOP', limite: 520000, aberto: 318920.0, atraso: 0,
      atividade: 'AUTOMOTIVO', municipio: 'DIADEMA', uf: 'SP', zona: 'ABC',
      contato: 'CLARA BENTO', fone: '(11) 4000-1002', representante: 'RENATO BORGES', comissao: 3.5,
      kanban: true, desde: '2007-02-01', ultimoPedido: '2026-09-25',
      obsEntrega: 'Kanban semanal. Entrega às terças, portaria 3.',
      obsFabricacao: 'Rastreabilidade obrigatória por lote. Auditoria de cliente semestral.' },
    { id: 'c3', codigo: 12, razao: 'TRES RIOS QUIMICA IND. E COM LTDA-ME', fantasia: 'PET VIDA',
      cnpj: '11.222.333/0001-44', situacao: 'EM_ANALISE', limite: 35000, aberto: 38210.9, atraso: 12440.0,
      atividade: 'QUIMICA', municipio: 'SÃO PAULO', uf: 'SP', zona: 'LESTE',
      contato: 'IVO MARTINS', fone: '(11) 4000-1001', representante: 'DIRETO', comissao: 5,
      kanban: false, desde: '2006-11-20', ultimoPedido: '2026-08-30',
      obsEntrega: '', obsFabricacao: '' },
    { id: 'c4', codigo: 203, razao: 'CLUBE DO LIVRO SUL COMERCIO LTDA', fantasia: 'CLUBE DO LIVRO',
      cnpj: '11.222.335/0001-49', situacao: 'ATIVO', limite: 90000, aberto: 21870.0, atraso: 0,
      atividade: 'EDITORIAL', municipio: 'PORTO ALEGRE', uf: 'RS', zona: 'SUL',
      contato: 'TEREZA LOPES', fone: '(51) 4000-1003', representante: 'SILVIA CAMPOS', comissao: 4,
      kanban: false, desde: '2016-03-08', ultimoPedido: '2026-09-11',
      obsEntrega: 'Frete CIF. Transportadora própria do cliente retira.', obsFabricacao: '' },
    { id: 'c5', codigo: 318, razao: 'VALE PAPEIS DISTRIBUIDORA LTDA', fantasia: 'VALE PAPEIS',
      cnpj: '11.222.336/0001-46', situacao: 'ATIVO', limite: 150000, aberto: 64110.3, atraso: 0,
      atividade: 'DISTRIBUIDOR', municipio: 'COTIA', uf: 'SP', zona: 'OESTE',
      contato: 'OTAVIO PINTO', fone: '(11) 4000-1004', representante: 'SILVIA CAMPOS', comissao: 4.5,
      kanban: false, desde: '2019-07-15', ultimoPedido: '2026-09-25',
      obsEntrega: '', obsFabricacao: '' },
    { id: 'c6', codigo: 402, razao: 'PIAO MATERIAIS P/ BRINCAR LTDA', fantasia: 'PIAO BRINQUEDOS',
      cnpj: '11.222.337/0001-43', situacao: 'ATIVO', limite: 60000, aberto: 8990.0, atraso: 0,
      atividade: 'BRINQUEDOS', municipio: 'GUARULHOS', uf: 'SP', zona: 'NORTE',
      contato: 'SANDRA MOTA', fone: '(11) 4000-1005', representante: 'RENATO BORGES', comissao: 5,
      kanban: false, desde: '2022-01-19', ultimoPedido: '2026-09-25',
      obsEntrega: '', obsFabricacao: '' },
    { id: 'c7', codigo: 288, razao: 'RIO CLARO COMERCIO DE BEBIDAS LTDA', fantasia: 'RIO CLARO',
      cnpj: '11.222.338/0001-40', situacao: 'BLOQUEADO', limite: 40000, aberto: 51200.0, atraso: 51200.0,
      atividade: 'BEBIDAS', municipio: 'CAMPINAS', uf: 'SP', zona: 'INTERIOR',
      contato: 'HELIO FARIA', fone: '(19) 4000-1006', representante: 'DIRETO', comissao: 5,
      kanban: false, desde: '2018-05-03', ultimoPedido: '2026-05-22',
      obsEntrega: '', obsFabricacao: '' }
  ];

  /* ------------------------------------------------------------ fichas técnicas */
  const fichas = [
    { numero: 92281, tipo: 'CAIXA', clienteId: 'c1', local: 'PAPELKRAFT',
      referencia: 'CX 04 ROLO PASTEL 3kg/MASSA LASANHA 1kg',
      estilo: '0201-B', C: 460, L: 240, A: 110, S: 0, I: 0, W: 0, R: 0,
      qualidadeInterna: 'NCC40B', qualidadeFornecedor: 'B2CH4', onda: 'B', gramatura: 329,
      fechamento: 'COLA', orelha: 'INTERNA', cliche: 'B-00000273', faca: 'F-004119', cores: 'PRETO',
      riscador: [122, 116, 122], impressao: [30, 463, 243, 463, 241],
      chapaLargura: 390, chapaComprimento: 1470, pecasPorChapa: 1,
      precoCaixa: 3.70, precoKg: 19.62, precoConjunto: 3.70, pesoG: 170.6, fator: 1.0,
      ncm: '48191000', ipi: 0, status: 'PRODUTO_FINAL', unidade: 'PC',
      amarrado: 20, tolerancia: [5, 5],
      obsPedido: '', obsImpressao: '',
      obsFabricacao: 'FURO RESPIRO COM 280MM DE DISTÂNCIA ENTRE ELES\nPROTOCOLO 30063 APROVADO 01/04/26\nPROTOCOLO 30019 REPROVADO 26/03/26',
      revisoes: [
        { rev: 4, data: '2026-03-24 15:31', usuario: 'Guilherme Marins', campo: 'Preço unitário', de: '3,410', para: '3,700' },
        { rev: 4, data: '2026-03-24 15:31', usuario: 'Guilherme Marins', campo: 'Preço conjunto', de: '3,410', para: '3,700' },
        { rev: 4, data: '2026-03-24 15:31', usuario: 'Guilherme Marins', campo: 'Gramatura', de: '0', para: '329' },
        { rev: 4, data: '2026-03-24 15:31', usuario: 'Guilherme Marins', campo: '1ª Med. Risc.', de: '0', para: '122' },
        { rev: 4, data: '2026-03-24 15:31', usuario: 'Guilherme Marins', campo: 'Total do riscador', de: '0', para: '360' },
        { rev: 3, data: '2026-03-18 09:12', usuario: 'Helena Prado', campo: 'Estilo', de: '0201-C', para: '0201-B' },
        { rev: 1, data: '2026-03-02 11:40', usuario: 'Guilherme Marins', campo: '—', de: '', para: 'INCLUSÃO' }
      ] },
    { numero: 65287, tipo: 'CAIXA', clienteId: 'c2', local: 'PAPELKRAFT',
      referencia: 'P3093 COLM P/KIT ALAV E ACRS',
      estilo: '0201-C', C: 205, L: 205, A: 100, S: 0, I: 0, W: 0, R: 0,
      qualidadeInterna: 'NCC40B', qualidadeFornecedor: 'B2CH4', onda: 'B', gramatura: 329,
      fechamento: 'COLA', orelha: 'INTERNA', cliche: '', faca: 'F-002884', cores: '',
      riscador: [106, 108, 106], impressao: [30, 209, 209, 209, 207],
      chapaLargura: 320, chapaComprimento: 864, pecasPorChapa: 1,
      precoCaixa: 1.42, precoKg: 14.43, precoConjunto: 7.44, pesoG: 91.0, fator: 1.0,
      ncm: '48191000', ipi: 0, status: 'PRODUTO_FINAL', unidade: 'PC',
      amarrado: 25, tolerancia: [5, 5],
      obsPedido: '', obsImpressao: '', obsFabricacao: 'AS COLMEIAS TEM QUE IR MONTADAS',
      complementoDe: null, revisoes: [] },
    { numero: 9818, tipo: 'ACESSORIO', clienteId: 'c2', local: 'PAPELKRAFT',
      referencia: 'P3093 DIV GD COLM P/KIT ALAV E ACRS',
      estilo: '0930-B', C: 205, L: 205, A: 100, S: 0, I: 0, W: 0, R: 0,
      qualidadeInterna: 'NCC40B', qualidadeFornecedor: 'B2CH4', onda: 'B', gramatura: 329,
      fechamento: 'SEM_FECHAMENTO', orelha: 'SEM_ORELHA', cliche: '', faca: 'F-002885', cores: '',
      riscador: [100], impressao: [103, 103, 103, 103],
      chapaLargura: 100, chapaComprimento: 412, pecasPorChapa: 11,
      precoCaixa: 0.52, precoKg: 14.43, precoConjunto: 0, pesoG: 13.6, fator: 1.96,
      ncm: '48191000', ipi: 0, status: 'PRODUTO_FINAL', unidade: 'PC',
      amarrado: 50, tolerancia: [5, 5],
      obsPedido: 'IMPRIMIR CODIGO NA ABA', obsImpressao: '',
      obsFabricacao: 'DIVISORIA COM 04 CORTES/ AS COLMEIAS TEM QUE IR MONTADAS',
      complementoDe: 65287, revisoes: [] },
    { numero: 93865, tipo: 'CAIXA', clienteId: 'c6', local: '',
      referencia: 'CX 250X180X90',
      estilo: '0201-B', C: 250, L: 180, A: 90, S: 0, I: 0, W: 0, R: 0,
      qualidadeInterna: 'B2CH4', qualidadeFornecedor: 'B2CH4', onda: 'B', gramatura: 315,
      fechamento: 'COLA', orelha: 'INTERNA', cliche: '', faca: '', cores: '',
      riscador: [92, 96, 92], impressao: [30, 253, 183, 253, 181],
      chapaLargura: 280, chapaComprimento: 900, pecasPorChapa: 1,
      precoCaixa: 1.18, precoKg: 15.10, precoConjunto: 1.18, pesoG: 79.4, fator: 1.0,
      ncm: '48191000', ipi: 0, status: 'AGUARDANDO_AMOSTRA', unidade: 'PC',
      amarrado: 25, tolerancia: [5, 5],
      obsPedido: '', obsImpressao: '', obsFabricacao: '', revisoes: [] },
    { numero: 92758, tipo: 'CAIXA', clienteId: 'c5', local: '',
      referencia: 'MDK0109 CX BRP0026 INOVE LTB PRO',
      estilo: '0427', C: 380, L: 280, A: 150, S: 0, I: 0, W: 0, R: 0,
      qualidadeInterna: 'NCC60BC', qualidadeFornecedor: 'NCC60BC', onda: 'BC', gramatura: 612,
      fechamento: 'COLA', orelha: 'EXTERNA', cliche: 'B-00000411', faca: 'F-004402', cores: 'AZUL / PRETO',
      riscador: [156, 286, 156], impressao: [156, 386, 156, 40],
      chapaLargura: 598, chapaComprimento: 738, pecasPorChapa: 1,
      precoCaixa: 4.92, precoKg: 17.84, precoConjunto: 4.92, pesoG: 270.0, fator: 1.0,
      ncm: '48191000', ipi: 0, status: 'PRODUTO_FINAL', unidade: 'PC',
      amarrado: 20, tolerancia: [5, 5],
      obsPedido: '', obsImpressao: 'LAYOUT APROVADO EM 12/08/26', obsFabricacao: '', revisoes: [] },
    { numero: 91354, tipo: 'CAIXA', clienteId: 'c4', local: '',
      referencia: 'CX 01 UNITARIA (LITERATURA/CURADORIA) AZUL',
      estilo: '0201-C', C: 240, L: 170, A: 60, S: 0, I: 0, W: 0, R: 0,
      qualidadeInterna: 'BMSK/C', qualidadeFornecedor: 'BMSK/C', onda: 'C', gramatura: 450,
      fechamento: 'COLA', orelha: 'INTERNA', cliche: 'B-00000398', faca: 'F-004310', cores: 'AZUL',
      riscador: [88, 68, 88], impressao: [30, 244, 174, 244, 172],
      chapaLargura: 244, chapaComprimento: 864, pecasPorChapa: 1,
      precoCaixa: 2.06, precoKg: 19.55, precoConjunto: 2.06, pesoG: 94.9, fator: 1.0,
      ncm: '48191000', ipi: 0, status: 'PRODUTO_FINAL', unidade: 'PC',
      amarrado: 30, tolerancia: [5, 5],
      obsPedido: '', obsImpressao: '', obsFabricacao: '', revisoes: [] }
  ];

  /* ---------------------------------------------------------------- amostras */
  const amostras = [
    { numero: 30063, clienteId: 'c1', ft: 92281, referencia: 'CX 04 ROLO PASTEL 3kg/MASSA LASANHA 1kg',
      estilo: '0201-B', qualidade: 'NCC40B', medida: '460 x 240 x 110', qtd: 1,
      emissao: '2026-03-24', status: 'APROVADO', dataStatus: '2026-04-01', repres: 'RENATO BORGES',
      assinadoPor: 'BRUNO ALMEIDA', cargo: 'Coord. de Compras' },
    { numero: 30656, clienteId: 'c2', ft: null, referencia: 'KIT DIVS - Z008525P',
      estilo: '0930-B', qualidade: 'NCC40B', medida: '400 x 300 x 120', qtd: 2,
      emissao: '2026-08-21', status: 'AGUARDANDO', dataStatus: null, repres: 'RENATO BORGES' },
    { numero: 30657, clienteId: 'c2', ft: null, referencia: 'DIV MAIOR - Z008525P',
      estilo: '0930-B', qualidade: 'NCC40B', medida: '400 x 150 x 120', qtd: 2,
      emissao: '2026-08-21', status: 'AGUARDANDO', dataStatus: null, repres: 'RENATO BORGES' },
    { numero: 30658, clienteId: 'c2', ft: null, referencia: 'DIV MENOR - Z008525P',
      estilo: '0930-B', qualidade: 'NCC40B', medida: '300 x 150 x 120', qtd: 2,
      emissao: '2026-08-21', status: 'AGUARDANDO', dataStatus: null, repres: 'RENATO BORGES' },
    { numero: 30801, clienteId: 'c6', ft: 93865, referencia: 'CX 250X180X90',
      estilo: '0201-B', qualidade: 'B2CH4', medida: '250 x 180 x 90', qtd: 1,
      emissao: '2026-09-25', status: 'AGUARDANDO', dataStatus: null, repres: 'RENATO BORGES' },
    { numero: 30802, clienteId: 'c6', ft: null, referencia: 'CX 185X145X85',
      estilo: '0201-B', qualidade: 'B2CH4', medida: '185 x 145 x 85', qtd: 1,
      emissao: '2026-09-25', status: 'AGUARDANDO', dataStatus: null, repres: 'RENATO BORGES' },
    { numero: 30803, clienteId: 'c5', ft: 92758, referencia: 'MDK0109 CX BRP0026 INOVE LTB PRO',
      estilo: '0427', qualidade: 'NCC60BC', medida: '380 x 280 x 150', qtd: 3,
      emissao: '2026-09-25', status: 'AGUARDANDO', dataStatus: null, repres: 'SILVIA CAMPOS' },
    { numero: 30540, clienteId: 'c4', ft: 91354, referencia: 'CX 02 UNITARIA (INEDITOS) LARANJA',
      estilo: '0201-C', qualidade: 'BMSK/C', medida: '240 x 170 x 60', qtd: 2,
      emissao: '2026-07-14', status: 'REPROVADO', dataStatus: '2026-07-29', repres: 'SILVIA CAMPOS',
      motivo: 'Cor laranja fora do Pantone aprovado' },
    { numero: 30478, clienteId: 'c3', ft: null, referencia: 'CX PET VIDA 5L',
      estilo: '0201-B', qualidade: 'B2CH4', medida: '300 x 220 x 250', qtd: 1,
      emissao: '2026-06-18', status: 'AGUARDANDO', dataStatus: null, repres: 'DIRETO' },
    { numero: 30390, clienteId: 'c5', ft: null, referencia: 'CX MASTER COTIA 12UN',
      estilo: '0201-C', qualidade: 'NCC60BC', medida: '600 x 400 x 300', qtd: 1,
      emissao: '2026-05-29', status: 'AGUARDANDO', dataStatus: null, repres: 'SILVIA CAMPOS' }
  ];

  /* ---------------------------------------------------------------- máquinas */
  const maquinas = [
    { id: 'm1', codigo: 'IMP-01', nome: 'Impressora Flexo 01', tipo: 'IMPRESSORA_FLEXO',
      cores: 4, larguraMax: 1600, capacidadeHora: 4800, situacao: 'EM_USO', custoHora: 185.0 },
    { id: 'm2', codigo: 'RSC-02', nome: 'Riscador 02', tipo: 'RISCADOR',
      larguraMax: 1600, capacidadeHora: 6200, situacao: 'EM_USO', custoHora: 96.0 },
    { id: 'm3', codigo: 'CV-01', nome: 'Corte e Vinco Plana 01', tipo: 'CORTE_VINCO_PLANA',
      larguraMax: 1400, capacidadeHora: 2600, situacao: 'EM_USO', custoHora: 168.0 },
    { id: 'm4', codigo: 'COL-01', nome: 'Coladeira 01', tipo: 'COLADEIRA',
      larguraMax: 1600, capacidadeHora: 7400, situacao: 'MANUTENCAO', custoHora: 142.0 },
    { id: 'm5', codigo: 'COL-02', nome: 'Coladeira 02', tipo: 'COLADEIRA',
      larguraMax: 1200, capacidadeHora: 5100, situacao: 'DISPONIVEL', custoHora: 128.0 },
    { id: 'm6', codigo: 'CONF', nome: 'Conferência', tipo: 'MONTAGEM',
      capacidadeHora: 3000, situacao: 'EM_USO', custoHora: 48.0 },
    { id: 'm7', codigo: 'EXP', nome: 'Expedição', tipo: 'PALETIZADORA',
      capacidadeHora: 4000, situacao: 'EM_USO', custoHora: 52.0 }
  ];

  const operadores = [
    { id: 'o1', nome: 'Jailson Ribeiro', cracha: 'OP-1042', turno: '1º' },
    { id: 'o2', nome: 'Marcia Alves', cracha: 'OP-1118', turno: '1º' },
    { id: 'o3', nome: 'Edson Carvalho', cracha: 'OP-0987', turno: '1º' },
    { id: 'o4', nome: 'Rosana Lima', cracha: 'OP-1205', turno: '1º' }
  ];

  const motivosParada = [
    { codigo: 'SETUP', desc: 'Troca de faca/clichê', cat: 'SETUP', planejada: true },
    { codigo: 'MANUT', desc: 'Manutenção corretiva', cat: 'MANUTENCAO', planejada: false },
    { codigo: 'FALTA_CHAPA', desc: 'Falta de chapa', cat: 'FALTA_MATERIAL', planejada: false },
    { codigo: 'FALTA_FERR', desc: 'Falta de ferramental', cat: 'FALTA_FERRAMENTAL', planejada: false },
    { codigo: 'QUALIDADE', desc: 'Ajuste de qualidade', cat: 'QUALIDADE', planejada: false },
    { codigo: 'REFEICAO', desc: 'Refeição / intervalo', cat: 'REFEICAO', planejada: true },
    { codigo: 'LIMPEZA', desc: 'Limpeza de máquina', cat: 'LIMPEZA', planejada: true },
    { codigo: 'ENERGIA', desc: 'Falta de energia', cat: 'ENERGIA', planejada: false }
  ];

  const motivosRefugo = [
    { codigo: 'IMP_BORRADO', desc: 'Impressão borrada', cat: 'IMPRESSAO' },
    { codigo: 'CORTE_FORA', desc: 'Corte fora de medida', cat: 'CORTE' },
    { codigo: 'COLA_FALHA', desc: 'Falha de colagem', cat: 'COLAGEM' },
    { codigo: 'CHAPA_RUIM', desc: 'Chapa empenada / úmida', cat: 'MATERIA_PRIMA' },
    { codigo: 'SETUP', desc: 'Perda de acerto (setup)', cat: 'SETUP' },
    { codigo: 'MANUSEIO', desc: 'Dano no manuseio', cat: 'MANUSEIO' }
  ];

  /* ---------------------------------------------------------------- pedidos */
  const pedidos = [
    { numero: 120521, clienteId: 'c1', tipo: 'NORMAL', data: '2026-09-04', entrega: '2026-10-08',
      status: 'EM_PRODUCAO', valor: 185000 * 0.0037 * 1000 / 1000,
      itens: [{ ft: 92281, qtd: 50000, preco: 3.70, produzida: 32400, faturada: 0,
        entregas: [
          { seq: 1, data: '2026-09-16', prog: 500, baixada: 500, nf: '084779', situacao: 'ENTREGUE' },
          { seq: 2, data: '2026-10-08', prog: 24500, baixada: 0, nf: null, situacao: 'EM_PRODUCAO' },
          { seq: 3, data: '2026-10-22', prog: 25000, baixada: 0, nf: null, situacao: 'PROGRAMADA' }
        ] }] },
    { numero: 120844, clienteId: 'c2', tipo: 'KANBAN', data: '2026-09-18', entrega: '2026-10-02',
      status: 'EM_PRODUCAO', valor: 96400,
      itens: [
        { ft: 65287, qtd: 40000, preco: 1.42, produzida: 12000, faturada: 0,
          entregas: [{ seq: 1, data: '2026-10-02', prog: 40000, baixada: 0, nf: null, situacao: 'EM_PRODUCAO' }] },
        { ft: 9818, qtd: 40000, preco: 0.52, produzida: 0, faturada: 0,
          entregas: [{ seq: 1, data: '2026-10-02', prog: 40000, baixada: 0, nf: null, situacao: 'PROGRAMADA' }] }
      ] },
    { numero: 120901, clienteId: 'c5', tipo: 'NORMAL', data: '2026-09-22', entrega: '2026-10-15',
      status: 'APROVADO', valor: 73800,
      itens: [{ ft: 92758, qtd: 15000, preco: 4.92, produzida: 0, faturada: 0,
        entregas: [{ seq: 1, data: '2026-10-15', prog: 15000, baixada: 0, nf: null, situacao: 'PROGRAMADA' }] }] },
    { numero: 120655, clienteId: 'c4', tipo: 'NORMAL', data: '2026-09-11', entrega: '2026-09-30',
      status: 'PARCIALMENTE_FATURADO', valor: 41200,
      itens: [{ ft: 91354, qtd: 20000, preco: 2.06, produzida: 20000, faturada: 12000,
        entregas: [
          { seq: 1, data: '2026-09-24', prog: 12000, baixada: 12000, nf: '084912', situacao: 'ENTREGUE' },
          { seq: 2, data: '2026-09-30', prog: 8000, baixada: 0, nf: null, situacao: 'PRONTA' }
        ] }] }
  ];

  const orcamentos = [
    { numero: 77120, clienteId: 'c1', data: '2026-09-16', validade: '2026-10-16', situacao: 'CONVERTIDO',
      valor: 185000, itens: 1, repres: 'RENATO BORGES' },
    { numero: 77098, clienteId: 'c6', data: '2026-09-25', validade: '2026-10-25', situacao: 'ENVIADO',
      valor: 29500, itens: 2, repres: 'RENATO BORGES' },
    { numero: 77102, clienteId: 'c5', data: '2026-09-25', validade: '2026-10-25', situacao: 'EM_NEGOCIACAO',
      valor: 73800, itens: 1, repres: 'SILVIA CAMPOS' },
    { numero: 76984, clienteId: 'c1', data: '2026-08-26', validade: '2026-09-26', situacao: 'EXPIRADO',
      valor: 172000, itens: 1, repres: 'RENATO BORGES' }
  ];

  /* ------------------------------------------------ ordens de fabricação e FS */
  const ordens = [
    { numero: 40218, pedido: 120521, ft: 92281, clienteId: 'c1', qtdPrevista: 24500, qtdProduzida: 18200,
      refugo: 340, status: 'EM_PRODUCAO', lote: 'L26-40218', prioridade: 2,
      inicioPrev: '2026-09-26T06:00', fimPrev: '2026-09-29T14:00',
      chapa: { qualidade: 'NCC40B', largura: 360, comprimento: 1440, chapas: 24500,
               situacao: 'RECEBIDA', fornecedor: 'Papelão Brasil S/A', chegada: '2026-09-24' },
      roteiro: [
        { seq: 1, operacao: 'IMPRESSAO', maquina: 'm1', status: 'CONCLUIDA' },
        { seq: 2, operacao: 'CORTE_VINCO', maquina: 'm3', status: 'EM_PRODUCAO' },
        { seq: 3, operacao: 'COLAGEM', maquina: 'm5', status: 'AGUARDANDO' },
        { seq: 4, operacao: 'CONFERENCIA', maquina: 'm6', status: 'AGUARDANDO' },
        { seq: 5, operacao: 'EXPEDICAO', maquina: 'm7', status: 'AGUARDANDO' }
      ] },
    { numero: 40231, pedido: 120844, ft: 65287, clienteId: 'c2', qtdPrevista: 40000, qtdProduzida: 12000,
      refugo: 120, status: 'EM_PRODUCAO', lote: 'L26-40231', prioridade: 1,
      inicioPrev: '2026-09-27T06:00', fimPrev: '2026-09-30T22:00',
      chapa: { qualidade: 'NCC40B', largura: 320, comprimento: 864, chapas: 40000,
               situacao: 'RECEBIDA', fornecedor: 'Papelão Brasil S/A', chegada: '2026-09-25' },
      roteiro: [
        { seq: 1, operacao: 'RISCADOR', maquina: 'm2', status: 'EM_PRODUCAO' },
        { seq: 2, operacao: 'CORTE_VINCO', maquina: 'm3', status: 'AGUARDANDO' },
        { seq: 3, operacao: 'COLAGEM', maquina: 'm5', status: 'AGUARDANDO' },
        { seq: 4, operacao: 'CONFERENCIA', maquina: 'm6', status: 'AGUARDANDO' }
      ] },
    { numero: 40244, pedido: 120844, ft: 9818, clienteId: 'c2', qtdPrevista: 40000, qtdProduzida: 0,
      refugo: 0, status: 'AGUARDANDO_CHAPA', lote: 'L26-40244', prioridade: 1,
      inicioPrev: '2026-09-30T06:00', fimPrev: '2026-10-01T18:00',
      chapa: { qualidade: 'NCC40B', largura: 100, comprimento: 412, chapas: 3640,
               situacao: 'COMPRADA', fornecedor: 'Papelão Brasil S/A', chegada: '2026-09-29' },
      roteiro: [
        { seq: 1, operacao: 'CORTE_VINCO', maquina: 'm3', status: 'AGUARDANDO' },
        { seq: 2, operacao: 'MONTAGEM', maquina: 'm6', status: 'AGUARDANDO' }
      ] },
    { numero: 40250, pedido: 120901, ft: 92758, clienteId: 'c5', qtdPrevista: 15000, qtdProduzida: 0,
      refugo: 0, status: 'AGUARDANDO_CHAPA', lote: 'L26-40250', prioridade: 4,
      inicioPrev: '2026-10-05T06:00', fimPrev: '2026-10-08T14:00',
      chapa: { qualidade: 'NCC60BC', largura: 598, comprimento: 738, chapas: 15000,
               situacao: 'EM_COTACAO', fornecedor: null, chegada: null },
      roteiro: [
        { seq: 1, operacao: 'IMPRESSAO', maquina: 'm1', status: 'AGUARDANDO' },
        { seq: 2, operacao: 'CORTE_VINCO', maquina: 'm3', status: 'AGUARDANDO' },
        { seq: 3, operacao: 'COLAGEM', maquina: 'm5', status: 'AGUARDANDO' }
      ] },
    { numero: 40199, pedido: 120655, ft: 91354, clienteId: 'c4', qtdPrevista: 8000, qtdProduzida: 8000,
      refugo: 62, status: 'CONCLUIDA', lote: 'L26-40199', prioridade: 5,
      inicioPrev: '2026-09-20T06:00', fimPrev: '2026-09-23T14:00',
      chapa: { qualidade: 'BMSK/C', largura: 244, comprimento: 864, chapas: 8000,
               situacao: 'RECEBIDA', fornecedor: 'Kraft Sul Papéis', chegada: '2026-09-18' },
      roteiro: [
        { seq: 1, operacao: 'IMPRESSAO', maquina: 'm1', status: 'CONCLUIDA' },
        { seq: 2, operacao: 'CORTE_VINCO', maquina: 'm3', status: 'CONCLUIDA' },
        { seq: 3, operacao: 'COLAGEM', maquina: 'm5', status: 'CONCLUIDA' },
        { seq: 4, operacao: 'CONFERENCIA', maquina: 'm6', status: 'CONCLUIDA' }
      ] }
  ];

  /* Fichas de Serviço: a unidade de trabalho do piso de fábrica */
  const fichasServico = [
    { numero: 88412, of: 40218, operacao: 'CORTE_VINCO', maquinaId: 'm3', ft: 92281, clienteId: 'c1',
      qtdPrevista: 24500, qtdProduzida: 18200, refugo: 340,
      tempoSetupMin: 42, tempoProducaoMin: 386, tempoParadaMin: 28,
      status: 'EM_PRODUCAO', fila: 1, ferramental: 'F-004119',
      operadores: ['o1', 'o2'], inicioReal: '2026-09-27T06:12' },
    { numero: 88420, of: 40218, operacao: 'COLAGEM', maquinaId: 'm5', ft: 92281, clienteId: 'c1',
      qtdPrevista: 24500, qtdProduzida: 0, refugo: 0,
      tempoSetupMin: 0, tempoProducaoMin: 0, tempoParadaMin: 0,
      status: 'AGUARDANDO', fila: 1, ferramental: '', operadores: [], inicioReal: null },
    { numero: 88431, of: 40231, operacao: 'RISCADOR', maquinaId: 'm2', ft: 65287, clienteId: 'c2',
      qtdPrevista: 40000, qtdProduzida: 12000, refugo: 120,
      tempoSetupMin: 25, tempoProducaoMin: 142, tempoParadaMin: 12,
      status: 'EM_PRODUCAO', fila: 1, ferramental: 'F-002884',
      operadores: ['o3'], inicioReal: '2026-09-27T08:40' },
    { numero: 88435, of: 40231, operacao: 'CORTE_VINCO', maquinaId: 'm3', ft: 65287, clienteId: 'c2',
      qtdPrevista: 40000, qtdProduzida: 0, refugo: 0,
      tempoSetupMin: 0, tempoProducaoMin: 0, tempoParadaMin: 0,
      status: 'AGUARDANDO', fila: 2, ferramental: 'F-002884', operadores: [], inicioReal: null },
    { numero: 88448, of: 40244, operacao: 'CORTE_VINCO', maquinaId: 'm3', ft: 9818, clienteId: 'c2',
      qtdPrevista: 3640, qtdProduzida: 0, refugo: 0,
      tempoSetupMin: 0, tempoProducaoMin: 0, tempoParadaMin: 0,
      status: 'AGUARDANDO', fila: 3, ferramental: 'F-002885', operadores: [],
      inicioReal: null, travaChapa: true },
    { numero: 88401, of: 40218, operacao: 'IMPRESSAO', maquinaId: 'm1', ft: 92281, clienteId: 'c1',
      qtdPrevista: 24500, qtdProduzida: 24500, refugo: 180,
      tempoSetupMin: 55, tempoProducaoMin: 312, tempoParadaMin: 18,
      status: 'CONCLUIDA', fila: 0, ferramental: 'B-00000273',
      operadores: ['o4'], inicioReal: '2026-09-26T06:05' },
    { numero: 88455, of: 40250, operacao: 'IMPRESSAO', maquinaId: 'm1', ft: 92758, clienteId: 'c5',
      qtdPrevista: 15000, qtdProduzida: 0, refugo: 0,
      tempoSetupMin: 0, tempoProducaoMin: 0, tempoParadaMin: 0,
      status: 'AGUARDANDO', fila: 1, ferramental: 'B-00000411', operadores: [],
      inicioReal: null, travaChapa: true },
    { numero: 88460, of: 40218, operacao: 'CONFERENCIA', maquinaId: 'm6', ft: 92281, clienteId: 'c1',
      qtdPrevista: 18200, qtdProduzida: 0, refugo: 0,
      tempoSetupMin: 0, tempoProducaoMin: 0, tempoParadaMin: 0,
      status: 'AGUARDANDO', fila: 1, ferramental: '', operadores: [], inicioReal: null },
    { numero: 88470, of: 40199, operacao: 'EXPEDICAO', maquinaId: 'm7', ft: 91354, clienteId: 'c4',
      qtdPrevista: 8000, qtdProduzida: 0, refugo: 0,
      tempoSetupMin: 0, tempoProducaoMin: 0, tempoParadaMin: 0,
      status: 'AGUARDANDO', fila: 1, ferramental: '', operadores: [], inicioReal: null }
  ];

  /* ------------------------------------------------------- compras de chapa */
  const necessidadesChapa = [
    { of: 40244, qualidade: 'NCC40B', largura: 100, comprimento: 412, chapas: 3640,
      necessidade: '2026-09-29', chegada: '2026-09-29', fornecedor: 'Papelão Brasil S/A',
      situacao: 'COMPRADA', pedidoCompra: 9188, custo: 1490.4 },
    { of: 40250, qualidade: 'NCC60BC', largura: 598, comprimento: 738, chapas: 15000,
      necessidade: '2026-10-03', chegada: null, fornecedor: null,
      situacao: 'EM_COTACAO', pedidoCompra: null, custo: 35870.0 },
    { of: 40218, qualidade: 'NCC40B', largura: 360, comprimento: 1440, chapas: 24500,
      necessidade: '2026-09-25', chegada: '2026-09-24', fornecedor: 'Papelão Brasil S/A',
      situacao: 'RECEBIDA', pedidoCompra: 9171, custo: 41290.5 },
    { of: 40231, qualidade: 'NCC40B', largura: 320, comprimento: 864, chapas: 40000,
      necessidade: '2026-09-26', chegada: '2026-09-25', fornecedor: 'Papelão Brasil S/A',
      situacao: 'RECEBIDA', pedidoCompra: 9174, custo: 32521.0 }
  ];

  const sobrasChapa = [
    { qualidade: 'NCC40B', largura: 360, comprimento: 1440, chapas: 820, deposito: 'MP-01', ofOrigem: 40218 },
    { qualidade: 'B2CH4', largura: 280, comprimento: 900, chapas: 1450, deposito: 'MP-01', ofOrigem: 40105 },
    { qualidade: 'BMSK/C', largura: 244, comprimento: 864, chapas: 310, deposito: 'MP-01', ofOrigem: 40199 }
  ];

  /* ---------------------------------------------------------------- financeiro */
  const titulos = [
    { numero: 58201, clienteId: 'c2', nf: '084912', parcela: '1/3', valor: 106306.67, venc: '2026-10-05', status: 'ABERTA' },
    { numero: 58202, clienteId: 'c2', nf: '084912', parcela: '2/3', valor: 106306.67, venc: '2026-10-19', status: 'ABERTA' },
    { numero: 58203, clienteId: 'c2', nf: '084912', parcela: '3/3', valor: 106306.66, venc: '2026-11-02', status: 'ABERTA' },
    { numero: 58140, clienteId: 'c3', nf: '084655', parcela: '1/1', valor: 12440.00, venc: '2026-09-08', status: 'VENCIDA' },
    { numero: 57980, clienteId: 'c7', nf: '084201', parcela: '1/2', valor: 25600.00, venc: '2026-07-15', status: 'VENCIDA' },
    { numero: 57981, clienteId: 'c7', nf: '084201', parcela: '2/2', valor: 25600.00, venc: '2026-08-15', status: 'VENCIDA' },
    { numero: 58260, clienteId: 'c1', nf: '084779', parcela: '1/1', valor: 1850.00, venc: '2026-10-16', status: 'ABERTA' },
    { numero: 58270, clienteId: 'c4', nf: '084912', parcela: '1/1', valor: 24720.00, venc: '2026-10-24', status: 'ABERTA' }
  ];

  const notas = [
    { numero: '084912', serie: '1', clienteId: 'c4', emissao: '2026-09-24', valor: 24720.00, situacao: 'AUTORIZADA', pedido: 120655 },
    { numero: '084779', serie: '1', clienteId: 'c1', emissao: '2026-09-16', valor: 1850.00, situacao: 'AUTORIZADA', pedido: 120521 },
    { numero: '084901', serie: '1', clienteId: 'c5', emissao: '2026-09-23', valor: 18400.00, situacao: 'AUTORIZADA', pedido: null },
    { numero: '084925', serie: '1', clienteId: 'c2', emissao: '2026-09-26', valor: 96400.00, situacao: 'EM_DIGITACAO', pedido: 120844 }
  ];

  /* ---------------------------------------------------------------- expedição */
  const volumes = [
    { codigo: 'V-2609-0412', tipo: 'PALLET', of: 40199, ft: 91354, qtd: 2000, peso: 210.8, situacao: 'DISPONIVEL' },
    { codigo: 'V-2609-0413', tipo: 'PALLET', of: 40199, ft: 91354, qtd: 2000, peso: 210.8, situacao: 'DISPONIVEL' },
    { codigo: 'V-2609-0414', tipo: 'PALLET', of: 40199, ft: 91354, qtd: 2000, peso: 210.8, situacao: 'DISPONIVEL' },
    { codigo: 'V-2609-0415', tipo: 'PALLET', of: 40199, ft: 91354, qtd: 2000, peso: 210.8, situacao: 'RESERVADO' },
    { codigo: 'V-2709-0501', tipo: 'PALLET', of: 40218, ft: 92281, qtd: 4000, peso: 754.4, situacao: 'EM_PRODUCAO' }
  ];

  const cargas = [
    { numero: 3188, transportadora: 'Rodoexpresso Cargas', placa: 'FGH-7A22', motorista: 'Antonio P.',
      prevista: '2026-09-28', situacao: 'MONTAGEM', pedidos: [120655], peso: 843.2 }
  ];

  /* ---------------------------------------------------------------- OEE demo */
  const oee = [
    { maquinaId: 'm1', disp: 84, perf: 91, qual: 99.3 },
    { maquinaId: 'm2', disp: 78, perf: 88, qual: 99.0 },
    { maquinaId: 'm3', disp: 71, perf: 82, qual: 98.1 },
    { maquinaId: 'm4', disp: 0,  perf: 0,  qual: 0 },
    { maquinaId: 'm5', disp: 88, perf: 94, qual: 99.6 }
  ];

  /* ---------------------------------------------------------------- helpers */
  const cliente = id => clientes.find(c => c.id === id);
  const ficha = num => fichas.find(f => f.numero === num);
  const estilo = id => estilos.find(e => e.id === id);
  const qualidade = id => qualidades.find(q => q.id === id);
  const maquina = id => maquinas.find(m => m.id === id);
  const operador = id => operadores.find(o => o.id === id);
  const ordem = num => ordens.find(o => o.numero === num);
  const pedido = num => pedidos.find(p => p.numero === num);

  const diasDesde = (isoData) => {
    const hoje = new Date('2026-09-27T19:00:00');
    return Math.floor((hoje - new Date(isoData + 'T00:00:00')) / 86400000);
  };

  return {
    estilos, qualidades, clientes, fichas, amostras, maquinas, operadores,
    motivosParada, motivosRefugo, pedidos, orcamentos, ordens, fichasServico,
    necessidadesChapa, sobrasChapa, titulos, notas, volumes, cargas, oee,
    cliente, ficha, estilo, qualidade, maquina, operador, ordem, pedido, diasDesde
  };
})();
