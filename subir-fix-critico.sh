#!/bin/bash
cd /mnt/c/Users/elanchok91/Documents/proyectos/gkachele
git add .
git commit -m "RESTAURAR login obligatorio + fix logo + metricas reales"
git push origin main
git tag v1.3.2
git push origin v1.3.2
echo "✅ FIXES CRÍTICOS APLICADOS - v1.3.2"

