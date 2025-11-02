#!/bin/bash
cd /mnt/c/Users/elanchok91/Documents/proyectos/gkachele
git add admin/
git commit -m "Agregar sistema de autenticacion al dashboard"
git push origin main
git tag v1.2.2
git push origin v1.2.2
echo ""
echo "✅ Sistema de autenticación subido!"
echo "🔗 Login: https://gkachele.duckdns.org/admin/"

