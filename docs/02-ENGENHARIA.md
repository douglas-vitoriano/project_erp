# 02 — Engenharia

## 1. Stack

| Camada | Escolha | Justificativa |
|---|---|---|
| Banco | **PostgreSQL 16+** | `jsonb`, tipos de intervalo, exclusão por restrição, particionamento, extensões; roda igual no nó local e na nuvem |
| Backend | **.NET 8 / ASP.NET Core** + EF Core | Aderente ao modelo v0 (enums, uuid, jsonb); ecossistema sólido de NF-e; equipe brasileira encontra profissional |
| Frontend | **React + TypeScript**, PWA instalável | Um só código para escritório, tablet de fábrica e tablet de vendedor; instala sem loja de aplicativos |
| Base local do cliente | **SQLite (WASM/OPFS)** no tablet do vendedor, **IndexedDB** na fila do tablet de fábrica | O vendedor precisa consultar relacional offline; a fábrica precisa apenas de fila |
| Anexos | **MinIO** (local) + bucket S3 (nuvem) | Mesma API nos dois nós |
| Empacotamento | **Docker Compose** | Operação simples para TI pequena |
| Identidade | **OIDC** (Keycloak self-hosted na nuvem) | Token validável offline no nó local via JWKS |
| Relatórios | Renderização própria em PDF (QuestPDF) + export XLSX real (ClosedXML) | Substitui o "xls que é HTML" do legado |
| Migrações | **DbUp** ou EF Core Migrations, scripts versionados em SQL | Ver §3.3 |

Sobre PWA versus aplicativo nativo: PWA cobre câmera, leitura de código de barras/QR, assinatura em
canvas e armazenamento offline. Se aparecer necessidade de **modo quiosque** real no tablet de fábrica ou
de leitor físico de código de barras, envolve-se o mesmo código em **Capacitor** e publica-se como APK
gerenciado — decisão adiável sem retrabalho de tela.

## 2. Estrutura do repositório

```
/
├─ docs/                          # esta documentação
├─ src/
│  ├─ Erp.Dominio/                # entidades, regras, invariantes (sem dependência de infra)
│  │  ├─ Nucleo/                  # tenant, empresa, usuario, permissao
│  │  ├─ Cadastro/                # cliente, fornecedor, representante, transportadora
│  │  ├─ Engenharia/              # ficha_tecnica, estilo, formula, ferramental, documento
│  │  ├─ Amostra/                 # requisicao, protocolo, assinatura, projeto
│  │  ├─ Comercial/               # orcamento, pedido, entrega programada, kanban
│  │  ├─ Suprimento/              # pedido de compra, recebimento
│  │  ├─ Pcp/                     # ordem de fabricacao, roteiro, carga-maquina
│  │  ├─ Producao/                # ficha de servico, apontamento, parada, OEE
│  │  ├─ Estoque/                 # item, saldo, movimento, lote, inventario
│  │  ├─ Expedicao/               # conferencia, volume, carga, romaneio
│  │  ├─ Fiscal/                  # nota fiscal, tributacao, series
│  │  └─ Financeiro/              # titulos, baixas, conciliacao
│  ├─ Erp.Aplicacao/              # casos de uso, validações, autorização
│  ├─ Erp.Infra/                  # EF Core, repositórios, storage, integrações
│  ├─ Erp.Calculo/                # MOTOR DE FÓRMULAS DE CAIXA (isolado e testável)
│  ├─ Erp.Sincronizacao/          # change log, cursores, lotes, conflitos, numeradores
│  ├─ Erp.Api/                    # ASP.NET Core (host do nó local e do nó nuvem)
│  ├─ Erp.AgenteSync/             # serviço que roda no nó local e conversa com a nuvem
│  ├─ Erp.Nfe/                    # emissão, eventos, contingência
│  └─ Erp.Web/                    # PWA React
│     ├─ app-escritorio/
│     ├─ app-fabrica/             # UI de toque grosso, alto contraste, 3 toques
│     └─ app-campo/               # offline-first, sincronização, assinatura
├─ db/
│  ├─ migracoes/                  # 0001_nucleo.sql, 0002_cadastro.sql, ...
│  └─ seeds/                      # estilos FEFCO, qualidades, motivos de parada, NCM
├─ etl/                           # migração do PcBoot
│  ├─ extracao/
│  ├─ transformacao/
│  └─ conferencia/                # relatórios de divergência legado x novo
└─ infra/
   ├─ compose.local.yml
   ├─ compose.nuvem.yml
   └─ observabilidade/
```

