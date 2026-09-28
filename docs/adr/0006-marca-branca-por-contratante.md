# ADR-0006 — Marca branca por contratante, com sinalização travada

- **Status:** Aceito
- **Data:** 28/09/2026
- **Contexto relacionado:** [04-MARCA](../04-MARCA.md), [03-BANCO-DE-DADOS §3](../03-BANCO-DE-DADOS.md), [ADR-0004](0004-nuvem-pura-sem-servidor-na-fabrica.md)

## Contexto

O BoxFlow é SaaS e cada contratante deve ver o sistema como **seu**: o nome dele no topo, o logotipo dele,
as cores dele. A marca BoxFlow fica restrita à tela de entrada e ao rodapé.

Personalização de cor em sistema de chão de fábrica tem um risco que sistema de escritório não tem. O
operador não lê a tela: ele **reconhece a cor de longe**, com a mão ocupada, de passagem. Se vermelho
significa "máquina parada" em um contratante e é a cor da barra superior em outro, vermelho deixa de
significar qualquer coisa. O prejuízo não é uma tela feia — é uma parada que ninguém viu.

Há ainda o problema banal e garantido: o cliente manda a cor do catálogo dele, ela tem 2:1 de contraste, e
a tela fica ilegível sob luz de galpão.

## Decisão

Marca branca **completa na identidade** e **nula na sinalização**.

1. **O contratante fornece uma cor, não uma paleta.** Uma cor primária em hex. O sistema deriva a escala
   inteira (50 a 900) por ajuste de luminosidade em espaço perceptual. Cliente escolhendo doze tons
   escolhe pelo catálogo impresso, não por contraste em tela.

2. **A cor passa por validação no momento de salvar**, não a cada requisição: algum tom da escala tem que
   atingir 4,5:1 para texto e 3:1 para interface, contra a superfície clara e contra a escura. Se não
   atingir, o sistema ajusta, mostra o que vai usar e diz por quê. O resultado fica gravado junto do tema.

3. **As cores de estado não são customizáveis.** Produzindo, setup, parada, refugo, aprovado, aguardando,
   atrasado e divergente têm cor fixa do sistema, listada em [04-MARCA §3.3](../04-MARCA.md).

4. **Faixas de matiz reservadas.** Cor primária em vermelho (355°–15°), âmbar (30°–55°) ou verde
   (95°–150°) é **aceita** — cartonagem de marca vermelha é comum — mas fica restrita à moldura: barra,
   link, botão primário. Não entra em indicador de estado.

5. **Nenhum estado é comunicado só por cor.** Sempre cor + texto + forma. É requisito de acessibilidade
   (WCAG 1.4.1) com utilidade imediata aqui: daltonismo vermelho-verde atinge perto de 8% dos homens, e o
   chão de fábrica é predominantemente masculino.

6. **O painel de galpão ignora o tema** e usa sempre petróleo e lima. É lido a dez metros; legibilidade a
   distância vale mais que identidade nesse único lugar.

7. **Tema é do contratante; nome exibido é da empresa.** Um contratante tem várias empresas (multi-CNPJ).
   O logotipo e as cores não mudam ao trocar de empresa, mas o nome no topo, no documento e no e-mail é o
   da empresa selecionada — é o CNPJ que emite a nota.

8. **A assinatura BoxFlow na tela de entrada e no rodapé é obrigação contratual.** Não existe chave para
   desligá-la; quem quiser removê-la negocia licença, não configuração.

## Alternativas consideradas

| Alternativa | Por que foi rejeitada |
|---|---|
| **Tema totalmente livre (CSS do cliente)** | Injeção de CSS de terceiro na aplicação é vetor de ataque e de suporte infinito. Quebra a sinalização de fábrica na primeira semana |
| **Paleta completa escolhida pelo cliente** | Produz combinação ilegível de forma previsível, e o suporte herda o problema |
| **Co-branding fixo (logo BoxFlow sempre visível ao lado)** | Era a recomendação técnica por manter a marca do produto em evidência, mas o cliente optou por marca branca |
| **Sem personalização alguma** | Mais simples e mais seguro, mas some com o principal argumento de venda de um SaaS de nicho: o cliente se reconhecer no sistema |
| **Cor de estado também customizável, com validação** | Validar contraste não resolve o problema real, que é o **significado** aprendido pelo operador, não a legibilidade |

## Consequências

**Positivas**

- O contratante se reconhece no sistema, que é o que ele espera de um produto que leva o nome dele.
- A sinalização de fábrica significa a mesma coisa em todos os contratantes, o que torna possível treinar,
  documentar e dar suporte com um material só.
- Uma cor de entrada em vez de doze reduz o suporte de implantação a uma pergunta.

**Negativas / custos aceitos**

- Marca do produto pouco visível: o BoxFlow fica difícil de crescer por indicação, já que o usuário final
  vê a marca do patrão. Custo comercial assumido em troca do argumento de venda.
- CSS por contratante precisa ser servido com cache e impressão digital para não piscar na carga nem
  vazar tema entre clientes no cache intermediário.
- **Domínio próprio deixa de ser opcional.** Marca branca quer que o contratante acesse
  `clientex.boxflow.app`, e subdomínio de provedor (`*.fly.dev`) cobre **um** hostname, não uma família.
  Consequência prática: o subdomínio grátis serve para piloto e demonstração, mas o **segundo
  contratante** exige domínio próprio com certificado curinga, validado por DNS-01. Custa ~US$ 14/ano e
  precisa ser resolvido **antes** de vender o segundo contrato, não depois
  ([05-INFRAESTRUTURA-E-CUSTOS §5.2](../05-INFRAESTRUTURA-E-CUSTOS.md#52-mas-o-domínio-próprio-não-é-opcional)).
- Documentação, captura de tela e material de treino ficam com aparência variável entre clientes; o
  material oficial usa o tema padrão BoxFlow.
- Logotipo enviado pelo cliente é arquivo de terceiro entrando no sistema: exige limite de tamanho,
  verificação de tipo real e **sanitização de SVG** (SVG aceita script).

## Revisão

Reavaliar se: (a) algum contratante exigir contratualmente cor de estado própria; (b) aparecer revenda,
caso em que passa a existir um terceiro nível de marca entre BoxFlow e contratante; (c) a perda de
visibilidade da marca se mostrar caro demais para a aquisição de clientes.
