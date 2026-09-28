# ADR-0002 — Propriedade explícita de dados em vez de resolução de conflito

- **Status:** Aceito, e **simplificado** pelo [ADR-0004](0004-nuvem-pura-sem-servidor-na-fabrica.md)
- **Data:** 27/09/2026 · nota de simplificação em 28/09/2026
- **Contexto relacionado:** [01-ARQUITETURA §6](../01-ARQUITETURA.md#6-sincronização), [02-ENGENHARIA §6](../02-ENGENHARIA.md#6-motor-de-sincronização)

> **Nota de 28/09/2026.** Este ADR foi escrito quando havia dois servidores. Com a nuvem pura do
> [ADR-0004](0004-nuvem-pura-sem-servidor-na-fabrica.md), sobrou **um** eixo de sincronização
> (dispositivo ↔ nuvem), e onde o texto abaixo diz "Nó Fábrica" leia-se simplesmente **o servidor**.
>
> A decisão não só continua válida, ela foi o que **viabilizou** a nuvem pura: por esta classificação,
> tudo que a fábrica produz é *fato imutável*, e fato imutável sincroniza por união de conjuntos. Foi
> isso que permitiu tirar o servidor de dentro da fábrica sem inventar mecanismo novo de resolução de
> conflito.

## Contexto

Com dois nós e dezenas de dispositivos gravando dados — alguns deles offline por horas ou dias — surge a
questão clássica: **o que fazer quando o mesmo registro é alterado em dois lugares?**

A resposta usual em sistemas distribuídos é escolher uma estratégia de resolução: último a escrever vence,
merge campo a campo, CRDT. Todas funcionam bem para dados comutativos (contador, conjunto, texto
colaborativo) e todas são perigosas para **documento de negócio**: um pedido cujo preço veio de um nó e a
quantidade de outro é um pedido que nunca existiu, e ninguém percebe até a nota sair errada.

## Decisão

**Eliminar o conflito por construção, em vez de resolvê-lo depois.** Todo dado do sistema é classificado em
uma de três categorias, cada uma com regra própria:

### 1. Dado de referência — dono único

`cliente`, `ficha_tecnica`, `estilo_caixa`, `qualidade_chapa`, `maquina`, preços.

Somente o **Nó Fábrica** altera. Nuvem e tablets recebem réplica **somente leitura**. Se o vendedor precisa
mudar o telefone do cliente, ele cria uma **solicitação de alteração** (`cliente_alteracao_solicitada`) que
alguém no escritório aprova. Conflito: impossível.

### 2. Fato imutável — append-only

`ficha_servico_apontamento`, `assinatura`, `amostra_evento`, `movimento_estoque`, `consumo_material`,
`revisao_campo`, `movimento_financeiro`.

Só se insere, nunca se altera. Sincronizar é unir conjuntos. Correção de um fato errado é um **evento de
estorno**, nominal e justificado, não um `UPDATE`. Conflito: impossível.

Garantia técnica: `REVOKE UPDATE, DELETE` no papel da aplicação sobre essas tabelas, e chave de
idempotência única por evento (`unique (tenant_id, idempotencia_chave)`) para que reenvio em rede instável
não gere apontamento em dobro.

### 3. Documento com ciclo de vida — propriedade que muda de mãos

`orcamento`, `pedido_venda`, `requisicao_amostra`.

Cada registro tem `proprietario_no`. O vendedor cria um orçamento offline: o dono é o dispositivo dele, e só
ele altera. Ao **submeter**, a propriedade passa para o Nó Fábrica e o documento fica somente leitura no
tablet. Se ele precisar mudar algo, cria uma **revisão nova** (`orcamento.revisao`), não edita a versão que
já está na fábrica.

## Regras complementares

- **O push envia intenção de negócio, não linha de tabela.** `POST /sync/v1/push` recebe operações do tipo
  `CriarRequisicaoAmostra`, `RegistrarApontamento`, validadas pelas regras de domínio do servidor. É isso
  que permite **rejeitar com motivo** ("cliente bloqueado em 12/09") em vez de gravar algo inválido.
- **Rejeição volta para o usuário.** Toda operação recusada vai para a caixa de pendências do vendedor com
  motivo em linguagem clara. Nada é descartado em silêncio.
- **`DUPLICADA` é sucesso.** Reenvio após timeout é o caso normal em 4G, não um erro.
- **A ordem é a do servidor.** `sequencia_servidor` (bigserial) define a ordenação; o relógio do dispositivo
  é gravado em `relogio_dispositivo` apenas como informação. Tablet com hora errada não corrompe a ordem
  dos fatos.
- **Quando o conflito ainda assim ocorrer** (falha de processo, registro tocado por dois nós): vence o dono
  do agregado, e **as duas versões** são gravadas em `sync_conflito` com alerta para revisão humana.
  Nunca há merge automático de campos de documento.

## Alternativas consideradas

| Alternativa | Por que foi rejeitada |
|---|---|
| **Last-write-wins global** | Perde silenciosamente alteração legítima. Em pedido e preço, o prejuízo é financeiro e só aparece depois |
| **Merge campo a campo** | Produz documento híbrido que nunca foi aprovado por ninguém — o pior resultado possível, porque parece válido |
| **CRDT** | Resolve bem texto e contador; não expressa invariante de negócio ("não aprovar pedido de cliente bloqueado"). Complexidade alta e mal empregada aqui |
| **Replicação bidirecional no banco** (BDR/pgEdge) | Resolve no nível da linha, sem acesso às regras de domínio, e amarra o projeto a infraestrutura pesada de replicação multi-master |
| **Bloqueio pessimista distribuído** | Exige estar online para obter o bloqueio — inviável para quem trabalha sem sinal |

## Consequências

**Positivas**

- Conflito deixa de ser rotina e passa a ser exceção rara e auditada.
- O usuário entende o modelo: "rascunho é meu, submetido é da fábrica".
- Invariantes de negócio são aplicados no momento da aceitação, não contornados pela sincronização.
- Reenvio, duplicidade e relógio errado deixam de ser fonte de dado corrompido.

**Negativas / custos aceitos**

- Mais cerimônia para o usuário de campo: ele **não edita** cadastro, ele solicita. Precisa de explicação no
  treinamento, e vai gerar reclamação no início.
- Exige disciplina de modelagem: cada tabela nova precisa ser classificada nas três categorias, e essa
  classificação é parte da revisão de código.
- Revisão de documento em vez de edição gera mais registros (`orcamento` com múltiplas revisões).

## Revisão

Reavaliar se aparecer caso de uso genuinamente colaborativo (dois usuários editando o mesmo documento ao
mesmo tempo, de propósito), que hoje não existe no escopo.
