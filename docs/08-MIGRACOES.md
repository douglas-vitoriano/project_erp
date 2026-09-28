# 08 — Migrações: criar o esquema na ordem que funciona

Como transformar o modelo do [03-BANCO-DE-DADOS](03-BANCO-DE-DADOS.md) em migrações Rails executáveis.
Supõe a aplicação criada pelo [07-CRIACAO-DO-PROJETO](07-CRIACAO-DO-PROJETO.md).

> **O que este documento resolve.** O doc 03 está organizado por assunto, para ser lido. O banco precisa
> ser criado por **dependência**, que é outra ordem. Três dependências cruzam a fronteira entre módulos e
> quebram quem tentar criar o esquema na sequência dos capítulos — são o §3.

---

## 1. Princípios

1. **DDL sensível vai em `execute`, com heredoc SQL.** A DSL do Active Record não expressa `EXCLUDE USING
   gist`, domínio com `CHECK`, política de RLS, coluna gerada nem índice parcial. Tentar traduzir produz
   migração que mente sobre o que criou.
2. **O `structure.sql` é a fonte da verdade do esquema**, e é regenerado e commitado **no mesmo commit** da
   migração ([02 §3.3](02-ENGENHARIA.md#33-migrações-de-banco)).
3. **Uma migração por grupo de dependência**, não por tabela. Cento e poucas migrações para um esquema
   inicial é ruído; vinte e cinco contam a história.
4. **Migração aplicada não se edita.** Correção é migração nova. Isso vale em dobro aqui, pelo motivo do §5.
5. **Nada de `DELETE` nem `UPDATE` destrutivo em migração.** O modelo é *append-only* em tabela de evento
   ([03 §2.4](03-BANCO-DE-DADOS.md#24-regras-transversais)) e a migração não é exceção.

Para criar cada arquivo com o *timestamp* certo, use o gerador e depois substitua o corpo:

```bash
bundle exec rails generate migration CriarModuloNucleo
```

---

## 2. A ordem, em vinte e cinco migrações

| # | Migração | Conteúdo |
|---|---|---|
| 01 | `HabilitarExtensoesEDominios` | `btree_gist`, `pg_trgm`, `pgcrypto`; os seis domínios |
| 02 | `CriarPapeisDeBanco` | `boxflow_ddl` e `boxflow_app` (idempotente) |
| 03 | `CriarModuloNucleo` | `tenant`, `empresa`, `usuario`, `tenant_marca`, `papel`, `permissao`, `papel_permissao`, `usuario_papel`, `dispositivo` |
| 04 | `CriarModuloSincronizacao` | `sync_alteracao`, `sync_cursor`, `sync_lote`, `sync_operacao`, `sync_conflito`, `numerador`, `numerador_bloco`, `escopo_sincronizacao` |
| 05 | `CriarCadastrosDeApoio` | `atividade`, `zona_entrega`, `condicao_pagamento`, `banco`, `parametro` |
| 06 | `CriarCadastrosPrincipais` | `representante`, `fornecedor`, `transportadora`, `funcionario`, `cliente` e filhos, `conta_bancaria`, `comissao_regra`, `comissao_apurada` |
| 07 | **`CriarItensEDepositos`** | `item`, `deposito`, `localizacao_estoque` — **antecipados**, ver §3.1 |
| 08 | `CriarDocumentos` | `documento`, `documento_vinculo` |
| 09 | `CriarEstilosEFormulas` | `estilo_caixa`, `estilo_formula_versao`, `estilo_formula_slot` |
| 10 | `CriarQualidadesETintas` | `qualidade_chapa`, `qualidade_chapa_fornecedor`, `tinta` |
| 11 | `CriarFerramental` | `ferramental`, `solicitacao_ferramental` |
| 12 | `CriarFichaTecnica` | `ficha_tecnica` e filhas, `ferramental_ficha_tecnica`, `revisao_campo` |
| 13 | `CriarAmostrasEProjetos` | `requisicao_amostra`, `amostra`, `amostra_evento`, `assinatura`, `projeto_*` |
| 14 | `CriarComercial` | `orcamento`, `orcamento_item`, `pedido_venda`, `pedido_venda_item`, `pedido_item_entrega`, `kanban_contrato` |
| 15 | `CriarSuprimentos` | `pedido_compra`, `pedido_compra_item`, `recebimento`, `recebimento_item` |
| 16 | `CriarPcp` | `centro_trabalho`, `operacao`, `maquina`, `turno`, `ordem_fabricacao`, `ordem_fabricacao_operacao`, `lote`, `necessidade_chapa` |
| 17 | `CriarRegrasDeMaquina` | `maquina_regra`, `maquina_setup_transicao` ([03 §10.2](03-BANCO-DE-DADOS.md#102-regras-de-velocidade-e-de-setup)) |
| 18 | `CriarProducao` | `motivo_parada`, `motivo_refugo`, `ficha_servico`, `ficha_servico_apontamento`, `ficha_servico_operador`, `consumo_material` |
| 19 | **`CriarPropostaDeSequencia`** | `sequencia_proposta`, `sequencia_proposta_item` — **depois da produção**, ver §3.2 |
| 20 | `CriarMovimentacaoEInventario` | `movimento_estoque`, `saldo_estoque`, `inventario`, `inventario_contagem` |
| 21 | `CriarExpedicao` | `conferencia`, `volume`, `veiculo`, `carga`, `entrega`, `entrega_ocorrencia` |
| 22 | **`CriarQualidade`** | `nao_conformidade`, `acao_corretiva` — **depois da expedição**, ver §3.3 |
| 23 | `CriarFiscalEFinanceiro` | `serie_fiscal`, `regra_tributaria`, `nota_fiscal` e filhas; `plano_conta`, `centro_custo`, `titulo_receber`, `titulo_pagar`, `movimento_financeiro`, `extrato_bancario_linha` |
| 24 | `CriarAuditoria` | `auditoria_evento`, `acesso_log` |
| 25 | `FecharEsquema` | FKs adiadas, restrições de exclusão, `REVOKE`, RLS, views |

As `seeds` não são migração — §12.

---

## 3. As três dependências que cruzam módulos

Estas são a razão de existir deste documento. Quem criar o esquema na ordem dos capítulos do doc 03 bate
nas três, e a terceira só aparece no fim.

### 3.1 `item` é do módulo 10, mas o módulo 8 precisa dele

`necessidade_chapa` tem `item_id` (o SKU de chapa é qualidade + formato) e `lote` tem `item_id`. As duas
são do PCP, capítulo 10 do doc 03; `item` só aparece no capítulo 12.

A solução é criar `item`, `deposito` e `localizacao_estoque` **antes** da engenharia — migração 07. Nada em
`item` depende de engenharia ou de PCP, então antecipar não custa nada. A movimentação de estoque, que
depende de O.F. e de FS, fica para depois, na 20: **a tabela de cadastro e a de movimento do mesmo módulo
não precisam nascer juntas.**

### 3.2 `sequencia_proposta_item` referencia `ficha_servico`

A proposta de sequência é conceitualmente PCP e está no [03 §10.3](03-BANCO-DE-DADOS.md#103-proposta-de-sequência),
mas cada item dela aponta para uma **Ficha de Serviço**, que é do módulo 9. Daí a migração 19 vir depois da
18, separada do resto do PCP.

### 3.3 `nao_conformidade` depende de quatro módulos ao mesmo tempo

Esta é a mais fácil de não ver. A não conformidade é a junção de quatro origens
([03 §11.2](03-BANCO-DE-DADOS.md#112-não-conformidade-e-ação-corretiva)), e duas delas — `conferencia` e
`entrega_ocorrencia` — são de expedição. Então ela não pode nascer com o módulo 9, apesar de estar
documentada ali.

É o preço de ter posto qualidade dentro do capítulo de produção para não renumerar o documento inteiro. O
preço é este parágrafo, e vale.

---

## 4. Migração 01 — extensões e domínios

```ruby
class HabilitarExtensoesEDominios < ActiveRecord::Migration[8.1]
  def up
    execute <<~SQL
      create extension if not exists btree_gist;   -- EXCLUDE de numerador e de vigência
      create extension if not exists pg_trgm;      -- busca por similaridade em razão social

      create domain dinheiro       as numeric(14,4);
      create domain percentual     as numeric(9,4)  check (value >= 0 and value <= 100);
      create domain medida_mm      as numeric(10,2) check (value >= 0);
      create domain quantidade     as numeric(18,4);
      create domain gramatura_gm2  as numeric(8,2)  check (value > 0);
      create domain cnpj_cpf       as text
        check (value ~ '^[0-9]{11}$' or value ~ '^[0-9]{14}$');
    SQL
  end

  def down
    execute <<~SQL
      drop domain if exists cnpj_cpf, gramatura_gm2, quantidade, medida_mm, percentual, dinheiro;
      drop extension if exists pg_trgm;
      drop extension if exists btree_gist;
    SQL
  end
end
```

**`pgcrypto` não entra aqui pelo motivo que o doc 03 dava.** `gen_random_uuid()` é função do núcleo do
Postgres desde a versão 13 — não precisa de extensão nenhuma. E no Postgres 18, que é a versão fixada no
[07 §1](07-CRIACAO-DO-PROJETO.md#1-versões-e-por-que-são-fixadas), o padrão passa a ser **`uuidv7()`**, também
nativo. `pgcrypto` continua valendo a pena separadamente, por causa do `digest()` usado na cadeia de hash da
`assinatura` — mas é uma dependência do módulo de amostras, não da chave primária, e o lugar dela é a
migração 13.

Extensão e domínio **têm de ser a primeira migração**: domínio usado em `create table` precisa existir
antes, e `btree_gist` antes de qualquer `EXCLUDE`.

---

## 5. O auxiliar `colunas_padrao`, e a armadilha que ele cria

As quinze colunas de `COLUNAS_PADRAO` ([03 §2.2](03-BANCO-DE-DADOS.md#22-colunas-padrão-colunas_padrao))
aparecem em mais de cem tabelas. Repetir é insustentável; gerar é a saída óbvia:

```ruby
# lib/boxflow/migracao.rb
module Boxflow
  module Migracao
    # NUNCA EDITE ESTE MÉTODO. Ver docs/08-MIGRACOES.md §5.
    def self.colunas_padrao_v1(empresa: true)
      <<~SQL.strip
        id              uuid primary key default uuidv7(),
        tenant_id       uuid not null references tenant(id),
        #{empresa ? "empresa_id      uuid not null references empresa(id)," : ""}
        versao          bigint not null default 1,
        dispositivo_origem_id       uuid references dispositivo(id),
        proprietario_dispositivo_id uuid references dispositivo(id),
        criado_em       timestamptz not null default now(),
        criado_por      uuid references usuario(id),
        atualizado_em   timestamptz not null default now(),
        atualizado_por  uuid references usuario(id),
        deletado_em     timestamptz,
        deletado_por    uuid references usuario(id),
        origem          text not null default 'SISTEMA'
                        check (origem in ('SISTEMA','PCBOOT','IMPORTACAO','CAMPO')),
        codigo_legado   text,
        qualidade_dado  text check (qualidade_dado in ('OK','SUSPEITO','INCOMPLETO'))
      SQL
    end
  end
end
```

Uso:

```ruby
execute <<~SQL
  create table cliente (
    #{Boxflow::Migracao.colunas_padrao_v1},
    razao_social text not null,
    -- ...
  );
SQL
```

**A armadilha.** Migração é código do passado que tem de continuar significando o mesmo. Um auxiliar
compartilhado quebra isso: no dia em que alguém acrescentar uma coluna a `colunas_padrao_v1`, **todas as
migrações já aplicadas passam a dizer outra coisa**. Quem rodar `db:migrate` do zero produz um esquema
diferente do que está em produção, e a diferença aparece como teste que passa na máquina de um e falha na de
outro.

Daí o `_v1` no nome e o comentário em maiúsculas. A regra é:

- **Método versionado nunca é editado.** Precisa mudar? Cria-se `colunas_padrao_v2`, e só migração nova usa.
- Mudança de coluna padrão em tabela existente é **`ALTER TABLE` em migração nova**, como qualquer outra.

O `structure.sql` versionado é a rede de segurança: se alguém violar a regra, o `git diff` do
`structure.sql` acusa na revisão. É mais um motivo para o princípio 2 do §1 não ser negociável.

---

## 6. Migração 03 — módulo núcleo, com a ordem interna corrigida

O doc 03 apresenta `tenant_marca` logo depois de `tenant`, porque é ali que ela se explica. Mas
`tenant_marca.atualizado_por` referencia `usuario`, que aparece três tabelas depois. A ordem de criação é:

```
tenant → empresa → usuario → tenant_marca → papel → permissao
       → papel_permissao → usuario_papel → dispositivo
```

As tabelas deste módulo **não usam `colunas_padrao`** — têm conjunto próprio e reduzido (`id`, `tenant_id`,
`criado_em`), justamente porque `colunas_padrao` referencia `usuario` e `dispositivo` e não pode ser usada
para criá-los. É a única circularidade real do modelo, e ela está resolvida no desenho, não na migração.

`tenant` não tem `tenant_id` — ela é a raiz. `permissao` é catálogo global e também não tem. Isso reaparece
no §9, porque muda a política de RLS das duas.

---

## 7. Migração 25 — FKs adiadas

O doc 03 marca com `-- FK adiada:` cada referência que aponta para frente. Todas se resolvem aqui:

```ruby
class FecharEsquema < ActiveRecord::Migration[8.1]
  def up
    execute <<~SQL
      alter table usuario
        add constraint usuario_funcionario_fk
            foreign key (funcionario_id)   references funcionario(id),
        add constraint usuario_representante_fk
            foreign key (representante_id) references representante(id);

      alter table dispositivo
        add constraint dispositivo_maquina_fk
            foreign key (maquina_id) references maquina(id);

      alter table tenant_marca
        add constraint tenant_marca_logo_claro_fk
            foreign key (logotipo_claro_id)  references documento(id),
        add constraint tenant_marca_logo_escuro_fk
            foreign key (logotipo_escuro_id) references documento(id),
        add constraint tenant_marca_favicon_fk
            foreign key (favicon_id)         references documento(id);

      alter table entrega
        add constraint entrega_nota_fiscal_fk
            foreign key (nota_fiscal_id) references nota_fiscal(id);
    SQL
  end
end
```

Vale conferir a lista contra o documento antes de considerar fechada, porque FK adiada esquecida não dá
erro — só deixa de proteger:

```bash
grep -n "FK adiada" docs/03-BANCO-DE-DADOS.md
```

---

## 8. Restrições de exclusão

Duas, e as duas dependem de `btree_gist`:

```sql
-- dois blocos do mesmo numerador nunca se sobrepõem (ADR-0003)
alter table numerador_bloco add constraint numerador_bloco_sem_sobreposicao
  exclude using gist (
    numerador_id with =,
    int8range(valor_inicio, valor_fim, '[]') with &&
  );
```

A do `estilo_caixa` usa `daterange` com vigência e índice parcial — copie do
[03 §6](03-BANCO-DE-DADOS.md#6-módulo-4--engenharia-de-produto), com atenção ao `WHERE` que a limita a
registros ativos e não excluídos.

É isto que torna a colisão de número **impossível no banco**, e não apenas improvável na aplicação. Um
teste que tente inserir bloco sobreposto e espere `ActiveRecord::StatementInvalid` é obrigatório: sem ele,
ninguém nota se a restrição deixar de ser criada.

---

## 9. Row Level Security

O [01 §7](01-ARQUITETURA.md#7-isolamento-entre-contratantes) exige isolamento entre contratantes e o
[02 §3.5](02-ENGENHARIA.md#35-multi-contratante-no-active-record) põe o `SET LOCAL app.tenant_id` num
`around_action`. A RLS é a rede embaixo disso — para o dia em que alguém esquecer um escopo.

### 9.1 A pegadinha que anula tudo

**O dono da tabela ignora a RLS por padrão.** Se a aplicação conectar com o papel que criou as tabelas, as
políticas ficam decorativas: o teste de vazamento passa e não deveria. Duas medidas, as duas obrigatórias:

- Papéis separados, criados no [07 §8.1](07-CRIACAO-DO-PROJETO.md#81-os-dois-papéis-do-banco-criados-desde-o-começo):
  `boxflow_ddl` roda migração e tem `BYPASSRLS`; `boxflow_app` é o da aplicação e não tem.
- **`FORCE ROW LEVEL SECURITY`** em toda tabela, para o dono também obedecer.

### 9.2 Aplicando em todas as tabelas de uma vez

```sql
do $$
declare t record;
begin
  for t in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attname = 'tenant_id' and a.attnum > 0
     where c.relkind = 'r' and n.nspname = 'public'
  loop
    execute format('alter table %I enable row level security', t.relname);
    execute format('alter table %I force  row level security', t.relname);
    execute format(
      $f$create policy %I on %I for all to boxflow_app
           using      (tenant_id = current_setting('app.tenant_id', true)::uuid)
           with check (tenant_id = current_setting('app.tenant_id', true)::uuid)$f$,
      t.relname || '_tenant', t.relname);
  end loop;
end $$;

-- tenant: a raiz não tem tenant_id, a política é sobre o próprio id
alter table tenant enable row level security;
alter table tenant force  row level security;
create policy tenant_proprio on tenant for all to boxflow_app
  using (id = current_setting('app.tenant_id', true)::uuid);
```

`permissao` fica de fora e isso é correto: é catálogo global, sem `tenant_id`, e a consulta acima
naturalmente não a alcança.

### 9.3 Falha fechada, e o detalhe que a transforma em falha aberta

`current_setting('app.tenant_id', true)` devolve `NULL` quando a variável não foi definida. A comparação
vira `NULL`, e em cláusula `USING` isso conta como falso: **zero linhas**. Esquecer o `SET LOCAL` faz a
aplicação não ver nada, que é exatamente o modo de falhar que se quer — o oposto do esquecimento de um
escopo do Active Record, que mostra tudo.

O detalhe que estraga: `''::uuid` **levanta erro**, não devolve `NULL`. Então `app.tenant_id` tem de ser um
UUID válido ou não estar definida — nunca string vazia. Código que faz `SET LOCAL app.tenant_id = ''` para
"limpar" troca uma falha silenciosa e segura por uma exceção em produção.

### 9.4 Permissões

```sql
grant usage on schema public to boxflow_app;
grant select, insert, update, delete on all tables    in schema public to boxflow_app;
grant usage, select                  on all sequences in schema public to boxflow_app;

-- tabela de evento é append-only (03 §2.4, regra 2): a garantia é aqui, não no modelo
revoke update, delete on
  ficha_servico_apontamento, movimento_estoque, consumo_material, assinatura,
  amostra_evento, nota_fiscal_evento, entrega_ocorrencia,
  sync_alteracao, auditoria_evento, acesso_log
from boxflow_app;
```

A ordem importa: conceder amplo e **depois** revogar o específico. Invertido, o `grant` desfaz o `revoke`.

O `REVOKE` é o que faz de *append-only* uma garantia e não uma convenção. Sem ele, basta um `update` num
console para reescrever histórico de apontamento — e o indicador de OEE que se apoia nele perde valor
retroativamente, sem deixar rastro.

---

## 10. Views e materializadas

Vão na última migração, depois de todas as tabelas, e são recriadas com `create or replace view` quando
mudarem. As quatro `vw_` e a `mvw_` estão em [03 §16](03-BANCO-DE-DADOS.md#16-views-de-apoio).

Um detalhe que só aparece em produção: `REFRESH MATERIALIZED VIEW CONCURRENTLY` **exige um índice único**
na view. O doc 03 já cria `create unique index on mvw_oee_maquina_dia (tenant_id, empresa_id, maquina_id,
dia)` — e é por isso, não por desempenho de consulta. Sem o índice, todo refresh trava leitura, o que num
painel de galpão significa a TV congelar na hora do turno.

---

## 11. Regras para as migrações que vierem depois

O esquema inicial é a parte fácil. O que exige disciplina é a mudança com tablets em campo rodando versão
anterior ([01 §6.4](01-ARQUITETURA.md#64-compatibilidade-de-versões)):

| Mudança | Como fazer |
|---|---|
| Coluna nova | Aditiva, com `default` ou aceitando nulo. Segura |
| Renomear coluna de tabela replicada | **Nunca em um passo.** Cria a nova, escreve nas duas por um ciclo de versão, migra leitura, remove a antiga depois que nenhum dispositivo reportar versão antiga |
| Remover coluna | Só depois de o `dispositivo.versao_app` mínimo em campo não a usar mais. A tabela `dispositivo` existe também para responder isso |
| Novo valor em `CHECK` de enumerado | Aditivo, mas o cliente offline precisa saber lidar com valor desconhecido antes de o valor existir |
| Nova tabela replicada | Exige entrada em `escopo_sincronizacao`, senão nasce invisível para os dispositivos |
| Índice em tabela grande | `CREATE INDEX CONCURRENTLY`, em migração com `disable_ddl_transaction!` |

E a regra que fecha: **migração que mexe em tabela replicada exige teste em `spec/offline/`** antes de
subir. O tablet que fica quinze dias sem sincronizar é o caso normal, não o excepcional.

---

## 12. Seeds

`db/seeds.rb` carrega o que é catálogo do sistema, não dado de cliente:

- `permissao` — o catálogo global de códigos de permissão.
- `papel` — os doze papéis do [03 §3](03-BANCO-DE-DADOS.md#3-módulo-1--núcleo).
- `operacao` — a carga inicial de conversão do [03 §10](03-BANCO-DE-DADOS.md#10-módulo-8--pcp), que é
  **sugestão e não restrição**: `operacao` é tabela mantida pelo usuário.
- `estilo_caixa` com os estilos FEFCO e suas fórmulas — vem do legado pelo ETL, não escrito à mão.

Seeds tem de ser **idempotente** (`find_or_create_by!`), porque vai rodar de novo em ambiente novo e em
ensaio de restore. E não cria `tenant`: o primeiro contratante entra pelo mesmo caminho que o segundo, senão
o caminho do segundo nunca é testado.

---

## 13. Verificação

```bash
bundle exec rails db:drop db:create db:migrate
bundle exec rails db:seed
git diff --stat db/*.sql          # tem de haver diferença, e ela vai no mesmo commit
```

Depois, no `psql`, cinco perguntas que revelam quase todo erro de migração:

```sql
-- 1. quantas tabelas nasceram
select count(*) from pg_tables where schemaname = 'public';

-- 2. alguma tabela com tenant_id ficou sem RLS?
select c.relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attname = 'tenant_id' and a.attnum > 0
 where c.relkind = 'r' and n.nspname = 'public'
   and not (c.relrowsecurity and c.relforcerowsecurity);

-- 3. as duas restrições de exclusão existem?
select conname, conrelid::regclass from pg_constraint where contype = 'x';

-- 4. alguma FK apontando para o vazio? (deve vir zero linhas)
select conrelid::regclass, conname from pg_constraint
 where contype = 'f' and not convalidated;

-- 5. o append-only está garantido por permissão?
select table_name, privilege_type from information_schema.table_privileges
 where grantee = 'boxflow_app' and privilege_type in ('UPDATE','DELETE')
   and table_name = 'ficha_servico_apontamento';   -- deve vir vazio
```

A consulta 2 é a que mais vale automatizar: ela responde "esqueci de proteger alguma tabela nova?" e a
resposta precisa ser sempre vazia. Vale virar teste em `spec/isolamento/`, ao lado do teste de 404.

---

## 14. Questões abertas

| # | Questão | O que muda |
|---|---|---|
| **E17** | O ETL do legado entra por migração ou por *rake task* fora do ciclo? | Migração com 94 mil F.T. dentro trava *deploy*. A inclinação é *task* idempotente e retomável, com a migração só criando o destino |
| **E18** | `boxflow_app` precisa de `SELECT` em `pg_stat_*` para a observabilidade do [01 §13](01-ARQUITETURA.md#13-observabilidade)? | Se sim, entra concessão específica em vez de papel mais poderoso |

## Histórico de revisões

| Data | Autor | Mudança |
|---|---|---|
| 28/09/2026 | — | Versão inicial. Ordem de criação em 25 migrações, as três dependências que cruzam módulos, o auxiliar `colunas_padrao_v1` e a armadilha de auxiliar compartilhado, DDL de RLS com `FORCE` e os dois papéis, `REVOKE` que torna *append-only* uma garantia, e as cinco consultas de verificação |
