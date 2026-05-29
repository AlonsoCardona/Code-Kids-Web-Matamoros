# CodeKids — Plataforma educativa de programación

Plataforma web para enseñanza de programación a niños. Roles: **Admin**, **Profesor**, **Estudiante**.

---

## Arquitectura

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML + JS vanilla (CDN Firebase 10.7.1) |
| Autenticación | Firebase Auth |
| Base de datos | Cloud Firestore |
| Backend | Cloud Functions (Node.js 18) |
| Hosting producción | Render (estático) |
| IA local (Cody) | Ollama `llama3.2:3b` — **solo funciona en local** |

> **Nota:** Render solo aloja archivos estáticos. Las Cloud Functions viven en Firebase.
> Los rewrites de `firebase.json` **no aplican** en Render; el frontend invoca las Functions directamente via su URL de Cloud Functions.

---

## Requisitos previos

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- Cuenta de Firebase con acceso al proyecto `codekids-dev`
- (Opcional, solo para Cody IA) [Ollama](https://ollama.com/) con el modelo `llama3.2:3b`

---

## Configuración inicial

### 1. Clonar y configurar Firebase

```bash
# Autenticarse
firebase login

# Crear .firebaserc apuntando al proyecto (este archivo NO está en el repo)
firebase use --add
# Seleccionar: codekids-dev
```

El archivo `.firebaserc` **no se incluye en el repositorio** (está en `.gitignore`).
El proyecto de Firebase es **`codekids-dev`** — puedes confirmarlo en `js/firebase-config.js`.

### 2. Instalar dependencias de Functions

```bash
cd functions
npm install
```

### 3. Crear el primer administrador

El sistema require que el primer admin sea creado con acceso directo al proyecto Firebase
(Firebase Console, CLI con permisos de Admin, o Service Account).

```bash
# Opción A: usando la CLI (necesita Service Account con permisos firebaseauth.admin)
node scripts/create-admin.js

# Opción B: usando setup-admin-emulator.js
# ⚠️ ADVERTENCIA: a pesar del nombre, este script apunta a PRODUCCIÓN.
# Leer los comentarios del archivo antes de ejecutar.
node scripts/setup-admin-emulator.js
```

---

## Desarrollo local (con emuladores)

```powershell
# Desde la raíz del proyecto — usa la ruta relativa correcta:
.\start.ps1
```

El script inicia Ollama (si está disponible) y los emuladores de Firebase en:

| Servicio | URL |
|---------|-----|
| Hosting | http://127.0.0.1:5002 |
| Cloud Functions | http://127.0.0.1:5001 |
| Auth | http://127.0.0.1:9099 |
| Firestore | http://127.0.0.1:10080 |
| UI de emuladores | http://127.0.0.1:4001 |

---

## Despliegue

### Firebase Hosting (recomendado — coordina rewrites con Functions)

```bash
firebase deploy --only hosting,functions,firestore:rules
```

### Render

Render sirve solo los archivos estáticos. Para que el panel de admin funcione
en Render, el frontend debe llamar directamente a la URL completa de Cloud Functions:

```
https://us-central1-codekids-dev.cloudfunctions.net/adminCreateUser
```

---

## Roles y custom claims

| Rol | Custom claim asignado al crear usuario |
|-----|---------------------------------------|
| Admin | `{ admin: true }` |
| Profesor | `{ teacher: true }` |
| Estudiante | (sin claim) |

Los claims son asignados automáticamente por `adminCreateUser`. Para usuarios
anteriores a este cambio, las reglas de Firestore tienen un fallback que lee el
campo `role` del documento del usuario.

---

## Variables de entorno (Functions)

| Variable | Uso | Default |
|---------|-----|---------|
| `OLLAMA_HOST` | URL de Ollama para Cody IA | `http://127.0.0.1:11434` |

> Cody IA **no funciona en producción** (Cloud Functions no tiene Ollama).
> Para habilitarlo en producción se requiere integrar una API de LLM gestionada (Vertex AI, OpenAI, etc.).

---

## Estructura del proyecto

```
/
├── index.html                  Página de entrada
├── Vistas_Publicas/            Páginas públicas (inicio, login, beneficios)
├── Dashboard/                  Dashboards por rol (Admin, Profesor, Estudiante)
├── auth/                       Registro (deshabilitado en producción)
├── functions/                  Cloud Functions (Node.js)
├── js/                         Scripts del frontend
├── css/                        Estilos
├── scripts/                    Utilitarios de administración (no son parte del app)
├── firebase.json               Configuración de Firebase Hosting + emuladores
├── firestore.rules             Reglas de seguridad de Firestore
├── render.yaml                 Configuración de Render (hosting estático)
└── start.ps1                   Script de inicio en desarrollo (Windows)
```

---

## Limitaciones conocidas (pendientes de resolver)

- No hay framework ni build system — cambios de UI requieren editar múltiples HTML.
- No hay entorno de staging separado de producción (`codekids-dev` es el único proyecto).
- No hay pruebas automatizadas ni CI/CD.
- Cody IA (chatbot) solo funciona en desarrollo local con Ollama activo.
- Bootstrap del primer admin requiere acceso directo a Firebase Console o CLI privilegiada.
