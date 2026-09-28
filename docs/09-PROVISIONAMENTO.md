# 09 — Provisionamento: do zero ao HTTPS no ar

Runbook que **executa** a decisão de infraestrutura do
[05-INFRAESTRUTURA-E-CUSTOS](05-INFRAESTRUTURA-E-CUSTOS.md): Fly.io na região `gru`, aplicação e Postgres
auto-gerido em dois *Machines*, Tigris para anexos, Cloudflare R2 para backup, domínio `.app` na Cloudflare.

> **Preço não está aqui.** A comparação dos nove provedores e os números mensais são o
> [05](05-INFRAESTRUTURA-E-CUSTOS.md), e continuam sendo só lá — valor repetido em dois documentos divergem
> no primeiro reajuste. Este documento tem comandos.

Supõe a aplicação do [07](07-CRIACAO-DO-PROJETO.md) e o esquema do [08](08-MIGRACOES.md).
Comandos conferidos na documentação do `flyctl` em 28/09/2026; onde não houve confirmação, está escrito.

---

## 1. Antes de começar

| Precisa de | Para |
|---|---|
| Conta Fly.io com cartão | Mesmo o uso pago-por-uso exige cartão cadastrado |
| Conta Cloudflare | Registro do domínio e DNS |
| `flyctl` instalado e autenticado | `fly auth login` |
| `RAILS_MASTER_KEY` da aplicação | `config/master.key`, que não está no repositório |

Nomes usados aqui, para substituir pelos reais: aplicação `boxflow`, banco `boxflow-db`, domínio
`boxflow.app`.

---

## 2. Domínio

