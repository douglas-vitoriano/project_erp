# ADR-0008 — Histórico analítico no mesmo Postgres, sem data warehouse separado

- **Status:** Aceito
- **Data:** 28/09/2026
- **Contexto relacionado:** [06-PARIDADE-COMPETITIVA §7](../06-PARIDADE-COMPETITIVA.md#7-etapa-4--histórico-analítico), [05-INFRAESTRUTURA-E-CUSTOS](../05-INFRAESTRUTURA-E-CUSTOS.md), [ADR-0002](0002-propriedade-de-dados-e-sincronizacao.md), [ADR-0004](0004-nuvem-pura-sem-servidor-na-fabrica.md)

## Contexto

O Kiwiplan tem um produto específico para isso — o Kiwiplan Data Warehouse, com a ferramenta de análise
DART — que consolida dado transacional de ERP, MES, gestão de armazém e logística, com foco em grupos
multi-planta. A ausência de equivalente no BoxFlow apareceu como lacuna no levantamento de 28/09/2026.

A pergunta é se a resposta é infraestrutura separada.

Dois fatos do nosso desenho mudam a conta. O primeiro é que **as tabelas de evento já são append-only por
decisão de arquitetura** ([ADR-0002](0002-propriedade-de-dados-e-sincronizacao.md)): apontamento,
movimento de estoque, assinatura e alteração de sincronização não sofrem `UPDATE` nem `DELETE`, e correção
é evento de estorno. Isso é, literalmente, a estrutura de uma tabela de fato — só que morando no banco
transacional. O warehouse que faltava está meio construído, por outro motivo.

O segundo é a ordem de grandeza. Os volumes documentados do legado
([00 §2.2](../00-CENARIO-E-PREMISSAS.md#22-volumes-reais-observados)) são acumulados de cerca de 20 anos:
94 mil F.T., 77 mil orçamentos, 30 mil amostras. Tomando orçamento como âncora de vazão comercial, são da
ordem de 4 mil por ano, ou cerca de 16 por dia útil. Propagando pelo modelo:

| Etapa | Estimativa | Base |
|---|---|---|
| Pedidos por dia útil | ~16 | Orçamentos anuais ÷ 250 dias |
| Itens por pedido | 2 a 3 | Suposição |
| O.F. por dia | ~40 | Item de pedido vira O.F. |
| FS por O.F. | ~5 | Roteiro impressão → corte/vinco → colagem → conferência → expedição |
| **FS por dia** | **~200** | |
| Apontamentos por FS | ~15 | Setup, produção, pausas, refugo, fim |
| **Apontamentos por ano** | **~750 mil** | 200 × 15 × 250 |

Menos de um milhão de linhas por ano na maior tabela de fato. Em uma década, algo entre 20 e 30 milhões de
linhas somando todas as tabelas de evento — com a de sincronização fora da conta, porque tem retenção de 90
dias por desenho. Isso ocupa da ordem de centenas de megabytes por ano com índices, contra o volume de
10 GB já orçado em [05-INFRAESTRUTURA-E-CUSTOS](../05-INFRAESTRUTURA-E-CUSTOS.md): a infraestrutura já
comprada cabe aproximadamente uma década de histórico.

Postgres num nó único atende isso sem esforço. Um warehouse aqui custaria, em operação e em pipeline para
manter sincronizado, mais do que devolve em tempo de resposta.

## Decisão

O histórico analítico vive **no mesmo Postgres**, sobre as tabelas de evento que já existem. Não haverá
banco analítico separado, nem processo de ETL interno, nem ferramenta de BI externa nesta etapa.

1. **As tabelas de evento são o fato.** Nenhuma tabela nova é criada para análise. O que existe para
   auditoria e sincronização serve para série histórica, e passa a ser tratado como tal — o que significa,
   na prática, que apagar evento antigo deixa de ser uma opção discutível.

2. **O modelo de leitura é declarado em views**, com o prefixo `vw_` para consulta direta e `mvw_` para o
   que precisa de pré-cálculo. A view materializada é o nosso agregado; a política de atualização de cada
   uma fica documentada junto dela em [03-BANCO-DE-DADOS §16](../03-BANCO-DE-DADOS.md#16-views-de-apoio).

3. **Retenção declarada por classe de dado**, não por tabela: fiscal e financeiro pelo prazo legal, evento
   de produção indefinidamente enquanto couber, sincronização em 90 dias
   ([D6](../03-BANCO-DE-DADOS.md#18-questões-abertas-do-modelo)).

4. **Consulta analítica não compete com o chão de fábrica.** Relatório pesado roda em réplica de leitura ou
   fora do horário de pico, e o apontamento tem prioridade. O orçamento de latência de
   [01 §12](../01-ARQUITETURA.md#12-orçamento-de-latência) vale para a operação, não para o relatório.

5. **Exportação em formato aberto é requisito, não cortesia.** XLSX real e CSV a partir de qualquer view.
   O contratante que quiser Power BI, Metabase ou planilha conecta no que exportamos, sem que isso vire
   produto nosso.

6. **Particionamento é decisão adiada, e por um motivo concreto** (ver abaixo).

7. **Gatilho de revisão: latência medida, não tamanho de tabela.** Este ADR volta à mesa quando as consultas
   analíticas padrão saírem do orçamento de p95 de forma sustentada, e não quando alguma tabela cruzar um
   número de linhas. No volume projetado, o limite de linhas nunca chega; o de latência pode chegar por
   consulta mal escrita, o que é problema diferente e com outra solução.

## O particionamento briga com a idempotência offline

Vale registrar porque é o tipo de coisa que se descobre tarde.

O reflexo, ao falar de tabela de evento grande, é particionar por mês. Mas `ficha_servico_apontamento` tem
`unique (tenant_id, idempotencia_chave)` — é essa restrição que garante que o apontamento reenviado por um
tablet que ficou offline não entre duas vezes. E no Postgres, **índice único em tabela particionada tem de
conter a chave de partição**. Particionar por data de ocorrência faria a garantia de idempotência valer
dentro do mês, não globalmente.

Como um tablet pode ficar dias ou semanas sem sincronizar, e um vendedor potencialmente mais
([D6](../03-BANCO-DE-DADOS.md#18-questões-abertas-do-modelo) trata exatamente disso), a janela de
deduplicação precisa ser maior que a partição. Particionar exigiria mover a guarda de idempotência para uma
tabela dedicada não particionada — trabalho real, com risco real, para resolver um problema de desempenho
que os números acima dizem que não existe ainda.

Por isso a decisão 6 não é preguiça: é recusa a pagar um custo com efeito colateral sobre a garantia mais
importante do modo offline antes de haver medição que o justifique.

## Alternativas consideradas

**Warehouse gerenciado (BigQuery, Snowflake, Redshift) com replicação.** Rejeitada por desproporção de
custo e de operação. A infraestrutura inteira do produto custa cerca de 11,66 dólares por mês
([05](../05-INFRAESTRUTURA-E-CUSTOS.md)); qualquer um desses acrescenta mais que isso só para existir, e
acrescenta um pipeline de replicação que quebra em silêncio. Para menos de um milhão de linhas por ano é
comprar caminhão para carregar caixa de sapato.

**Segundo Postgres como réplica analítica, no mesmo provedor.** Rejeitada agora, mas é a primeira coisa a
fazer se o gatilho da decisão 7 disparar — é barata, não exige pipeline novo e resolve o caso real, que é
relatório pesado concorrendo com apontamento. Fica registrada como a saída preferida.

**Ferramenta de BI embutida no produto.** Rejeitada por escopo. Construir explorador de dados é um produto
inteiro, e não é o nosso. A decisão 5 entrega o valor por um caminho muito mais curto.

**Não fazer nada e responder com consulta ad hoc.** Rejeitada porque é o estado atual e ele tem um defeito
específico: sem modelo de leitura declarado, cada pergunta nova vira um `SELECT` escrito na hora por quem
souber o schema. Funciona com uma fábrica e uma pessoa; não sobrevive a multi-contratante.

## Consequências

- O item "data warehouse" sai da lista de lacunas por reclassificação, não por construção: o que faltava
  era declarar modelo de leitura e retenção, não levantar infraestrutura. É a única das sete lacunas cuja
  resposta honesta é "estávamos comparando com a solução deles, não com o problema".
- Apagar evento antigo para liberar espaço deixa de ser opção operacional. Se o espaço apertar, cresce o
  volume — que é barato — em vez de perder série histórica, que é insubstituível.
- Fica uma dependência escondida: a calibração da regra de velocidade de
  [06 §4.6](../06-PARIDADE-COMPETITIVA.md#46-calibração-de-onde-saem-os-números) passa a depender da
  retenção decidida aqui. Reduzir retenção de evento de produção no futuro quebra a calibração, e quem
  mexer precisa saber disso.
- A estimativa de volume é **derivada, não medida** (E11 em
  [06 §12](../06-PARIDADE-COMPETITIVA.md#12-questões-abertas)). Se a vazão real for uma ordem de grandeza
  acima, a decisão 6 e o gatilho da decisão 7 são os primeiros pontos a revisitar — não o resto do ADR.
