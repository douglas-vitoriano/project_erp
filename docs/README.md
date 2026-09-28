# BoxFlow — Documentação do Projeto

Documentação de arquitetura, engenharia, marca e banco de dados do **BoxFlow**, um ERP para empresas de
cartonagem vendido como SaaS. O primeiro contratante substitui o **Sistema Cartonagem (PcBoot)**.

## Índice

| Doc | Conteúdo | Público |
|---|---|---|
| [00-CENARIO-E-PREMISSAS.md](00-CENARIO-E-PREMISSAS.md) | Situação atual (legado PcBoot), volumes, lacunas do modelo inicial, premissas e restrições | Todos |
| [01-ARQUITETURA.md](01-ARQUITETURA.md) | Topologia em nuvem pura, clientes offline, rede da fábrica, isolamento entre contratantes, orçamento de latência, segurança, backup | Arquitetura, infra |
| [02-ENGENHARIA.md](02-ENGENHARIA.md) | Stack Rails, estrutura de repositório, motor de fórmulas de caixa, Fichas de Serviço e homem-máquina, sincronização, migração do legado, fases | Desenvolvimento |
| [03-BANCO-DE-DADOS.md](03-BANCO-DE-DADOS.md) | Modelo de dados completo: convenções, tabelas, colunas, tipos, chaves, restrições, índices e views por módulo | Desenvolvimento, DBA |
| [04-MARCA.md](04-MARCA.md) | Identidade do BoxFlow, paleta, contraste medido, e o contrato de marca branca por contratante | Produto, interface, comercial |
| [05-INFRAESTRUTURA-E-CUSTOS.md](05-INFRAESTRUTURA-E-CUSTOS.md) | Onde hospedar, quanto custa, domínio HTTPS sem Registro.br, plano de migração de provedor | Infra, financeiro |
| [06-PARIDADE-COMPETITIVA.md](06-PARIDADE-COMPETITIVA.md) | Comparação com o Kiwiplan: as lacunas reais, a ordem em que fecham, o que não vamos copiar e os critérios de aceite | Produto, desenvolvimento, comercial |
| [adr/](adr/) | Registros de decisão de arquitetura — o "por quê" de cada escolha estrutural | Todos |

Leia na ordem 00 → 01 → 02 → 03. A marca (04) e a infraestrutura (05) são independentes e podem ser
lidas a qualquer momento. O 06 é o roteiro de evolução funcional e supõe o 02 e o 03 lidos. Os ADRs são
referenciados de dentro dos documentos.

## Decisões de arquitetura

| ADR | Decisão | Status |
|---|---|---|
| [0001](adr/0001-topologia-hibrida-local-nuvem.md) | Topologia híbrida: servidor local + nó em nuvem | **Superado pelo 0004** |
| [0002](adr/0002-propriedade-de-dados-e-sincronizacao.md) | Propriedade de dados e sincronização sem conflito | Aceito |
| [0003](adr/0003-numeracao-offline-por-blocos.md) | Numeração offline por blocos pré-alocados | Aceito |
| [0004](adr/0004-nuvem-pura-sem-servidor-na-fabrica.md) | **Nuvem pura: nenhum servidor dentro da fábrica** | Aceito |
| [0005](adr/0005-ruby-on-rails-e-hotwire.md) | **Ruby on Rails, com NF-e em serviço isolado** | Aceito |
| [0006](adr/0006-marca-branca-por-contratante.md) | **Marca branca por contratante, com sinalização travada** | Aceito |
| [0007](adr/0007-sequenciamento-como-proposta-auditavel.md) | **Sequenciamento automático como proposta auditável, não como oráculo** | Aceito |
| [0008](adr/0008-historico-analitico-no-mesmo-postgres.md) | **Histórico analítico no mesmo Postgres, sem data warehouse separado** | Aceito |

Do 0004 ao 0006, todos de 28/09/2026, o projeto mudou de forma substancial: deixou de ser uma instalação
em uma empresa e passou a ser um produto. O 0007 e o 0008 vieram depois, no mesmo dia, da comparação com o
Kiwiplan documentada no [06](06-PARIDADE-COMPETITIVA.md) — e os dois são decisões sobre **não** copiar o
concorrente do jeito óbvio.

## Situação dos documentos anteriores