Registre `boxflow.app` na Cloudflare (registro a preço de custo, sem margem de revenda — ver
[05 §5](05-INFRAESTRUTURA-E-CUSTOS.md#5-domínio-e-https)).

Duas coisas sobre `.app` que mudam a operação e não aparecem no preço:

- **`.app` está na lista de pré-carga de HSTS do navegador, para todo o TLD.** Nenhum navegador aceita
  `http://` nesse domínio, nunca, nem na primeira visita. Isso é ótimo para segurança e péssimo para
  depuração: não existe "testa em HTTP só para ver se o app sobe". Certificado errado não degrada, ele
  impede o acesso. (A validação HTTP-01 do Let's Encrypt não é afetada — o validador não é navegador.)
- **Deixe os registros como "DNS only", sem o proxy da Cloudflare** (nuvem cinza, não laranja). O TLS é
  terminado pelo Fly, e o proxy da Cloudflare na frente cria duas camadas que brigam na validação de
  certificado e no cabeçalho de IP de origem. O `_acme-challenge` do §7 também precisa ser DNS only.

---

## 3. Aplicação no Fly

```bash
cd boxflow
fly launch --no-deploy --region gru --name boxflow --vm-size shared-cpu-2x --vm-memory 512
```

`--no-deploy` é deliberado: sem banco e sem DNS, o primeiro *deploy* falha e o diagnóstico fica confuso.

Revise o `fly.toml` gerado. Dois pontos:

```toml
[http_service]
  internal_port = 3000          # Thruster escuta aqui dentro do contêiner
  force_https = true
  auto_stop_machines = "suspend"
  min_machines_running = 1
```

`min_machines_running = 1` importa porque o tablet de fábrica sincroniza em rajadas e a primeira requisição
depois de uma suspensão paga a partida a frio. Num galpão, isso vira "o sistema travou".

> A armadilha correlata está no [05 §7](05-INFRAESTRUTURA-E-CUSTOS.md#7-não-ficar-preso-ao-fornecedor): se em algum momento a
> implantação passar para **Kamal**, o `app_port` do `kamal-proxy` é **80**, não 3000, porque o Thruster
> fica na frente do Puma. E com `ssl: true` é preciso `forward_headers: true`, senão o Rails vê o IP do
> proxy em toda requisição e a auditoria de acesso do [01 §9](01-ARQUITETURA.md#9-segurança-e-lgpd) registra
> sempre o mesmo endereço.

---

## 4. Postgres auto-gerido

O Postgres gerenciado do Fly custa quatro vezes a solução inteira
([05 §4](05-INFRAESTRUTURA-E-CUSTOS.md#4-a-decisão-do-banco-dita-com-clareza)), e o `fly postgres create` não gerenciado está
declaradamente sem suporte. Sobra a imagem oficial num Machine, que é o que o 05 decidiu — com as
obrigações de backup do §8 deste documento como contrapartida.

```bash
fly apps create boxflow-db

fly volumes create pgdados --app boxflow-db --region gru --size 10

fly machine run postgres:18.6 \
  --app boxflow-db \
  --region gru \
  --vm-size shared-cpu-2x --vm-memory 512 \
  --volume pgdados:/var/lib/postgresql/data \
  --env PGDATA=/var/lib/postgresql/data/pgdata \
  --env POSTGRES_PASSWORD=<senha-forte> \
  --env POSTGRES_DB=boxflow_production \
  --restart always
```

Quatro detalhes, todos capazes de custar uma noite:

**`PGDATA` aponta para uma subpasta do volume.** Volume do Fly é ext4 e vem com um `lost+found`. O
`initdb` recusa diretório não vazio, e a mensagem fala de permissão, não de conteúdo. Apontar para
`/var/lib/postgresql/data/pgdata` resolve de uma vez.

**`postgres:18.6`, com a versão explícita.** `postgres:18` puxaria 18.7 em algum reinício futuro, e a série
já provou que salta versão — a 18.5 nunca foi publicada por causa de uma regressão
([07 §1](07-CRIACAO-DO-PROJETO.md#1-versões-e-por-que-são-fixadas)).

**`--restart always` e nada de `auto_stop`.** Banco suspenso não é banco.

**Nenhum IP público neste app.** Não rode `fly ips allocate` em `boxflow-db`. A aplicação alcança o banco
por `boxflow-db.internal`, pela rede privada da organização. Postgres exposto na internet com senha é
questão de tempo.

### 4.1 Os dois papéis

Os mesmos do [07 §8.1](07-CRIACAO-DO-PROJETO.md#81-os-dois-papéis-do-banco-criados-desde-o-começo), agora em
produção, porque sem eles a RLS do [08 §9](08-MIGRACOES.md#9-row-level-security) é decorativa:

```bash
fly ssh console --app boxflow-db -C "psql -U postgres -d boxflow_production"
```

```sql
create role boxflow_ddl login password '<senha-ddl>' bypassrls;
create role boxflow_app login password '<senha-app>';
grant connect on database boxflow_production to boxflow_app;
```

---

## 5. Segredos

```bash
fly secrets set --app boxflow \
  RAILS_MASTER_KEY="$(cat config/master.key)" \
  DATABASE_URL="postgres://boxflow_app:<senha-app>@boxflow-db.internal:5432/boxflow_production" \
  DATABASE_URL_DDL="postgres://boxflow_ddl:<senha-ddl>@boxflow-db.internal:5432/boxflow_production"
```

`fly secrets set` reinicia os Machines da aplicação. Em provisionamento inicial é indiferente; depois de no
ar, é uma janela de indisponibilidade curta — agrupe as mudanças num comando só.

### 5.1 Migração não roda com o papel da aplicação

Consequência direta dos dois papéis, e ela morde no primeiro *deploy*: `boxflow_app` não tem DDL, então a
migração automática na fase de liberação **falha**. Desligue-a e rode a migração explicitamente:

```bash
fly ssh console --app boxflow -C \
  "/bin/sh -c 'DATABASE_URL=\"\$DATABASE_URL_DDL\" bin/rails db:migrate'"
```

Isso é um passo manual de propósito. Migração automática em *deploy* de sistema com dispositivo offline em
campo é como o [08 §11](08-MIGRACOES.md#11-regras-para-as-migrações-que-vierem-depois) pede para **não**
fazer: a ordem certa é migrar, confirmar, e só então publicar a versão nova do aplicativo.

---

## 6. Storage de objetos

```bash
fly storage create --app boxflow        # provisiona Tigris e injeta as credenciais como segredo
```

O Tigris entra na mesma fatura e as chaves aparecem automaticamente no ambiente da aplicação — é a razão de
o [05 §6](05-INFRAESTRUTURA-E-CUSTOS.md#6-storage-de-objetos) escolhê-lo para anexo.

O **backup do banco vai para a Cloudflare R2**, criado à mão no painel da Cloudflare, e isso é deliberado:
backup no mesmo fornecedor que o dado não protege contra o cenário em que se perde a conta do fornecedor.

```bash
fly secrets set --app boxflow-db \
  R2_ENDPOINT="https://<conta>.r2.cloudflarestorage.com" \
  R2_BUCKET="boxflow-backup" \
  R2_ACCESS_KEY_ID="..." \
  R2_SECRET_ACCESS_KEY="..."
```

---

## 7. DNS e certificados

**A ordem importa:** IP primeiro, DNS depois, certificado por último. Invertida, a validação falha e o Fly
entra em espera com mensagem genérica.

```bash
fly ips allocate-v4 --app boxflow      # IPv4 compartilhado; anote o endereço
fly ips allocate-v6 --app boxflow
fly ips list --app boxflow
```

Na Cloudflare, os três registros, todos DNS only:

| Nome | Tipo | Valor |
|---|---|---|
| `boxflow.app` | A | o IPv4 do `fly ips list` |
| `boxflow.app` | AAAA | o IPv6 do `fly ips list` |
| `*.boxflow.app` | CNAME | `boxflow.fly.dev` |

Depois que o DNS propagar:

```bash
fly certs add boxflow.app       --app boxflow     # valida por HTTP-01, automático
fly certs add "*.boxflow.app"   --app boxflow     # exige DNS-01, passo manual abaixo
fly certs show "*.boxflow.app"  --app boxflow
```

O segundo comando **não se resolve sozinho.** Certificado curinga só pode ser validado por DNS, então o
`fly certs show` devolve um registro de desafio para criar na Cloudflare, na forma
`_acme-challenge.boxflow.app` CNAME para algo terminado em `.flydns.net`. Crie, aguarde, e rode
`fly certs check "*.boxflow.app" --app boxflow`.

### 7.1 Por que o curinga não é opcional

Marca branca quer que o contratante acesse `clientex.boxflow.app`
([ADR-0006](adr/0006-marca-branca-por-contratante.md)). Um certificado por hostname cobre **um** nome; a
família `*.boxflow.app` cobre o contratante que ainda não existe.

A consequência operacional é a que interessa: **o primeiro contratante funciona sem o curinga, o segundo
não.** Se o curinga só for configurado quando o segundo contratante chegar, a configuração vai ser feita
com pressa, em cima de uma venda fechada. Faça agora, com um contratante, quando errar não custa nada.

---

## 8. Backup — as cinco obrigações, em comando

O [05 §4](05-INFRAESTRUTURA-E-CUSTOS.md#4-a-decisão-do-banco-dita-com-clareza) aceita Postgres auto-gerido **em troca** de cinco
obrigações. Elas não são recomendação; são o que faz a decisão ser defensável. Sem elas, a economia mensal
é o preço de vender a integridade do dado fiscal do cliente.

| # | Obrigação | Como |
|---|---|---|
| 1 | Arquivamento contínuo de WAL | `WAL-G` ou `pgBackRest` no contêiner do banco, empurrando para a R2 |
| 2 | Backup fora do fornecedor | R2 (§6), não Tigris |
| 3 | Snapshot de volume | Automático no Fly; confirme com `fly volumes snapshots list <id>` |
| 4 | **Restore ensaiado** | §8.2 |
| 5 | Alerta de falha de backup | §9 |

### 8.1 Arquivamento de WAL

A imagem oficial do Postgres não traz WAL-G, então isto exige uma imagem própria — `postgres:18.6` como
base, mais o binário do WAL-G e um `postgresql.conf` com:

```
archive_mode = on
archive_command = 'wal-g wal-push %p'
```

Backup completo semanal por `wal-g backup-push`, agendado. **Não confirmado:** se vale agendar com
`fly machine run --schedule weekly` num Machine efêmero ou com cron dentro do contêiner do banco. A segunda
opção é mais simples; a primeira sobrevive à perda do Machine do banco, que é exatamente o cenário do
backup. Decidir antes de ir ao ar — é a questão I3 do §11.

### 8.2 O ensaio de restore

Backup não ensaiado é esperança, não backup. A única prova é restaurar. Uma vez por mês, num app
descartável:

```bash
fly apps create boxflow-db-ensaio
fly volumes create pgdados --app boxflow-db-ensaio --region gru --size 10
# subir a mesma imagem com WAL-G apontando para a R2 em modo somente leitura
fly ssh console --app boxflow-db-ensaio -C "wal-g backup-fetch /var/lib/postgresql/data/pgdata LATEST"
# recovery.signal, subir o Postgres, e então:
fly ssh console --app boxflow-db-ensaio -C \
  "psql -U postgres -d boxflow_production -c 'select count(*) from ficha_servico_apontamento'"
fly apps destroy boxflow-db-ensaio
```

O ensaio tem de registrar **duas medidas**, e são elas que dão valor ao exercício: quanto tempo levou
(RTO real, não estimado) e qual o instante mais recente recuperado (RPO real). Anotadas mês a mês, mostram
degradação antes de o incidente mostrar.

E o que confere não é o `count`: é conferir que o número **bate com o de produção no instante do backup**.
Restore que sobe com metade dos dados também responde ao `count`.

---

## 9. Alertas que precisam existir antes de ir ao ar

Quatro, e o segundo é o mais esquecido porque falha em silêncio:

1. **Disco do volume acima de 80%.** Postgres com volume cheio não degrada, ele para. 10 GB parece muito
   até a primeira tabela de apontamento com um ano de vida ([ADR-0008](adr/0008-historico-analitico-no-mesmo-postgres.md)).
2. **Backup completo que não aconteceu em 8 dias**, e falha de `wal-push`. Um `archive_command` que falha
   faz o WAL acumular no volume — o modo de falha é o alerta 1 disparando por um motivo que não é o volume
   de dados.
3. **Machine do banco reiniciado.** Uma instância só significa que o reinício é visível ao usuário; saber
   quando aconteceu é o que permite correlacionar com a reclamação.
4. **Certificado a menos de 20 dias do vencimento.** A renovação é automática, mas a do curinga depende de
   o `_acme-challenge` continuar existindo na Cloudflare — e esse registro é o tipo de coisa que alguém
   remove na limpeza anual de DNS.

---

## 10. Subir e conferir

```bash
fly deploy --app boxflow
```

Seis verificações, nesta ordem:

```bash
curl -I https://boxflow.app/up                    # 200
curl -I https://cliente-teste.boxflow.app/up      # 200, prova o curinga
fly certs list --app boxflow                      # os dois certificados emitidos
fly logs --app boxflow
fly ssh console --app boxflow -C "bin/rails runner 'puts ActiveRecord::Base.connection.select_value(%q(select version()))'"
fly ssh console --app boxflow -C "bin/rails runner 'puts ActiveRecord::Base.connection.select_value(%q(select current_user))'"
```

A última é a que ninguém faz e a que mais importa: tem de devolver **`boxflow_app`**. Se devolver
`boxflow_ddl` ou `postgres`, a aplicação está conectando com papel que ignora RLS, e todo o isolamento
entre contratantes do [01 §7](01-ARQUITETURA.md#7-isolamento-entre-contratantes) está desligado sem nenhum
sintoma visível.

---

## 11. Saída de emergência

O [05 §7](05-INFRAESTRUTURA-E-CUSTOS.md#7-não-ficar-preso-ao-fornecedor) registra que nada aqui é
irreversível, e o que garante isso é concreto: a aplicação é um contêiner Docker padrão, o banco é
Postgres puro numa imagem oficial, o storage fala S3 e o DNS está na Cloudflare, que não é o Fly.

Migrar para um VPS é, em ordem: apontar o Kamal para o novo host, restaurar o *dump*, trocar os registros
de DNS. As duas armadilhas do Kamal (`app_port` 80 com Thruster, `forward_headers: true` com SSL) estão
no §3 e no [05 §7](05-INFRAESTRUTURA-E-CUSTOS.md#7-não-ficar-preso-ao-fornecedor).

O que **não** é reversível sem trabalho é o Tigris: as credenciais são injetadas pelo Fly. Por isso o
Active Storage tem de ser configurado com endpoint S3 genérico e variáveis de ambiente, e nunca com um
adaptador específico do fornecedor.

---

## 12. Questões abertas

| # | Questão | O que muda |
|---|---|---|
| **I3** | WAL-G agendado por cron no contêiner do banco ou por Machine efêmero? | O Machine efêmero sobrevive à perda do banco, que é o cenário do backup. Decidir antes de ir ao ar (§8.1) |
| **I4** | O Fly Managed Postgres está disponível em `gru`? | Se estiver, muda o cálculo de "auto-gerido mais as cinco obrigações" contra "gerenciado mais caro" quando houver o terceiro contratante |
| **I5** | IPv4 compartilhado é suficiente ou será necessário dedicado? | Compartilhado é grátis e basta para HTTP. IP dedicado só se algum cliente exigir liberação de IP fixo em firewall próprio |

## Histórico de revisões

| Data | Autor | Mudança |
|---|---|---|
| 28/09/2026 | — | Versão inicial. Runbook do Fly.io em `gru`: aplicação, Postgres por imagem oficial com `PGDATA` em subpasta e sem IP público, os dois papéis de banco, Tigris e R2, certificado curinga por DNS-01, as cinco obrigações de backup com ensaio de restore, quatro alertas e a verificação de `current_user` |
