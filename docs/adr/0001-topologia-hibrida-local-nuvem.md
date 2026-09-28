# ADR-0001 — Topologia híbrida: servidor local + nó em nuvem

> **SUPERADO** por [ADR-0004 — Nuvem pura](0004-nuvem-pura-sem-servidor-na-fabrica.md) em 28/09/2026.
> A premissa que sustentava esta decisão — uma implantação, em uma empresa que já havia escolhido servidor
> local — caiu quando o sistema virou o **BoxFlow, um SaaS multi-contratante**. O texto abaixo fica
> preservado porque registra o raciocínio original e porque o ADR-0004 responde diretamente ao único
> argumento desta decisão que continuou válido: a fábrica parar quando a internet cai.

- **Status:** Superado pelo [ADR-0004](0004-nuvem-pura-sem-servidor-na-fabrica.md)
- **Data:** 27/09/2026
- **Contexto relacionado:** [00-CENARIO-E-PREMISSAS §3](../00-CENARIO-E-PREMISSAS.md#3-premissas-do-novo-sistema-definidas-pelo-cliente), [01-ARQUITETURA §2](../01-ARQUITETURA.md#2-a-pergunta-central-manter-a-fábrica-rodando-sem-servidor-local)

## Contexto

O cliente definiu que fábrica e escritório (mesmo endereço) usarão um **servidor local**. Ao mesmo tempo,
duas frentes móveis precisam do sistema:

- **Tablets de fábrica** transacionando Fichas de Serviço em PCP, máquinas, conferência e expedição, para
  controle homem-máquina e visibilidade de onde está o pedido.
- **Tablets de vendedores**, que trabalham em rua, precisam consultar processo e carteira e colher
  assinatura do cliente em amostras — e, nas palavras do próprio cliente, "não poderão utilizar o servidor
  remotamente".

A produção não pode parar por queda de internet. A equipe de campo não pode depender de o link da fábrica
estar de pé. E, em muitas visitas, **não há sinal algum** no momento em que o cliente assina.

## Decisão

Adotar **dois nós que se sincronizam**, com clientes offline-first:

1. **Nó Fábrica (on-premise)** — autoridade de cadastros, engenharia, produção, estoque, expedição, fiscal
   e financeiro. Atende tablets de fábrica e desktops por LAN. Opera sem internet.
2. **Nó Nuvem** — ponto de encontro do time de campo e autoridade de identidade e dos documentos criados
   em campo. Replica apenas um **recorte** do ERP, nunca o todo.
3. **Conexão sempre iniciada pela fábrica**, por HTTPS de saída com mTLS. Nenhuma porta de entrada aberta,
   nenhum serviço da fábrica publicado na internet.
4. **O tablet do vendedor fala exclusivamente com a nuvem**, inclusive quando ele está fisicamente na
   empresa. Um só caminho de código.

## Alternativas consideradas

| Alternativa | Por que foi rejeitada |
|---|---|
| **VPN do tablet até o servidor local** | Transforma o link da fábrica em ponto único de falha do comercial. CGNAT/IP dinâmico, latência de 4G, e a exposição do ERP não se pagam. Sobretudo: não resolve visita sem sinal |
| **Acesso remoto a desktop** | Interface de desktop não se opera em tablet e exige conectividade contínua |
| **Publicar o servidor local na internet** | Expõe fiscal, financeiro e engenharia na borda, sob um servidor sem equipe de segurança dedicada nem janela de patch confiável |
| **Apenas nuvem (sem servidor local)** | Contraria a premissa do cliente e para a fábrica quando a internet cai — inaceitável para apontamento e expedição |
| **Apenas local (sem nuvem)** | Deixa a equipe de campo sem sistema, que é justamente uma das quatro premissas do projeto |

## Consequências

**Positivas**

- Fábrica imune a queda de internet nas operações que não dependem de terceiros.
- Campo funciona sem sinal, com sincronização oportunista.
- Superfície de ataque pequena: nada da fábrica é alcançável de fora.
- A nuvem absorve a instabilidade dos dois lados, e nenhum lado depende do uptime do outro.

**Negativas / custos aceitos**

- Complexidade real de **sincronização entre nós** — mitigada por [ADR-0002](0002-propriedade-de-dados-e-sincronizacao.md).
- Custo recorrente de infraestrutura em nuvem.
- Necessidade de **compatibilidade entre versões** de nós (a nuvem atualiza antes da fábrica), tratada em
  [01-ARQUITETURA §6.4](../01-ARQUITETURA.md#64-compatibilidade-de-versões).
- Dado de cliente na nuvem exige tratamento de LGPD explícito.
- **Sem alta disponibilidade no nó local** (decisão consciente): um servidor, com UPS, restore testado e
  fila nos tablets como mitigação. Se a indisponibilidade máxima tolerável cair para menos de algumas
  horas, esta decisão precisa ser revista por ADR novo.

## Revisão

Reavaliar se: (a) a operação passar a ter mais de um endereço físico; (b) a exigência de disponibilidade do
nó local aumentar; (c) o volume de dados replicados para a nuvem crescer ao ponto de o recorte deixar de
ser recorte.
