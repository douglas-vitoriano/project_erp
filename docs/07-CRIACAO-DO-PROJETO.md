# 07 — Criação do projeto: do zero ao primeiro commit

Sequência de comandos para levantar o repositório da aplicação BoxFlow. Vale para a máquina de
desenvolvimento e para o ambiente de integração; o provisionamento da nuvem é o
[09-PROVISIONAMENTO](09-PROVISIONAMENTO.md), e o banco é o [08-MIGRACOES](08-MIGRACOES.md).

Versões conferidas em **28/09/2026**. Onde não houve confirmação, está escrito "não confirmado".

> **Este documento não cria o esquema.** Ao final dele existe uma aplicação Rails vazia que conecta no
> Postgres. As 100 e tantas tabelas do [03-BANCO-DE-DADOS](03-BANCO-DE-DADOS.md) entram pelo 08.

---

## 1. Versões, e por que são fixadas

| Ferramenta | Versão | Onde se fixa |
|---|---|---|
| Ruby | **3.4.x** | `.ruby-version` |
| Rails | **8.1.4** | `Gemfile` com `~> 8.1.4` |
| PostgreSQL | **18.6** | tag da imagem Docker, igual em desenvolvimento e produção |
| Node | **não é necessário** | Propshaft + importmap não fazem *build* |
| Docker | qualquer recente | — |
| `flyctl` | qualquer recente | usado só no [09](09-PROVISIONAMENTO.md) |

Três observações que valem mais que a tabela:

**Rails 8.1.4 saiu em 24/09/2026, e a janela de correção de bugs da série 8.1 encerra em 10/10/2026** —
ou seja, o 8.2 é iminente. Isso não é motivo para esperar: comece no 8.1.4, mas conte com um *upgrade* de
minor nas primeiras semanas, e por isso não vale acumular divergência do padrão do framework antes de a
aplicação existir.

