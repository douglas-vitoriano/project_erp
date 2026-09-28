<#
.SINOPSE
    Descobre qual banco de dados o Sistema Cartonagem (PcBoot) usa, onde estao os arquivos
    de dados e qual o volume por tabela.

.DESCRICAO
    Script de LEITURA APENAS. Nao altera, move, renomeia nem apaga nada.
    Nao abre o banco em modo exclusivo e nao interfere com o sistema em uso.

    Identifica o motor por quatro evidencias independentes:
      1. Extensao dos arquivos de dados encontrados no diretorio da aplicacao
      2. DLLs de acesso a dados ao lado do executavel (BDE, Firebird, Interbase, ADO)
      3. Arquivos de configuracao (.ini, .cfg, .udl) com string de conexao
      4. DSNs ODBC registrados na maquina e servicos de banco em execucao

.EXEMPLO
    .\descobrir-banco-pcboot.ps1
    .\descobrir-banco-pcboot.ps1 -Caminho "W:\" -Saida "C:\temp\relatorio.txt"

.OBSERVACOES
    Rodar na estacao que usa o PcBoot, com o drive de rede (W:) mapeado.
    Nao precisa de privilegio de administrador. Se o inventario de tabelas
    ficar vazio, conferir se o usuario tem permissao de leitura no compartilhamento.
#>

