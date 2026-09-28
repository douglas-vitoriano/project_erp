# ADR-0003 — Numeração offline por blocos pré-alocados

- **Status:** Aceito
- **Data:** 27/09/2026
- **Depende de:** [ADR-0001](0001-topologia-hibrida-local-nuvem.md), [ADR-0002](0002-propriedade-de-dados-e-sincronizacao.md)
- **Contexto relacionado:** [01-ARQUITETURA §5.3](../01-ARQUITETURA.md#53-numeração-offline), [03-BANCO-DE-DADOS §4.3](../03-BANCO-DE-DADOS.md#43-numeração-por-blocos-offline)

## Contexto

O legado usa **numeração inteira sequencial** em tudo que importa, e os usuários conhecem esses números de
cor: F.T. 92281, Protocolo de Amostra 30063, Orçamento 77120. Eles citam o número ao telefone, escrevem no
papel, colam no pallet.

O problema aparece no campo. O **Protocolo de Amostra é impresso e assinado na frente do cliente** — logo
precisa de um número **de verdade**, na hora, possivelmente sem nenhuma conectividade. O mesmo vale, em
menor grau, para orçamento e requisição de amostra gerados em visita.

Isso colide com o modelo de dados distribuído: sequência é um recurso centralizado, e centralizar exige
estar online.

## Decisão

Separar **identidade técnica** de **número humano**, e alocar número humano em **blocos**:

1. **Chave interna é UUID** (`id`), gerada em qualquer lugar sem risco de colisão.
2. **Número humano** (`numero`) continua inteiro sequencial, exibido e pesquisável, preservando a
   continuidade do legado: cada numerador começa **acima do maior valor migrado** (F.T. > 93.865,
   amostra > 30.803, orçamento > 77.120).
3. **Blocos pré-alocados por dispositivo.** Quando o tablet está conectado, ele recebe uma faixa exclusiva
   (ex.: protocolos 30.900 a 30.999). Offline, consome dessa faixa. Quando o estoque de números cai abaixo
   de um limite, pede bloco novo. Bloco não consumido é **devolvido e auditado**.
4. **Não sobreposição garantida pelo banco**, não pela aplicação:

```sql
alter table numerador_bloco add constraint numerador_bloco_sem_sobreposicao
  exclude using gist (
    numerador_id with =,
    int8range(valor_inicio, valor_fim, '[]') with &&
  );
```

5. **Numeração fiscal nunca é alocada offline.** `numerador.permite_offline = false` para NF-e, e a série
   fiscal é sempre atribuída pelo nó local, por estabelecimento (CNPJ). Lacuna em numeração fiscal é
   problema com o fisco, não inconveniente operacional.

## Alternativas consideradas

| Alternativa | Por que foi rejeitada |
|---|---|
| **Só UUID na tela** | Quebra 20 anos de hábito. Ninguém dita um UUID ao telefone, e o número está escrito em papel e pallet pela fábrica inteira |
| **Número provisório trocado depois** | O documento assinado pelo cliente ficaria com um número que depois muda. Inaceitável: o protocolo assinado é a evidência |
| **Prefixo por dispositivo** (ex.: `T3-1045`) | Funciona tecnicamente, mas polui o número que o negócio usa e quebra relatórios e buscas existentes |
| **Sequência central com fila** (número atribuído na chegada) | Impossível imprimir o protocolo na visita, que é exatamente o requisito |
| **Timestamp + dispositivo como número** | Ilegível e não sequencial; perde a propriedade de "número baixo é antigo" que o negócio usa |

## Consequências

**Positivas**

- Protocolo impresso e assinado na visita, offline, com número definitivo.
- Colisão de número é **impossível no banco**, não apenas improvável na aplicação.
- Continuidade total com o legado: a numeração não reinicia nem se sobrepõe ao histórico migrado.
- Bloco devolvido deixa rastro, então lacuna na sequência é explicável em auditoria.

**Negativas / custos aceitos**

- **A sequência deixa de ser densa.** Vão existir lacunas (bloco não consumido, bloco expirado) e saltos
  (dispositivo A usa 30.910 antes de o escritório usar 30.905). Quem audita precisa saber disso — está
  documentado justamente por isso.
- **Número não reflete ordem cronológica exata.** Relatórios devem ordenar por `data_emissao` ou por
  `sequencia_servidor`, nunca por `numero`. Isso é regra de implementação, não sugestão.
- Gestão adicional: monitorar dispositivo com bloco quase esgotado e alertar antes de acabar.
- Tablet que fica muito tempo offline pode esgotar o bloco. Mitigação: tamanho de bloco dimensionado pelo
  uso histórico (padrão 100) e alerta ao vendedor bem antes do fim.

## Revisão

Reavaliar se o volume de emissão em campo crescer ao ponto de o dimensionamento de bloco virar problema
recorrente, ou se surgir exigência legal de sequência densa em algum documento hoje tratado como interno.
