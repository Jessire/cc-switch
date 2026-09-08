param(
  [string]$ExePath = (Join-Path $PSScriptRoot '..\src-tauri\target\release\cc-switch.exe'),
  [int]$ExpectedVersionMajor = 3,
  [string]$ExpectedArchitecture = 'x64',
  [switch]$RequireRunning
)

$ErrorActionPreference = 'Stop'
$resolved = (Resolve-Path -LiteralPath $ExePath -ErrorAction Stop).Path
$file = Get-Item -LiteralPath $resolved
$hash = (Get-FileHash -LiteralPath $resolved -Algorithm SHA256).Hash
$version = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($resolved).FileVersion

$stream = [System.IO.File]::Open($resolved, 'Open', 'Read', 'ReadWrite')
try {
  $reader = New-Object System.IO.BinaryReader($stream)
  $stream.Position = 0x3c
  $peOffset = $reader.ReadInt32()
  $stream.Position = $peOffset
  $signature = $reader.ReadUInt32()
  if ($signature -ne 0x00004550) { throw 'invalid PE signature' }
  $machine = $reader.ReadUInt16()
} finally {
  if ($reader) { $reader.Dispose() } else { $stream.Dispose() }
}

$architecture = switch ($machine) {
  0x8664 { 'x64' }
  0x014c { 'x86' }
  0xaa64 { 'arm64' }
  default { ('unknown-0x{0:X4}' -f $machine) }
}

$running = @(Get-CimInstance Win32_Process -Filter "Name='cc-switch.exe'" | Where-Object { $_.ExecutablePath -eq $resolved })
$errors = @()
if ([string]::IsNullOrWhiteSpace($version) -or ([int]($version -split '\.')[0] -lt $ExpectedVersionMajor)) {
  $errors += 'unexpected-version'
}
if ($architecture -ne $ExpectedArchitecture) {
  $errors += 'unexpected-architecture'
}
if ($RequireRunning -and $running.Count -eq 0) {
  $errors += 'expected-exe-not-running'
}

$result = [ordered]@{
  ok = $errors.Count -eq 0
  exe = $resolved
  version = $version
  architecture = $architecture
  machine = ('0x{0:X4}' -f $machine)
  size = $file.Length
  sha256 = $hash
  running = $running.Count -gt 0
  pids = @($running | ForEach-Object ProcessId)
  errors = $errors
}
$result | ConvertTo-Json -Depth 4
if (-not $result.ok) { exit 1 }