[CmdletBinding()]
param(
    [string[]] $Caminho = @("W:\"),
    [string]   $Saida   = (Join-Path $PSScriptRoot "relatorio-descoberta-pcboot.txt"),
    [int]      $TopTabelas = 40
)

$ErrorActionPreference = "Continue"
$relatorio = [System.Collections.Generic.List[string]]::new()

function Escreve {
    param([string] $Texto, [string] $Cor = "Gray")
    Write-Host $Texto -ForegroundColor $Cor
    $relatorio.Add($Texto)
}

function Titulo {
    param([string] $Texto)
    Escreve ""
    Escreve ("=" * 78) "DarkGray"
    Escreve "  $Texto" "Cyan"
    Escreve ("=" * 78) "DarkGray"
}

# compativel com Windows PowerShell 5.1 (sem operador ??)
function OuTraco {
    param($Valor)
    if ([string]::IsNullOrWhiteSpace([string]$Valor)) { return "-" }
    return [string]$Valor
}

# Assinaturas de banco em arquivo: extensao -> motor provavel
$assinaturas = @{
    ".DB"   = "Paradox (BDE) - tabela"
    ".PX"   = "Paradox (BDE) - indice primario"
    ".X01"  = "Paradox (BDE) - indice secundario"
    ".XG0"  = "Paradox (BDE) - indice secundario"
    ".YG0"  = "Paradox (BDE) - indice secundario"
    ".MB"   = "Paradox (BDE) - memo/blob"
    ".VAL"  = "Paradox (BDE) - validacao"
    ".DBF"  = "dBase / Clipper / FoxPro - tabela"
    ".CDX"  = "dBase / FoxPro - indice composto"
    ".NTX"  = "Clipper - indice"
    ".MDX"  = "dBase - indice"
    ".DBT"  = "dBase - memo"
    ".FPT"  = "FoxPro - memo"
    ".FDB"  = "Firebird - banco"
    ".GDB"  = "InterBase / Firebird antigo - banco"
    ".IB"   = "InterBase - banco"
    ".MDB"  = "Microsoft Access (Jet) - banco"
    ".ACCDB"= "Microsoft Access (ACE) - banco"
    ".MDF"  = "Microsoft SQL Server - banco"
    ".SQLITE" = "SQLite - banco"
    ".DAT"  = "Generico - inspecionar cabecalho"
    ".NX1"  = "Advantage / NexusDB - indice"
    ".ADT"  = "Advantage Database Server - tabela"
}

Titulo "DESCOBERTA DO BANCO DE DADOS - SISTEMA CARTONAGEM (PcBoot)"
Escreve "Maquina......: $env:COMPUTERNAME"
Escreve "Usuario......: $env:USERNAME"
Escreve "Data/hora....: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')"
Escreve "Caminhos.....: $($Caminho -join ', ')"
Escreve ""
Escreve "Este script NAO altera nada. Somente leitura." "Yellow"

# ---------------------------------------------------------------- 0. Drives
Titulo "0. DRIVES E COMPARTILHAMENTOS"

Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue | ForEach-Object {
    $origem = ""
    try {
        $net = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$($_.Name):'" -ErrorAction SilentlyContinue
        if ($net -and $net.ProviderName) { $origem = " -> $($net.ProviderName)" }
    } catch { }
    $livreGb = if ($_.Free) { [math]::Round($_.Free / 1GB, 1) } else { 0 }
    Escreve ("  {0}: {1,8} GB livres{2}" -f $_.Name, $livreGb, $origem)
}

$caminhosValidos = @()
foreach ($c in $Caminho) {
    if (Test-Path -LiteralPath $c) {
        $caminhosValidos += $c
        Escreve "  [OK]    Caminho acessivel: $c" "Green"
    } else {
        Escreve "  [FALHA] Caminho NAO acessivel: $c" "Red"
    }
}

if (-not $caminhosValidos) {
    Escreve ""
    Escreve "Nenhum caminho acessivel. Mapeie o drive de rede (ex.: W:) e rode de novo." "Red"
    $relatorio | Set-Content -LiteralPath $Saida -Encoding UTF8
    return
}

# ---------------------------------------------------------------- 1. Executaveis
Titulo "1. EXECUTAVEIS E DATA DE COMPILACAO"

$executaveis = foreach ($c in $caminhosValidos) {
    Get-ChildItem -LiteralPath $c -Filter *.exe -Recurse -Depth 2 -ErrorAction SilentlyContinue |
        Select-Object -First 40
}

if ($executaveis) {
    foreach ($exe in $executaveis) {
        $vi = $exe.VersionInfo
        Escreve ("  {0}" -f $exe.FullName)
        Escreve ("      versao: {0,-16} produto: {1}" -f (OuTraco $vi.FileVersion), (OuTraco $vi.ProductName))
        Escreve ("      empresa: {0,-15} alterado: {1}" -f (OuTraco $vi.CompanyName), $exe.LastWriteTime.ToString("dd/MM/yyyy"))
    }
} else {
    Escreve "  Nenhum executavel encontrado nos caminhos informados." "Yellow"
}

# ---------------------------------------------------------------- 2. DLLs de acesso a dados
Titulo "2. BIBLIOTECAS DE ACESSO A DADOS (evidencia mais confiavel do motor)"

$dllsConhecidas = @{
    "idapi32.dll"  = "BDE (Borland Database Engine) -> Paradox ou dBase"
    "idapi01.dll"  = "BDE 16 bits -> Paradox ou dBase"
    "idpdx32.dll"  = "BDE driver PARADOX"
    "iddbas32.dll" = "BDE driver dBASE"
    "idodbc32.dll" = "BDE ponte ODBC"
    "idsql32.dll"  = "BDE SQL Links (banco cliente/servidor)"
    "gds32.dll"    = "InterBase / Firebird (cliente legado)"
    "fbclient.dll" = "Firebird (cliente)"
    "ibclient.dll" = "InterBase (cliente)"
    "sqlite3.dll"  = "SQLite"
    "libmysql.dll" = "MySQL"
    "msjet40.dll"  = "Microsoft Jet (Access)"
    "ace.dll"      = "Microsoft ACE (Access moderno)"
    "sqlncli.dll"  = "SQL Server Native Client"
    "msodbcsql17.dll" = "ODBC Driver for SQL Server"
    "ntwdblib.dll" = "SQL Server (DB-Library antiga)"
    "oci.dll"      = "Oracle"
    "ace32.dll"    = "Advantage Database Server"
    "axcws32.dll"  = "Advantage Database Server"
}

$achouDll = $false
foreach ($c in $caminhosValidos) {
    $dlls = Get-ChildItem -LiteralPath $c -Filter *.dll -Recurse -Depth 2 -ErrorAction SilentlyContinue
    foreach ($dll in $dlls) {
        $chave = $dll.Name.ToLower()
        if ($dllsConhecidas.ContainsKey($chave)) {
            Escreve ("  [ACHOU] {0,-18} => {1}" -f $dll.Name, $dllsConhecidas[$chave]) "Green"
            Escreve ("          {0}" -f $dll.FullName)
            $achouDll = $true
        }
    }
}

# BDE tambem se instala no sistema, nao so ao lado do exe
foreach ($p in @("$env:SystemRoot\System32\idapi32.dll",
                 "${env:CommonProgramFiles(x86)}\Borland Shared\BDE\idapi32.dll",
                 "$env:CommonProgramFiles\Borland Shared\BDE\idapi32.dll")) {
    if (Test-Path -LiteralPath $p) {
        Escreve "  [ACHOU] BDE instalado no sistema: $p" "Green"
        $achouDll = $true
    }
}

if (-not $achouDll) {
    Escreve "  Nenhuma DLL de banco reconhecida. O motor pode estar embutido no executavel" "Yellow"
    Escreve "  ou instalado em outro diretorio. Seguir pelas evidencias 3 e 4." "Yellow"
}

# ---------------------------------------------------------------- 3. Arquivos de dados
Titulo "3. ARQUIVOS DE DADOS ENCONTRADOS"

$arquivosDados = [System.Collections.Generic.List[object]]::new()
foreach ($c in $caminhosValidos) {
    Get-ChildItem -LiteralPath $c -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $assinaturas.ContainsKey($_.Extension.ToUpper()) } |
        ForEach-Object { $arquivosDados.Add($_) }
}

