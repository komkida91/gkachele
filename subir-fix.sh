#!/bin/bash
cd /mnt/c/Users/elanchok91/Documents/proyectos/gkachele
git add .
git commit -m "Fix: Quitar login bloqueante + agregar logo showcase + analytics"
git push origin main
git tag v1.3.1
git push origin v1.3.1
echo "✅ Cambios subidos - v1.3.1"

