# 00 — Cenário, Premissas e Restrições

## 1. O negócio

Indústria de **cartonagem** (embalagens de papelão ondulado), operação **sob encomenda** (make-to-order),
B2B. Fábrica e escritório no **mesmo endereço**. Equipe comercial externa (representantes/vendedores em
rua). Cada cliente tem caixas específicas, com projeto próprio, ferramental próprio (faca e clichê) e
histórico de aprovação de amostra.

Característica que define o sistema: **o produto não é um item de catálogo, é um projeto**. A unidade
central de informação é a **Ficha Técnica (F.T.)** — uma caixa desenhada para um cliente, com geometria,
qualidade de papelão, ferramental, preço e histórico próprios.

## 2. Sistema atual — Sistema Cartonagem (PcBoot Informática)

Aplicação **desktop Windows** legada (aparência Delphi/VB), executada direto de compartilhamento de rede
(`W:\Gerenciador.exe`). Desenhos e documentos são arquivos no file server, com o **caminho gravado dentro
do registro** (`W:\Desenhos\MALETA.jpg`, `W:\Tabela\Desenho\<CLIENTE>\...`).

### 2.1 Módulos do legado

Menu principal: **Gerenciador · Produção · Financeiro · Reforma Trib. · Representante · Utilitário**.

Dentro do Gerenciador: Cadastros · Produtos · Orçamento · Pedido de Venda · Fabricações · Caixas Prontas ·
Pré-faturamento · Pedido de Compra · Notas Fiscais.

Em Cadastros: Cliente (Cadastro, Inform. Comercial, Histórico, S.A.C.) · Fornecedor · Funcionário ·
Vendedor · Bancos · Parâmetros · Empresa · Transportadora · Senha.

### 2.2 Volumes reais observados

| Indicador | Valor | Fonte |
|---|---|---|
| Fichas Técnicas cadastradas | ~94.000 (maior F.T. observada: 93.865) | Relação analítica de amostras |
| Amostras emitidas (numeração) | até 30.803 | Pesquisa de amostras |
| Orçamentos (numeração) | até 77.120 | Histórico de orçamentos da F.T. 92281 |
| Amostras em 2026 (jan–set) | 1.248 emitidas: 727 aguardando (58%), 225 reprovadas, 296 aprovadas | `Relacao de amostra sintetico.xls` |
| Histórico de amostras | desde 08/2018 | `Relacao de amostra analítico.xls` |
| Histórico comercial | última compra de clientes registrada desde 2006 | Tela "Encontrar" de clientes |

Consequência para o projeto: **cerca de 20 anos de histórico a migrar**, com numerações inteiras que os
usuários conhecem de cor e citam ao telefone. Não se pode trocar F.T. 92281 por um UUID na tela.

### 2.3 O que o legado faz bem (e precisa ser preservado)

- **Motor de fórmulas de caixa por estilo.** A tela *Cadastro de Parâmetros p/ Cálculo de Caixa* define,
  por estilo, as fórmulas de largura (`R1..R9`) e de comprimento (`I1..I9`), com as variáveis:
  `C` comprimento · `L` largura · `A` altura · `S` transpasse superior · `I` transpasse inferior ·
  `W` comprimento da faca · `R` largura da faca. Exemplo do estilo `0201-C`:
  largura `((L/2)+3)`, `A+8`, `((L/2)+3)`; comprimento `30`, `C+4`, `L+4`, `C+4`, `L+2`.
  Junto vão os limites de máquina (mín/máx impressora, mín/máx riscador), referência de largura e
  comprimento, largura da folha e nº por impressão, além do caminho do desenho do estilo.
- **F.T. com base e complemento.** A caixa e sua divisória/acessório são F.T. distintas, ligadas
  (ex.: base 65287 ↔ complemento 9818), com prefixos `Cx` e `Ac`.
- **Auditoria em nível de campo.** "Alterações registradas dos produtos" lista revisão por revisão, com
  usuário, data/hora e valor "de → para" de cada campo alterado.
- **Ciclo de amostra formal.** Requisição de Amostras → Protocolo de Amostra impresso em vias (1ª via
  cliente) com carimbo/assinatura e três desfechos: **Aprovado · Aprovado com Desvio · Reprovado**.
- **Projeto e Desenvolvimento** com liberação assinada por departamento (Vendas, Compras, Qualidade,
  Produção) mais verificação e validação (protocolo de amostra, layout de impressão) — fluxo tipo APQP.