O arquivo `Novo Documento de Texto.txt` na raiz do projeto é a **versão 0 do modelo de dados** e está
**superada** por [03-BANCO-DE-DADOS.md](03-BANCO-DE-DADOS.md). Ele foi integralmente absorvido: tudo que
estava lá continua no modelo novo (multi-tenant, auditoria, UUID, exclusão lógica, índices compostos),
acrescido dos módulos que faltavam. Recomendação: mantê-lo como registro histórico e não editá-lo mais.

A pasta `Print PcBoot/` é **evidência de levantamento** — prints, PDFs e exports do sistema legado. Ela
**não é versionada** (está no `.gitignore`) porque contém razão social, CNPJ, contato e preço praticado de
clientes reais, e este repositório é público. Serve como fonte para validar regras de negócio e como base
dos testes de regressão descritos em [02-ENGENHARIA §4.4](02-ENGENHARIA.md).

## Como seguir com os documentos quando houver mudanças

1. **A documentação é a fonte da verdade do desenho.** Mudança de desenho entra primeiro no doc, depois no
   código. Se o código divergir do doc, é bug de um dos dois — decide-se qual e corrige-se.
2. **Mudança estrutural exige ADR.** Toda decisão que altera topologia, propriedade de dado, contrato de
   sincronização, stack ou modelo de dados central gera um arquivo novo em `adr/`, numerado em sequência,
   com status `Proposto` → `Aceito` → eventualmente `Superado por ADR-XXXX`. **ADR aceito não se apaga nem
   se reescreve:** cria-se outro que o substitui, preservando o histórico do raciocínio. O
   [ADR-0001](adr/0001-topologia-hibrida-local-nuvem.md) é o exemplo vivo disso neste repositório — ele
   continua legível, com um aviso no topo apontando para o que o substituiu.
3. **Mudança de modelo de dados = migração versionada.** Nenhuma alteração de schema é feita à mão em
   banco. Cada mudança vira uma migração (ver [02-ENGENHARIA §3.3](02-ENGENHARIA.md#33-migrações-de-banco))
   e o DDL do doc 03 é atualizado **no mesmo commit**. Atenção redobrada em tabela replicada para
   dispositivo: a alteração precisa ser compatível com PWA rodando versão anterior (ver
   [01-ARQUITETURA §6.4](01-ARQUITETURA.md)).
4. **Cada documento tem histórico de revisões no final.** Registre data e o que mudou — uma linha por
   revisão, sem reescrever o passado.
5. **Dúvida aberta é documentada, não esquecida.** Perguntas sem resposta ficam na seção "Questões
   abertas" do documento correspondente. Quando respondida, sai de lá e entra no corpo do documento, com
   a pergunta riscada em vez de apagada.

## Convenções gerais

- Documentos em português (PT-BR), Markdown, uma frase por linha quando possível — facilita o diff.
- Identificadores de banco em `snake_case`, em português, singular (`ficha_tecnica`, não `FichasTecnicas`).
- Termos do negócio preservados como a fábrica fala: F.T., riscador, chapa, onda, faca, clichê, orelha,
  amarrado, refugo, O.F., Ficha de Serviço. **Não traduzir nem "modernizar" vocabulário de fábrica** —
  isso quebra a comunicação com quem vai usar o sistema.
- Unidades explícitas em nome de coluna quando houver risco de ambiguidade: `_mm`, `_kg`, `_g`, `_min`,
  `_pct`.
- Arquivos em **UTF-8 sem BOM**. Parece detalhe, mas este próprio arquivo já perdeu todos os acentos uma
  vez por gravação com codificação errada.

## Histórico de revisões

| Data | Mudança |
|---|---|
| 27/09/2026 | Criação do conjunto inicial de documentos (00 a 03 + ADRs 0001–0003) |
| 28/09/2026 | Produto nomeado **BoxFlow** e transformado em SaaS: documentos 04 (marca) e 05 (infraestrutura e custos) criados, ADRs 0004–0006 adicionados, ADR-0001 marcado como superado. Acentuação deste arquivo recuperada |
| 28/09/2026 | Documento 06 (paridade competitiva contra o Kiwiplan) criado, com ADRs 0007 e 0008. Doc 03 ganhou regras de velocidade, proposta de sequência, não conformidade e veículo; doc 02 ganhou o motor de regras, o sequenciador e as fases 8 e 9 |
