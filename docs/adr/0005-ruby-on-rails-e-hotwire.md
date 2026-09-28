# ADR-0005 — Ruby on Rails, com NF-e em serviço isolado

- **Status:** Aceito
- **Data:** 28/09/2026
- **Substitui:** a escolha de stack em [02-ENGENHARIA §1](../02-ENGENHARIA.md) (.NET 8 + React)
- **Contexto relacionado:** [ADR-0004](0004-nuvem-pura-sem-servidor-na-fabrica.md), [ADR-0002](0002-propriedade-de-dados-e-sincronizacao.md)

## Contexto

A stack original era **.NET 8 / ASP.NET Core + EF Core** com um PWA React. Ela foi escolhida quando o
sistema seria instalado em um servidor dentro da fábrica e quando o argumento de peso era o ecossistema
de NF-e.

Duas coisas mudaram:

- O produto virou **SaaS entregue pelo navegador** ([ADR-0004](0004-nuvem-pura-sem-servidor-na-fabrica.md)):
  não há mais instalação, e o que importa é velocidade de evolução de um time pequeno sobre um único
  ambiente.
- A decisão de nuvem pura tirou o servidor local — e com ele a razão pela qual o serviço de NF-e precisava
  morar no mesmo processo do ERP.

## Decisão

**Ruby on Rails 8** como aplicação única, servindo HTML por Hotwire para as telas conectadas e JSON para
os dois clientes que precisam funcionar sem rede. **A emissão de NF-e fica fora**, em um serviço .NET
pequeno e isolado, acessado por HTTP.

### O que é renderizado no servidor e o que não é

Esta é a parte da decisão que exige atenção, porque Hotwire é renderização no servidor e offline-first é
renderização no cliente. As duas coisas não se misturam bem, então a fronteira é declarada:

| Cliente | Como é feito | Por quê |
|---|---|---|
| **Escritório** (engenharia, comercial, PCP, fiscal, financeiro) | Hotwire: Turbo Drive, Turbo Frames, Turbo Streams + Stimulus. Renderizado no servidor | São telas densas em formulário e listagem, sempre online ([ADR-0004](0004-nuvem-pura-sem-servidor-na-fabrica.md) aceita isso). Hotwire entrega isso com uma fração do código de uma SPA |
| **Painel de galpão** | Hotwire, empurrado por Turbo Streams sobre WebSocket | Só leitura, sempre online, e atualização por push é exatamente o caso de uso do Turbo Stream |
| **Tablet de máquina** | Cliente próprio: Stimulus + fila em IndexedDB + service worker, falando JSON idempotente | Precisa apontar durante queda de link. São poucas telas e simples — apontamento, parada, refugo, conferência, carga — então o cliente escrito à mão é pequeno e se paga |
| **Tablet do vendedor** | Cliente próprio com **SQLite (WASM/OPFS)** e fila de envio | Precisa de consulta relacional offline e de escrita offline com assinatura. É o cliente mais pesado do sistema, e nenhum atalho de servidor resolve |

O Rails é o mesmo nos quatro casos: as mesmas regras de domínio, os mesmos casos de uso. Muda só a
fronteira de saída — `respond_to` devolvendo HTML ou JSON.

### Decisões de implementação que vêm junto

- **`schema_format = :sql`** (`structure.sql`, não `schema.rb`). Obrigatório, não preferência: o modelo
  depende de `EXCLUDE USING gist` com `int8range` ([ADR-0003](0003-numeracao-offline-por-blocos.md)),
  de políticas de RLS, de domínios com `CHECK` e de índices parciais. Nada disso o `schema.rb` sabe
  representar. Migração que precisa desses recursos usa `execute` com SQL explícito.
- **RLS como rede de segurança, não como enfeite.** Todo request abre a conexão com
  `SET LOCAL app.tenant_id`, e as políticas do Postgres filtram. Escopo esquecido no Active Record é o
  erro mais fácil de cometer em SaaS multi-tenant, e o único jeito de ele não virar vazamento entre
  clientes é o banco recusar.
- **Motor de fórmulas em gem pura**, sem dependência de Rails, com **parser próprio** — descida
  recursiva sobre as sete variáveis (`C L A S I W R`) e as quatro operações. **Nunca `eval`.** A fórmula
  vem de dado de cliente; `eval` sobre dado de cliente em processo multi-tenant é execução remota de
  código. A gem isolada também é o que permite rodar a regressão contra as 94 mil F.T. do legado fora da
  aplicação.