Regra de dependência: `Dominio` não conhece ninguém. `Erp.Calculo` também não — é biblioteca pura, e é
por isso que ela é testável contra as 94 mil F.T. do legado.

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

- REST com recursos em português, alinhados ao vocabulário do negócio
  (`/fichas-tecnicas`, `/ordens-fabricacao/{id}/fichas-servico`).
- **Idempotência obrigatória** em todo POST que pode vir de cliente offline: cabeçalho
  `Idempotencia-Chave` (UUID gerado no dispositivo), com resposta memorizada por 7 dias.
- Concorrência otimista por `versao` (`If-Match`), devolvendo `409` com o estado atual — nunca
  sobrescrevendo em silêncio.
- Paginação por cursor (não por offset) em toda listagem grande, porque as tabelas têm 20 anos.
- Erros com corpo padronizado: código, mensagem para o usuário, campo e detalhe técnico separados.

### 3.3 Migrações de banco

- Um arquivo SQL numerado por mudança, imutável após merge. Correção é migração nova.
- Toda migração é **aditiva e compatível com a versão anterior** (ver
  [01-ARQUITETURA §6.4](01-ARQUITETURA.md#64-compatibilidade-de-versões-entre-nós)): coluna nova anulável
  ou com default; renomeação vira `adiciona nova + copia + deprecia`; remoção só após duas versões.
- Migração que toca tabela replicada declara explicitamente o impacto na sincronização no cabeçalho do
  arquivo.
- Índice em tabela grande criado com `CREATE INDEX CONCURRENTLY`.
- O DDL de [03-BANCO-DE-DADOS](03-BANCO-DE-DADOS.md) é atualizado **no mesmo commit** da migração.

### 3.4 Testes

| Tipo | Escopo | Meta |
|---|---|---|
| Unidade | Regras de domínio, motor de fórmulas | Cobertura alta em `Erp.Calculo` e `Erp.Dominio` |
| Regressão de cálculo | 94k F.T. do legado reprocessadas | ver §4.4 — é o teste mais importante do projeto |
| Integração | API + Postgres real (Testcontainers) | Fluxos: orçamento→pedido→O.F.→FS→NF-e |
| Sincronização | Dois nós + dois dispositivos simulados, com partição de rede | Cenários de §6.5 |
| Interface | Fluxos críticos de fábrica e campo (Playwright) | Apontamento, assinatura, sincronização |
| Carga | Listagens sobre 20 anos de histórico; 30 tablets apontando | Latência p95 < 500 ms em LAN |

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
- **AST compilada e cacheada** por estilo/versão — recalcular 94 mil F.T. exige isso.
- Aritmética em `decimal` com arredondamento explícito e documentado por slot. Nunca `double`:
  medida de caixa em ponto flutuante binário produz 122,99999 e briga na fábrica.
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

## 6. Motor de sincronização

### 6.1 Componentes

| Componente | Onde roda | Função |
|---|---|---|
| `sync_alteracao` + gatilhos | Postgres (ambos os nós) | Registrar toda mudança com sequência global |
| `Erp.AgenteSync` | Nó local | Puxar e empurrar contra a nuvem, em ciclo, com retentativa exponencial |
| Endpoints `/sync/v1` | Nó nuvem e nó local | `pull`, `push`, `handshake`, `numerador/bloco`, `anexo` |
| Cliente de sincronização | PWA do vendedor | Aplicar pull no SQLite, drenar a fila de push |
| Fila de eventos | PWA de fábrica | Persistir apontamento e reenviar |

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
6. Fábrica fica 8 h sem internet; nuvem acumula; drenagem sem perda nem ordem invertida.
7. Nuvem em versão nova, fábrica em versão anterior — handshake e compatibilidade.
8. Tablet perdido e revogado — bloqueio de push e apagamento da base local no próximo contato.
9. Relógio do tablet errado em 2 h — ordenação por sequência do servidor, não por hora do cliente.
10. Anexo grande (desenho) sincronizando em 4G lento sem travar a fila de dados.

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
| **0** | Infra dos dois nós, identidade, esqueleto de sincronização, migração de ensaio | Nada funciona antes disso, e a migração de ensaio revela cedo o tamanho do problema de dados |
| **1** | Engenharia: F.T., estilos, fórmulas, ferramental, documentos + **regressão contra 94k F.T.** | É o núcleo e o maior risco técnico. Provar aqui autoriza o resto |
| **2** | Comercial: orçamento, pedido, programação de entregas, kanban | Alimenta a produção; sem pedido não há O.F. |
| **3** | **Amostras + tablet do vendedor com assinatura** | Maior dor atual (58% da fila aguardando) e o pedido explícito do cliente |
| **4** | PCP + Produção: O.F., roteiro, **Fichas de Serviço nos tablets**, homem-máquina, rastreio do pedido | Depende de F.T. e pedido existirem no sistema novo |
| **5** | Estoque, conferência e expedição | Fecha o ciclo físico |
| **6** | Fiscal (NF-e, IBS/CBS) e Financeiro | Último a migrar por ser o de maior risco regulatório; convive com o legado até estar provado |
| **7** | Indicadores, OEE, painéis, portal do cliente | Só faz sentido com dado sendo coletado de verdade |

As fases 3 e 4 são as que mudam a vida da empresa — e são também as que dependem de Wi-Fi e de adesão do
operador. Recomenda-se **piloto em uma única máquina** antes de escalar para todas.

## 9. Observabilidade e qualidade em produção

- Log estruturado com `tenant_id`, `no_id`, `dispositivo_id`, `usuario_id`, `correlacao_id` propagado
  entre nós — requisito para investigar "meu apontamento não chegou".
- Métrica de negócio no mesmo painel da métrica técnica: amostras aguardando por faixa de idade,
  FS paradas sem motivo, pedidos sem O.F., títulos vencidos.
- Alertas com dono definido e ação esperada. Alerta sem ação vira ruído e depois vira desligado.

## 10. Questões abertas de engenharia

| # | Questão | Impacto |
|---|---|---|
| E1 | Banco do PcBoot e disponibilidade do schema | Define esforço de ETL (ver Q2 do doc 00). Script de descoberta disponível em `etl/descoberta/` |
| ~~E2~~ | ~~Onduladeira própria ou compra de chapa~~ | **Respondida:** compra chapa pronta e converte. Roteiro sem ondulação; item crítico é chapa por qualidade e formato (ver [00 §3.1](00-CENARIO-E-PREMISSAS.md#31-modelo-de-fabricação--conversão-confirmado-em-27092026)) |
| E3 | Tablet Android gerenciado ou iPad | Afeta modo quiosque, MDM e leitura de código de barras |
| E4 | Provedor de NF-e: biblioteca própria ou serviço | Prazo e custo da fase 6 |
| E5 | Assinatura precisa de ICP-Brasil | Define se entra assinatura qualificada (Q7) |
| E6 | Existe balança/leitor/PLC a integrar nas máquinas | Apontamento pode ser parcialmente automático em vez de manual |
| E7 | Chapa vem no formato exato ou há refile interno | Define se existe operação `REFILE` no roteiro padrão e como se contabiliza a sobra (Q9) |

## Histórico de revisões

| Data | Autor | Mudança |
|---|---|---|
| 27/09/2026 | — | Versão inicial: stack, padrões, motor de fórmulas, fichas de serviço, sincronização, migração, fases |
