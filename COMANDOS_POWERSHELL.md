# 🚀 Comandos para PowerShell en Proyecto CodeKids

Este archivo contiene los comandos esenciales para trabajar con el proyecto **CodeKids** usando PowerShell en Windows. Úsalo como referencia para ejecutar tareas comunes.

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- ✅ **Node.js** (v18 o superior): https://nodejs.org/
- ✅ **Firebase CLI**: `npm install -g firebase-tools`
- ✅ **Git** (opcional): https://git-scm.com/

---

## 🔧 Configuración Inicial (Solo la Primera Vez)

### 1. Navegar a la carpeta del proyecto

```powershell
cd "C:\Users\USER\Desktop\Proyecto_CodeKids"
```

### 2. Instalar Firebase Tools (si no lo tienes)

```powershell
npm install -g firebase-tools
```

### 3. Iniciar sesión en Firebase

```powershell
firebase login
```

### 4. Instalar dependencias de Firebase Functions

```powershell
cd functions
npm install
cd ..
```

---

## 🎯 Comandos Principales

### 1. Iniciar el proyecto localmente (Emuladores Firebase)

```powershell
firebase emulators:start
```

**Esto iniciará:**
- 🔥 **Firestore Emulator** (base de datos): http://localhost:8080
- 🌐 **Hosting Emulator** (sitio web): http://localhost:5000
- ⚡ **Functions Emulator** (funciones): http://localhost:5001
- 🎛️ **Emulator UI** (panel de control): http://localhost:4000

**Para detener:** Presiona `Ctrl+C`

### 2. Desplegar el proyecto a producción

```powershell
firebase deploy
```

**Desplegar solo hosting:**
```powershell
firebase deploy --only hosting
```

**Desplegar solo funciones:**
```powershell
firebase deploy --only functions
```

**Desplegar solo reglas de Firestore:**
```powershell
firebase deploy --only firestore:rules
```

### 3. Ver logs en tiempo real

```powershell
firebase functions:log
```

---

## 🧪 Comandos de Desarrollo

### Ejecutar solo Firestore Emulator

```powershell
firebase emulators:start --only firestore
```

### Ejecutar solo Hosting

```powershell
firebase serve
```

### Ver el proyecto en producción

```powershell
firebase open hosting:site
```

### Verificar configuración de Firebase

```powershell
firebase projects:list
```

---

## 📊 Comandos de Base de Datos

### Exportar datos de Firestore (emulador local)

```powershell
firebase emulators:export ./backup
```

### Importar datos al emulador

```powershell
firebase emulators:start --import=./backup
```

### Ver reglas de seguridad

```powershell
Get-Content firestore.rules
```

---

## 🔍 Comandos de Diagnóstico

### Ver versión de Firebase CLI

```powershell
firebase --version
```

### Ver proyecto actual

```powershell
firebase use
```

### Cambiar de proyecto

```powershell
firebase use [PROJECT_ID]
```

### Ver información del proyecto

```powershell
firebase projects:list
```

---

## 🛠️ Utilidades Adicionales

### Limpiar caché de Firebase

```powershell
Remove-Item -Recurse -Force .firebase
```

### Reinstalar dependencias de Functions

```powershell
cd functions
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
cd ..
```

### Ver estructura del proyecto

```powershell
tree /F /A
```

### Abrir el proyecto en el navegador

```powershell
Start-Process "http://localhost:5000"
```

---

## 🎨 Comandos para Desarrollo Frontend

### Editar estilos CSS

```powershell
notepad css/style.css
```

### Editar archivo de configuración de Firebase

```powershell
notepad firebase.json
```

### Editar reglas de Firestore

```powershell
notepad firestore.rules
```

---

## 🚨 Solución de Problemas

### Error: "Firebase command not found"

```powershell
npm install -g firebase-tools
```

### Error: Puerto ya en uso

```powershell
# Detener proceso que usa el puerto 5000
netstat -ano | findstr :5000
# Luego matar el proceso con su PID
taskkill /PID [PID_NUMBER] /F
```

### Limpiar y reiniciar

```powershell
# Detener todos los emuladores (Ctrl+C)
# Limpiar caché
Remove-Item -Recurse -Force .firebase -ErrorAction SilentlyContinue
# Reiniciar emuladores
firebase emulators:start
```

---

## 📝 Flujo de Trabajo Recomendado

### Para Desarrollo Local:

1. Abrir PowerShell en la carpeta del proyecto
2. Ejecutar: `firebase emulators:start`
3. Abrir navegador en: http://localhost:5000
4. Hacer cambios en el código
5. Refrescar navegador (los cambios se ven automáticamente)
6. Cuando termines, presionar `Ctrl+C`

### Para Desplegar a Producción:

1. Probar todo localmente primero
2. Verificar que no hay errores
3. Ejecutar: `firebase deploy`
4. Esperar confirmación
5. Probar en: https://codekidsv1.web.app

---

## 🔗 Enlaces Útiles

- **Proyecto en local**: http://localhost:5000
- **Emulator UI**: http://localhost:4000
- **Firestore Emulator**: http://localhost:8080
- **Consola Firebase**: https://console.firebase.google.com/project/codekidsv1
- **Sitio en producción**: https://codekidsv1.web.app

---

## 💡 Consejos

- Siempre prueba en local antes de desplegar
- Usa `firebase emulators:start` para desarrollo
- Guarda cambios frecuentemente
- Revisa los logs si algo falla
- Mantén respaldos de tu código

---

> **Nota:** Ejecuta estos comandos desde la raíz del proyecto (`C:\Users\USER\Desktop\Proyecto_CodeKids`).

> **Importante:** Nunca compartas tus credenciales de Firebase ni subas las claves privadas a GitHub.