- **Solid Queue, Solid Cache e Solid Cable** (padrão do Rails 8), tudo no Postgres. Um serviço de dado a
  menos para operar e pagar, o que importa dado o orçamento de
  [05-INFRAESTRUTURA-E-CUSTOS](../05-INFRAESTRUTURA-E-CUSTOS.md).
- **Active Storage** para desenho, foto, PDF e assinatura, com backend S3-compatível.
- **Kamal 2** para implantar, em qualquer VPS ou provedor de contêiner — deliberadamente sem amarra a um
  fornecedor.

### Por que a NF-e fica fora

O certificado A1, a assinatura do XML, o schema que a SEFAZ muda sem avisar e a contingência são um
subsistema com ciclo de vida próprio. As bibliotecas maduras estão em .NET, e essa era a melhor razão para
a stack anterior. Manter **só isso** em .NET preserva a vantagem e custa um contêiner.

O contrato é estreito, e a divisão de responsabilidade é o que faz ele funcionar:

- O **Rails é dono da máquina de estados** do documento fiscal: rascunho, autorizada, rejeitada, cancelada,
  inutilizada, carta de correção. A nota é dado do ERP.
- O **serviço é dono do transporte**: monta o XML, assina, envia, lê o retorno, trata contingência.
- Comunicação por HTTP com `Idempotencia-Chave`, porque reenvio depois de timeout não pode gerar nota
  duplicada.

Uma consequência do [ADR-0004](0004-nuvem-pura-sem-servidor-na-fabrica.md) cai aqui: **o certificado A1
deixou de morar na fábrica.** Ele passa a ser guardado cifrado por contratante, com a chave em cofre
gerenciado, e o serviço o carrega em memória apenas durante a assinatura. Isso é obrigação nova e precisa
estar no contrato com o cliente, porque é o certificado digital dele.

## Alternativas consideradas

| Alternativa | Por que foi rejeitada |
|---|---|
| **Continuar em .NET 8** | Escolha do cliente foi mudar. Objetivamente, o que .NET oferecia de melhor era o ecossistema fiscal, e isso foi preservado no serviço isolado. O que Rails oferece de melhor — velocidade de um time pequeno sobre CRUD denso — é o que este projeto mais consome |
| **Rails só como API + SPA React** | Duas bases de código e todo o custo de uma SPA para telas de escritório que Hotwire resolve. Os únicos clientes que justificam código no navegador são os dois offline, e esses ficaram assim mesmo |
| **Hotwire para tudo, inclusive fábrica** | Não funciona sem rede, e apontamento sem rede é requisito. Tentar resolver isso só com service worker sobre HTML renderizado no servidor dá um sistema que parece funcionar e perde lançamento |
| **Phoenix / LiveView** | Tecnicamente excelente para o painel e para tempo real, mas contratar Elixir no Brasil é bem mais difícil que contratar Rails |
| **Node / Next.js** | Fraco justamente onde este sistema é pesado: SQL complexo, transação longa, relatório e migração de 20 anos de histórico |

## Consequências

**Positivas**

- Uma linguagem, um framework e um banco para quase tudo; o desvio é um serviço pequeno e estável.
- Hotwire elimina a maior parte do custo de SPA nas telas de escritório, que são a maioria das telas.
- Rails 8 com Solid* reduz a infraestrutura ao mínimo: aplicação + Postgres + storage de objeto.
- `structure.sql` mantém o DDL de [03-BANCO-DE-DADOS](../03-BANCO-DE-DADOS.md) como fonte de verdade,
  em vez de uma tradução empobrecida em Ruby.

**Negativas / custos aceitos**

- **Dois runtimes em produção** (Ruby e .NET). Aceito porque o segundo tem uma responsabilidade só.
- **Ecossistema fiscal em Ruby é fraco.** É exatamente por isso que existe o serviço isolado; se ele for
  abandonado no futuro, o problema volta.
- **Throughput por processo menor que .NET.** Pouco relevante: a carga é dominada por espera de banco, não
  por CPU. A exceção é a regressão das 94 mil F.T., que roda fora do ciclo de requisição.
- **Dois clientes offline escritos à mão**, sem framework para segurar a barra. É o ponto mais caro da
  stack e precisa de teste de partição de rede automatizado, não de teste manual.
- Sem `schema.rb`, o time perde a leitura rápida do esquema em Ruby e passa a depender do DDL. Mitigado
  por o DDL estar documentado e revisado no mesmo commit da migração.

## Revisão

Reavaliar se: (a) o serviço de NF-e em .NET virar um problema de manutenção maior que a vantagem do
ecossistema; (b) as telas de escritório passarem a exigir interação que Hotwire não sustente; (c) o
cliente offline de fábrica crescer ao ponto de justificar um framework no navegador.
