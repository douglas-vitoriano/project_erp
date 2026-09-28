# Protótipo navegável — ERP Cartonagem

Protótipo de interface do ERP que vai substituir o Sistema Cartonagem (PcBoot). É HTML, CSS e
JavaScript puros: **nenhuma dependência externa, nenhuma etapa de build, nenhum servidor**.

O objetivo é discutir o sistema olhando para ele, antes de escrever a primeira linha do backend.
Os números, clientes, estilos e medidas foram copiados dos prints reais do PcBoot coletados no
levantamento, justamente para que quem usa o sistema hoje reconheça o que está vendo.

## Como abrir

Basta abrir `index.html` no navegador — duplo clique resolve.

Se preferir servir por HTTP (mais parecido com o GitHub Pages):

```bash
python -m http.server 8080
# depois: http://127.0.0.1:8080/
```

## Os quatro dispositivos

| Arquivo | Quem usa | O que mostra |
|---|---|---|
| `index.html` | — | Hub: escolha o dispositivo ou vá direto a um módulo |
| `escritorio.html` | Escritório, mouse e teclado | ERP completo: engenharia, PCP, comercial, amostras, compra de chapa, produção, expedição, fiscal, financeiro, sincronização |
| `maquina.html` | Piso de fábrica, tablet | Ficha de Serviço, apontamento em três toques, parada e refugo por motivo, conferência e expedição |
| `campo.html` | Vendedor, tablet na rua | Carteira, posição dos pedidos, requisição de amostra e **assinatura do cliente** — funciona offline |
| `painel.html` | Galpão, TV na parede | OEE por máquina, situação dos postos e o que precisa de decisão |

`escritorio.html` usa rotas por hash, então é possível linkar direto para um módulo:
`escritorio.html#engenharia/92281`, `escritorio.html#pcp`, `escritorio.html#chapa`.

`maquina.html` aceita o posto na query: `maquina.html?posto=m6` abre a conferência.

## Duas coisas funcionam de verdade

O resto é fachada, mas estas duas são o coração técnico do projeto e estão implementadas:

**1. Motor de fórmulas de caixa** (`js/formulas.js`) — lexer, parser descendente recursivo, AST em
cache e avaliação, aceitando apenas as sete variáveis do PcBoot (`C L A S I W R`). Qualquer outro
identificador é recusado com a mensagem dizendo qual token caiu. Na tela de Engenharia, mude
comprimento, largura ou altura e veja o riscador, a impressão, a chapa, o peso, o custo, o
aproveitamento na folha e o plano de corte recalcularem.

As fórmulas cadastradas reproduzem **exatamente** os valores gravados no PcBoot para a F.T. 92281
(riscador 122/116/122 = 360 e impressão 30/463/243/463/241 = 1.440). O selo no alto da tela informa
quando o cálculo confere com o legado, quando divergiu e precisa de triagem, e quando é apenas uma
simulação porque as medidas foram alteradas na tela. É o teste de regressão de
`docs/02-ENGENHARIA.md` §4.4 aparecendo uma F.T. por vez.

**2. Captura de assinatura** (`js/campo.js`) — canvas com eventos de ponteiro, escalado pelo
`devicePixelRatio` para a assinatura não sair serrilhada, exportada em PNG e encadeada por hash.
Ligue o **modo avião** na barra superior do app de campo antes de assinar: nada deixa de funcionar
e a operação fica visível na fila de envio.

## Estrutura

```
prototipo/
├── index.html          hub de dispositivos
├── escritorio.html     shell do ERP (roteamento por hash)
├── maquina.html        tablet de fábrica
├── campo.html          tablet do vendedor
├── painel.html         TV do galpão
├── css/
│   ├── base.css        tokens, reset e componentes compartilhados
│   ├── escritorio.css  shell de desktop, F.T., carga-máquina, fluxo do pedido
│   ├── tablet.css      toque grosso, alto contraste, teclado numérico
│   ├── campo.css       uso em rua, barra de sincronização, área de assinatura
│   └── painel.css      leitura a cinco metros
└── js/
    ├── comum.js        formatação pt-BR, selos, modal, toast, fila offline
    ├── dados.js        dados fictícios baseados nos prints do PcBoot
    ├── formulas.js     motor de fórmulas de caixa (real)
    ├── caixa-svg.js    plano de corte e miniatura isométrica em SVG
    ├── escritorio.js   telas do escritório
    ├── maquina.js      apontamento, conferência e expedição
    ├── campo.js        carteira, amostra e assinatura
    └── painel.js       indicadores do painel
```

## Publicar no GitHub Pages

O protótipo é estático, então o Pages serve sem configuração. Duas opções:

**Publicar só a pasta do protótipo, na raiz do site.** Crie um repositório, copie o conteúdo de
`prototipo/` para a raiz dele, e em *Settings → Pages* escolha *Deploy from a branch*, branch `main`,
pasta `/ (root)`.

**Publicar o repositório inteiro.** Em *Settings → Pages* escolha branch `main`, pasta `/ (root)`, e
acesse `https://<usuario>.github.io/<repo>/prototipo/`. Os caminhos internos são todos relativos, então
funciona em subpasta sem ajuste.

Em qualquer um dos casos, adicione um arquivo `.nojekyll` vazio na raiz publicada. Sem ele o Jekyll
processa o site e pode ignorar arquivos e pastas que comecem com `_`.

## O que este protótipo não é

- Não tem backend, banco nem persistência: recarregar a página volta tudo ao estado inicial.
- Não tem autenticação: as telas de crachá e PIN são encenação.
- Não faz validação fiscal, cálculo de imposto nem emissão de documento.
- Os dados são fictícios. Os valores copiados dos prints servem de referência visual, não de
  cadastro.

O que ele serve para decidir está em `docs/` — arquitetura, engenharia e banco de dados.