if ($arquivosDados.Count -eq 0) {
    Escreve "  Nenhum arquivo de dados reconhecido." "Yellow"
    Escreve "  Provavel banco cliente/servidor (Firebird, SQL Server). Ver evidencia 4." "Yellow"
} else {
    Escreve "Resumo por extensao:"
    $arquivosDados | Group-Object { $_.Extension.ToUpper() } | Sort-Object Count -Descending | ForEach-Object {
        $mb = [math]::Round(($_.Group | Measure-Object Length -Sum).Sum / 1MB, 1)
        Escreve ("  {0,-8} {1,6} arquivo(s)  {2,10} MB   {3}" -f `
            $_.Name, $_.Count, $mb, $assinaturas[$_.Name])
    }

    Escreve ""
    Escreve "Diretorios com dados:"
    $arquivosDados | Group-Object DirectoryName | Sort-Object Count -Descending |
        Select-Object -First 10 | ForEach-Object {
            $mb = [math]::Round(($_.Group | Measure-Object Length -Sum).Sum / 1MB, 1)
            Escreve ("  {0,6} arquivo(s)  {1,10} MB   {2}" -f $_.Count, $mb, $_.Name)
        }

    # As tabelas maiores sao as que importam no ETL
    $tabelas = $arquivosDados | Where-Object {
        $_.Extension.ToUpper() -in @(".DB", ".DBF", ".ADT", ".FDB", ".GDB", ".MDB", ".ACCDB")
    }

    if ($tabelas) {
        Escreve ""
        Escreve "Maiores tabelas (as que dominam o esforco de migracao):"
        $tabelas | Sort-Object Length -Descending | Select-Object -First $TopTabelas | ForEach-Object {
            Escreve ("  {0,12:N0} KB   {1,-34} {2}" -f `
                ($_.Length / 1KB), $_.Name, $_.LastWriteTime.ToString("dd/MM/yyyy HH:mm"))
        }

        $totalMb = [math]::Round(($tabelas | Measure-Object Length -Sum).Sum / 1MB, 1)
        Escreve ""
        Escreve ("  TOTAL: {0} tabela(s), {1} MB" -f $tabelas.Count, $totalMb) "Cyan"
    }
}

# ---------------------------------------------------------------- 4. Configuracao
Titulo "4. ARQUIVOS DE CONFIGURACAO E STRING DE CONEXAO"

$padroesConexao = @(
    "server\s*=", "database\s*=", "datasource\s*=", "data source\s*=",
    "provider\s*=", "driver\s*=", "alias\s*=", "path\s*=", "dbpath\s*=",
    "user\s*name\s*=", "protocol\s*=", "port\s*=", "localhost", "127\.0\.0\.1",
    "\.fdb", "\.gdb", "\.mdb", "\.db\b"
)

$extensoesConfig = @(".ini", ".cfg", ".udl", ".config", ".conf", ".txt")
$configs = foreach ($c in $caminhosValidos) {
    Get-ChildItem -LiteralPath $c -Recurse -Depth 2 -File -ErrorAction SilentlyContinue |
        Where-Object { ($extensoesConfig -contains $_.Extension.ToLower()) -and ($_.Length -lt 200KB) }
}

