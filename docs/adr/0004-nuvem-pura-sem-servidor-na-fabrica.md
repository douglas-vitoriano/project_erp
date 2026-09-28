# ADR-0004 — Nuvem pura: nenhum servidor dentro da fábrica

- **Status:** Aceito
- **Data:** 28/09/2026
- **Substitui:** [ADR-0001 — Topologia híbrida](0001-topologia-hibrida-local-nuvem.md)
- **Contexto relacionado:** [01-ARQUITETURA](../01-ARQUITETURA.md), [ADR-0002](0002-propriedade-de-dados-e-sincronizacao.md), [ADR-0003](0003-numeracao-offline-por-blocos.md), [05-INFRAESTRUTURA-E-CUSTOS](../05-INFRAESTRUTURA-E-CUSTOS.md)

## Contexto

O [ADR-0001](0001-topologia-hibrida-local-nuvem.md) foi tomado sob uma premissa que **deixou de valer**: a
de que o sistema seria instalado em uma empresa, que já havia decidido usar um servidor local. O produto
agora é o **BoxFlow, vendido como SaaS** para várias cartonagens, entregue pelo navegador.

Isso muda a conta. Um nó on-premise por contratante significa que o fornecedor do software passa a operar
**um parque de servidores físicos espalhados**, e cada um deles traz:

- hardware, UPS, disco e o dia em que o disco morre;
- janela de atualização negociada empresa por empresa, o que produz **defasagem de versão** entre
  contratantes — e [01-ARQUITETURA §6.4](../01-ARQUITETURA.md) já tratava compatibilidade entre dois nós;
  com N contratantes vira compatibilidade entre N pares;
- diagnóstico remoto de rede de terceiro, sem acesso físico e sem TI local;
- backup que precisa sair da fábrica de qualquer forma, ou seja, o problema de nuvem continua existindo.

Para um fornecedor pequeno começando com poucos contratantes, esse parque é o maior custo e o maior risco
do negócio — maior que o desenvolvimento em si. O ADR-0001 tinha rejeitado a alternativa "apenas nuvem"
com dois argumentos. Um deles ("contraria a premissa do cliente") caiu. O outro ("para a fábrica quando a
internet cai") continua verdadeiro e é o que este ADR precisa resolver.

## Decisão

**Um único nó, na nuvem. Nada é instalado na fábrica além de navegador.**

Escritório, tablets de máquina, tablets de vendedor e painel de galpão são todos clientes do mesmo serviço
em nuvem. Deixa de existir sincronização entre nós; existe apenas sincronização **dispositivo ↔ nuvem**,
que já era necessária para o tablet do vendedor.

Para cobrir o argumento que restou do ADR-0001, quatro coisas mudam de status — de "desejável" para
**obrigatórias**:

1. **O tablet de fábrica passa a ser offline-first de verdade**, e não apenas resiliente a soluço de
   Wi-Fi. No início do turno ele fixa localmente as Fichas de Serviço do dia e os dados de apoio (motivos
   de parada, operadores, postos). Apontamento, parada, refugo, conferência e carregamento são **fatos
   imutáveis** ([ADR-0002](0002-propriedade-de-dados-e-sincronizacao.md)), entram em fila local e drenam
   quando a rede volta. O operador não vê diferença: a tela responde na hora, o envio é assunto do sistema.

2. **Numeração por blocos pré-alocados** ([ADR-0003](0003-numeracao-offline-por-blocos.md)) deixa de ser
   recurso do campo e passa a valer para todo documento de fábrica. Sem autoridade local, não há quem
   atribua número durante a queda — o bloco é reservado antes.

3. **Link redundante na fábrica passa a ser requisito contratual de implantação**: link principal mais
   roteador com 4G/5G em failover automático. Custa uma fração de um servidor com UPS e resolve a queda
   de link, que é a falha comum. Não resolve queda de energia — mas sem energia não há máquina rodando,
   então não há o que apontar.

4. **Impressão da carga do turno como último recurso.** No início do turno o PCP pode imprimir as Fichas
   de Serviço do dia. Se a fábrica ficar horas sem link *e* os tablets ficarem sem bateria, a produção
   continua no papel e o apontamento é lançado depois. É degradação explícita e documentada, não
   improviso.

## Alternativas consideradas

| Alternativa | Por que foi rejeitada |
|---|---|
| **Manter o híbrido do ADR-0001** | Um servidor por contratante para o fornecedor operar. O custo e o risco não escalam para um SaaS pequeno, e a compatibilidade entre versões vira N problemas |
| **Appliance padronizado, atualizado remotamente** | Reduz a variação, mas não elimina hardware, visita técnica nem defasagem de versão. Continua sendo um parque físico |
| **Nó local opcional, por plano** | O pior dos dois: mantém toda a complexidade de sincronização entre nós **e** toda a da nuvem, com duas topologias para testar, documentar e suportar |
| **Cache local somente leitura na fábrica** | Ainda é hardware na ponta, e não resolve escrita — que é justamente o que a fábrica faz (apontar) |

## Consequências

**Positivas**

- Uma versão em produção, uma janela de atualização, um lugar para diagnosticar.
- Sem hardware na ponta: implantação de um contratante novo é criar um `tenant`.
- Backup, retenção e recuperação em um único lugar, com teste de restore de verdade.
- A complexidade de sincronização **cai**: o eixo fábrica ↔ nuvem do [ADR-0002](0002-propriedade-de-dados-e-sincronizacao.md)
  desaparece e sobra apenas dispositivo ↔ nuvem.
- Custo de infraestrutura previsível e pequeno (ver [05-INFRAESTRUTURA-E-CUSTOS](../05-INFRAESTRUTURA-E-CUSTOS.md)).

**Negativas / custos aceitos**

- **O escritório para quando o link cai.** Emitir nota, aprovar pedido, gerar O.F. e fechar romaneio
  passam a exigir internet. Aceito porque o escritório tolera esperar; a máquina não. O que a máquina faz
  continua funcionando pela fila local.
- **LAN vira WAN.** Latência de consulta sai de milissegundos e passa a depender do link. Isso impõe
  orçamento de latência explícito, resposta renderizada no servidor com carga pequena e paginação por
  cursor em toda listagem — o histórico tem 20 anos ([02-ENGENHARIA](../02-ENGENHARIA.md)).
- **Dado fiscal e financeiro de todos os contratantes em um só banco**, o que eleva a importância do
  isolamento por `tenant_id` com RLS e torna um vazamento um incidente multi-cliente. Tratado em
  [01-ARQUITETURA §8](../01-ARQUITETURA.md).
- **Dependência de terceiro** para disponibilidade. Some a esta a dependência da SEFAZ, que já existia.
- Objeção comercial previsível de cliente que "quer o dado na casa dele". A resposta é o teste de restore
  e o relatório de acesso, não um servidor na sala da diretoria.

## Revisão

Reavaliar se: (a) algum contratante estiver em local onde o link principal **e** o 4G falham de forma
recorrente; (b) a indisponibilidade tolerável do escritório cair abaixo de uma hora; (c) exigência
contratual de cliente grande impuser dado em instalação própria — caso em que a discussão é de
*single-tenant hospedado*, não de volta ao servidor na fábrica.
