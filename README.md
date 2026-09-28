# ERP Cartonagem

Projeto do ERP que vai substituir o **Sistema Cartonagem (PcBoot)** em uma empresa de cartonagem —
fabricante de caixas de papelão ondulado que **compra chapa pronta e converte** (imprime, risca,
corta, vinca e cola), sem onduladeira própria.

Este repositório tem duas coisas: a **documentação de desenho** do sistema e um **protótipo navegável**
da interface. Ainda não há backend.

## Protótipo navegável

Quatro dispositivos, um sistema — escritório, tablet de máquina, tablet do vendedor e painel de fábrica.
É HTML, CSS e JavaScript puros, sem dependência externa e sem etapa de build.

👉 **[Abrir o protótipo](prototipo/index.html)** · detalhes em [`prototipo/README.md`](prototipo/README.md)

Duas coisas nele funcionam de verdade, porque são o coração técnico do projeto:

- **Motor de fórmulas de caixa** — lexer, parser descendente recursivo e avaliação, aceitando apenas as
  sete variáveis do legado (`C L A S I W R`). Na tela de Engenharia, mude comprimento, largura ou altura
  e veja riscador, impressão, chapa, peso, custo, aproveitamento e plano de corte recalcularem. As
  fórmulas cadastradas reproduzem **exatamente** o que está gravado na F.T. 92281 do PcBoot
  (riscador 122/116/122 = 360 e impressão 30/463/243/463/241 = 1.440).
- **Captura de assinatura do cliente** — canvas com eventos de ponteiro, escalado por `devicePixelRatio`,
  exportado em PNG e encadeado por hash. Funciona com o aparelho offline: ligue o *modo avião* na barra
  do app de campo antes de assinar.

## Documentação

Leia na ordem. Os ADRs são referenciados de dentro dos documentos.

| Doc | Conteúdo |
|---|---|
| [docs/00-CENARIO-E-PREMISSAS.md](docs/00-CENARIO-E-PREMISSAS.md) | Situação atual do legado, volumes, lacunas do modelo inicial, premissas e restrições |
| [docs/01-ARQUITETURA.md](docs/01-ARQUITETURA.md) | Topologia com servidor local e nó em nuvem, tablets de fábrica e de campo, operação offline, rede, segurança, backup e contingência |
| [docs/02-ENGENHARIA.md](docs/02-ENGENHARIA.md) | Stack, padrões, motor de fórmulas, Fichas de Serviço e homem-máquina, motor de sincronização, migração do legado, fases |
| [docs/03-BANCO-DE-DADOS.md](docs/03-BANCO-DE-DADOS.md) | Modelo de dados completo: convenções, tabelas, colunas, tipos, chaves, restrições, índices e views |
| [docs/adr/](docs/adr/) | Registros de decisão de arquitetura — o "por quê" de cada escolha estrutural |

O processo para manter os documentos vivos quando houver mudança está em
[`docs/README.md`](docs/README.md).

## As três decisões que definem o sistema

**O vendedor na rua não acessa o servidor da fábrica.** VPN, área de trabalho remota e publicar o
servidor local na internet foram descartados. Existe um nó em nuvem servindo de ponto de encontro, e é
a fábrica que abre a conexão de dentro para fora — sem porta aberta e sem VPN para o vendedor
configurar. O argumento decisivo: mesmo com link perfeito, o vendedor precisa trabalhar **sem sinal**
no momento em que o cliente assina. Ver [ADR-0001](docs/adr/0001-topologia-hibrida-local-nuvem.md).

**Conflito de escrita é eliminado por construção, não resolvido depois.** Todo dado pertence a uma de
três classes — referência com dono único, fato imutável em modo *append-only*, e documento com ciclo de
vida e transferência explícita de propriedade. Não existe *merge* automático de campo. Ver
[ADR-0002](docs/adr/0002-propriedade-de-dados-e-sincronizacao.md).

**Numeração offline por blocos pré-alocados.** Cada aparelho recebe uma faixa, e a não sobreposição é
garantida por restrição de exclusão no banco (`int8range` + `gist`), não pela aplicação. É isso que
permite numerar, imprimir e assinar um protocolo de amostra sem internet. Numeração fiscal nunca sai
offline. Ver [ADR-0003](docs/adr/0003-numeracao-offline-por-blocos.md).

## Descoberta do banco legado

O motor de banco usado pelo PcBoot ainda não é conhecido. Em
[`etl/descoberta/`](etl/descoberta/) há um script PowerShell **somente leitura** que investiga a estação
de trabalho da fábrica — executáveis, DLLs de acesso a dados, assinaturas de arquivo, strings de
conexão, aliases BDE no registro, DSNs ODBC, serviços e portas em escuta — e conclui qual motor é, com
o caminho de extração correspondente. Não exige administrador e não lê dado de cliente.

## Sobre dados neste repositório

O repositório é público, então **nenhum dado real de cliente está versionado**:

- A pasta `Print PcBoot/` (prints, PDFs e planilhas do legado, com razão social, CNPJ, contatos,
  telefones e preços praticados) está no `.gitignore` e permanece apenas na máquina local. Ela é a
  evidência do levantamento e a base dos testes de regressão descritos no doc 02.
- No protótipo, razões sociais, nomes fantasia, CNPJ, telefones e nomes de pessoas são **fictícios**.
  O que permanece fiel ao legado é o vocabulário de fábrica e os números de geometria, que não
  identificam ninguém.

## Estado atual

| Frente | Situação |
|---|---|
| Documentação de arquitetura, engenharia e banco | Escrita e revisada |
| Protótipo de interface dos quatro dispositivos | Navegável |
| Identificação do banco legado | Script pronto, aguardando execução na fábrica |
| Backend, banco e migração | Não iniciados |
