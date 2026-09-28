# 06 — Paridade competitiva: fechar as lacunas contra o Kiwiplan

> **Escopo.** Este documento trata dos sete pontos em que o levantamento de 28/09/2026 apontou o BoxFlow
> atrás do Kiwiplan: três ausências e quatro implementações rasas. Não trata dos quatro módulos de
> onduladeira e bobina, que não se aplicam a quem compra chapa pronta
> ([00 §3.1](00-CENARIO-E-PREMISSAS.md#31-modelo-de-fabricação--conversão-confirmado-em-27092026)).

## 1. Os sete itens

| # | Item | Situação | O que o Kiwiplan tem |
|---|---|---|---|
| 1 | Custeio e velocidade por característica | Raso | Motor de custeio com regra de degradação de velocidade, roteirização separada do custeio |
| 2 | Coleta de dados de chão de fábrica | Raso | Coleta automática da máquina: setup, refugo de setup, quantidade, parada |
| 3 | Sequenciamento automático de produção | **Ausente** | Reprograma a cada 15 min, horizonte de 90 dias, economia de setup, status de ferramental |
| 4 | Histórico analítico | **Ausente** | Data warehouse dedicado com dado transacional consolidado |
| 5 | Qualidade | Raso | Módulo dedicado |
| 6 | Programação de carga e frete | Raso | Monta carga automaticamente reduzindo quilometragem |
| 7 | Integração eletrônica com máquina | **Ausente** | Comunicação bidirecional com controladores e periféricos |

## 2. A cadeia: a ordem importa mais que a lista

Estes sete itens não são sete projetos paralelos. Quatro deles formam uma corrente de uma única direção:

```
 apontamento          histórico com          regra de velocidade        sequenciamento
 confiável     ──►    série temporal   ──►   e setup calibrada    ──►    automático
   (item 2)              (item 4)                 (item 1)                 (item 3)
```

O Kiwiplan vende esses quatro como produtos separados e o cliente pode comprá-los em qualquer ordem —
porque eles chegam **já calibrados** por 45 anos de base instalada, com consultoria de implantação que traz
número de referência do setor. Nós não podemos comprar a calibração. O único lugar de onde os nossos
números vão sair é o nosso próprio chão de fábrica.

Disso decorrem duas conclusões que reordenam o roteiro:

**Um sequenciador alimentado por velocidade escalar produz programação que o piso ignora.** E isso é pior
que fila manual, porque custa caro e queima a confiança uma única vez — depois de o encarregado ver duas
programações impossíveis, ele para de abrir a tela, e não volta. O item 3 só pode ser construído depois de
o item 1 estar medido, não estimado.

**O histórico analítico não é o enfeite do fim, é o substrato do item 1.** Não existe regra de degradação
de velocidade sem série histórica para ajustá-la. O que parecia "BI, fase 7" é, na verdade, pré-requisito
da coisa que dá dinheiro. Ele sobe de posição.

Os outros três itens (5, 6 e 7) são independentes da corrente e podem andar em paralelo ou esperar.

## 3. Classificação: copiar, encolher, fazer diferente, adiar

| Item | Decisão | Por quê |
|---|---|---|
| 1 · Custeio e velocidade | **Copiar** | A regra de degradação é boa engenharia e resolve dois problemas com uma estrutura. Copiamos inclusive a separação entre regra de custeio e regra de roteirização |
| 2 · Coleta de chão de fábrica | **Copiar a intenção, não o meio** | Eles coletam da máquina; nós coletamos do operador. O mesmo evento com origem diferente exige desenho diferente: o inimigo deles é o cabo, o nosso é o esquecimento |
| 3 · Sequenciamento | **Copiar encolhido e invertido** | O problema deles é combinatório de verdade; o nosso não. E a saída é proposta auditável em vez de oráculo ([ADR-0007](adr/0007-sequenciamento-como-proposta-auditavel.md)) |
| 4 · Histórico analítico | **Fazer diferente** | Fato append-only no mesmo Postgres. Data warehouse separado no nosso volume é teatro ([ADR-0008](adr/0008-historico-analitico-no-mesmo-postgres.md)) |
| 5 · Qualidade | **Encolher** | Não conformidade e ação corretiva agora, porque fazem falta hoje. Aparato de certificação só depois da Q8 |
| 6 · Carga e frete | **Encolher** | Checagem de cabimento sim, roteirização não |
| 7 · Integração com máquina | **Adiar, com pergunta definida** | É levantamento de parque instalado, não decisão de software (E6) |

---

## 4. Etapa 1 — velocidade e setup em que se possa acreditar

### 4.1 O problema de um número só

Hoje `maquina.capacidade_hora` é um escalar: peças por hora daquela máquina. Esse número tem **dois
consumidores com interesses opostos**, e erra para os dois ao mesmo tempo:

- O **orçamento** usa para formar preço. Se o número é otimista, a empresa vende abaixo do custo e
  descobre no fim do mês.
- A **promessa de data** usa para calcular carga. Se o número é otimista, a empresa promete prazo que não
  cumpre e descobre na reclamação.

Um erro, dois prejuízos, em departamentos que não conversam. É por isso que este é o item de maior retorno
por linha de código de toda a lista.

### 4.2 Regra de degradação com vocabulário fechado

A velocidade real de uma máquina depende do trabalho: duas cores em vez de uma, colagem por fora em vez de
por dentro, parede dupla, painel estreito. Cada característica derruba a velocidade a partir do máximo
teórico.

O desenho segue a **mesma disciplina do motor de fórmulas**: vocabulário fechado, nada de expressão livre.
Como no caso das sete variáveis, qualquer atributo fora da lista declarada é **recusado**, com mensagem
dizendo qual foi rejeitado ([02 §4.1](02-ENGENHARIA.md#41-entrada-e-variáveis)).

A razão é a mesma de lá, e vale repetir porque é tentador ceder: o Kiwiplan permite que qualquer campo do
banco, inclusive campo definido pelo usuário, entre na regra. Num produto de instalação única, com
consultor por perto, isso é flexibilidade. Em processo **multi-contratante**, regra de cliente interpretada
em tempo de execução é a mesma porta que o `eval` abriria no motor de fórmulas. A flexibilidade deles é
custeada por um modelo de entrega que nós não temos.

Atributos da carga inicial — físicos, derivados da F.T. e do ferramental, nunca do cliente:
`NUMERO_CORES`, `ONDA`, `PAREDE`, `MENOR_PAINEL_MM`, `AREA_M2`, `PECAS_POR_CHAPA`, `GRAMATURA`,
`TIPO_COLAGEM`, `ESTILO`, `QUALIDADE_CHAPA`, `TIPO_FERRAMENTAL`.

Efeitos possíveis: `VELOCIDADE_TETO`, `VELOCIDADE_FATOR`, `SETUP_ADICIONAL_MIN`, `REFUGO_SETUP_FOLHAS`,
`PROIBIR`, `PENALIZAR`.

### 4.3 Composição independente de ordem (e por que não uma lista ordenada)

O caminho óbvio é avaliar as regras em sequência, cada uma sobrescrevendo a anterior. **Não é o que vamos
fazer.** Regra ordenada cria regra sombreada: alguém cadastra a quarta regra, ela nunca dispara porque a
segunda já resolveu, e ninguém consegue explicar por quê. O resultado passa a depender de um acidente de
ordem de inserção.

A composição é **associativa e comutativa**, partindo sempre de `capacidade_hora`:

| Efeito | Composição | Resultado |
|---|---|---|
| `VELOCIDADE_TETO` | menor valor entre os tetos que casaram | A restrição mais dura vence |
| `VELOCIDADE_FATOR` | produto dos fatores que casaram | Degradações se acumulam |
| `SETUP_ADICIONAL_MIN` | soma | Cada complicação cobra seu tempo |
| `REFUGO_SETUP_FOLHAS` | soma | Idem |
| `PROIBIR` | qualquer um basta | Restrição dura: a máquina não faz |
| `PENALIZAR` | soma dos pesos | Restrição mole: faz, mas mal |

A ordem de cadastro passa a ser irrelevante, e a explicação de um resultado é a lista de regras que
casaram — não uma disputa entre elas.

### 4.4 Roteirização separada de custeio, e dura separada de mole

Duas separações copiadas deliberadamente do Kiwiplan, porque as duas resolvem confusões reais:

**Finalidade.** A mesma regra pode valer para custear, para roteirizar, ou para as duas coisas. O custeio
pode ser conservador de propósito — cobrar pelo caso ruim é decisão comercial legítima — enquanto a
roteirização precisa ser realista, senão a programação mente. Mesmo dado, perguntas diferentes.

**Dureza.** `PROIBIR` é impossibilidade física: a máquina de três cores não imprime quatro. `PENALIZAR` é
"consegue, mas roda mal": a terceira cor sempre vaza, a chapa abaixo de 300 mm entorta. Só `PROIBIR`
bloqueia. `PENALIZAR` custa pontos no sequenciador e mostra aviso quando alguém roteiriza à mão — porque às
vezes a fábrica *precisa* rodar mal, e o sistema não tem o direito de impedir, só de avisar.

### 4.5 Setup dependente da sequência

Numa cartonagem o dinheiro do setup está na **troca de faca e de clichê**. Isso significa que o custo de
preparar um trabalho não é uma propriedade dele, e sim da **transição** entre ele e o anterior: rodar duas
O.F. que usam a mesma faca em seguida custa quase nada; separá-las custa duas trocas.

Sem essa informação modelada, o sequenciador não tem motivo nenhum para agrupar, e agrupar é justamente de
onde vem a economia. Por isso `maquina_setup_transicao` (§10.2 do
[03-BANCO-DE-DADOS](03-BANCO-DE-DADOS.md#102-regras-de-velocidade-e-de-setup)) declara, por máquina, o
tempo de cada tipo de mudança entre trabalhos consecutivos.

### 4.6 Calibração: de onde saem os números

Em três tempos, e nenhum deles é "chutar":

1. **Semente do legado.** `ficha_tecnica_processo.tempo_setup_min` e o histórico do PcBoot já carregam
   tempo de processo. Entram como valor inicial pelo mesmo ETL já previsto em
   [02 §7](02-ENGENHARIA.md#7-migração-do-legado-pcboot).
2. **Medição.** Com os tablets no piso, cada FS concluída produz tempo real de setup e de produção, já
   separados. Comparar previsto com realizado por máquina e por faixa de atributo é uma consulta, não um
   projeto.
3. **Recalibração proposta, nunca automática.** O sistema calcula o desvio e **propõe** ajuste na regra.
   Um humano aceita. O mesmo princípio do sequenciador: regra que se reescreve sozinha é regra que ninguém
   sabe explicar na reunião de fechamento.

**Critério de calibrada:** para uma máquina, o tempo total previsto de uma FS fica dentro de ±15% do
realizado em 80% das FS concluídas nos últimos 30 dias. Abaixo disso, a máquina não entra no sequenciamento
automático — fica em fila manual, e isso é visível na tela.

---

## 5. Etapa 2 — coleta que se pode auditar

O item 2 é raso por um motivo estrutural: eles leem da máquina, nós lemos do operador. Não vamos fechar
essa diferença com integração (item 7, adiado); vamos fechar atacando o que de fato falha na coleta manual.

**O que falha:** o operador esquece de apontar o fim do setup, aponta tudo junto no fim do turno, ou
declara quantidade de cabeça. O sintoma é sempre o mesmo — evento que não existe, ou número que não fecha.

**O que muda:**

- **Refugo de setup separado do refugo de produção.** Hoje o apontamento de `REFUGO` tem motivo e
  quantidade, mas não diz em que fase aconteceu. São dois números com causas diferentes: refugo de setup é
  custo de troca e alimenta `REFUGO_SETUP_FOLHAS`; refugo de produção é problema de processo. Misturados,
  nenhum dos dois serve para decidir nada. Resolve com uma coluna `fase`.
- **Cadeia de eventos incompleta é indicador, não erro de digitação.** FS que foi de `EM_SETUP` a
  `CONCLUIDA` sem `SETUP_FIM`, ou que produziu sem `PRODUCAO_INICIO`, entra numa view de apontamento
  suspeito. A coluna `qualidade_dado` de `COLUNAS_PADRAO` já existe exatamente para isso.
- **Velocidade fisicamente impossível é sinal de apontamento em lote.** Se a quantidade dividida pelo tempo
  declarado supera o teto físico da máquina, o dado é suspeito — quase sempre porque alguém apontou às
  17h50 o que aconteceu às 14h. Detectável por consulta, sem acusar ninguém: o alvo é corrigir o hábito,
  não punir.
- **Divergência entre produção declarada e volumes conferidos.** A conferência de expedição já conta.
  Declarado contra contado é a única checagem independente que temos hoje, e ela é de graça.

Este é o item que **precisa vir antes** do sequenciamento, porque é ele que produz o dado com que a etapa 1
se calibra. Um sequenciador calibrado com apontamento lançado em lote no fim do turno aprende o turno, não
a máquina.

---

## 6. Etapa 3 — sequenciamento

A decisão e seus motivos estão em [ADR-0007](adr/0007-sequenciamento-como-proposta-auditavel.md). Aqui fica
a forma.

### 6.1 O problema é menor do que o deles

Vale dizer isso com clareza para não comprar maquinário caro para problema fácil. O que o Kiwiplan resolve
na onduladeira é genuinamente combinatório: centenas de pedidos em até 16 qualidades simultâneas,
minimizando refile lateral. É um problema de corte e empacotamento.

O nosso é **sequenciamento em máquinas paralelas com tempo de setup dependente da sequência**, num parque
de cerca de dez máquinas. É um problema pequeno, bem estudado, e que não exige solver comercial: heurística
de despacho com afinidade de setup, seguida de busca local sob orçamento de tempo, resolve com folga.

### 6.2 Restrições

Duras, que o sequenciador nunca viola:

- Limites dimensionais da máquina (`largura_minima_mm`, `largura_maxima_mm`, e os de comprimento).
- Regras `PROIBIR` do §4.
- Ferramental existente, na situação `DISPONIVEL`, e dentro da vida útil (`tiragem_acumulada` contra
  `tiragem_vida_util`).
- O portão de chapa que já existe: O.F. sem `necessidade_chapa` em `RECEBIDA` ou `RESERVADA_ESTOQUE` não
  entra na fila ([03 §10.1](03-BANCO-DE-DADOS.md#101-necessidade-de-chapa)).
- Turno e disponibilidade da máquina.

Moles, que ele tenta respeitar e reporta quando não consegue: regras `PENALIZAR`, prioridade da O.F.,
agrupamento por faca, clichê e qualidade de chapa.

Objetivo: minimizar atraso ponderado por prioridade, mais minutos de setup. Os dois pesos são parâmetro do
contratante, porque a fábrica que vive de prazo e a que vive de margem querem respostas diferentes.

### 6.3 Cadência orientada a evento, não a relógio

O Kiwiplan roda a cada 15 minutos. Nós rodamos **quando algo muda**, com carência para não recalcular dez
vezes no mesmo minuto:

| Evento | Por que dispara |
|---|---|
| O.F. liberada | Entrou trabalho novo na fila |
| FS concluída | A fila andou; o resto pode subir |
| `ferramental.situacao` mudou | Faca quebrou ou voltou da manutenção — é o gatilho que o Kiwiplan destaca e que hoje não temos |
| `necessidade_chapa` virou `RECEBIDA` | O portão abriu |
| Abertura de turno | A capacidade do dia mudou |

Mais um piso de tempo, para o caso de nada disparar. Relógio cego recalcula quando ninguém precisa; evento
sem piso nunca recalcula quando a fábrica está parada.

### 6.4 Horizonte congelado

A FS em `EM_SETUP` ou `EM_PRODUCAO` é **intocável**, e as próximas N por máquina ficam congeladas a menos
que o PCP descongele explicitamente.

O motivo é físico, não informático: o operador já está com a faca da próxima na bancada. Programação que
embaralha o que alguém está montando com as mãos destrói confiança mais rápido do que programação errada —
errada se corrige, embaralhada parece desrespeito. `N` é parâmetro, começando em 2.

### 6.5 Motivo por posição

Cada posição proposta carrega a frase que a justifica, em português, para o PCP ler:

- *"agrupada com a anterior por compartilhar a faca F-1042 — economiza 35 min de troca"*
- *"antecipada: entrega prometida em 02/10 e a fila levaria além disso"*
- *"adiada: clichê C-880 em manutenção"*
- *"mantida: posição congelada, setup já iniciado"*

Isso não é enfeite de interface, é o que faz a proposta ser aceita. Programação sem motivo é ordem; com
motivo é argumento — e o encarregado que discorda do argumento tem como apontar onde está errado, o que
alimenta a calibração.

### 6.6 Determinismo

Mesma entrada produz exatamente a mesma saída, com semente fixa na busca local. Sem isso não há teste
possível, e o PCP não tem como distinguir "mudou porque a fábrica mudou" de "mudou porque o algoritmo
sorteou diferente". A segunda hipótese, uma vez suspeitada, nunca mais sai da cabeça de ninguém.

### 6.7 O que ele nunca faz

- Não altera roteiro: escolher operação é engenharia.
- Não reserva nem compra chapa: quem faz isso é `necessidade_chapa`.
- Não promete data ao cliente sozinho. Produz a data possível; assumir compromisso é ato comercial.
- Não aplica sozinho. Proposta aceita por humano é o que vira fila ([ADR-0007](adr/0007-sequenciamento-como-proposta-auditavel.md)).

---

## 7. Etapa 4 — histórico analítico

Decisão em [ADR-0008](adr/0008-historico-analitico-no-mesmo-postgres.md). O resumo é que **já temos o
essencial e não tínhamos percebido**: as tabelas de evento do modelo são append-only por decisão de
arquitetura ([ADR-0002](adr/0002-propriedade-de-dados-e-sincronizacao.md)). Isso é exatamente a estrutura de
um fato de data warehouse, só que dentro do banco transacional.

O que falta é modesto: partição por mês nas tabelas de evento grandes, política de retenção declarada,
modelo de leitura documentado e política de atualização das views materializadas.

O que não vamos fazer é levantar infraestrutura separada. A ordem de grandeza derivada dos volumes do
legado ([00 §2.2](00-CENARIO-E-PREMISSAS.md#22-volumes-reais-observados)) coloca o maior fato na casa de
centenas de milhares de linhas por ano — número em que Postgres nem transpira, e em que um warehouse
custaria mais em operação do que devolve em resposta. A conta e o gatilho de revisão estão no ADR.

---

## 8. Os dois que encolhem

### 8.1 Qualidade: não conformidade agora, certificação depois

Duas tabelas entram já, porque fazem falta **independentemente de certificação**: hoje o sistema registra
refugo com responsável (`motivo_refugo.responsavel` aceita `FORNECEDOR`, `ENGENHARIA`, `CLIENTE`) e esse
apontamento não tem onde desaguar. Refugo atribuído a fornecedor que não gera tratativa é dinheiro que a
empresa larga na mesa.

A não conformidade é a **junção do que já existe**, com quatro origens todas já modeladas: conferência
interna, recebimento de chapa, reclamação de cliente e ocorrência de entrega.

O que fica **esperando a Q8** ([00 §6.2](00-CENARIO-E-PREMISSAS.md#62-abertas)) é o aparato de
certificação: controle de documento com revisão vigente, registro de auditoria, ação corretiva formal com
verificação de eficácia, qualificação de fornecedor. Construir isso sem saber se há ISO ou BRC em jogo é
inventar burocracia para o cliente cumprir.

### 8.2 Carga: cabimento sim, roteirização não

**Entra:** cadastro de veículo com capacidade real (peso, posições de pallet, volume), totais na carga e
checagem de cabimento antes de fechar, indicador de ocupação, e sugestão de agrupamento por zona de entrega
e data. Hoje `carga.placa` é texto livre — não há contra o que conferir, e carga acima da capacidade só
aparece na balança ou na multa.

**Não entra:** otimização de rota. Roteirização precisa de endereço geocodificado confiável, tempo de
percurso, janela de recebimento por cliente e frota conhecida. Para entrega regional a partir de uma
fábrica, a economia é pequena diante do custo de errar, e errar aqui significa caminhão na porta errada.
Revisar se o cliente tiver frota própria e o frete virar linha relevante no custo.

---

## 9. O que depende de ir à fábrica

O item 7 não tem desenho porque **desenhar integração para máquina que não fala é desenho jogado fora**. A
questão E6 precisa virar levantamento, máquina por máquina:

- Fabricante, modelo e ano.
- Tem controlador eletrônico? Qual?
- Existe contador de tiragem ou de impressões acessível?
- Existe porta de rede ou serial exposta?
- Já existe algum sistema de supervisão ligado nela?
- Na expedição: existe balança? Existe leitor de código de barras?

Uma possibilidade a considerar **depois** do levantamento, e não antes: em vez de integração bidirecional
completa, leitura de mão única do contador. Isso elimina justamente o número mais sujeito a erro do
apontamento manual — a quantidade produzida — sem abrir o problema de escrever comando em máquina.
É opção, não decisão.

---

## 10. Critérios de aceite

Nenhum destes itens é "pronto" porque a tela existe. Cada um tem número, e o número tem onde ser medido.

| Item | Como saber que funcionou | Onde se mede |
|---|---|---|
| Velocidade e setup | Tempo total previsto da FS dentro de ±15% do realizado em 80% das FS concluídas em 30 dias, por máquina | `ficha_servico` previsto contra realizado |
| Transição de setup | Setup medido em transição de mesma faca **materialmente** menor que em troca completa | `ficha_servico_apontamento` com `fase`, agrupado por tipo de transição |
| Coleta | Proporção de FS com cadeia de eventos completa acima de 95%; apontamento suspeito em queda mês a mês | `vw_apontamento_suspeito` |
| Sequenciamento | Proposta aceita sem edição na maioria das rodadas **e** razão de minutos de setup sobre minutos totais menor que a linha de base manual | `sequencia_proposta` e `mvw_oee_maquina_dia` |
| Histórico | Consultas analíticas padrão dentro do orçamento de p95 de [01 §12](01-ARQUITETURA.md#12-orçamento-de-latência) | Métrica de latência por consulta |
| Qualidade | Todo refugo com responsável `FORNECEDOR` ou `ENGENHARIA` tem não conformidade aberta | `nao_conformidade` contra `ficha_servico_apontamento` |
| Carga | Nenhuma carga expedida acima da capacidade do veículo | `carga` contra `veiculo` |

Duas disciplinas que valem mais que os números:

**A linha de base tem que ser medida antes de ligar.** Razão de setup sobre total, aderência de prazo e
refugo precisam de pelo menos 30 dias de medição com fila manual. Sem isso é impossível provar que o
sequenciador ajudou, e "parece melhor" não sobrevive à primeira semana ruim.

**O critério da transição de setup é falsificável de propósito.** Se a medição mostrar que rodar com a
mesma faca não economiza tempo relevante, então a hipótese de agrupamento está errada, e o objetivo do
sequenciador do §6.2 está errado junto. É melhor descobrir isso numa consulta do que depois de construir o
algoritmo em cima da suposição.

## 11. O que deliberadamente não vamos fazer

- Qualquer coisa de onduladeira, bobina ou refile lateral de web. Não é o nosso negócio.
- Otimização de rota de entrega (§8.2).
- Data warehouse em infraestrutura separada ([ADR-0008](adr/0008-historico-analitico-no-mesmo-postgres.md)).
- Aparato de certificação antes de a Q8 ser respondida (§8.1).
- Motor de regras com expressão livre ou campo definido pelo usuário na condição (§4.2).
- Aplicar sequência automaticamente, sem aceite humano ([ADR-0007](adr/0007-sequenciamento-como-proposta-auditavel.md)).
- Reescrever regra de velocidade automaticamente a partir da medição (§4.6).

## 12. Questões abertas

| # | Questão | O que muda |
|---|---|---|
| **E11** | Quantas O.F. e FS por dia, de verdade? | Os volumes do legado ([00 §2.2](00-CENARIO-E-PREMISSAS.md#22-volumes-reais-observados)) são acumulados de 20 anos, não vazão diária. A conta do [ADR-0008](adr/0008-historico-analitico-no-mesmo-postgres.md) é derivada da contagem de orçamentos e precisa ser confirmada antes de virar decisão de partição |
| **E12** | O PcBoot guarda tempo real de setup e de produção, ou só o previsto? | Se guarda, a semente da calibração (§4.6) vem do ETL e a linha de base do §10 já existe. Se não guarda, são 30 dias de medição antes de ligar o sequenciador |
| **E13** | Quem é dono da regra de velocidade: engenharia ou PCP? | Define permissão de escrita e quem aceita a recalibração proposta |
| **E14** | A fábrica quer otimizar prazo ou margem? | Define o peso inicial entre atraso e setup no objetivo do §6.2 |

Continuam valendo, e agora com consequência maior: **Q8** (certificações, §8.1) e **E6** (integração de
máquina, §9).

## Histórico de revisões

| Data | Autor | Mudança |
|---|---|---|
| 28/09/2026 | — | Versão inicial. Plano para os três itens ausentes e os quatro rasos do levantamento contra o Kiwiplan, com a cadeia de dependência entre coleta, histórico, calibração e sequenciamento |
