# ADR-0007 — Sequenciamento automático como proposta auditável, não como oráculo

- **Status:** Aceito
- **Data:** 28/09/2026
- **Contexto relacionado:** [06-PARIDADE-COMPETITIVA §6](../06-PARIDADE-COMPETITIVA.md#6-etapa-3--sequenciamento), [03-BANCO-DE-DADOS §10.3](../03-BANCO-DE-DADOS.md#103-proposta-de-sequência), [02-ENGENHARIA §5.6](../02-ENGENHARIA.md#56-sequenciador-de-carga-máquina), [ADR-0002](0002-propriedade-de-dados-e-sincronizacao.md)

## Contexto

O sistema não tem sequenciamento automático. `ficha_servico.sequencia_fila` é um inteiro ordenável e
`vw_carga_maquina` soma os minutos previstos da fila; quem decide a ordem é uma pessoa. É a lacuna mais
citada quando se compara o projeto ao Kiwiplan, cujo Production Control System reprograma a fábrica a cada
15 minutos num horizonte de 90 dias.

A tentação é copiar o comportamento: um programa que recalcula a fila e a aplica. A questão que este ADR
resolve não é *se* vamos sequenciar automaticamente — vamos — mas **quem fica com a palavra final e o que
acontece quando o algoritmo está errado**.

Três fatos do nosso contexto empurram a resposta:

**Os nossos números ainda não são confiáveis.** A velocidade de máquina é um escalar
(`maquina.capacidade_hora`) e o tempo de setup é um padrão por máquina. Enquanto a calibração descrita em
[06 §4.6](../06-PARIDADE-COMPETITIVA.md#46-calibração-de-onde-saem-os-números) não estiver feita, qualquer
sequência calculada é uma opinião bem formatada.

**O piso tem memória longa para promessa quebrada.** Duas programações impossíveis bastam para o
encarregado parar de abrir a tela, e ele não volta quando o algoritmo melhora. A adoção é gasta uma vez.

**O Kiwiplan, que tem o algoritmo maduro, faz questão de dizer que o manual continua fácil.** No material
de demonstração deles, a frase é que não travam a fábrica durante a programação e que quiseram tornar a
programação manual o mais simples possível. Quem tem 45 anos de calibração ainda preserva o volante. Nós
temos menos razão para tirá-lo.

## Decisão

O sequenciador **propõe**; a pessoa **aceita**. A fila que o chão de fábrica enxerga é sempre uma sequência
aceita por um humano identificado.

1. **A proposta é uma entidade, não um efeito colateral.** Cada rodada grava `sequencia_proposta` com
   parâmetros, versão do algoritmo e resultado, e `sequencia_proposta_item` com a posição sugerida de cada
   FS. Nada é escrito em `ficha_servico.sequencia_fila` antes do aceite.

2. **O aceite é registrado com autor.** Aceitar tudo, aceitar por máquina ou aceitar com edição são três
   desfechos distintos, todos gravados. Quem aceitou e quando fica no registro — é a informação que
   transforma "o sistema mandou" em "o PCP decidiu com esta recomendação".

3. **Toda posição carrega motivo em português.** Agrupada por faca compartilhada, antecipada por prazo,
   adiada por ferramental indisponível, mantida por congelamento. Proposta sem motivo é ordem; com motivo
   é argumento, e argumento pode ser contestado por quem conhece a máquina.

4. **A edição do humano é dado de calibração, não ruído.** Divergência entre proposta e sequência aceita é
   medida e revisada. Quando o PCP move a mesma coisa toda semana, o errado é o modelo — quase sempre uma
   restrição real que ninguém declarou.

5. **Horizonte congelado.** A FS em `EM_SETUP` ou `EM_PRODUCAO` é intocável; as próximas `N` por máquina
   (padrão 2) só mudam com descongelamento explícito. O motivo é físico: o operador já está com a faca da
   próxima na bancada.

6. **Determinismo obrigatório.** Mesma entrada, mesma saída, semente fixa. Sem isso não há teste
   reproduzível, e o PCP não consegue distinguir mudança causada pela fábrica de mudança causada pelo
   algoritmo.

7. **Máquina não calibrada não entra.** Enquanto a máquina não atingir o critério de ±15% em 80% das FS
   ([06 §4.6](../06-PARIDADE-COMPETITIVA.md#46-calibração-de-onde-saem-os-números)), ela fica em fila
   manual, e a tela diz que está assim e por quê.

8. **Cadência por evento, com piso de tempo.** Dispara em O.F. liberada, FS concluída, mudança de situação
   de ferramental, chapa recebida e abertura de turno. Relógio cego recalcula quando ninguém precisa.

9. **Fronteiras que ele não atravessa.** Não altera roteiro, não reserva nem compra chapa, não assume
   compromisso de data com cliente e não se aplica sozinho.

## Alternativas consideradas

**Aplicar automaticamente, com possibilidade de override.** É o que o nome "automático" sugere e é o
comportamento do produto de referência. Rejeitada por ordem de maturidade, não por princípio: aplicar
sozinho exige tempo de setup e velocidade confiáveis, que são exatamente o que ainda não temos. Fica como
evolução natural — quando a aderência do §10 de
[06](../06-PARIDADE-COMPETITIVA.md#10-critérios-de-aceite) se sustentar por alguns meses e o PCP estiver
aceitando sem editar, inverter o padrão para "aplica e avisa" é mudança de configuração, não de
arquitetura. O caminho proposta → aplicação automática é percorrível; o contrário não é.

**Deixar tudo manual e investir só em visualização.** Um Gantt bom e carga-máquina clara já melhoram muito
a vida do PCP, e é o que o protótipo esboça. Rejeitada porque não captura o ganho que existe: agrupar por
faca e clichê economiza setup de forma sistemática, e pessoa nenhuma faz essa combinatória de cabeça para
dez máquinas todos os dias. A visualização entra de todo jeito — é como a proposta é apresentada.

**Solver de otimização comercial.** Rejeitada por desproporção. Sequenciamento em máquinas paralelas com
setup dependente da sequência, em cerca de dez máquinas, é problema pequeno: heurística de despacho com
afinidade de setup mais busca local resolve. Solver acrescenta licença, dependência e uma caixa que ninguém
na equipe sabe explicar quando der resposta estranha — e "não sei por que ele fez isso" é exatamente o que
a decisão 3 existe para evitar.

**Regra fixa de despacho, do tipo menor prazo primeiro.** Rejeitada porque ignora setup, que é onde está o
dinheiro numa cartonagem. Ordenar só por data de entrega produz troca de faca a cada trabalho.

## Consequências

- O ganho aparece mais devagar do que apareceria aplicando direto, e depende de o PCP abrir a tela. Em
  troca, um erro do algoritmo custa uma proposta recusada em vez de um turno perdido.
- Existe uma tabela a mais para manter e um passo a mais no fluxo. Aceito: é o passo que gera o registro de
  quem decidiu.
- A divergência entre proposta e aceite vira indicador de qualidade **do modelo**, não do PCP. Isso precisa
  ser dito na implantação, senão o número é lido como boletim do encarregado e ele passa a aceitar tudo
  para não aparecer mal — destruindo justamente o sinal de calibração.
- O sequenciamento fica atrás da coleta e da calibração no roteiro de entrega
  ([06 §2](../06-PARIDADE-COMPETITIVA.md#2-a-cadeia-a-ordem-importa-mais-que-a-lista)). Construir antes
  seria construir sobre número que não existe.
