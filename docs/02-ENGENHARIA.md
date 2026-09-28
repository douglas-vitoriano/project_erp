# 02 — Engenharia

## 1. Stack

Escolhida em [ADR-0005](adr/0005-ruby-on-rails-e-hotwire.md), que substitui a stack original (.NET 8 +
React). O contexto que a define é o [ADR-0004](adr/0004-nuvem-pura-sem-servidor-na-fabrica.md): um nó só,
na nuvem, entregue pelo navegador.

| Camada | Escolha | Justificativa |
|---|---|---|
| Banco | **PostgreSQL 16+** | `jsonb`, tipos de intervalo, `EXCLUDE USING gist`, particionamento, RLS. Nenhuma dessas é opcional no modelo deste sistema |
| Aplicação | **Ruby on Rails 8** (Ruby 3.3+), Puma | Velocidade de um time pequeno sobre CRUD denso, que é a maior parte deste ERP |
| Telas de escritório e painel | **Hotwire**: Turbo Drive, Frames, Streams + Stimulus | Renderizado no servidor; entrega telas densas de formulário com uma fração do código de uma SPA |
| Fila, cache e WebSocket | **Solid Queue, Solid Cache, Solid Cable** — tudo no Postgres | Sem Redis. Um serviço a menos para operar e pagar |
| Tablet de máquina | Cliente próprio: **Stimulus + IndexedDB + service worker**, falando JSON idempotente | Precisa apontar durante queda de link ([01-ARQUITETURA §5.1](01-ARQUITETURA.md)). São poucas telas e simples |
| Tablet do vendedor | Cliente próprio com **SQLite (WASM/OPFS)** e fila de envio | Precisa de consulta relacional offline e de escrita offline com assinatura |
| Motor de fórmulas | **Gem Ruby pura**, sem dependência de Rails, com parser próprio | Isolada para rodar a regressão contra as 94 mil F.T. fora da aplicação (§4) |
| Anexos | **Active Storage** sobre backend S3-compatível | Fim do caminho de rede gravado no registro |
| NF-e | **Serviço .NET isolado**, por HTTP com chave de idempotência | O ecossistema fiscal maduro está em .NET; manter só isso lá custa um contêiner ([ADR-0005](adr/0005-ruby-on-rails-e-hotwire.md)) |
| Autorização | **Pundit**, política por módulo e operação | Regra no servidor, nunca só na interface |
| Relatórios | PDF renderizado no servidor + **XLSX real** | Substitui o "xls que é HTML" do legado |
| Migrações | Rails Migrations com **`schema_format = :sql`** | Obrigatório: `schema.rb` não representa `EXCLUDE`, RLS nem domínio com `CHECK` (§3.3) |
| Implantação | **Kamal 2** | Roda em qualquer VPS ou provedor de contêiner, sem amarra a fornecedor ([05-INFRAESTRUTURA-E-CUSTOS](05-INFRAESTRUTURA-E-CUSTOS.md)) |

### 1.1 A fronteira entre servidor e cliente

Hotwire renderiza no servidor; offline-first renderiza no cliente. As duas coisas não se misturam bem, e
por isso a fronteira é declarada em vez de descoberta durante a obra:

| Cliente | Renderização | Funciona sem rede? |
|---|---|---|
| Escritório | Servidor (Hotwire) | Não — e não precisa |
| Painel de galpão | Servidor, empurrado por Turbo Stream | Não — exibe a hora do último dado |
| Tablet de máquina | Cliente, com fila local | **Sim** |
| Tablet do vendedor | Cliente, com banco local | **Sim** |

O Rails é o mesmo nos quatro: mesmas regras de domínio, mesmos casos de uso. Muda só o `respond_to`.

Sobre PWA versus aplicativo nativo: PWA cobre câmera, leitura de QR, assinatura em canvas e armazenamento
offline. Se aparecer necessidade de **modo quiosque** real no tablet de fábrica ou de leitor físico de
código de barras, envolve-se o mesmo código em **Capacitor** e publica-se como APK gerenciado — decisão
adiável sem retrabalho de tela.

## 2. Estrutura do repositório

