# ERP Cartonagem ? Documenta??o do Projeto

Reposit?rio de documenta??o de arquitetura, engenharia e banco de dados do ERP que substituir? o
**Sistema Cartonagem (PcBoot)**.

## ?ndice

| Doc | Conte?do | P?blico |
|---|---|---|
| [00-CENARIO-E-PREMISSAS.md](00-CENARIO-E-PREMISSAS.md) | Situa??o atual (legado PcBoot), volumes, lacunas do modelo inicial, premissas e restri??es do novo sistema | Todos |
| [01-ARQUITETURA.md](01-ARQUITETURA.md) | Topologia (servidor local + n? em nuvem), tablets de f?brica e de campo, opera??o offline, seguran?a, rede, backup e conting?ncia | Arquitetura, infra |
| [02-ENGENHARIA.md](02-ENGENHARIA.md) | Stack, estrutura de reposit?rio, motor de f?rmulas de caixa, Fichas de Servi?o e homem-m?quina, motor de sincroniza??o, assinatura de amostras, migra??o do legado, fases | Desenvolvimento |
| [03-BANCO-DE-DADOS.md](03-BANCO-DE-DADOS.md) | Modelo de dados completo: conven??es, tabelas, colunas, tipos, chaves, restri??es, ?ndices e views por m?dulo | Desenvolvimento, DBA |
| [adr/](adr/) | Registros de decis?o de arquitetura (ADR) ? o "por qu?" de cada escolha estrutural | Todos |

Leia na ordem 00 ? 01 ? 02 ? 03. Os ADRs s?o referenciados de dentro dos documentos.

## Situa??o dos documentos anteriores

O arquivo `Novo Documento de Texto.txt` na raiz do projeto (ERP Cartonagem ? Modelo de Dados) ? a
**vers?o 0 do modelo de dados** e est? **superada** por [03-BANCO-DE-DADOS.md](03-BANCO-DE-DADOS.md).
Ele foi integralmente absorvido: tudo que estava l? continua no modelo novo (multi-tenant, auditoria,
UUID, exclus?o l?gica, ?ndices compostos), acrescido dos m?dulos que faltavam. Recomenda??o: mant?-lo
como registro hist?rico e n?o edit?-lo mais.

A pasta `Print PcBoot/` ? **evid?ncia de levantamento** ? prints, PDFs e exports do sistema legado.
N?o editar; serve como fonte para validar regras de neg?cio e como base dos testes de regress?o
descritos em [02-ENGENHARIA.md](02-ENGENHARIA.md#7-migra??o-do-legado-pcboot).

## Como seguir com os documentos quando houver mudan?as

1. **A documenta??o ? a fonte da verdade do desenho.** Mudan?a de desenho entra primeiro no doc, depois
   no c?digo. Se o c?digo divergir do doc, ? bug de um dos dois ? decide-se qual e corrige-se.
2. **Mudan?a estrutural exige ADR.** Toda decis?o que altera topologia, propriedade de dado, contrato de
   sincroniza??o, stack ou modelo de dados central gera um arquivo novo em `adr/`, numerado em sequ?ncia,
   com status `Proposto` ? `Aceito` ? (eventualmente) `Substitu?do por ADR-XXXX`. ADR aceito n?o se apaga
   nem se reescreve: cria-se outro que o substitui, preservando o hist?rico do racioc?nio.
3. **Mudan?a de modelo de dados = migra??o versionada.** Nenhuma altera??o de schema ? feita ? m?o em
   banco. Cada mudan?a vira um script de migra??o numerado (ver
   [02-ENGENHARIA.md](02-ENGENHARIA.md#33-migra??es-de-banco)) e o DDL do doc 03 ? atualizado no mesmo
   commit. Aten??o redobrada em tabelas replicadas entre n?s: altera??o de schema precisa ser
   compat?vel com n?s rodando vers?o anterior (ver regra de compatibilidade no doc 01).
4. **Cada documento tem hist?rico de revis?es no final.** Registre data, autor e o que mudou ? uma linha
   por revis?o, sem reescrever o passado.
5. **D?vida aberta ? documentada, n?o esquecida.** Perguntas sem resposta ficam na se??o
   "Quest?es abertas" do documento correspondente, com respons?vel. Quando respondida, sai de l? e entra
   no corpo do documento.

## Conven??es gerais

- Documentos em portugu?s (PT-BR), Markdown, uma frase por linha quando poss?vel (facilita diff).
- Identificadores de banco em `snake_case`, em portugu?s, singular (`ficha_tecnica`, n?o `FichasTecnicas`).
- Termos do neg?cio preservados como a f?brica fala: F.T., riscador, chapa, onda, faca, clich?, orelha,
  amarrado, refugo, O.F., Ficha de Servi?o. N?o traduzir nem "modernizar" vocabul?rio de f?brica ?
  isso quebra a comunica??o com quem vai usar o sistema.
- Unidades expl?citas em nomes de coluna quando houver risco de ambiguidade: `_mm`, `_kg`, `_g`,
  `_min`, `_pct`.

## Hist?rico de revis?es

| Data | Autor | Mudan?a |
|---|---|---|
| 27/09/2026 | ? | Cria??o do conjunto inicial de documentos (00 a 03 + ADRs 0001-0003) |
