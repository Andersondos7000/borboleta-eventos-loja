# Encontrar arquivos grandes específicos
Write-Host "🔍 ARQUIVOS MAIORES QUE 1MB:" -ForegroundColor Green

$largeFiles = Get-ChildItem -Recurse -File | Where-Object {$_.Length -gt 1MB} | Sort-Object Length -Descending

$counter = 1
foreach ($file in $largeFiles | Select-Object -First 15) {
    $sizeMB = [math]::Round($file.Length / 1MB, 2)
    Write-Host "$counter. $($sizeMB) MB - $($file.Name)" -ForegroundColor Yellow
    Write-Host "   Caminho: $($file.DirectoryName)" -ForegroundColor Gray
    Write-Host ""
    $counter++
}

Write-Host "📊 RESUMO:" -ForegroundColor Cyan
Write-Host "Total de arquivos > 1MB: $($largeFiles.Count)" -ForegroundColor White
Write-Host "Espaço total ocupado: $([math]::Round(($largeFiles | Measure-Object Length -Sum).Sum / 1MB, 2)) MB" -ForegroundColor White