```
/
├─ docs/                          # esta documentação
├─ app/
│  ├─ models/                     # Active Record + invariantes de domínio
│  │  ├─ nucleo/                  # tenant, tenant_marca, empresa, usuario, permissao
│  │  ├─ cadastro/                # cliente, fornecedor, representante, transportadora
│  │  ├─ engenharia/              # ficha_tecnica, estilo, formula, ferramental, documento
│  │  ├─ amostra/                 # requisicao, protocolo, assinatura, projeto
│  │  ├─ comercial/               # orcamento, pedido, entrega programada, kanban
│  │  ├─ suprimento/              # pedido de compra, recebimento
│  │  ├─ pcp/                     # ordem de fabricacao, roteiro, carga-maquina
│  │  ├─ producao/                # ficha de servico, apontamento, parada, OEE
│  │  ├─ estoque/                 # item, saldo, movimento, lote, inventario
│  │  ├─ expedicao/               # conferencia, volume, carga, romaneio
│  │  ├─ fiscal/                  # nota fiscal, tributacao, series
│  │  └─ financeiro/              # titulos, baixas, conciliacao
│  ├─ operacoes/                  # casos de uso; um objeto por intenção de negócio
│  ├─ policies/                   # Pundit: módulo + operação + carteira do representante
│  ├─ controllers/
│  │  ├─ escritorio/              # responde HTML (Hotwire)
│  │  └─ api/v1/                  # responde JSON para os dois clientes offline
│  ├─ components/                 # ViewComponent
│  ├─ views/
│  ├─ jobs/                       # Solid Queue
│  └─ javascript/
│     ├─ escritorio/              # Stimulus de apoio ao Hotwire
│     ├─ fabrica/                 # cliente offline: fila IndexedDB, service worker, 3 toques
│     └─ campo/                   # cliente offline: SQLite WASM, sincronização, assinatura
├─ lib/
│  ├─ boxflow_calculo/            # MOTOR DE FÓRMULAS + regras de velocidade (gem pura, sem Rails)
│  ├─ boxflow_sequenciador/       # carga-máquina: propõe sequência (gem pura, sem Rails)
│  └─ boxflow_sincronizacao/      # change log, cursores, lotes, conflitos, numeradores
├─ db/
│  ├─ migrate/                    # migrações Rails; DDL sensível via execute()
│  ├─ structure.sql               # esquema real (schema_format = :sql)
│  └─ seeds/                      # estilos FEFCO, qualidades, motivos de parada, NCM
├─ servicos/
│  └─ nfe/                        # serviço .NET isolado: XML, assinatura, contingência
├─ etl/                           # migração do PcBoot
│  ├─ descoberta/                 # identifica o banco do legado (somente leitura)
│  ├─ extracao/
│  ├─ transformacao/
│  └─ conferencia/                # relatórios de divergência legado x novo
├─ images/marca/                  # marca BoxFlow, gerada por parâmetro (ver 04-MARCA)
├─ prototipo/                     # protótipo navegável de interface
└─ config/
   ├─ deploy.yml                  # Kamal
   └─ ...
```

Regra de dependência que importa: **`lib/boxflow_calculo` não conhece Rails.** É biblioteca pura, e é
exatamente por isso que ela é executável contra as 94 mil F.T. do legado por um script, fora da
aplicação (§4.4). `boxflow_sequenciador` segue a mesma regra, pelo mesmo tipo de motivo: proposta gravada
há três semanas precisa poder ser reproduzida fora da aplicação, a partir do registro (§5.6).

## 3. Padrões de desenvolvimento

### 3.1 Domínio

Abordagem **DDD pragmático**: agregados com invariantes no domínio, sem cerimônia de CQRS/event sourcing
por toda parte. Event sourcing aparece só onde o negócio já é naturalmente um fluxo de eventos:
**apontamento de produção** e **movimento de estoque** (ambos append-only).

Invariantes que moram no domínio, não em trigger nem em tela:

- `movimento_estoque` referencia produto **ou** matéria-prima, nunca os dois (restrição do modelo v0,
  mantida e reforçada por `CHECK`).
- F.T. com status `PRODUTO_FINAL` não pode ter medidas de riscador vazias.
- Pedido não é aprovado se o cliente está `BLOQUEADO` ou se estoura o limite de crédito, salvo liberação
  registrada e nominal.
- Ficha de Serviço não fecha com apontamento em aberto.
- Amostra reprovada não gera O.F.

### 3.2 API

A aplicação tem **duas saídas**, e a distinção é deliberada: o escritório consome HTML, os dois clientes
offline consomem JSON. Os dois caminhos chamam o mesmo objeto de `app/operacoes/` — a regra de negócio não
é duplicada.

- REST com recursos em português, alinhados ao vocabulário do negócio
  (`/fichas-tecnicas`, `/ordens-fabricacao/{id}/fichas-servico`).
- **Idempotência obrigatória** em todo POST que pode vir de cliente offline: cabeçalho
  `Idempotencia-Chave` (UUID gerado no dispositivo), com resposta memorizada por 7 dias.
- Concorrência otimista por `versao` (`If-Match`), devolvendo `409` com o estado atual — nunca
  sobrescrevendo em silêncio.
- Paginação por cursor (não por offset) em toda listagem grande, porque as tabelas têm 20 anos.
- Erros com corpo padronizado: código, mensagem para o usuário, campo e detalhe técnico separados.

### 3.3 Migrações de banco

**`config.active_record.schema_format = :sql`.** Não é preferência: o modelo depende de
`EXCLUDE USING gist` com `int8range` ([ADR-0003](adr/0003-numeracao-offline-por-blocos.md)), de políticas
de RLS, de domínios com `CHECK` e de índices parciais. O `schema.rb` não sabe representar nada disso, e
um esquema de teste gerado a partir dele seria mais permissivo que a produção — o pior tipo de diferença
entre ambientes. DDL desses recursos é escrito com `execute` e SQL explícito na migração.