- **Solicitação de facas e clichês** com fornecedor, custo, se é cobrado do cliente e por quanto,
  especificação técnica e verificação OK/NOK com aprovação nominal.
- **Cadastro de cliente rico**: situação (Cliente Top / Em análise / Bloqueado / Inativo) com limite,
  representante e comissão %, zona, transportadora, flag Kanban, pedido único, três blocos de endereço
  (cobrança, faturamento, entrega) mais lista de locais de entrega com um padrão, condições de pagamento
  por semana/mês/período com regra "abaixo de", antecipação/prorrogação, e observações separadas para
  entrega, pedido, fabricação, laudo e faturamento.
- **Entregas parciais por item de pedido**: quantidade pedida, baixada, saldo, data da baixa e nota
  fiscal, com distinção entre *pedido normal* e *pedido kanban*.
- **Documentos gerados**: Ficha de Impressão (FI), Protocolo de Amostra (PA), Requisição de Amostras
  (RQA), relatórios analítico e sintético com export para `.xls`.

### 2.4 Limitações do legado (motivação do projeto)

- Executável em compartilhamento de rede: só funciona dentro da fábrica, em desktop Windows.
- **Nada de mobile.** Fábrica não aponta produção no sistema; vendedor em rua não tem acesso.
- Anexos como caminho de arquivo em rede: frágil, sem versão, sem validade controlada de fato.
- Export "xls" que na verdade é HTML com tabela — sem integração real com planilha ou BI.
- Fila de amostras aguardando (58% em 2026) sem gestão ativa de prazo/alerta.
- Sem rastreabilidade de onde o pedido está no processo em tempo real.

## 3. Premissas do novo sistema (definidas pelo cliente)

1. **Servidor local** na fábrica/escritório (mesmo endereço) — decisão tomada.
2. **Tablets na fábrica** rodando o sistema, para transacionar **Fichas de Serviço**: PCP, máquinas
   (corte, colagem, impressão etc.), conferência, expedição. Objetivo: controle **homem-máquina** e
   visibilidade remota de **onde está o pedido**.
3. **Tablets para vendedores**, com: acesso ao processo da fábrica e à carteira de clientes, e captura de
   **assinatura do cliente** em amostras e propostas de engenharia.
4. **Vendedores trabalham em rua** e não terão acesso ao servidor local. Necessidade de operação
   desconectada.

### 3.1 Modelo de fabricação — CONVERSÃO (confirmado em 27/09/2026)

**A empresa compra chapa pronta de terceiros e faz a conversão.** Não há onduladeira própria.

Isso não é um detalhe de cadastro: define o desenho de três módulos. As consequências assumidas em todo o
resto da documentação são estas:

| Consequência | Onde aparece |
|---|---|
| Não existe operação de ondulação no roteiro, nem bobina em estoque. O parque é de conversão: impressão, riscador/vinco, corte, colagem, grampo, refile | [03 §10](03-BANCO-DE-DADOS.md#10-módulo-8--pcp) — tipos de `maquina` e `operacao` |
| O item de estoque crítico é a **chapa por qualidade e formato**, não a bobina | [03 §12](03-BANCO-DE-DADOS.md#12-módulos-10-e-11--estoque-e-expedição) — `item.tipo = 'CHAPA'` |
| O **plano de corte determina a especificação de compra**: o motor de fórmulas calcula o formato da chapa, e é esse formato que se compra | [02 §4.3](02-ENGENHARIA.md#43-saídas-e-validações) + `necessidade_chapa` |
| A **largura de folha disponível no fornecedor** é restrição de projeto, não parâmetro interno de máquina | `qualidade_chapa_fornecedor.largura_folha_disponivel_mm` |
| O **lead time do fornecedor de chapa entra na promessa de entrega** ao cliente, somado à fila de máquina | `ordem_fabricacao` com estado `AGUARDANDO_CHAPA` |
| Conferência de chapa recebida (gramatura, resistência, esquadro, empenamento, umidade) é controle de qualidade de entrada, e reclamação com fornecedor depende desse registro | `recebimento_item` |
| Sobra de formato é reaproveitável em outra O.F., então saldo de chapa é controlado por formato | `saldo_estoque` por `item` (qualidade + formato) |
| Margem depende de **aproveitamento da chapa**, e o fornecedor é o maior componente do custo | `ficha_tecnica.aproveitamento_pct`, `qualidade_chapa_fornecedor.custo_m2` |

Confirma também a leitura dos campos do legado: **"Qual. int."** é a qualidade especificada pela
engenharia e **"Qual. forn."** é a qualidade que o fornecedor de chapa entrega — duas coisas que precisam
ser comparadas, e não sinônimos.

## 4. Restrições e decisões derivadas

| # | Restrição | Decisão | Onde está detalhada |
|---|---|---|---|
| R1 | A produção não pode parar por queda de internet | Servidor local é autoridade de produção, estoque e expedição; tablets de fábrica operam em LAN | [ADR-0001](adr/0001-topologia-hibrida-local-nuvem.md) |
| R2 | Vendedor sem acesso ao servidor local | Nó em nuvem como ponto de encontro; **nunca** VPN/acesso remoto ao servidor da fábrica | [ADR-0001](adr/0001-topologia-hibrida-local-nuvem.md) |
| R3 | Vendedor pode ficar horas sem sinal | Aplicativo offline-first com base local e fila de envio | [01-ARQUITETURA §5](01-ARQUITETURA.md#5-operação-offline) |
| R4 | Dois nós gravando o mesmo dado gera conflito | Propriedade explícita por agregado + eventos append-only; sem merge automático de estado | [ADR-0002](adr/0002-propriedade-de-dados-e-sincronizacao.md) |
| R5 | Protocolo de amostra precisa de número impresso, offline, único | Numeração por **blocos pré-alocados** por nó/dispositivo | [ADR-0003](adr/0003-numeracao-offline-por-blocos.md) |
| R6 | Usuários conhecem as numerações atuais de cor | UUID como chave interna + **código humano** preservado do legado (`codigo_legado`) | [03-BANCO-DE-DADOS §2](03-BANCO-DE-DADOS.md#2-convenções) |
| R7 | NF-e exige internet e certificado | Emissão no nó local (guarda o certificado A1) com contingência | [01-ARQUITETURA §7](01-ARQUITETURA.md#7-fiscal-e-contingência) |
| R8 | Dados de cliente na nuvem (LGPD) | Escopo mínimo replicado, cifrado em repouso, trilha de acesso, retenção definida | [01-ARQUITETURA §8](01-ARQUITETURA.md#8-segurança-e-lgpd) |
| R9 | Motor de fórmulas é o núcleo técnico e não pode errar | Reimplementado com testes de regressão contra as ~94k F.T. do legado | [02-ENGENHARIA §4](02-ENGENHARIA.md#4-motor-de-fórmulas-de-caixa) |

## 5. Lacunas do modelo de dados versão 0

O documento `Novo Documento de Texto.txt` cobria bem as fundações transversais, mas descrevia uma
indústria genérica. Estes blocos estavam ausentes e entram no modelo novo:

| # | Lacuna | Módulo no doc 03 |
|---|---|---|
| 1 | F.T. como entidade rica (riscador, impressão, estilo, qualidades, chapa, peças/chapa, R$/kg, fator, peso, base+complemento) | Engenharia de Produto |
| 2 | Motor de estilos/fórmulas e limites de máquina | Engenharia de Produto |
| 3 | Amostra / Protocolo / Requisição / Projeto e Desenvolvimento | Amostras e Desenvolvimento |
| 4 | Ferramental (faca, clichê, DTI/DTP) com custo, fornecedor, cobrança e vida útil | Engenharia de Produto |
| 5 | Orçamento como entidade própria, com numeração e histórico, separado do pedido | Comercial |
| 6 | Programação de entregas parciais e kanban de cliente | Comercial |
| 7 | Representante, comissão, transportadora, funcionário, banco | Cadastros |
| 8 | Multi-empresa **dentro** do tenant (o legado já tem campo `Empresa` no cliente) | Núcleo |
| 9 | Fiscal brasileiro real (IPI, CST, NCM/classificação fiscal) e Reforma Tributária (IBS/CBS/IS) | Fiscal |
| 10 | Compras: pedido de compra e recebimento | Suprimentos |
| 11 | Pré-faturamento e Caixas Prontas (estoque de acabados por O.F.) | Estoque / Comercial |
| 12 | Documentos e anexos como entidade (com nº de embalagem e validade), não caminho de rede | Engenharia de Produto |
| 13 | Ficha de Serviço, apontamento homem-máquina, motivo de parada, OEE | Produção |
| 14 | Assinatura do cliente com valor probatório | Amostras e Desenvolvimento |
| 15 | Sincronização entre nós (change log, cursores, conflitos, numeradores) | Sincronização |

Além disso, dois termos apareciam no modelo v0 sem definição — **"Rastro DNA"** e módulo
**"Organizer"**. Foram interpretados como, respectivamente, *rastreabilidade por lote* e *conciliação
financeira*, e implementados com esses nomes (`lote_rastreabilidade` e `conciliacao_bancaria`). Se a
intenção era outra, corrigir aqui e propagar.

## 6. Questões

### 6.1 Respondidas

| # | Questão | Resposta | Data |
|---|---|---|---|
| Q1 | Onduladeira própria ou compra de chapa pronta? | **Compra chapa pronta e converte.** Modelagem ajustada — ver §3.1 | 27/09/2026 |

### 6.2 Abertas

| # | Questão | Por que importa | Responsável |
|---|---|---|---|
| Q2 | Qual o **banco de dados do PcBoot** (Paradox/BDE, Firebird, DBF, Access)? | Define a estratégia e o custo do ETL. **Em investigação** — há indício forte de banco em arquivo em `W:\Tabela` (ver §6.3); rodar `etl/descoberta/descobrir-banco-pcboot.ps1` para confirmar | TI |
| Q3 | Existe contrato/suporte ativo com a PcBoot e acesso ao schema? | Viabiliza extração limpa em vez de scraping de relatório | Negócio |
| Q4 | Quantas máquinas e postos terão tablet? Quantos turnos? | Dimensiona licenças, rede Wi-Fi e a modelagem de turno | Produção |
| Q5 | Quantos vendedores externos e qual o tamanho médio da carteira? | Dimensiona o escopo de sincronização por dispositivo | Comercial |
| Q6 | Quais empresas/CNPJs operam na mesma instalação? | Confirma a necessidade de multi-empresa e de séries fiscais separadas | Fiscal |
| Q7 | A assinatura do cliente na amostra precisa de validade jurídica plena (ICP-Brasil) ou evidência robusta basta? | Define se entra certificado digital do cliente ou apenas assinatura manuscrita + evidências | Jurídico / Negócio |
| Q8 | Há exigência de certificação (ISO 9001, BRC, cliente automotivo)? | O fluxo de Projeto e Desenvolvimento e a rastreabilidade mudam de rigor | Qualidade |
| Q9 | Quantos fornecedores de chapa, e a chapa vem **já no formato** ou em formato padrão para refilar? | Define se `necessidade_chapa` compra formato exato ou se há operação de refile e sobra sistemática | Compras |
| Q10 | Existe estoque de chapa de giro (formatos comuns) ou tudo é comprado por O.F.? | Define se o PCP trabalha com ponto de pedido ou compra sob demanda | Compras / PCP |

### 6.3 Indício sobre o banco do PcBoot (Q2)

Os próprios prints do levantamento apontam para um **banco de dados em arquivo**, não cliente/servidor:

- O executável roda de compartilhamento de rede: `W:\Gerenciador.exe`.
- O caminho de desenho gravado no cadastro de produto é `W:\Tabela\Desenho\<CLIENTE>\...` — e uma pasta
  chamada **`Tabela`** ao lado do executável é o padrão clássico de aplicação Delphi com BDE/Paradox
  (`.DB`) ou dBase (`.DBF`), onde cada tabela é um arquivo.
- A aparência da interface (grid com navegador de registros, abas, visualizador de relatório com botão
  `Close`) e o "export para `.xls`" que na verdade gera HTML são marcas de Delphi com BDE.

Se confirmado, é **boa notícia para o ETL**: dá para ler as tabelas direto, sem depender do fornecedor,
via ODBC/BDE ou conversor. Mas também significa que **não há constraint nem integridade referencial no
banco** — toda validação estava no código do aplicativo, e o perfilamento de dados
([02 §7.1](02-ENGENHARIA.md#71-etapas), etapa 3) vai encontrar mais inconsistência do que o normal.

Confirmar antes de assumir: `etl/descoberta/descobrir-banco-pcboot.ps1`.

## Histórico de revisões

| Data | Autor | Mudança |
|---|---|---|
| 27/09/2026 | — | Versão inicial, consolidando o levantamento do legado e as premissas de fábrica/campo |
