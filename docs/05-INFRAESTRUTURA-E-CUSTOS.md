# 05 — Infraestrutura e custos

Com a nuvem pura do [ADR-0004](adr/0004-nuvem-pura-sem-servidor-na-fabrica.md), a infraestrutura deixou de
ser problema do cliente e passou a ser **custo do produto**. Cada real por mês aqui sai da margem do
BoxFlow, e é por isso que este documento existe separado.

Preços levantados em **28/09/2026**. Onde não houve confirmação na página oficial do fornecedor, está
escrito "não confirmado" — preço inventado é pior que preço ausente.

---

## 1. O que se está otimizando

| Critério | Por quê |
|---|---|
| **Custo mínimo** | SaaS começando com 1 a 5 contratantes; a infraestrutura não pode comer a receita |
| **Região no Brasil** | Tablets, escritório e SEFAZ estão no Brasil, e o [orçamento de latência](01-ARQUITETURA.md#12-orçamento-de-latência) é apertado |
| **HTTPS pronto** | O provedor entrega um subdomínio com TLS automático, sem comprar domínio para começar |
| **Sem Registro.br** | Decisão do cliente: nada de `.com.br`, que exige CNPJ e passa pelo Registro.br |
| **Sem amarra a fornecedor** | Implantação por [Kamal 2](adr/0005-ruby-on-rails-e-hotwire.md), que roda em qualquer VPS ou provedor de contêiner |

---

## 2. Decisão

**Fly.io, região `gru` (São Paulo)**, com a aplicação e o PostgreSQL em dois *Machines* pequenos, storage
de objetos no Tigris, e domínio próprio `.app` registrado na Cloudflare.

É o **único provedor que entrega região no Brasil e domínio HTTPS pronto ao mesmo tempo** — os demais
oferecem um ou o outro.

| Item | Configuração | Custo/mês |
|---|---|---|
| Aplicação (Rails + Thruster/Puma) | `shared-cpu-2x` · 512 MB | US$ 4,39 |
| PostgreSQL (imagem oficial, auto-gerido — ver §4) | `shared-cpu-2x` · 512 MB | US$ 4,39 |
| Volume do banco | 10 GB × US$ 0,15 | US$ 1,50 |
| Snapshots do volume | primeiros 10 GB/mês | US$ 0,00 |
| Storage de objetos (Tigris) | até 5 GB | US$ 0,00 |
| Egress América do Sul | ~5 GB × US$ 0,04 | US$ 0,20 |
| IPv4 compartilhado + IPv6 Anycast | incluso | US$ 0,00 |
| Certificado TLS | incluso e renovado pelo provedor | US$ 0,00 |
| Domínio `.app` na Cloudflare | ~US$ 14/ano | US$ 1,18 |
| **Total** | | **≈ US$ 11,66** |

> **Aviso de preço.** A Fly.io anunciou em 21/09/2026 um **aumento de 20% no preço de memória** dos
> Machines com vigência em **01/10/2026**. A tabela acima **já usa o valor novo**. Antes do reajuste o
> subtotal era US$ 9,48; depois é US$ 10,48. CPU e Managed Postgres não mudam.
> Fonte: <https://fly.io/pricing-update/>

Menos de doze dólares por mês para a operação inteira. Para efeito de decisão comercial: isso é cerca de
**0,4% do custo do servidor único** que a topologia anterior exigia de cada cliente, sem contar UPS,
disco redundante, energia e quem cuida.

---

## 3. Comparativo

| Provedor | Config mínima utilizável | Preço/mês | Região BR? | Subdomínio HTTPS? | Observação |
|---|---|---|---|---|---|
| **Fly.io** | 2 Machines `shared-cpu-2x`·512 MB + volume 10 GB, em `gru` | **US$ 10,48** | **Sim** (`gru`) | **Sim** (`*.fly.dev`) | Único com os dois. Postgres gerenciado é caro; ver §4 |
| Fly.io + Managed Postgres | app + MPG Basic (1 GB) + 10 GB | US$ 45,19 | app sim; MPG em `gru` **não confirmado** | Sim | HA, backup e pooler inclusos. Piso de US$ 38, sem tier hobby |
| Render | Web Starter US$ 7 + Postgres Basic US$ 6 | US$ 13,00 | **Não** | Sim | Preço mais previsível da lista, mas o mais próximo é Virginia |
| Railway | Hobby US$ 5 + uso medido | US$ 8–15 real | **Não** | Sim | O piso de US$ 5 não se sustenta com app + banco |
| Vultr São Paulo | 1 vCPU / 1 GB / 25 GB | US$ 5,00 base | **Sim** | Não | Sobretaxa LATAM de ~5% relatada, **não confirmada** |
| Magalu Cloud | VM `BV1-2-10` (1 vCPU / 2 GB) | R$ 44,99 | **Sim** | Não | Em reais, com NF-e, sem IOF nem câmbio. Ver §8 |
| Hetzner CAX11 | 2 vCPU ARM / 4 GB / 40 GB + IPv4 | € 6,49 | **Não** | Não | Melhor hardware por euro, mas ~200 ms do Brasil |
| DigitalOcean App Platform | app US$ 5 + Dev Database US$ 7 | US$ 12,00 | **Não** | Sim | O Dev Database de US$ 7 **não tem backup automático** |
| Oracle Cloud Always Free | 2 OCPU ARM / 12 GB | **US$ 0** | Sim, se a *home region* for `gru` | Não | Ver §9: limites cortados pela metade e falta crônica de capacidade |

### 3.1 Por que São Paulo vale dinheiro aqui

Não é preciosismo. O [orçamento de latência](01-ARQUITETURA.md#12-orçamento-de-latência) fixa 800 ms de
p95 para abrir listagem no escritório, e esse orçamento é gasto em três lugares: link da fábrica,
travessia até o servidor e consulta no banco. Hospedar na Europa consome cerca de **200 ms** só na
travessia; nos Estados Unidos, algo entre 120 e 150 ms. É um quarto do orçamento entregue de graça, em um
sistema cujas tabelas têm 20 anos de histórico.

Soma-se a isso a integração com a SEFAZ, que é brasileira, e o fato de a decisão de nuvem pura ter
transferido para o link **toda** a interatividade que antes acontecia em LAN. São Paulo custa praticamente
o mesmo que Virginia. Não há razão para pagar a latência.

---

## 4. A decisão do banco, dita com clareza

Este é o ponto que exige escolha consciente, porque a Fly.io **descontinuou o Postgres não gerenciado**
(`flyctl postgres`) e o Managed Postgres não tem plano pequeno:

| Caminho | Custo/mês | O que você ganha | O que você assume |
|---|---|---|---|
| **Imagem `postgres` própria** (escolhido) | US$ 5,89 | Custo baixo, controle total de versão e extensão | **Backup, PITR e restore são seu trabalho** |
| Managed Postgres Basic | US$ 40,80 | HA, backup automático, PITR e connection pooler | Nada além da fatura |

A diferença é de **~US$ 35/mês**. Para um SaaS com 1 a 5 contratantes isso é dinheiro real, e por isso a
escolha é o Postgres próprio — **mas ela só é defensável com o backup resolvido de verdade**, e o dado
aqui é fiscal e financeiro de múltiplos clientes.

O que "resolvido de verdade" significa, concretamente:

- **Arquivamento contínuo de WAL** com `pgBackRest` ou `WAL-G` para storage de objetos, com
  `archive_timeout` de 5 minutos. É isso que sustenta o **RPO ≤ 15 min** prometido em
  [01-ARQUITETURA §11](01-ARQUITETURA.md#11-backup-retenção-e-recuperação).
- **Base completa diária**, cifrada.
- **Cópia em provedor diferente** — a exigência de [01-ARQUITETURA §11](01-ARQUITETURA.md#11-backup-retenção-e-recuperação)
  de que backup não more no mesmo lugar que o dado. Cloudflare R2 ou Backblaze B2 custam centavos nessa
  escala (§6).
- **Restore ensaiado mensalmente**, com o tempo cronometrado, para o **RTO ≤ 2 h** ser um número medido e
  não uma esperança.
- **Alerta ativo de backup que não rodou.** Backup silenciosamente quebrado é o padrão da indústria.

Se esse trabalho não for feito, a economia de US$ 35 é ilusória: ela troca custo previsível por risco de
perda de dado fiscal de terceiro. **A regra de decisão é simples — no dia em que a receita do BoxFlow
tornar US$ 35/mês irrelevante, migre para o Managed Postgres e devolva o problema ao fornecedor.**

---

## 5. Domínio e HTTPS

### 5.1 Sem domínio nenhum: o que funciona e o que não funciona

| Caminho | Serve em produção? | Por quê |
|---|---|---|
| **Subdomínio do provedor** (`*.fly.dev`) | **Sim** | TLS gerenciado e renovado pelo provedor, hostname estável, sem limite de emissão |
| `sslip.io` / `nip.io` | **Não** | Nenhum dos dois está na Public Suffix List, e o pedido do `sslip.io` foi **recusado**. Consequência: todos os usuários do mundo dividem o **mesmo limite de emissão** da Let's Encrypt — o limite foi elevado a 200 mil certificados por semana e **ainda assim esgotou em fevereiro de 2026**. Sua renovação a cada 60–90 dias fica refém disso. Fora da PSL, o escopo de cookie também não isola entre hostnames vizinhos |
| Certificado de IP da Let's Encrypt | **Não** | Funciona, mas a URL é `https://1.2.3.4/`. Inaceitável para um ERP comercial |
| `trycloudflare.com` | **Não** | A Cloudflare é categórica: "apenas para teste e desenvolvimento". A URL **muda a cada reinício**, há limite rígido de 200 requisições concorrentes e não suporta Server-Sent Events |

### 5.2 Mas o domínio próprio não é opcional

Aqui houve uma descoberta que muda a conclusão fácil. O modelo de dados prevê
**`tenant.subdominio`** ([03-BANCO-DE-DADOS §3](03-BANCO-DE-DADOS.md#3-módulo-1--núcleo)), porque marca
branca ([ADR-0006](adr/0006-marca-branca-por-contratante.md)) quer que cada contratante acesse um endereço
que pareça dele: `clientex.boxflow.app`.

**Isso não é possível sobre `*.fly.dev`.** O subdomínio do provedor cobre um hostname, não uma família. Ou
seja: o subdomínio grátis serve para o piloto e para a demonstração, e **no momento em que existir o
segundo contratante, o domínio próprio com certificado curinga passa a ser requisito de arquitetura**, não
preferência de marketing.

Dois detalhes técnicos que costumam pegar:

- Certificado **curinga** exige desafio **DNS-01**, não HTTP-01. Na Fly.io isso é
  `fly certs add "*.boxflow.app"` com validação por DNS.
- O SSL automático do `kamal-proxy` faz apenas HTTP-01 para **um** host. Se a implantação migrar para VPS,
  o curinga precisa ser fornecido por `certificate_pem` / `private_key_pem`.

### 5.3 Onde registrar, fora do Registro.br

Qualquer gTLD atende uma empresa brasileira, sem CNPJ e sem Registro.br. A **Cloudflare Registrar** cobra
**preço de custo do registry, sem markup e sem diferença entre registro e renovação** — não existe o
truque de primeiro ano barato com renovação caríssima.

| TLD | Faixa encontrada (USD/ano) | Observação |
|---|---|---|
| `.com` | 8,57 – 10,46 | Mais reconhecido; sem HSTS preload |
| `.app` | 11,00 – 14,20 | **HSTS preload no TLD inteiro** |
| `.dev` | 10,11 – 12,20 | **HSTS preload no TLD inteiro** |
| `.net` | ~11,86 | — |

As fontes divergem em alguns dólares, então trate como faixa e confirme no checkout. Em qualquer caso é
**menos de US$ 1,25/mês**.

**Recomendação: `.app`.** `.app` e `.dev` estão na lista de **HSTS preload do Chromium como TLD inteiro**,
com `force-https` compilado no binário do navegador — Firefox, Safari e Edge herdam a mesma lista. Para um
ERP com dado fiscal isso é uma vantagem de segurança de graça: HTTPS é obrigatório **desde a primeira
visita**, antes de qualquer cabeçalho nosso, o que elimina ataque de downgrade e o acesso acidental por
`http://`.

O contraponto honesto: **não há tela de "prosseguir mesmo assim"**. Certificado vencido deixa o sistema
totalmente inacessível. Como Fly.io e Kamal renovam automaticamente, isso é gerenciável — mas o alerta de
vencimento de certificado deixa de ser zelo e passa a ser obrigatório, ao lado do alerta de vencimento do
certificado A1 ([01-ARQUITETURA §8](01-ARQUITETURA.md#8-fiscal-e-contingência)).

Se o reconhecimento de marca preocupar, registrar o `.com` equivalente em paralelo mantém o total abaixo
de US$ 25/ano.

---

## 6. Storage de objetos

Desenho, foto, PDF de protocolo e assinatura vão para storage S3-compatível
([01-ARQUITETURA §10](01-ARQUITETURA.md#10-anexos-e-documentos)).

| Serviço | Storage | Egress | Camada gratuita |
|---|---|---|---|
| **Tigris** (integrado à Fly) | US$ 0,020/GB | **Grátis** | 5 GB |
| **Cloudflare R2** | US$ 0,015/GB | **Grátis, sempre** | 10 GB |
| Backblaze B2 | US$ 0,007/GB | Grátis até 3× o storage médio; **ilimitado via Cloudflare** | 10 GB |
| Magalu Object Storage | R$ 0,10/GiB | R$ 0,10/GiB | — |

No primeiro ano, com 1 a 5 contratantes, o volume provavelmente fica abaixo de 10 GB e os três primeiros
custam **US$ 0**. A escolha é por conveniência:

- **Tigris** para os anexos da aplicação: provisiona com um comando, entra na mesma fatura e não sofre a
  tarifa de egress da Fly.io.
- **Cloudflare R2** para os **backups do banco** (§4), justamente porque é outro fornecedor — o que
  satisfaz a exigência de a cópia não morar junto do dado. Egress grátis também significa que restaurar
  não custa nada, e restore que custa é restore que não se ensaia.

---

## 7. Não ficar preso ao fornecedor

A implantação é por **Kamal 2** ([ADR-0005](adr/0005-ruby-on-rails-e-hotwire.md)), que sobe contêiner em
qualquer máquina com SSH. Isso é deliberado: a Fly.io é a escolha de hoje, não um casamento.

O `kamal-proxy` roda nas portas 80 e 443 do próprio servidor e emite Let's Encrypt automaticamente, o que
**elimina a necessidade de load balancer pago** em qualquer VPS. A configuração é de três linhas:

```yaml
# config/deploy.yml
proxy:
  ssl: true
  host: boxflow.app
```

Três requisitos, para não descobrir no dia da migração: funciona com **um** servidor (vários exigem
certificado fornecido ou LB na frente), o **DNS precisa estar apontado antes do primeiro deploy** ou o
desafio ACME falha, e nada mais pode estar ocupando as portas 80 e 443.

Duas armadilhas do Rails 8, que já traz Kamal e Thruster configurados: com Thruster, o `app_port` do proxy
é **80**, não 3000; e com `ssl: true` o `kamal-proxy` para de encaminhar cabeçalhos a menos que se marque
`forward_headers: true`.

**A decisão que evita o pior tipo de amarra é registrar o domínio cedo**, mesmo usando `*.fly.dev` no
começo. Endereço de provedor vira dependência silenciosa: o dia em que mudar, quebram favorito,
integração e qualquer cadastro que cliente ou SEFAZ tenham feito.

---

## 8. Alternativa em reais: Magalu Cloud

Vale registrar porque resolve uma dor real de SaaS pequeno que a Fly.io não resolve: **faturar e pagar na
mesma moeda**.

VM `BV1-2-10` (1 vCPU / 2 GB / 10 GB) por **R$ 44,99/mês**, com impostos inclusos, rodando aplicação e
Postgres no mesmo servidor via Kamal 2, mais Object Storage a R$ 0,10/GiB. É nuvem brasileira, com **nota
fiscal brasileira, sem IOF e sem exposição cambial** — para um produto vendido em reais, isso às vezes
compensa a diferença de preço absoluto.

O que se perde: **não há subdomínio HTTPS pronto** (domínio próprio passa a ser obrigatório desde o
primeiro dia) e o DBaaS gerenciado não compensa nessa escala (R$ 94,22 a instância única). O preço do IP
flutuante público **não foi confirmado**.

---

## 9. Por que não a Oracle Cloud Always Free

Ela é tentadora: **2 OCPU ARM com 12 GB de RAM de graça, com região em São Paulo** — muito mais máquina do
que qualquer coisa que se compre por US$ 10. Com Kamal 2 e um domínio `.app`, o custo total ficaria em
**US$ 1,18/mês**.

Foi rejeitada por três motivos, e nenhum deles é técnico:

1. **"Out of host capacity" é crônico**, reconhecido na própria documentação da Oracle, com relatos
   recorrentes especificamente em São Paulo. Não se consegue nem criar a instância de forma confiável.
2. **A Oracle cortou os limites pela metade em 15/06/2026** — de 4 OCPU / 24 GB para 2 OCPU / 12 GB — sem
   blog, sem changelog e sem aviso no console. Usuários descobriram quando instâncias foram desligadas.
   Quem cortou uma vez pode cortar de novo.
3. **Instância ociosa por 7 dias pode ser recuperada** pelo provedor, e não há snapshot automático no
   Always Free.

Sem SLA, sem aviso de mudança e sem garantia de capacidade não se coloca o dado fiscal de cliente pagante.
É um ambiente excelente para **homologação e ensaio de restore**, e é para isso que vale mantê-la no radar.

---

## 10. O que faz a conta crescer

Enquanto são 1 a 5 contratantes o custo é irrelevante. O que muda a ordem de grandeza, em ordem de
probabilidade:

| Gatilho | Efeito | Quando agir |
|---|---|---|
| **Anexos** (desenho, foto, PDF, assinatura) | Cresce para sempre e ninguém percebe | Cota e alerta por contratante em 70%, já previstos em [01-ARQUITETURA §13](01-ARQUITETURA.md#13-observabilidade) |
| Memória da aplicação | Machine maior | Quando o p95 do §12 da arquitetura estourar, não antes |
| Trocar para Managed Postgres | +US$ 35/mês | Quando a receita tornar o trabalho de backup mais caro que a fatura (§4) |
| Sincronização de tablets de campo | Egress | US$ 0,04/GB na América do Sul; irrelevante até dezenas de GB |
| Segundo contratante com marca branca | Domínio + certificado curinga | **Antes** de vender o segundo contrato (§5.2) |

A métrica que precisa existir desde a fase 0 é **custo por contratante**. Sem ela não se sabe se o plano
cobre a operação, e é a pergunta que define o preço de venda.

---

## 11. Pontos não confirmados

Registrados para não virarem suposição esquecida:

- Se o **Fly Managed Postgres está disponível em `gru`** — a tabela de preços não discrimina por região.
- O **preço exato da Vultr em São Paulo**. Há relato de terceiros de sobretaxa de ~5% em LATAM, sem
  confirmação na página oficial.
- O **preço do IP flutuante público da Magalu Cloud**.
- O **prazo de validade dos certificados de IP da Let's Encrypt**.
- Se a linha **ARM (CAX) da Hetzner existe nos Estados Unidos** — a tabela oficial só lista Alemanha e
  Finlândia.
- **Postgres gerenciado gratuito de terceiros** (Neon, Supabase) poderia derrubar ainda mais o custo do
  banco, mas preço e disponibilidade de região brasileira não foram pesquisados. Vale verificação antes de
  fechar a arquitetura, com uma ressalva: o modelo depende de `EXCLUDE USING gist`, RLS e extensões
  ([02-ENGENHARIA §3.3](02-ENGENHARIA.md#33-migrações-de-banco)), e provedor gerenciado costuma restringir
  exatamente isso.

---

## Histórico de revisões

| Data | Mudança |
|---|---|
| 28/09/2026 | Documento criado. Fly.io em `gru` com Postgres auto-gerido, domínio `.app` na Cloudflare, Tigris para anexos e R2 para backup; comparativo de nove provedores; descoberta de que marca branca por subdomínio torna o domínio próprio requisito de arquitetura |
