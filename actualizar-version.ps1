# Script para actualizar versión del CSS y forzar recarga en navegadores (Windows PowerShell)
# Uso: .\actualizar-version.ps1

# Generar timestamp único
$VERSION = Get-Date -Format "yyyyMMdd-HHmmss"

Write-Host "🔄 Actualizando versión del CSS a: $VERSION" -ForegroundColor Cyan

# Leer index.html
$content = Get-Content "index.html" -Raw

# Reemplazar la versión del CSS
$content = $content -replace 'style\.css\?v=\d+-\d+', "style.css?v=$VERSION"

# Guardar cambios
Set-Content "index.html" -Value $content

Write-Host "✅ Versión actualizada en index.html" -ForegroundColor Green

# Agregar cambios a git
git add index.html

Write-Host "📝 Archivos listos para commit" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 Ahora ejecuta:" -ForegroundColor Cyan
Write-Host "   git commit -m 'Actualizar versión CSS para forzar recarga'"
Write-Host "   git push origin main"