$achouConfig = $false
foreach ($cfg in ($configs | Select-Object -First 60)) {
    try {
        $conteudo = Get-Content -LiteralPath $cfg.FullName -Raw -ErrorAction Stop
        $linhas = $conteudo -split "`r?`n" | Where-Object {
            $linha = $_
            ($linha.Trim().Length -gt 0) -and
            ($padroesConexao | Where-Object { $linha -imatch $_ })
        }
        if ($linhas) {
            Escreve ""
            Escreve "  >> $($cfg.FullName)" "Green"
            $linhas | Select-Object -First 15 | ForEach-Object { Escreve "       $($_.Trim())" }
            $achouConfig = $true
        }
    } catch { }
}

if (-not $achouConfig) {
    Escreve "  Nenhuma string de conexao encontrada em arquivo de configuracao." "Yellow"
}

# BDE: os aliases ficam no registro
Titulo "4b. ALIASES DO BDE NO REGISTRO"

$achouAlias = $false
foreach ($raiz in @("HKLM:\SOFTWARE\Borland\Database Engine\Settings\DATABASES",
                    "HKLM:\SOFTWARE\WOW6432Node\Borland\Database Engine\Settings\DATABASES")) {
    if (Test-Path $raiz) {
        Get-ChildItem $raiz -ErrorAction SilentlyContinue | ForEach-Object {
            $alias = $_.PSChildName
            $db = Get-ItemProperty "$($_.PSPath)\DB" -ErrorAction SilentlyContinue
            Escreve "  ALIAS '$alias'" "Green"
            if ($db) {
                foreach ($p in $db.PSObject.Properties) {
                    if ($p.Name -notlike "PS*") { Escreve ("       {0,-14} = {1}" -f $p.Name, $p.Value) }
                }
            }
            $achouAlias = $true
        }
    }
}
if (-not $achouAlias) { Escreve "  BDE nao registrado nesta maquina (ou sem aliases)." "Yellow" }

# ---------------------------------------------------------------- 5. ODBC e servicos
Titulo "5. DSNs ODBC E SERVICOS DE BANCO"

foreach ($raiz in @("HKCU:\SOFTWARE\ODBC\ODBC.INI\ODBC Data Sources",
                    "HKLM:\SOFTWARE\ODBC\ODBC.INI\ODBC Data Sources",
                    "HKLM:\SOFTWARE\WOW6432Node\ODBC\ODBC.INI\ODBC Data Sources")) {
    if (Test-Path $raiz) {
        $props = Get-ItemProperty $raiz -ErrorAction SilentlyContinue
        foreach ($p in $props.PSObject.Properties) {
            if ($p.Name -notlike "PS*") { Escreve ("  DSN  {0,-28} driver: {1}" -f $p.Name, $p.Value) "Green" }
        }
    }
}

$servicosBanco = Get-Service -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -imatch "firebird|interbase|mssql|sqlserver|mysql|postgres|advantage|oracle|sqlanywhere"
}
if ($servicosBanco) {
    foreach ($s in $servicosBanco) {
        Escreve ("  SERVICO  {0,-26} {1}" -f $s.Name, $s.Status) "Green"
    }
} else {
    Escreve "  Nenhum servico de banco de dados em execucao nesta maquina." "Yellow"
}

$portas = @{ 3050 = "Firebird / InterBase"; 1433 = "SQL Server"; 3306 = "MySQL";
             5432 = "PostgreSQL"; 6262 = "Advantage Database Server" }
foreach ($porta in $portas.Keys) {
    $conn = Get-NetTCPConnection -LocalPort $porta -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) { Escreve ("  PORTA {0} em escuta => {1}" -f $porta, $portas[$porta]) "Green" }
}

# ---------------------------------------------------------------- 6. Conclusao
Titulo "6. CONCLUSAO AUTOMATICA"

$votos = @{}
function Vota { param([string]$Motor, [int]$Peso, [string]$Porque)
    if (-not $votos.ContainsKey($Motor)) { $votos[$Motor] = @{ Peso = 0; Porques = @() } }
    $votos[$Motor].Peso += $Peso
    $votos[$Motor].Porques += $Porque
}