**Ruby 3.4 removeu o `csv` da biblioteca padrão.** Como o sistema exporta XLSX e CSV
([02 §1](02-ENGENHARIA.md#1-stack)), `gem "csv"` é obrigatório no `Gemfile`. O erro aparece tarde, em
produção, na primeira exportação.

**Postgres 18.6, não 18.4 nem 18.5.** A série pulou de 18.4 para 18.6 porque a **18.5 não foi publicada,
por causa de uma regressão**. Fixar `postgres:18.5` simplesmente não resolve imagem. E o 19 está em beta 3,
fora de cogitação para dado fiscal.

O Postgres 18 importa por dois motivos concretos para este projeto:

- **`uuidv7()` é nativo**, sem extensão. É a chave ordenável no tempo que o
  [03 §2.2](03-BANCO-DE-DADOS.md#22-colunas-padrão-colunas_padrao) prefere, e que reduz fragmentação de
  índice nas tabelas que recebem milhões de eventos.
- **Restrições temporais** em `PRIMARY KEY`, `UNIQUE` e `FOREIGN KEY` passaram a existir. Não mudamos o
  desenho por isso — o `EXCLUDE USING gist` do [03 §4.3](03-BANCO-DE-DADOS.md#43-numeração-por-blocos-offline) está
  correto e testado — mas fica registrado como alternativa para quem revisitar.

---

## 2. Pré-requisitos

```bash
# versões instaladas
ruby -v                      # esperado: ruby 3.4.x
docker --version
git --version

# Rails na versão fixada
gem install rails -v 8.1.4
rails -v                     # esperado: Rails 8.1.4
```

Se o `ruby -v` não devolver 3.4, instale pelo gerenciador de versão que você já usa (`mise`, `rbenv`,
`asdf`). Não vale a pena padronizar isso no documento: muda por máquina e não muda o resultado.

---

## 3. Criar a aplicação

```bash
rails new boxflow \
  --database=postgresql \
  --skip-test \
  --skip-jbuilder \
  --skip-action-mailbox \
  --skip-action-text
cd boxflow
```

Cada escolha, com o motivo:

| Opção | Por quê |
|---|---|
| `--database=postgresql` | O modelo depende de `EXCLUDE USING gist`, RLS, domínios com `CHECK`, `jsonb` e coluna gerada. Nada disso é portável |
| `--skip-test` | Os testes são em RSpec (§7). Deixar o Minitest gerado cria duas suítes e ninguém roda as duas |
| `--skip-jbuilder` | A API de sincronização serializa estrutura controlada, não *view* de JSON ([02 §3.2](02-ENGENHARIA.md#32-api)) |
| `--skip-action-mailbox` | Não recebemos e-mail. Recebemos NF-e, que é outro serviço |
| `--skip-action-text` | Nenhum campo de texto rico no modelo. Se aparecer, adiciona-se depois |
| sem `--css` | Propshaft com CSS puro. O tema por contratante é gerado a partir de **uma** cor e servido em `/tema/<tenant>-<hash>.css` ([02 §3.6](02-ENGENHARIA.md#36-tema-do-contratante)); framework de CSS utilitário atravessaria esse desenho em vez de ajudar |
| sem `--javascript` | O padrão do Rails 8 é `importmap`, que é o que queremos: sem Node, sem *build*, sem `node_modules` |
| sem `--skip-solid` | Solid Queue, Cache e Cable são exatamente a decisão do [ADR-0005](adr/0005-ruby-on-rails-e-hotwire.md): nada de Redis |
| sem `--skip-kamal` | Kamal 2 é a implantação, e é o que evita amarra de fornecedor ([05 §7](05-INFRAESTRUTURA-E-CUSTOS.md#7-não-ficar-preso-ao-fornecedor)) |

> Os nomes das opções mudam entre versões *minor* do Rails. A autoridade é `rails new --help` na versão
> que você instalou — se alguma das opções acima for recusada, confira ali antes de contornar.

---

## 4. Ajustes de configuração que vêm antes de qualquer código

### 4.1 `config/application.rb`

```ruby
module Boxflow
  class Application < Rails::Application
    config.load_defaults 8.1

    # O schema.rb não sabe representar EXCLUDE, RLS, domínio com CHECK nem
    # coluna gerada. Sem isto, o banco de teste nasce diferente do de produção.
    config.active_record.schema_format = :sql

    config.time_zone = "America/Sao_Paulo"
    config.active_record.default_timezone = :utc

    config.i18n.default_locale = :"pt-BR"
    config.i18n.available_locales = [:"pt-BR"]

    # As gems locais do §6 são carregadas pelo Gemfile, não pelo autoload.
    config.autoload_lib(ignore: %w[assets tasks])
  end
end
```

`schema_format = :sql` é o ajuste mais importante deste documento e o mais fácil de esquecer, porque nada
falha imediatamente: o projeto roda por semanas e só quebra quando alguém cria o banco de teste do zero e
descobre que as restrições não existem lá. Motivo completo em
[02 §3.3](02-ENGENHARIA.md#33-migrações-de-banco).

### 4.2 O fuso, explicado porque dá briga

`time_zone` em São Paulo e `default_timezone = :utc` gravam em UTC e exibem em horário local. É o
comportamento certo para um sistema com tablet em rua e apontamento de turno que cruza a meia-noite — e é
coerente com a regra de usar `timestamptz` sempre
([03 §2.4](03-BANCO-DE-DADOS.md#24-regras-transversais)).

---

## 5. Gems

```ruby
# Gemfile — acrescentar ao que o Rails gerou

gem "csv"                      # Ruby 3.4 removeu da stdlib; usado na exportação

gem "pundit"                   # autorização por política (01-ARQUITETURA §9.2)
gem "view_component"           # componentes de tela reutilizáveis
gem "caxlsx"                   # XLSX real, não "xls" que é HTML renomeado
gem "caxlsx_rails"

gem "omniauth"                 # identidade OIDC (01-ARQUITETURA §9.1)
gem "omniauth_openid_connect"
gem "omniauth-rails_csrf_protection"

group :development, :test do
  gem "rspec-rails"
  gem "factory_bot_rails"
  gem "rubocop-rails-omakase", require: false
end

group :development do
  gem "annotaterb"             # mantém o esquema visível no modelo
end
```

```bash
bundle install
```

Sobre o que **não** está aqui: nenhuma gem de multi-tenancy. O isolamento é `default_scope` por
contratante mais RLS no banco como rede de segurança
([02 §3.5](02-ENGENHARIA.md#35-multi-contratante-no-active-record)), e gem de tenancy costuma trazer
comportamento mágico que atravessa exatamente esse desenho. Também não há gem de autenticação: o Rails 8
já gera o gerador de autenticação e a identidade é OIDC.

---

## 6. As três gems locais

O motor de cálculo, o sequenciador e o motor de sincronização são bibliotecas puras que **não conhecem
Rails** ([02 §2](02-ENGENHARIA.md#2-estrutura-do-repositório)). Isso não é purismo: é o que permite rodar a
regressão contra as 94 mil F.T. do legado por script, sem subir a aplicação, e reproduzir uma proposta de
sequência de três semanas atrás a partir do registro.

```bash
bundle gem lib/boxflow_calculo       --no-exe --no-coc --no-mit --test=rspec
bundle gem lib/boxflow_sequenciador  --no-exe --no-coc --no-mit --test=rspec
bundle gem lib/boxflow_sincronizacao --no-exe --no-coc --no-mit --test=rspec
```

```ruby
# Gemfile
gem "boxflow_calculo",       path: "lib/boxflow_calculo"
gem "boxflow_sequenciador",  path: "lib/boxflow_sequenciador"
gem "boxflow_sincronizacao", path: "lib/boxflow_sincronizacao"
```

Como `bundle gem` cria um `Gemfile` e um `.git` dentro de cada pasta, remova os dois — são subrepositórios
acidentais que quebram o `git add` da raiz:

```bash
rm -rf lib/boxflow_*/.git lib/boxflow_*/Gemfile
```

**A regra que precisa ser vigiada em revisão de código:** nenhuma dessas três gems pode ganhar
`activerecord`, `activesupport` ou `rails` no seu `gemspec`. No dia em que ganhar, o script de regressão
para de rodar fora da aplicação e ninguém percebe até precisar dele.

---

## 7. RSpec

```bash
bundle exec rails generate rspec:install
```

```ruby
# .rspec
--require spec_helper
--format documentation
```

Crie as pastas que correspondem aos testes que o [02 §3.4](02-ENGENHARIA.md#34-testes) declara
obrigatórios, para que eles não fiquem sem lugar:

```bash
mkdir -p spec/{models,requests,services,isolamento,regressao,offline}
```

- `spec/isolamento/` — o teste de vazamento entre contratantes: autenticado como A, pedindo id de B, tem
  que voltar **404**, não 403 ([01 §7](01-ARQUITETURA.md#7-isolamento-entre-contratantes)).
- `spec/regressao/` — a comparação das F.T. do legado ([02 §4.4](02-ENGENHARIA.md#44-teste-de-regressão-contra-o-legado-obrigatório)).
- `spec/offline/` — os cenários de queda de link ([02 §6.5](02-ENGENHARIA.md#65-cenários-que-os-testes-precisam-cobrir)).

Vale criar o teste de isolamento **vazio e falhando** já agora, com a mensagem do que ele vai provar.
Pasta de teste vazia é pasta que ninguém preenche.

---

## 8. Postgres local

A mesma versão de produção, em contêiner, para não descobrir diferença de comportamento no *deploy*:

```bash
docker run -d --name boxflow-pg \
  -e POSTGRES_PASSWORD=desenvolvimento \
  -e POSTGRES_DB=boxflow_development \
  -p 5432:5432 \
  -v boxflow-pg-dados:/var/lib/postgresql/data \
  postgres:18.6
```

```bash
# .env — não versionado
DATABASE_URL=postgres://postgres:desenvolvimento@localhost:5432/boxflow_development
```

### 8.1 Os dois papéis do banco, criados desde o começo

Isto parece cerimônia de produção, mas tem de existir em desenvolvimento **desde o primeiro dia**, senão a
RLS do [08](08-MIGRACOES.md) não é exercitada e o vazamento entre contratantes só aparece em produção:

```sql
-- psql -h localhost -U postgres -d boxflow_development

-- papel que roda migração: dono das tabelas, ignora RLS
create role boxflow_ddl login password 'desenvolvimento' bypassrls createdb;

-- papel que a aplicação usa: sujeito à RLS, sem DDL
create role boxflow_app login password 'desenvolvimento';

grant connect on database boxflow_development to boxflow_app;
```

O motivo é uma pegadinha do Postgres: **o dono da tabela ignora a RLS por padrão.** Se a aplicação
conectar com o mesmo papel que criou as tabelas, todas as políticas de isolamento ficam
decorativas — o teste de vazamento passa, e não deveria. O [08 §9](08-MIGRACOES.md#9-row-level-security)
trata disso em detalhe, incluindo o `FORCE ROW LEVEL SECURITY`.

```bash
bundle exec rails db:create
bundle exec rails db:prepare
```

### 8.2 As quatro bases do Solid

O Rails 8 gera `config/database.yml` com quatro bases em produção: a principal mais `cache`, `queue` e
`cable`. Consequência de `schema_format = :sql` que pega desprevenido: **passa a existir um arquivo de
estrutura por base**, não um só. Confira os nomes gerados depois do primeiro `db:prepare` e versione todos:

```bash
ls db/*.sql
```

Em desenvolvimento dá para apontar as quatro para o mesmo servidor. Em produção elas continuam no mesmo
Postgres — é a decisão de custo do [05 §2](05-INFRAESTRUTURA-E-CUSTOS.md#2-decisão) — e isso tem uma
consequência que o [02 §3.5](02-ENGENHARIA.md#35-multi-contratante-no-active-record) já registra: como o
Solid Queue grava no mesmo banco com RLS, **o `tenant_id` tem de viajar no payload do job**. Job que
descobre o contratante pela sessão não funciona, porque job não tem sessão.

---

## 9. O serviço de NF-e

Fica em repositório separado, em .NET, por decisão do
[ADR-0005](adr/0005-ruby-on-rails-e-hotwire.md). Não faz parte deste documento além do registro de que o
Rails fala com ele por HTTP e que a variável de ambiente correspondente precisa existir desde o começo,
ainda que apontando para nada:

```bash
# .env
NFE_SERVICO_URL=http://localhost:5080
```

Sem o placeholder, a primeira tela de faturamento quebra com erro de configuração em vez de erro de
conexão, e os dois se parecem o suficiente para custar uma tarde.

---

## 10. Primeiro commit

```bash
git init
git add -A
git commit -m "Aplicação Rails 8.1.4 inicial, sem esquema"
```

Antes de commitar, confirme que o `.gitignore` gerado cobre `.env`, `log/`, `tmp/`, `storage/` e
`config/master.key`. O `config/credentials.yml.enc` **é versionado**; a `master.key` nunca.

---

## 11. Verificação: o que tem de passar antes da primeira funcionalidade

Nenhuma linha de regra de negócio antes destes sete comandos responderem certo. É meia hora que economiza
uma semana:

```bash
ruby -v                                      # 3.4.x
bundle exec rails -v                         # 8.1.4
bundle exec rails runner 'puts ActiveRecord::Base.connection.select_value("select version()")'
                                             # PostgreSQL 18.6
bundle exec rails runner 'puts Rails.application.config.active_record.schema_format'
                                             # sql
bundle exec rails runner 'puts Time.zone.name'
                                             # America/Sao_Paulo
bundle exec rspec                            # verde (ou vermelho só no teste de isolamento do §7)
bundle exec rails runner 'puts Boxflow::Calculo::VERSION'
                                             # carrega a gem local
```

E uma verificação que não é comando, mas é a que mais importa: abra o `Gemfile.lock` e confirme que
`activerecord` **não** aparece como dependência de `boxflow_calculo`.

---

## 12. Questões abertas

| # | Questão | O que muda |
|---|---|---|
| **E15** | Migrar para Rails 8.2 assim que sair, ou ficar no 8.1 até o fim do suporte de segurança? | A janela de correção de bugs do 8.1 encerra em 10/10/2026. Decidir antes de acumular divergência do padrão do framework |
| **E16** | O provedor de identidade OIDC será próprio ou de terceiro? | Define se `omniauth_openid_connect` aponta para um Keycloak nosso ou para um serviço, e mexe no custo do [05](05-INFRAESTRUTURA-E-CUSTOS.md) |

## Histórico de revisões

| Data | Autor | Mudança |
|---|---|---|
| 28/09/2026 | — | Versão inicial. Rails 8.1.4 em Ruby 3.4, Postgres 18.6 com `uuidv7()` nativo, os dois papéis de banco desde o desenvolvimento, as três gems puras e o checklist de verificação |
