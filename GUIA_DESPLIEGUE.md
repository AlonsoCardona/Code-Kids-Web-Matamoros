# 🚀 Guía de Despliegue - CodeKids

Esta guía te ayudará a configurar y desplegar el proyecto CodeKids para que esté funcionando completamente.

---

## 📋 Requisitos Previos

- Node.js instalado
- Firebase CLI instalado (`npm install -g firebase-tools`)
- Cuenta de Firebase (plan Spark gratuito o Blaze)
- Git (opcional)

---

## 🔧 Configuración Inicial

### 1. Clonar o Descargar el Proyecto

```powershell
cd C:\Users\USER\Desktop
git clone [URL_DEL_REPO] Proyecto_CodeKids
cd Proyecto_CodeKids
```

### 2. Autenticarse en Firebase

```powershell
firebase login
```

Sigue las instrucciones en el navegador para autorizar.

### 3. Verificar Configuración del Proyecto

Verifica que `.firebaserc` tenga el ID correcto del proyecto:

```json
{
  "projects": {
    "default": "codekidsv1"
  }
}
```

---

## 🌐 Desplegar el Sitio Web

### 1. Desplegar Firebase Hosting

```powershell
firebase deploy --only hosting
```

Esto despliega todos los archivos del sitio web a: **https://codekidsv1.web.app/**

### 2. Verificar el Despliegue

Abre tu navegador en: https://codekidsv1.web.app/

---

## 🔐 Configurar Usuario Administrador

### 1. Descargar Service Account Key

1. Ve a: https://console.firebase.google.com/project/codekidsv1/settings/serviceaccounts/adminsdk
2. Haz clic en **"Generar nueva clave privada"**
3. Guarda el archivo JSON descargado en: `config/service-account.json`

### 2. Crear el Documento de Admin en Firestore

1. Ve a: https://console.firebase.google.com/project/codekidsv1/firestore/data
2. Crea una colección llamada **`users`** (si no existe)
3. Dentro de `users`, crea un documento con tu UID de usuario
   - Para obtener tu UID: ve a Authentication → Users → copia el UID
4. Agrega los siguientes campos al documento:
   ```
   email: "admin@codekids.com" (string)
   role: "Admin" (string)
   rol: "admin" (string)
   displayName: "Administrador" (string)
   ```

### 3. Asignar Custom Claim de Admin

En la terminal de PowerShell:

```powershell
cd functions
node tools/setAdminClaim.js --email admin@codekids.com
```

Deberías ver: `✅ Set admin claim for [UID] email: admin@codekids.com`

---

## 🛠️ Servidor Local de Administración

Para crear usuarios desde el panel de admin SIN necesitar el plan Blaze de Firebase:

### 1. Iniciar el Servidor Local

En una terminal de PowerShell (déjala abierta):

```powershell
cd functions
node tools/localAdminServer.js --port 5055 --key ..\config\service-account.json
```

Deberías ver: `Local Admin Server listening on http://127.0.0.1:5055`

### 2. Configurar el Endpoint en el Navegador

1. Abre tu sitio: https://codekidsv1.web.app/admin.html
2. Inicia sesión con tu cuenta de admin
3. Abre la consola del navegador (presiona **F12**)
4. Ejecuta este comando:
   ```javascript
   window.CODEKIDS_LOCAL_ADMIN_ENDPOINT = 'http://127.0.0.1:5055/adminCreateUser'
   ```

### 3. Crear Usuarios

Ahora puedes usar el panel de administración normalmente para crear usuarios (estudiantes y profesores).

**Nota:** El servidor local debe estar corriendo mientras uses el panel de admin.

---

## ☁️ Desplegar Cloud Functions (Opcional - Requiere Plan Blaze)

Si actualizas al plan Blaze de Firebase, puedes desplegar las Cloud Functions para no necesitar el servidor local:

### 1. Actualizar al Plan Blaze

Ve a: https://console.firebase.google.com/project/codekidsv1/usage/details

### 2. Instalar Dependencias de Functions

```powershell
cd functions
npm install
```

### 3. Desplegar Todo

```powershell
cd ..
firebase deploy
```

Esto desplegará:
- Hosting
- Firestore Rules
- Cloud Functions (adminCreateUser, requestAdminPasswordReset, etc.)

---

## 🔄 Actualizar el Sitio

Cada vez que hagas cambios al código:

```powershell
firebase deploy --only hosting
```

Si modificaste las funciones:

```powershell
firebase deploy --only functions
```

Para desplegar todo:

```powershell
firebase deploy
```

---

## 🐛 Solución de Problemas

### El navegador muestra una versión antigua

**Solución:** Fuerza la recarga del navegador:
- **Ctrl + Shift + R** (Windows/Linux)
- **Cmd + Shift + R** (Mac)

### Error: "No autorizado" al crear usuarios

**Solución:**
1. Verifica que tu documento en `/users/{UID}` tenga `role: "Admin"`
2. Cierra sesión y vuelve a iniciar sesión
3. Asegúrate de que el servidor local esté corriendo
4. Configura el endpoint en la consola del navegador

### El servidor local no se conecta

**Solución:**
1. Verifica que el archivo `service-account.json` esté en `config/`
2. Reinicia el servidor con:
   ```powershell
   node tools/localAdminServer.js --port 5055 --key ..\config\service-account.json
   ```

### Error al desplegar Cloud Functions

**Solución:**
- Requiere plan Blaze (de pago)
- Usa el servidor local como alternativa (gratuito)

---

## 📝 Resumen de URLs Importantes

- **Sitio Web:** https://codekidsv1.web.app/
- **Panel Admin:** https://codekidsv1.web.app/admin.html
- **Firebase Console:** https://console.firebase.google.com/project/codekidsv1/overview
- **Firestore:** https://console.firebase.google.com/project/codekidsv1/firestore/data
- **Authentication:** https://console.firebase.google.com/project/codekidsv1/authentication/users
- **Servidor Local:** http://127.0.0.1:5055

---

## 👥 Para Nuevos Colaboradores

### Configuración Rápida

1. **Clona el proyecto**
2. **Ejecuta:** `npm install -g firebase-tools`
3. **Ejecuta:** `firebase login`
4. **Pide acceso al proyecto Firebase** (el dueño debe agregarte en la consola)
5. **Descarga el service account key** y guárdalo en `config/`
6. **¡Listo para desarrollar!**

### Workflow de Desarrollo

1. Haz cambios en tu código local
2. Prueba localmente con el emulador:
   ```powershell
   firebase emulators:start
   ```
3. Cuando esté listo, despliega:
   ```powershell
   firebase deploy --only hosting
   ```

---

## 🎯 Funcionalidades Disponibles

✅ **Con Hosting (Gratuito):**
- Sitio web completo
- Autenticación de usuarios
- Firestore (base de datos)
- Dashboard de estudiantes y profesores
- Sistema de gamificación
- Lecciones y tareas

✅ **Con Servidor Local (Gratuito):**
- Todo lo anterior +
- Creación de usuarios desde panel admin

✅ **Con Cloud Functions (Plan Blaze):**
- Todo lo anterior +
- Reseteo de contraseña de administradores
- Sin necesidad de servidor local

---

## 📞 Soporte

Si tienes problemas:
1. Revisa la sección de **Solución de Problemas**
2. Verifica los logs en Firebase Console
3. Revisa la consola del navegador (F12) para errores
4. Contacta al administrador del proyecto

---

**¡CodeKids está listo para enseñar programación! 🎓💻**