- Uma migração por mudança, imutável após merge. Correção é migração nova.
- Toda migração é **aditiva e compatível com a versão anterior** (ver
  [01-ARQUITETURA §6.4](01-ARQUITETURA.md#64-compatibilidade-de-versões)): coluna nova anulável
  ou com default; renomeação vira `adiciona nova + copia + deprecia`; remoção só após duas versões.
- Migração que toca tabela replicada declara explicitamente o impacto na sincronização no cabeçalho do
  arquivo.
- Índice em tabela grande criado com `CREATE INDEX CONCURRENTLY`.
- O DDL de [03-BANCO-DE-DADOS](03-BANCO-DE-DADOS.md) é atualizado **no mesmo commit** da migração.

### 3.4 Testes

| Tipo | Escopo | Ferramenta | Meta |
|---|---|---|---|
| Unidade | Regras de domínio, motor de fórmulas | RSpec | Cobertura alta em `boxflow_calculo` e nos modelos |
| Regressão de cálculo | 94k F.T. do legado reprocessadas | script sobre a gem pura | ver §4.4 — é o teste mais importante do projeto |
| Integração | Rota + Postgres real | RSpec + banco de teste com `structure.sql` | Fluxos: orçamento→pedido→O.F.→FS→NF-e |
| **Vazamento entre contratantes** | Todo recurso, autenticado como A pedindo id de B | RSpec | Tem que devolver **404**, não 403 ([01-ARQUITETURA §7](01-ARQUITETURA.md)) |
| Sincronização | Dois dispositivos simulados, com partição de rede | RSpec + cliente simulado | Cenários de §6.5 |
| Interface | Fluxos críticos de fábrica e campo | Playwright | Apontamento, assinatura, sincronização, **modo offline forçado** |
| Carga | Listagens sobre 20 anos de histórico; 30 tablets apontando | k6 ou similar | Orçamento de latência de [01-ARQUITETURA §12](01-ARQUITETURA.md) |

Dois testes desta tabela não existiam na versão anterior e são consequência direta da nuvem pura: o de
**vazamento entre contratantes**, porque agora todos os clientes dividem um banco, e o de **modo offline
forçado** no tablet de fábrica, porque não existe mais servidor local para absorver a queda.

### 3.5 Multi-contratante no Active Record

Todo request abre a conexão com `SET LOCAL app.tenant_id` dentro de um `around_action`, e as políticas de
RLS do Postgres filtram a partir daí. O escopo no Active Record continua existindo — é o que faz a consulta
ser eficiente — mas **a RLS é a rede de segurança**: escopo esquecido é o erro mais fácil de cometer em
SaaS multi-tenant, e a única forma de ele não virar vazamento é o banco recusar a linha.

Duas consequências práticas: `Solid Queue` precisa carregar o `tenant_id` no payload do job e reabrir o
contexto ao executar, porque job roda fora do request; e migração que roda DDL tem que ser executada com
papel que **contorna** a RLS, senão ela não vê as linhas que precisa alterar.

### 3.6 Tema do contratante

Implementação do contrato definido em [04-MARCA §3](04-MARCA.md) e
[ADR-0006](adr/0006-marca-branca-por-contratante.md).

- A cor primária informada pelo contratante é validada **na gravação**, e a escala derivada (50 a 900) é
  persistida em `tenant_marca.escala` junto do resultado da validação. Não se recalcula por requisição.
- O tema chega ao navegador como **variável CSS** em uma folha por contratante, servida em rota própria
  com impressão digital no caminho (`/tema/<tenant>-<hash>.css`) e cache longo. Impressão digital no
  caminho é o que evita tema de um contratante ser servido a outro por cache intermediário.
- Para não piscar na carga, as variáveis essenciais — cor de fundo da barra e cor primária — são inseridas
  também em `<style>` no `<head>` do layout, que já é renderizado no servidor.
- Logotipo enviado passa por verificação de tipo real, limite de tamanho e **sanitização de SVG**. SVG
  aceita `<script>`; logotipo de terceiro sem sanitizar é XSS com a nossa permissão.
- As cores de estado ficam em folha separada, que o tema **não** pode sobrescrever — nem por ordem de
  carga, nem por especificidade. Elas são declaradas depois e com escopo próprio.

## 4. Motor de fórmulas de caixa

É o núcleo técnico do sistema e o maior risco de erro silencioso: um cálculo errado de riscador produz
um lote inteiro de caixa fora de medida.

### 4.1 Entrada e variáveis

Variáveis, exatamente como o legado documenta na aba *Ajuda das fórmulas*:

| Letra | Significado |
|---|---|
| `C` | Comprimento |
| `L` | Largura |
| `A` | Altura |
| `S` | Transpasse superior |
| `I` | Transpasse inferior |
| `W` | Comprimento da faca |
| `R` | Largura da faca |

Qualquer outro identificador é **recusado** — comportamento idêntico ao legado ("qualquer outra inclusão
será recusada"), e agora com mensagem de erro que diz qual token foi rejeitado.

### 4.2 Implementação

```
texto da fórmula ──► léxico ──► parser (precedência) ──► AST ──► validação ──► avaliação decimal
```

- Gramática mínima: números decimais, as 7 variáveis, `+ - * /`, parênteses. Sem função, sem condicional.
  Manter deliberadamente pobre: fórmula de caixa não precisa de linguagem, e linguagem embutida em ERP
  vira dívida eterna.
- **Parser próprio, por descida recursiva. Nunca `eval`.** A fórmula é dado de cliente, gravado no banco
  e editável pela engenharia. `eval` sobre dado de cliente em processo multi-contratante é execução
  remota de código com acesso ao banco de todos os contratantes. Este é o requisito de segurança mais
  importante do motor, acima de qualquer consideração de desempenho.
- **AST compilada e cacheada** por estilo e versão — recalcular 94 mil F.T. exige isso.
- Aritmética em `BigDecimal` com arredondamento explícito e documentado por slot. Nunca `Float`:
  medida de caixa em ponto flutuante binário produz 122,99999 e briga na fábrica.
- A gem **não depende de Rails** e recebe as sete variáveis como argumento simples. É isso que permite
  rodar a regressão do §4.4 por script, sobre um dump do legado, sem subir a aplicação.
- Fórmula é **versionada**: alterar a fórmula de um estilo cria versão nova com vigência, e as F.T.
  existentes continuam apontando para a versão com que foram calculadas. Sem isso, "corrigir" um estilo
  reescreveria retroativamente 20 anos de ficha.

### 4.3 Saídas e validações

Para cada F.T. o motor produz:

- Vetor de **larguras (R1..R9)** e de **comprimentos (I1..I9)** em mm, com o total de cada eixo.
- Dimensão da chapa (largura × comprimento) e **peças por chapa** / nº por impressão.
- Aproveitamento (%) e sobra.
- Peso unitário (a partir de gramatura × área) e o **fator** usado na precificação.
- Preço: R$/caixa, R$/kg e R$/conjunto (base + complemento).

Validações que bloqueiam a gravação da F.T.:

- Total fora dos limites **mín/máx da impressora** e **mín/máx do riscador** do estilo.
- Largura da chapa maior que a **largura da folha** disponível na qualidade escolhida.
- Faca informada incompatível com as dimensões calculadas (`W`/`R`).

Isso transforma em erro de sistema o que hoje depende da experiência de quem digita.

### 4.4 Teste de regressão contra o legado (obrigatório)

Antes de qualquer tela nova, o motor tem que provar que reproduz o passado:

1. Extrair do PcBoot todas as F.T. com suas entradas (estilo, C, L, A, transpasses, faca) **e** suas
   saídas gravadas (medidas de riscador e de impressão, chapa, peso, peças/chapa).
2. Reprocessar as entradas no motor novo.
3. Comparar saída por saída, com tolerância zero em mm.
4. Toda divergência é triada em uma de três gavetas: **bug do motor novo** (corrigir),
   **dado legado alterado à mão** (documentar como exceção conhecida), ou **regra não descoberta**
   (levantar com a engenharia e virar requisito).

A meta de aceite é divergência explicada em 100% dos casos — não "quase igual". Este é o critério que
autoriza desligar o PcBoot.

### 4.5 Motor de regras de velocidade e de setup

Mora na mesma gem `lib/boxflow_calculo`, por dois motivos: reusa a aritmética decimal já testada e, como a
gem não conhece Rails, a regra pode ser avaliada em script sobre um dump do legado — que é exatamente o
que a calibração de [06 §4.6](06-PARIDADE-COMPETITIVA.md#46-calibração-de-onde-saem-os-números) precisa
fazer antes de haver aplicação no ar.

**Vocabulário fechado, pela mesma razão do §4.1.** Atributo fora da lista de `maquina_regra.atributo` é
recusado, com mensagem dizendo qual. A tentação de aceitar "qualquer campo do banco", como o produto de
referência faz, é a mesma tentação do `eval` no §4.2, com o mesmo agravante: regra de contratante
interpretada em tempo de execução num processo que atende todos os contratantes. Recusado pelo mesmo
motivo, e a lista de atributos é ampliada por *deploy*, não por cadastro.

**Avaliação sem estado e sem ordem.** A assinatura é `(maquina, caracteristicas_do_trabalho, finalidade) →
resultado`, sendo `caracteristicas_do_trabalho` um mapa de atributo para valor, extraído da F.T. e do
ferramental. O resultado é uma estrutura, não um número:

```
{ velocidade_hora:, setup_min:, refugo_setup_folhas:, proibido:, penalidade:, regras_aplicadas: [...] }
```

`regras_aplicadas` não é diagnóstico opcional — é o que a tela mostra quando alguém pergunta por que a
velocidade caiu, e é o que o sequenciador põe no motivo da posição. Uma implementação que devolva só o
número obriga a recalcular para explicar, e explicação recalculada divergindo do número original é um bug
que aparece em reunião.

**Composição comutativa**, conforme [03 §10.2](03-BANCO-DE-DADOS.md#102-regras-de-velocidade-e-de-setup):
mínimo dos tetos, produto dos fatores, soma dos adicionais, disjunção do `PROIBIR`, soma das penalidades. O
teste que garante isso é direto e vale a pena escrever primeiro: **avaliar o mesmo conjunto de regras em
ordens embaralhadas tem de dar resultado idêntico**, para qualquer permutação.

Testes obrigatórios do motor de regras:

| Teste | O que prova |
|---|---|
| Permutação de regras | Composição independente de ordem (propriedade, não exemplo) |
| Sem regra que casa | Devolve `capacidade_hora` intacta, nunca zero nem nulo |
| `PROIBIR` presente | Bloqueia mesmo se outra regra der velocidade ótima |
| `VELOCIDADE_FATOR` fora de `(0, 1]` | Recusado na gravação, não na avaliação |
| Atributo desconhecido | Recusado, com o nome do atributo na mensagem |
| Finalidade `CUSTEIO` contra `ROTEIRIZACAO` | Mesma entrada devolve números diferentes quando as regras diferem |
| Vigência expirada | Regra com `vigencia_fim` no passado não participa |

## 5. Fichas de Serviço e controle homem-máquina

### 5.1 Encadeamento

```
Pedido ─► Item do pedido ─► Ordem de Fabricação (O.F.)
                                     │
                                     ├─ roteiro: sequência de operações
                                     │    impressão → corte/vinco → colagem/grampo → conferência → expedição
                                     │
                                     └─ para cada operação: FICHA DE SERVIÇO (FS)
                                              │ QR code impresso
                                              └─ apontamentos (eventos append-only)
```

A **FS é a unidade de trabalho do piso de fábrica**: uma operação, em uma máquina, com quantidade
prevista, sequência e QR. É o que o tablet lê e o que o operador enxerga.

### 5.2 Máquina de estados da FS

```
AGUARDANDO ──► EM_SETUP ──► EM_PRODUCAO ──► CONCLUIDA
                  │              │  ▲
                  │              ▼  │
                  └──────────► PAUSADA / PARADA (com motivo)
                                     │
                                     ▼
                                 CANCELADA
```

Eventos de apontamento: `SETUP_INICIO`, `SETUP_FIM`, `PRODUCAO_INICIO`, `PAUSA`, `RETOMADA`,
`PARADA` (com motivo obrigatório), `REFUGO` (com quantidade e motivo), `FIM`, `CANCELAMENTO`.

Eventos são **imutáveis**. Correção de apontamento errado gera um evento de estorno nominal, com
justificativa — não um `UPDATE`. É o que dá confiança ao indicador e ao apuramento de hora-máquina.

### 5.3 Homem-máquina de verdade

A relação não é 1:1 e o modelo precisa aceitar isso:

- Uma máquina pode ter **vários operadores** no mesmo período (ex.: coladeira com dois na saída).
- Um operador pode atender **várias máquinas** (ex.: dois riscadores em paralelo).
- Um operador troca de máquina no meio do turno.

Por isso existe `ficha_servico_operador` (FS × usuário × janela × função), independente dos eventos da
FS. O custo de mão de obra e o de máquina são apurados separadamente, e o rateio do operador que está em
duas máquinas é proporcional ao tempo declarado.

### 5.4 Indicadores derivados

- **OEE** por máquina/turno/dia: disponibilidade (tempo produzindo ÷ tempo programado), performance
  (produção real ÷ capacidade teórica) e qualidade (boas ÷ total, usando refugo).
- **Carga-máquina**: fila de FS por máquina com tempo previsto, alimentando a promessa de data de entrega.
- **Tempo de setup separado do de produção** — é o que revela onde o dinheiro está sendo perdido em
  troca de faca e clichê.
- **Rastreamento do pedido**: posição consolidada a partir da FS mais avançada de cada O.F., exposta ao
  escritório e ao tablet do vendedor.

### 5.5 Interface de fábrica (requisito de engenharia, não de estética)

- Operação em **três toques**: ler QR da FS → escolher evento → confirmar.
- Alvos de toque grandes, alto contraste, legível com luva e com poeira de papel na tela.
- Sem digitação livre no fluxo principal; motivo de parada é botão, não campo de texto.
- Estado de conexão e número de eventos pendentes sempre visíveis.
- Bloqueio de navegação acidental (modo quiosque) e retorno automático à tela da máquina.

### 5.6 Sequenciador de carga-máquina

Decisão e alternativas recusadas em [ADR-0007](adr/0007-sequenciamento-como-proposta-auditavel.md); plano e
ordem no roteiro em [06 §6](06-PARIDADE-COMPETITIVA.md#6-etapa-3--sequenciamento). Aqui fica a
implementação.

**Onde mora.** Em `lib/boxflow_sequenciador`, ao lado do motor de cálculo e com a mesma regra: não conhece
Rails. Recebe um retrato imutável do estado (FS pendentes, máquinas, turnos, ferramental, regras, portões de
chapa) e devolve uma proposta. Não lê nem escreve banco. É isso que permite reproduzir uma proposta de três
semanas atrás a partir do registro em `sequencia_proposta`, com a mesma versão de algoritmo e a mesma
semente, para descobrir por que ela sugeriu o que sugeriu.

**Algoritmo, em duas fases.** Nenhuma delas exige solver — o problema é sequenciamento em máquinas
paralelas com setup dependente da sequência, em cerca de dez máquinas:

1. **Atribuição.** Para cada operação pendente, as máquinas candidatas são as que passam pelas restrições
   duras (limites dimensionais, `PROIBIR`, ferramental disponível e dentro da vida útil, portão de chapa).
   Entre as candidatas, custo = tempo estimado pelo motor do §4.5 com finalidade `ROTEIRIZACAO`, mais
   penalidade das regras `PENALIZAR`, mais a fila já existente na máquina.
2. **Sequenciamento por máquina.** Despacho guloso por folga de prazo, com **antecipação de afinidade**:
   antes de fixar a próxima posição, verifica se algum trabalho adiante compartilha faca, clichê ou
   qualidade de chapa com o atual e se puxá-lo para cá economiza mais setup do que custa em atraso. Depois,
   busca local (troca e reinserção) sob orçamento de tempo fixo, aceitando só melhora do objetivo.

O objetivo é `peso_atraso × atraso_ponderado_por_prioridade + peso_setup × minutos_de_setup`. Os dois pesos
são parâmetro do contratante e ficam gravados na proposta, porque a fábrica que vive de prazo e a que vive
de margem querem respostas diferentes — e porque comparar duas propostas exige saber com que pesos cada uma
foi feita.

**Determinismo.** Semente fixa gravada em `sequencia_proposta.semente`, nenhuma iteração sobre estrutura
sem ordem definida, nenhuma leitura de relógio dentro do algoritmo — o "agora" entra como argumento. Sem
isso não há teste reproduzível e o PCP não distingue mudança causada pela fábrica de mudança causada por
sorteio.

**Cadência.** Job do Solid Queue disparado por evento (`OF_LIBERADA`, `FS_CONCLUIDA`,
`FERRAMENTAL_ALTERADO`, `CHAPA_RECEBIDA`, `ABERTURA_TURNO`) com carência de alguns minutos para agrupar
rajadas, mais um piso de tempo para o caso de nada disparar. Uma proposta pendente é marcada `SUPERADA`
quando outra nasce — proposta acumulada em fila é pior que proposta nenhuma, porque o PCP nunca sabe qual
está olhando.

Como o job é multi-contratante, vale o §3.5: `tenant_id` vai no payload e o `around_action` equivalente do
job aplica o `SET LOCAL`. Sequenciador que vaza entre contratantes não é bug de programação, é incidente.

**Horizonte congelado.** FS em `EM_SETUP` ou `EM_PRODUCAO` nunca se move. As próximas `N` por máquina
(padrão 2) saem com `congelada = true` e `motivo_codigo = 'CONGELADA'`. O motivo é físico: o operador já
está com a faca da próxima na bancada.

**Escrita.** O algoritmo grava só `sequencia_proposta` e seus itens. `ficha_servico.sequencia_fila` é escrita
pelo serviço de aceite, em transação, e só para itens não congelados.

Testes obrigatórios do sequenciador:

| Teste | O que prova |
|---|---|
| Mesma entrada duas vezes | Saída idêntica, item por item (determinismo) |
| FS em `EM_PRODUCAO` | Não muda de posição em nenhuma circunstância |
| Faca em `EM_MANUTENCAO` | O.F. sai da fila com `motivo_codigo = 'ADIADA_FERRAMENTAL'` |
| `necessidade_chapa` pendente | O.F. não entra na fila, mesmo com prazo estourando |
| Duas O.F. com a mesma faca e prazos folgados | Ficam adjacentes, e `economia_setup_min` é maior que zero |
| Prazo apertado contra economia de setup | Com `peso_atraso` alto, o prazo vence; com `peso_setup` alto, o agrupamento vence |
| Máquina não calibrada | Fica fora de `maquinas_incluidas` e sua fila não é tocada |
| Proposta anterior pendente | Passa a `SUPERADA` quando a nova nasce |
| Dois contratantes com dados semelhantes | Nenhuma FS de um aparece na proposta do outro |
| Aceite com edição | `posicao_aceita` difere de `posicao_proposta` e `situacao` fica `ACEITA_COM_EDICAO` |

## 6. Motor de sincronização

### 6.1 Componentes

Só existe o eixo **dispositivo ↔ nuvem**. O eixo entre nós, que era a parte mais difícil do desenho
anterior, desapareceu com o [ADR-0004](adr/0004-nuvem-pura-sem-servidor-na-fabrica.md).

| Componente | Onde roda | Função |
|---|---|---|
| `sync_alteracao` + gatilhos | PostgreSQL | Registrar toda mudança com sequência global monotônica |
| Rotas `/sync/v1` | Rails | `pull`, `push`, `handshake`, `numerador/bloco`, `anexo` |
| `lib/boxflow_sincronizacao` | Rails | Cursores, lotes, idempotência, conflito, blocos de numeração |
| Cliente de sincronização | PWA do vendedor | Aplicar pull no SQLite local, drenar a fila de push |
| Fila de eventos | PWA de fábrica | Persistir apontamento em IndexedDB e reenviar |

### 6.2 Fluxo de pull

```
GET /sync/v1/pull?cursor=<versao_global>&limite=500
  → { itens: [{tabela, registro_id, operacao, versao, payload}], proximo_cursor, tem_mais }
```

O servidor filtra pelo **escopo do solicitante** (papel + carteira + janela temporal) e aplica exclusão
lógica como operação normal (`deletado_em` preenchido), para que o cliente remova o registro local.

### 6.3 Fluxo de push

```
POST /sync/v1/push
  { operacoes: [ { idempotencia_chave, tipo: "CriarRequisicaoAmostra", payload: {...} }, ... ] }
  → { resultados: [ { idempotencia_chave, situacao: ACEITA|DUPLICADA|REJEITADA, motivo, entidade_id } ] }
```

Três pontos deliberados:

1. O push envia **intenção de negócio**, não linha de tabela. Assim o servidor pode rejeitar com motivo
   ("cliente bloqueado em 12/09", "F.T. inativada") em vez de gravar algo inválido.
2. `DUPLICADA` é resposta de sucesso — reenvio após timeout é o caso normal em 4G, não um erro.
3. Rejeição volta para a **caixa de pendências do vendedor**, com o motivo em linguagem clara. Nada é
   descartado em silêncio, e ele descobre no tablet, não pelo cliente reclamando.

### 6.4 Conflito

Com propriedade explícita ([ADR-0002](adr/0002-propriedade-de-dados-e-sincronizacao.md)) o conflito é
exceção. Quando ocorre: **vence o dono do agregado**, e o caso inteiro (as duas versões) vai para
`sync_conflito` com alerta. Nunca há merge automático de campos de documento — essa é a fonte clássica de
dado corrompido silenciosamente em sistemas distribuídos.

### 6.5 Cenários que os testes precisam cobrir

1. Vendedor cria orçamento offline, sobe 3 dias depois, cliente foi bloqueado no intervalo.
2. Dois tablets de vendedores diferentes criam amostra para o mesmo cliente offline, ao mesmo tempo.
3. Tablet do vendedor esgota o bloco de numeração offline.
4. Tablet de fábrica aponta 200 eventos com Wi-Fi caído e reenvia tudo.
5. Reenvio duplicado do mesmo lote (timeout na resposta) — não pode gerar apontamento em dobro.
6. **Fábrica fica 8 h sem link**: turno inteiro apontado em fila local, drenagem sem perda nem ordem
   invertida, e escritório bloqueando envio em vez de aceitar e perder.
7. **PWA de fábrica em versão antiga** (semanas sem recarregar) contra servidor novo — handshake,
   bloqueio com mensagem clara, e atualização que **só** ocorre depois de a fila drenar.
8. Tablet perdido e revogado — bloqueio de push e apagamento da base local no próximo contato.
9. Relógio do tablet errado em 2 h — ordenação por sequência do servidor, não por hora do cliente.
10. Anexo grande (desenho) sincronizando em 4G lento sem travar a fila de dados.
11. **Token do posto expira durante a queda de link** — o tablet continua coletando em fila, mas não
    abre tela nova ([01-ARQUITETURA §9.1](01-ARQUITETURA.md)).

O item 9 merece destaque: **nunca ordenar por horário do dispositivo**. A ordem é sempre a sequência
atribuída pelo servidor; o horário do cliente é gravado como informação, não como critério.

## 7. Migração do legado (PcBoot)

### 7.1 Etapas

1. **Descoberta** — identificar o banco do PcBoot (Q2 do doc 00), mapear tabelas e tipos. Enquanto isso
   não estiver resolvido, todo cronograma de migração é estimativa sem base.
   Ponto de partida: rodar **`etl/descoberta/descobrir-banco-pcboot.ps1`** na estação que usa o sistema.
   O script identifica o motor (Paradox/BDE, dBase, Firebird, Access, SQL Server), localiza os arquivos de
   dados, mede o volume por tabela e gera um relatório. Indício atual: banco em arquivo sob `W:\Tabela`
   (ver [00 §6.3](00-CENARIO-E-PREMISSAS.md#63-indício-sobre-o-banco-do-pcboot-q2)).
2. **Extração** — cópia bruta para uma área de trabalho (`staging`), sem transformação, preservando tudo.
3. **Perfilamento** — medir de verdade: campos vazios, duplicidade de cliente/CNPJ, F.T. órfã, estilo
   sem fórmula, medida inconsistente. Aqui se descobre o tamanho real do problema.
4. **Transformação** — mapear para o modelo novo, gerando `id` UUID e preservando o número humano em
   `codigo_legado` (F.T. 92281 continua sendo 92281 na tela).
5. **Ingestão de anexos** — varrer `W:\Desenhos` e `W:\Tabela\Desenho`, calcular hash, subir para o
   storage, vincular à F.T. pelo caminho, guardar `caminho_legado`.
6. **Conferência** — relatórios de divergência que o **negócio** assina: totais por cliente, F.T. por
   status, títulos em aberto, saldo de estoque, amostras por situação, e a regressão de cálculo do §4.4.
7. **Ensaios** — no mínimo três migrações completas de ensaio, cronometradas, antes da definitiva.
8. **Cutover** — congelamento do PcBoot, migração final, conferência, liberação. O legado permanece
   disponível **somente para consulta** por um período definido.

### 7.2 Regras de migração

- Nada é "limpo" em silêncio. Dado ruim é migrado e **marcado** (`qualidade_dado`), ou rejeitado em
  relatório para alguém decidir. Silêncio na migração é o que destrói a confiança no sistema novo.
- Numeração legada continua na mesma sequência: os numeradores novos começam acima do maior valor
  existente (F.T. > 93.865, amostra > 30.803, orçamento > 77.120).
- Histórico financeiro e fiscal migra com exclusão lógica apenas — nunca exclusão física.
- Toda entidade migrada carrega `origem = 'PCBOOT'` e a data da migração, para auditoria posterior.

## 8. Fases de entrega

Sequência pensada para que cada fase entregue valor sozinha e reduza risco da seguinte.

| Fase | Entrega | Por que nesta ordem |
|---|---|---|
| **0** | Infra em nuvem, contratante e tema, identidade, esqueleto de sincronização, migração de ensaio | Nada funciona antes disso, e a migração de ensaio revela cedo o tamanho do problema de dados. `tenant` e `tenant_marca` entram na fase 0 porque multi-contratante retrofitado é reescrita, não ajuste |
| **1** | Engenharia: F.T., estilos, fórmulas, ferramental, documentos + **regressão contra 94k F.T.** | É o núcleo e o maior risco técnico. Provar aqui autoriza o resto |
| **2** | Comercial: orçamento, pedido, programação de entregas, kanban | Alimenta a produção; sem pedido não há O.F. |
| **3** | **Amostras + tablet do vendedor com assinatura** | Maior dor atual (58% da fila aguardando) e o pedido explícito do cliente |
| **4** | PCP + Produção: O.F., roteiro, **Fichas de Serviço nos tablets**, homem-máquina, rastreio do pedido | Depende de F.T. e pedido existirem no sistema novo |
| **5** | Estoque, conferência e expedição | Fecha o ciclo físico |
| **6** | Fiscal (NF-e, IBS/CBS) e Financeiro | Último a migrar por ser o de maior risco regulatório; convive com o legado até estar provado |
| **7** | Indicadores, OEE, painéis, **modelo de leitura e retenção do histórico** | Só faz sentido com dado sendo coletado de verdade. O histórico sobe de prioridade dentro da fase: é substrato da fase 8, não enfeite ([ADR-0008](adr/0008-historico-analitico-no-mesmo-postgres.md)) |
| **8** | Regras de velocidade e setup calibradas, não conformidade, cabimento de carga, e **só então o sequenciador** | Paridade competitiva ([06](06-PARIDADE-COMPETITIVA.md)). A ordem interna desta fase não é negociável: sequenciador antes de velocidade medida programa com número inventado |
| **9** | Portal do cliente | Depende de tudo acima estar confiável para ser exposto a terceiro |

As fases 3 e 4 são as que mudam a vida da empresa — e são também as que dependem de Wi-Fi e de adesão do
operador. Recomenda-se **piloto em uma única máquina** antes de escalar para todas.

Duas observações sobre as fases 7 e 8, acrescentadas em 28/09/2026. O portal do cliente saiu da fase 7 e
virou fase 9: ele era o único item daquela lista que expõe dado a terceiro, e não faz sentido expor antes de
o indicador interno estar confiável. E a fase 8 tem ordem interna obrigatória, explicada em
[06 §2](06-PARIDADE-COMPETITIVA.md#2-a-cadeia-a-ordem-importa-mais-que-a-lista) — coleta confiável, depois
histórico, depois calibração, depois sequenciamento. Construir na ordem inversa é o modo documentado de
desperdiçar o esforço.

## 9. Observabilidade e qualidade em produção

- Log estruturado com `tenant_id`, `dispositivo_id`, `usuario_id` e `correlacao_id` — requisito para
  investigar "meu apontamento não chegou" e, mais ainda, para responder a um incidente de vazamento
  entre contratantes.
- Métrica de negócio no mesmo painel da métrica técnica: amostras aguardando por faixa de idade,
  FS paradas sem motivo, pedidos sem O.F., títulos vencidos.
- Alertas com dono definido e ação esperada. Alerta sem ação vira ruído e depois vira desligado.

## 10. Questões abertas de engenharia

| # | Questão | Impacto |
|---|---|---|
| E1 | Banco do PcBoot e disponibilidade do schema | Define esforço de ETL (ver Q2 do doc 00). Script de descoberta disponível em `etl/descoberta/` |
| ~~E2~~ | ~~Onduladeira própria ou compra de chapa~~ | **Respondida:** compra chapa pronta e converte. Roteiro sem ondulação; item crítico é chapa por qualidade e formato (ver [00 §3.1](00-CENARIO-E-PREMISSAS.md#31-modelo-de-fabricação--conversão-confirmado-em-27092026)) |
| E3 | Tablet Android gerenciado ou iPad | Afeta modo quiosque, MDM e leitura de código de barras |
| ~~E4~~ | ~~Provedor de NF-e: biblioteca própria ou serviço~~ | **Respondida:** serviço **.NET isolado** mantido pelo projeto, acessado por HTTP ([ADR-0005](adr/0005-ruby-on-rails-e-hotwire.md)) |
| E5 | Assinatura precisa de ICP-Brasil | Define se entra assinatura qualificada (Q7) |
| E6 | Existe balança/leitor/PLC a integrar nas máquinas | Apontamento pode ser parcialmente automático em vez de manual |
| E7 | Chapa vem no formato exato ou há refile interno | Define se existe operação `REFILE` no roteiro padrão e como se contabiliza a sobra (Q9) |
| **E8** | Custódia do certificado A1 na nuvem: cofre do provedor ou serviço dedicado | Define cláusula contratual e o desenho do serviço de NF-e ([01-ARQUITETURA §8](01-ARQUITETURA.md)) |
| **E9** | Migração do legado é por contratante ou só para o primeiro | O ETL do PcBoot serve um cliente; o segundo contratante pode vir de outro sistema |
| **E10** | Planos comerciais: o que limita — usuários, dispositivos, volume de anexo | Define o que precisa ser medido por contratante desde a fase 0 |
| **E11** | Vazão real: quantas O.F. e FS por dia | A estimativa do [ADR-0008](adr/0008-historico-analitico-no-mesmo-postgres.md) é derivada da contagem de orçamentos, não medida. Decide partição das tabelas de evento |
| **E12** | O PcBoot guarda tempo **real** de setup e produção, ou só o previsto? | Se guarda, a semente da calibração vem do ETL e a linha de base do sequenciador já existe. Se não, são 30 dias de medição antes de ligar ([06 §4.6](06-PARIDADE-COMPETITIVA.md#46-calibração-de-onde-saem-os-números)) |
| **E13** | Dono da regra de velocidade: engenharia ou PCP? | Define permissão de escrita em `maquina_regra` e quem aceita a recalibração proposta |
| **E14** | A fábrica quer otimizar prazo ou margem? | Define `peso_atraso` e `peso_setup` iniciais do objetivo do sequenciador (§5.6) |

## Histórico de revisões

| Data | Mudança |
|---|---|
| 27/09/2026 | Versão inicial: stack, padrões, motor de fórmulas, fichas de serviço, sincronização, migração, fases |
| 28/09/2026 | Stack trocada para **Ruby on Rails** ([ADR-0005](adr/0005-ruby-on-rails-e-hotwire.md)): §1 e §2 reescritos, fronteira servidor/cliente declarada (§1.1), `schema_format = :sql` (§3.3), multi-contratante com RLS (§3.5), tema do contratante (§3.6), proibição explícita de `eval` no motor (§4.2), sincronização reduzida a um eixo (§6.1), cenários de teste de nuvem pura (§6.5), E4 respondida, E8–E10 abertas |
| 28/09/2026 | Paridade competitiva ([06](06-PARIDADE-COMPETITIVA.md)): motor de regras de velocidade e setup (§4.5), sequenciador de carga-máquina com determinismo e horizonte congelado (§5.6), gem `boxflow_sequenciador` no §2, fases 8 e 9 com ordem interna obrigatória (§8), questões E11–E14 |
