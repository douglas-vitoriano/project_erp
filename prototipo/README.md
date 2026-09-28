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

## Publicação

Já está publicado, automaticamente, em
**<https://douglas-vitoriano.github.io/project_erp/>**

Não há nada a configurar na mão. O workflow [`.github/workflows/pages.yml`](../.github/workflows/pages.yml)
publica esta pasta como **raiz do site** a cada alteração em `prototipo/` na branch `main` — por isso o
endereço é `/project_erp/` e não `/project_erp/prototipo/`.

Antes de publicar, o workflow verifica quatro coisas, e qualquer uma delas falhando aborta a publicação:

1. **Sintaxe do JavaScript** (`node --check` em cada arquivo de `js/`). Protótipo sem etapa de build não
   tem compilador para pegar erro de sintaxe; este passo faz esse papel.
2. **Referências existentes**: todo `src` e `href` de `.js` e `.css` nas páginas aponta para um arquivo
   que existe. Sem isso, renomear um arquivo e esquecer a referência abre a página em branco e ninguém
   percebe até alguém acessar.
3. **Entrada do site**: `index.html` presente.
4. **Nenhuma evidência do legado versionada**: se um print, PDF ou planilha da pasta `Print PcBoot/`
   escapar do `.gitignore`, a publicação para. O repositório é público e aquela pasta tem dado real de
   cliente.

Para publicar sem alterar nada, use *Actions → Publicar protótipo no GitHub Pages → Run workflow*.

## O que este protótipo não é

- Não tem backend, banco nem persistência: recarregar a página volta tudo ao estado inicial.
- Não tem autenticação: as telas de crachá e PIN são encenação.
- Não faz validação fiscal, cálculo de imposto nem emissão de documento.
- Os dados são fictícios. Os valores copiados dos prints servem de referência visual, não de
  cadastro.

O que ele serve para decidir está em `docs/` — arquitetura, engenharia e banco de dados.
