#!/bin/bash

# Script para actualizar versión del CSS y forzar recarga en navegadores
# Uso: ./actualizar-version.sh

# Generar timestamp único
VERSION=$(date +"%Y%m%d-%H%M%S")

echo "🔄 Actualizando versión del CSS a: $VERSION"

# Actualizar la versión en index.html
sed -i "s/style\.css?v=[0-9]*-[0-9]*/style.css?v=$VERSION/g" index.html

echo "✅ Versión actualizada en index.html"

# Agregar cambios a git
git add index.html

echo "📝 Archivos listos para commit"
echo ""
echo "💡 Ahora ejecuta:"
echo "   git commit -m 'Actualizar versión CSS para forzar recarga'"
echo "   git push origin main"

