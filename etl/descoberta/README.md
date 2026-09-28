# Descoberta do banco de dados do PcBoot

Responde à questão **Q2** de [00-CENARIO-E-PREMISSAS](../../docs/00-CENARIO-E-PREMISSAS.md#62-abertas):
qual motor de banco o Sistema Cartonagem usa, onde estão os arquivos e qual o volume por tabela.

Sem essa resposta, qualquer prazo de migração é chute — é a primeira etapa da migração descrita em
[02-ENGENHARIA §7.1](../../docs/02-ENGENHARIA.md#71-etapas).

## Como rodar

Na **estação que usa o PcBoot**, com o drive de rede mapeado (normalmente `W:`), abrir o PowerShell e:

```powershell
cd <pasta do projeto>\etl\descoberta
powershell -ExecutionPolicy Bypass -File .\descobrir-banco-pcboot.ps1
```

Se o compartilhamento não estiver em `W:`, ou para varrer mais de um caminho:

```powershell
.\descobrir-banco-pcboot.ps1 -Caminho "W:\", "W:\Tabela", "\\servidor\pcboot"
```

Leva de alguns segundos a poucos minutos, conforme o tamanho do compartilhamento. Gera
`relatorio-descoberta-pcboot.txt` na própria pasta e imprime o mesmo conteúdo na tela.

## Garantias

- **Somente leitura.** Não altera, move, renomeia nem apaga nada; não abre o banco em modo exclusivo e não
  interfere com quem está usando o sistema.
- **Não precisa de administrador.**
- **Não coleta dado de cliente.** O relatório traz nome de arquivo, tamanho, data, DLLs, DSNs e strings de
  conexão — nunca conteúdo de tabela. Pode ser enviado por e-mail sem restrição.
- Compatível com Windows PowerShell 5.1 (o que vem no Windows) e com PowerShell 7.

## O que o script investiga

Quatro evidências independentes, para que o resultado não dependa de uma só pista:

1. **Extensão dos arquivos de dados** — `.DB`/`.PX`/`.MB` indicam Paradox (BDE); `.DBF`/`.CDX` indicam
   dBase/Clipper; `.FDB`/`.GDB` indicam Firebird/InterBase; `.MDB` indica Access; `.MDF` indica SQL Server.
2. **DLLs de acesso a dados** ao lado do executável e no sistema — `idapi32.dll` (BDE),
   `fbclient.dll`/`gds32.dll` (Firebird), `msjet40.dll` (Access), entre outras. É a evidência mais confiável.
3. **Arquivos de configuração e aliases do BDE no registro** — strings de conexão em `.ini`, `.cfg`, `.udl`.
4. **DSNs ODBC, serviços de banco em execução e portas em escuta** — 3050 (Firebird), 1433 (SQL Server),
   3306 (MySQL), 5432 (PostgreSQL).

No fim, o script pondera as evidências, aponta o motor mais provável e indica o caminho de extração
correspondente.

## Se o resultado vier indeterminado

Nessa ordem:

1. Rodar de novo apontando para o diretório real da aplicação, incluindo subpastas suspeitas
   (`W:\Tabela` é o principal candidato — ver
   [00 §6.3](../../docs/00-CENARIO-E-PREMISSAS.md#63-indício-sobre-o-banco-do-pcboot-q2)).
2. Com o PcBoot **aberto**, usar o Process Explorer (aba *Handles*, filtrando pelo processo do sistema)
   para ver quais arquivos ele mantém abertos. Isso mostra o banco em uso sem margem para dúvida.
3. Perguntar ao suporte da PcBoot Informática — é a via mais rápida se houver contrato ativo (questão Q3).

## Depois de descobrir

O motor identificado define a estratégia de extração:

| Motor | Extração | Cuidado principal |
|---|---|---|
| Paradox (BDE) | ODBC com driver Paradox, `pypxlib`, ou conversão pelo próprio BDE | Sem integridade referencial no banco: toda validação estava no código do aplicativo |
| dBase / Clipper | Leitura direta do `.DBF` (`dbfread`) ou ODBC dBase | Campos memo ficam em `.DBT`/`.FPT` e precisam ser lidos junto |
| Firebird / InterBase | `gbak` para o schema, extração por SQL | Cenário mais confortável; atenção a dialeto e charset |
| Access | ODBC/OLEDB, schema por consulta | Limite de tamanho do arquivo pode ter gerado bases divididas |
| SQL Server | Extração por SQL | Cenário mais confortável |

Em todos os casos file-based (Paradox, dBase, Access), esperar **muito mais inconsistência de dados** do que
num banco cliente/servidor, porque não havia constraint nenhuma no banco. É o que a etapa de perfilamento
(etapa 3 da migração) existe para medir.