$porExtensao = $arquivosDados | Group-Object { $_.Extension.ToUpper() }
foreach ($g in $porExtensao) {
    switch ($g.Name) {
        ".DB"    { Vota "Paradox (BDE)"   10 "$($g.Count) arquivo(s) .DB" }
        ".PX"    { Vota "Paradox (BDE)"    8 "$($g.Count) indice(s) .PX" }
        ".MB"    { Vota "Paradox (BDE)"    5 "$($g.Count) memo(s) .MB" }
        ".DBF"   { Vota "dBase/Clipper"   10 "$($g.Count) arquivo(s) .DBF" }
        ".CDX"   { Vota "dBase/FoxPro"     5 "$($g.Count) indice(s) .CDX" }
        ".FDB"   { Vota "Firebird"        12 "$($g.Count) banco(s) .FDB" }
        ".GDB"   { Vota "InterBase/Firebird" 12 "$($g.Count) banco(s) .GDB" }
        ".MDB"   { Vota "Access (Jet)"    12 "$($g.Count) banco(s) .MDB" }
        ".ACCDB" { Vota "Access (ACE)"    12 "$($g.Count) banco(s) .ACCDB" }
        ".MDF"   { Vota "SQL Server"      12 "$($g.Count) banco(s) .MDF" }
        ".ADT"   { Vota "Advantage"       10 "$($g.Count) tabela(s) .ADT" }
    }
}
if ($achouDll)   { Vota "ver secao 2"  3 "DLL de acesso a dados encontrada" }
if ($achouAlias) { Vota "Paradox (BDE)" 6 "alias do BDE registrado" }
foreach ($s in $servicosBanco) {
    if ($s.Name -imatch "firebird|interbase") { Vota "Firebird"   8 "servico $($s.Name) presente" }
    if ($s.Name -imatch "mssql|sqlserver")    { Vota "SQL Server" 8 "servico $($s.Name) presente" }
}

if ($votos.Count -eq 0) {
    Escreve "  INDETERMINADO. Nada conclusivo foi encontrado." "Red"
    Escreve ""
    Escreve "  Proximos passos sugeridos:"
    Escreve "    1. Rodar novamente apontando para o diretorio real da aplicacao:"
    Escreve "       .\descobrir-banco-pcboot.ps1 -Caminho 'W:\','W:\Tabela'"
    Escreve "    2. Com o PcBoot ABERTO, verificar quais arquivos ele mantem em uso"
    Escreve "       (Process Explorer, aba Handles, filtrando pelo processo do sistema)."
    Escreve "    3. Perguntar diretamente ao suporte da PcBoot Informatica."
} else {
    $ordenado = $votos.GetEnumerator() | Sort-Object { $_.Value.Peso } -Descending
    $vencedor = $ordenado | Select-Object -First 1
    Escreve ""
    Escreve "  MOTOR MAIS PROVAVEL: $($vencedor.Key)" "Green"
    Escreve ""
    foreach ($v in $ordenado) {
        Escreve ("  {0,-24} peso {1,3}" -f $v.Key, $v.Value.Peso)
        foreach ($p in ($v.Value.Porques | Select-Object -Unique)) { Escreve "      - $p" }
    }

    Escreve ""
    Escreve "  Caminho de extracao conforme o motor:" "Cyan"
    Escreve "    Paradox (BDE) : ODBC via driver Paradox, ou pxlib/pypxlib, ou converter no proprio BDE."
    Escreve "                    ATENCAO: sem integridade referencial no banco - validar tudo no ETL."
    Escreve "    dBase/Clipper : leitura direta do .DBF (dbfread em Python, ou ODBC dBase)."
    Escreve "                    ATENCAO: memo em .DBT/.FPT precisa ser lido junto."
    Escreve "    Firebird      : isql / gbak para extrair schema; extracao por SQL (cenario mais confortavel)."
    Escreve "    Access        : leitura por ODBC/OLEDB; schema disponivel via consulta."
    Escreve "    SQL Server    : extracao por SQL (cenario mais confortavel)."
}

# ---------------------------------------------------------------- Saida
Titulo "FIM"
Escreve "Relatorio gravado em: $Saida"
Escreve ""
Escreve "Envie este arquivo para a equipe do projeto. Ele nao contem dado de cliente," "Yellow"
Escreve "apenas nomes de tabela, tamanhos e configuracao tecnica." "Yellow"

$relatorio | Set-Content -LiteralPath $Saida -Encoding UTF8
