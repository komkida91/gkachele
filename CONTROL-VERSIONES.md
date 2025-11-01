# Control de Versiones - GKACHELE

## Versiones Estables

### v1.0-stable
- Versión estable con móvil funcionando correctamente
- Contactos centrados
- Formularios funcionando
- Todos los componentes operativos

**Para volver a esta versión:**
```bash
git checkout v1.0-stable
```

## Flujo de Trabajo Recomendado

### 1. Antes de Hacer Cambios Grandes

**Crear un tag de respaldo:**
```bash
git tag -a v1.X-backup -m "Backup antes de cambios grandes"
git push origin v1.X-backup
```

### 2. Para Cambios Experimentales

**Crear un branch de desarrollo:**
```bash
git checkout -b dev
# Hacer cambios aquí
git add .
git commit -m "Descripción del cambio"
git push origin dev
```

**Cuando esté funcionando, mergear a main:**
```bash
git checkout main
git merge dev
git push origin main
```

### 3. Cuando Tengas una Versión Estable

**Crear un tag de versión:**
```bash
git tag -a v1.1-stable -m "Nueva versión estable - descripción"
git push origin v1.1-stable
```

## Comandos Útiles

### Ver Versiones Disponibles
```bash
git tag -l
```

### Ver Historial de Commits
```bash
git log --oneline -20
```

### Volver a un Commit Específico
```bash
git checkout <commit-hash>
```

### Volver a la Última Versión Estable
```bash
git checkout v1.0-stable
```

### Ver Diferencias Entre Versiones
```bash
git diff v1.0-stable main
```

## Buenas Prácticas

1. **Commits pequeños y específicos**: Un cambio por commit
2. **Mensajes descriptivos**: Explicar qué y por qué se cambió
3. **Testear antes de push**: Verificar que funciona en móvil y desktop
4. **Crear tags antes de cambios grandes**: Para poder volver atrás fácilmente
5. **Usar branches para experimentos**: No romper main

## Si Algo Se Rompe

1. Volver a la última versión estable:
   ```bash
   git checkout v1.0-stable
   git push origin main --force
   ```

2. O revertir commits específicos:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

