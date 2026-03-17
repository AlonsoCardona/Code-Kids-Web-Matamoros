# 📐 Arquitectura Completa de CodeKids

## 1. Filosofía y Principios de Diseño

### 🔒 Seguridad de "Entorno Amurallado" (Walled Garden)
- **NO existe registro público**: Cada usuario es creado manualmente por un Administrador
- **Control total**: Elimina spam, ciberacoso y garantiza un ambiente seguro
- **Usuarios validados**: Solo estudiantes y profesores de escuelas autorizadas

### 👮 Control y Moderación
- **Profesores como moderadores**: Gestionan sus grupos y alumnos
- **Comunicación limitada**: Estudiantes solo chatean con profesores, no entre ellos
- **Prevención de distracciones**: Canales de comunicación claros y controlados

### 🎮 Gamificación y Motivación Intrínseca
- **Audiencia 8-14 años**: Progreso visual, tangible y divertido
- **Lecciones desbloqueables**: Completa lecciones para acceder a minijuegos
- **Sistema de recompensas**: Puntos, insignias y barras de progreso
- **Interacciones positivas**: Reacciones y comentarios moderados

### 🎨 UI/UX Familiar (Inspirada en Teams)
- **Layout 2-3 paneles**: Navegación > Lista > Contenido
- **Simplificado y atractivo**: Iconografía grande, colores brillantes, avatares prominentes
- **Menos densidad de información**: Adaptado para niños y adolescentes
- **Animaciones fluidas**: Transiciones suaves y notificaciones claras

### 🔧 Plataforma Única Integrada
- **Todo en un lugar**: Lecciones, foros, tareas, calificaciones y minijuegos
- **Profesor centralizado**: Gestiona todo desde un solo panel
- **Estudiante enfocado**: Aprende, juega y pregunta en el mismo sitio

### 🤝 Interactividad Segura
- **Funciones sociales controladas**: Reacciones, emojis y comentarios permitidos por el profesor
- **Configuración por grupo**: Los profesores definen qué reacciones se permiten
- **Colaboración, no distracción**: Expresión positiva sin convertirse en red social

---

## 2. Stack Tecnológico

### Frontend
- **HTML5**: Estructura semántica
- **TailwindCSS**: UI profesional y rápida con utility-first
- **JavaScript ES6+**: Módulos, async/await, imports

### Backend (Firebase BaaS)
- **Firebase Authentication**: Gestión de usuarios (Email/Contraseña)
- **Firebase Firestore**: Base de datos NoSQL en tiempo real
- **Firebase Storage**: Almacenamiento de archivos (fotos, PDFs, recursos)
- **Firebase Hosting**: Despliegue de la aplicación

### Librerías Externas (CDN)
- **Leaflet.js**: Mapas interactivos de escuelas
- **Lucide Icons / FontAwesome**: Iconografía moderna
- **emoji-picker-element**: Selector de emojis en chats
- **browser-image-compression**: Compresión de imágenes en cliente

---

## 3. Arquitectura de Base de Datos (Firestore)

### 📂 Colecciones Principales (Top-Level)

#### 1. `/users/{userId}`
**Descripción**: Almacén central de usuarios. El `userId` es el mismo que el `uid` de Firebase Authentication.

```javascript
{
  "email": "alumno.ejemplo@codekids.mx",
  "displayName": "Alumno Ejemplo",
  "searchableDisplayName": "alumno ejemplo", // Para búsquedas
  "nombre": "Alumno",
  "apellidoPaterno": "Ejemplo",
  "apellidoMaterno": "Prueba",
  "role": "Estudiante", // "Estudiante" | "Profesor" | "Admin"
  "schoolId": "school_cbtis135", // FK a /schools
  "photoURL": "gs://bucket/profiles/user_uid.jpg",
  "createdAt": Timestamp,
  "lastLogin": Timestamp,
  "forcePasswordChange": true, // Forzar cambio tras primer login
  
  // --- Solo si role == "Estudiante" ---
  "studentProfile": {
    "points": 1250,
    "currentLessonRef": "doc(lessons/lesson_id_02_01)",
    "completedLessons": ["lesson_id_01_01", "lesson_id_01_02"],
    "gameScores": {
      "laberinto_comandos": 9800,
      "depurador_bugs": 7500
    }
  },
  
  // --- Solo si role == "Profesor" ---
  "teacherProfile": {
    "department": "Computación",
    "office": "Oficina A-102"
  }
}
```

#### 2. `/schools/{schoolId}`
**Descripción**: Escuelas participantes para el mapa.

```javascript
{
  "name": "CBTIS 135, Matamoros",
  "address": "Av. Manuel Cavazos Lerma S/N",
  "coords": GeoPoint(25.845, -97.495), // Para queries de mapa
  "isActive": true
}
```

#### 3. `/groups/{groupId}`
**Descripción**: Los "Equipos" o "Clases" (estilo Teams).

```javascript
{
  "name": "5to A - Programación Python",
  "description": "Grupo para dudas, tareas y anuncios",
  "ownerId": "teacher_user_id", // FK a /users
  "schoolId": "school_cbtis135", // FK a /schools
  "joinCode": "A8B1Z2", // Código de 6 dígitos
  "memberCount": 25,
  "members": {
    // Mapa de miembros para queries rápidas
    "teacher_user_id": "Profesor",
    "student_user_id_1": "Estudiante",
    "student_user_id_2": "Estudiante"
  },
  "settings": {
    "allowStudentPosts": true,
    "moderatePosts": false,
    "allowStudentReactions": true,
    "allowedReactions": ["👍", "💡", "🎉", "❤️", "🤔"]
  }
}
```

#### 4. `/courses/{courseId}`
**Descripción**: Estructura del temario.

```javascript
{
  "title": "Python Básico",
  "description": "Aprende desde cero"
}
```

#### 5. `/labGames/{gameId}`
**Descripción**: Minijuegos del laboratorio.

```javascript
{
  "title": "Laberinto de Comandos",
  "description": "Aprende secuencias lógicas",
  "icon": "fa-maze",
  "gameUrl": "/games/maze-runner/index.html",
  "unlocksOnLesson": "lesson_id_01_03",
  "highScoreLeaderboard": [
    { "userId": "user_id_x", "displayName": "SuperProg", "score": 10500 }
  ]
}
```

#### 6. `/badges/{badgeId}`
**Descripción**: Insignias/logros.

```javascript
{
  "name": "¡Primer Script!",
  "description": "Completaste tu primera lección",
  "iconUrl": "gs://bucket/badges/first_script.png",
  "points": 50
}
```

### 📁 Sub-colecciones (Anidadas)

#### 1. Lecciones (Dentro de Cursos)
- **Ruta**: `/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}`

```javascript
// modules
{
  "title": "Módulo 1: Fundamentos",
  "order": 1
}

// lessons
{
  "title": "1.1: ¿Qué es una variable?",
  "order": 1,
  "videoUrl": "https://vimeo.com/xxxxx",
  "content": "HTML/Markdown del artículo...",
  "unlocksNextLesson": "lesson_id_01_02"
}
```

#### 2. Comentarios de Lección
- **Ruta**: `/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/comments/{commentId}`

```javascript
{
  "authorId": "user_uid",
  "content": "No entendí esta parte...",
  "createdAt": Timestamp,
  "isResolved": false
}
```

#### 3. Publicaciones de Grupo (Foro)
- **Ruta**: `/groups/{groupId}/posts/{postId}`

```javascript
{
  "title": "Duda con el bucle 'for'",
  "content": "...",
  "authorId": "student_user_id_1",
  "createdAt": Timestamp,
  "isPinned": false,
  "isResolved": false,
  "replyCount": 0,
  "reactions": {
    "👍": ["user_id_1", "user_id_2"],
    "💡": ["user_id_3"]
  }
}
```

#### 4. Respuestas a Publicaciones
- **Ruta**: `/groups/{groupId}/posts/{postId}/replies/{replyId}`

```javascript
{
  "content": "¡Buena pregunta! Intenta esto...",
  "authorId": "teacher_user_id",
  "createdAt": Timestamp,
  "reactions": {
    "🎉": ["user_id_1"]
  }
}
```

#### 5. Tareas (Assignments)
- **Ruta**: `/groups/{groupId}/assignments/{assignmentId}`

```javascript
{
  "title": "Tarea 1: Calculadora",
  "instructions": "Crear una calculadora...",
  "dueDate": Timestamp,
  "totalPoints": 100,
  "filesUrl": ["gs://bucket/assignments/guia.pdf"]
}
```

#### 6. Entregas de Tareas (Submissions)
- **Ruta**: `/groups/{groupId}/assignments/{assignmentId}/submissions/{studentId}`

```javascript
{
  "fileUrl": "gs://bucket/submissions/tarea1_alumno1.zip",
  "submittedAt": Timestamp,
  "status": "Entregado" | "Calificado" | "Tarde",
  "grade": 95,
  "teacherFeedback": "¡Excelente trabajo!"
}
```

#### 7. Insignias Ganadas (Por Usuario)
- **Ruta**: `/users/{userId}/earnedBadges/{badgeId}`

```javascript
{
  "earnedAt": Timestamp
}
```

#### 8. Notificaciones (Por Usuario)
- **Ruta**: `/users/{userId}/notifications/{notificationId}`

```javascript
{
  "text": "El Prof. García calificó tu Tarea 1.",
  "link": "/app/groups/group_id/assignments/assign_id",
  "isRead": false,
  "createdAt": Timestamp
}
```

#### 9. Chats 1-a-1 (Seguros)
- **Ruta**: `/chats/{chatId}`
- **chatId**: Combinación alfabética de los dos `userId` (ej: `prof_uid_abc_est_uid_xyz`)

```javascript
{
  "members": ["prof_uid_abc", "est_uid_xyz"],
  "lastMessage": "¡Hola profe! 🎉",
  "lastMessageAt": Timestamp,
  "lastMessageSenderId": "est_uid_xyz",
  "memberReadStatus": {
    "prof_uid_abc": true,
    "est_uid_xyz": false
  }
}
```

#### 10. Mensajes del Chat
- **Ruta**: `/chats/{chatId}/messages/{messageId}`

```javascript
{
  "senderId": "est_uid_xyz",
  "createdAt": Timestamp,
  "type": "text" | "image",
  "textContent": "Tengo una duda... 🤔", // Solo si type == "text"
  "imageUrl": "gs://bucket/chat-images/chatId/img_uuid.jpg", // Solo si type == "image"
  "imageMetadata": { "fileName": "mi_error.png", "size": 120400 }
}
```

---

## 4. Flujo de Roles y Autenticación

### 🚫 NO HAY REGISTRO PÚBLICO

### ✅ Flujo 1: Creación de Usuario (Admin)

1. **Admin** inicia sesión en su panel (`admin.html`)
2. Va a "Gestión de Usuarios" → "Crear Nuevo Usuario"
3. Rellena el formulario:
   - Nombre(s)
   - Apellido Paterno
   - Apellido Materno
   - Correo Electrónico
   - Rol (Estudiante, Profesor, Admin)
   - Escuela (Opcional)

4. Al hacer clic en **"Crear"**:
   - Se genera una contraseña aleatoria segura (8+ caracteres, alfanumérica + símbolos)
   - Se crea el usuario en Firebase Authentication
   - Se crea el documento en Firestore con:
     - `forcePasswordChange: true`
     - `searchableDisplayName`: lowercase del displayName
     - Campos específicos según rol (`studentProfile` o `teacherProfile`)

5. Se muestra un modal con las credenciales:
   - Email
   - Contraseña temporal (se muestra solo una vez)
   - Advertencia: El usuario debe cambiar la contraseña en su primer login

6. El Admin comunica estas credenciales al usuario de forma segura

### 🔐 Flujo 2: Inicio de Sesión (Usuario)

1. Usuario va al **Sitio Público** (`index.html`)
2. Hace clic en **"Iniciar Sesión"**
3. Introduce Email y Contraseña
4. Se autentica con `signInWithEmailAndPassword`
5. `onAuthStateChanged` detecta el login
6. Se obtiene el documento del usuario de Firestore (`/users/{uid}`)
7. Se verifica `forcePasswordChange`:
   - Si es `true`: Se bloquea la UI con un modal de cambio de contraseña
   - El usuario DEBE cambiar la contraseña antes de continuar
   - Al cambiarla, se actualiza `forcePasswordChange: false`

8. **Redirección según rol**:
   - `role === "Admin"` → `admin.html`
   - `role === "Estudiante"` o `"Profesor"` → `app.html`

---

## 5. Aplicación Interna (Post-Login)

### 🏗️ Estructura General (El "Shell")

**Archivo**: `app.html`  
**Script principal**: `js/app.js`

#### Header Global (Barra Superior)
- **Izquierda**: Logo CodeKids
- **Centro**: Barra de búsqueda global
  - Busca usuarios (por `searchableDisplayName`)
  - Busca contenido (posts, lecciones)
  - Muestra resultados en dropdown
- **Derecha**:
  - **Notificaciones** (campana con badge)
    - onSnapshot de `/users/{userId}/notifications`
    - Muestra punto rojo si hay notificaciones no leídas
  - **Avatar de Usuario** (dropdown con menú)
    - "Mi Perfil" (modal para cambiar displayName y photoURL)
    - "Configuración" (toggle de modo noche)
    - "Cerrar Sesión"

#### Barra Lateral Izquierda (Navegación)
Iconos grandes con tooltips:
- **📝 Tareas** (Solo Estudiantes)
- **📚 Grupos** (Equipos/Foros)
- **📖 Lecciones** (Cursos/Videos)
- **🎮 Laboratorio** (Minijuegos)
- **💬 Chats** (Mensajería 1-a-1)
- **📊 Panel de Control** (Solo Profesores)

#### Main Content (Contenido Dinámico)
Se renderiza según la sección seleccionada.

---

### 📚 Sección: GRUPOS (Estilo Teams)

**Layout**: 3 Paneles

#### Panel 1 (Izquierda): "Mis Grupos"
- Lista de grupos del usuario
- Query: `where('members.{userId}', 'in', ['Estudiante', 'Profesor'])`
- **Profesor**: Botones "Crear Grupo" y "Unirse a Grupo"
- **Estudiante**: Botón "Unirse a Grupo" (pide joinCode)

#### Panel 2 (Centro): "Canales/Pestañas"
Al seleccionar un grupo, se muestran pestañas:
- **Publicaciones** (Foro/Default)
  - Lista de hilos (`/groups/{groupId}/posts`)
  - Botón "Nueva Publicación"
  - Reacciones configurables
- **Archivos**
  - Visor de Firebase Storage (`group-files/{groupId}/`)
- **Tareas**
  - Lista de assignments
- **Cuaderno de Calificaciones** (Solo Profesor)
  - Grid: Alumnos (filas) x Tareas (columnas)
  - Permite editar notas directamente
  - Botón "Exportar a CSV"
- **Miembros** (Solo Profesor)
  - Lista de `group.members`

#### Panel 3 (Derecha): "Contenido"
- **Vista de Publicación**:
  - Post completo + respuestas
  - UI de reacciones (botón `[+]` abre popover con emojis permitidos)
  - Lógica de transacción para agregar/quitar reacciones
- **Vista de Tarea (Profesor)**:
  - Lista de entregas
  - Panel de calificación y feedback

---

### 📖 Sección: LECCIONES (Aprendizaje Progresivo)

**Layout**: 2 Paneles

#### Panel 1 (Izquierda): "Temario"
- Árbol de Módulos y Lecciones
- **Lógica de Desbloqueo**:
  - ✔ **Check Verde**: Lección completada
  - ▶ **Resaltado Azul**: Lección actual
  - 🔒 **Candado**: Lección bloqueada
- Basado en `user.studentProfile.completedLessons` y `currentLessonRef`

#### Panel 2 (Derecha): "Contenido de la Lección"
- **Pestaña "Lección"**:
  - Video embed (`videoUrl`)
  - Artículo (`content` en HTML/Markdown)
- **Pestaña "Comentarios de la Lección"**:
  - Mini-foro de la lección
- **Botón "Completar y Continuar"**:
  - Añade `lessonId` al array `completedLessons`
  - Actualiza `currentLessonRef` al `unlocksNextLesson`
  - Otorga puntos (`increment(50)` en `studentProfile.points`)
  - (Opcional) Otorga insignia
  - Navega automáticamente a la siguiente lección

---

### 🎮 Sección: LABORATORIO (Minijuegos)

**Layout**: Grid de Tarjetas

- Cada tarjeta muestra un minijuego
- **Lógica de Candado**: Basado en `game.unlocksOnLesson`
- Al hacer clic en un juego:
  - Abre modal grande
  - **Pestaña "Jugar"**: Carga `gameUrl` en iframe
  - **Pestaña "Clasificación"**: Muestra `highScoreLeaderboard`

#### Comunicación Iframe ↔ App
- **Juego envía**: `window.parent.postMessage({ type: 'gameEvent', event: 'levelComplete', score: 100 }, '*')`
- **App escucha**: Actualiza `user.studentProfile.gameScores` y el leaderboard

---

### 💬 Sección: CHATS (Seguros)

**Layout**: 2 Paneles

#### Panel 1 (Izquierda): "Contactos/Conversaciones"
- **Estudiante**: Muestra SOLO profesores
  - Query: `where('schoolId', '==', user.schoolId), where('role', '==', 'Profesor')`
- **Profesor**: Muestra Estudiantes y otros Profesores
  - Query: `where('schoolId', '==', user.schoolId), where('role', '!=', 'Admin')`
- **NO SE PUEDE BUSCAR OTROS ESTUDIANTES**

#### Panel 2 (Derecha): "Mensajes"
- **Renderizado de Mensajes**: onSnapshot de `/chats/{chatId}/messages`
  - `type === "text"`: Renderiza `textContent` (emojis automáticos)
  - `type === "image"`: Renderiza `<img>` con `imageUrl`
- **Caja de Entrada**:
  - Botón 😊: Abre `emoji-picker-element`
  - Botón 📎: Sube imagen (comprimida con `browser-image-compression`)

---

### 📝 Sección: TAREAS (Solo Estudiantes)

- Vista consolidada de todas las tareas en todos los grupos
- Filtros por estado (pendiente, entregada, calificada)
- Ordenar por fecha límite

---

### 📊 Sección: PANEL DE PROFESOR

- Dashboard con estadísticas
- Gestión de alumnos
- Vista de calificaciones consolidada

---

## 6. Panel de Administrador

**Archivo**: `admin.html`  
**Script principal**: `js/admin.js`

### Pestañas

#### 1. Dashboard
- **Usuarios Totales**
- **Estudiantes**
- **Profesores**
- **Escuelas Activas**
- **Grupos Creados**

#### 2. Gestión de Usuarios (CRUD)
- Tabla de todos los usuarios (`/users`)
- Filtros por rol y escuela
- **Botón "Crear Usuario"**: Abre modal de creación
- **Acciones por fila**:
  - "Resetear Contraseña" (`sendPasswordResetEmail`)
  - "Editar Rol/Escuela"
  - "Desactivar/Eliminar" (Cloud Function)

#### 3. Gestión de Escuelas (CRUD)
- **Mapa de Leaflet**: Carga marcadores desde `/schools`
- **Formulario "Crear/Editar Escuela"**:
  - Nombre, Dirección
  - Mapa interactivo: El admin hace clic para soltar un pin (`GeoPoint`)
- **Tabla de Escuelas**: Con botón "Eliminar"

#### 4. Gestión de Contenidos (CRUD Maestro)
- Interfaz para crear/editar:
  - Cursos
  - Módulos
  - Lecciones
  - Minijuegos
  - Insignias
- Permite subir iconos y recursos

---

## 7. Reglas de Seguridad (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helpers
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isSignedIn() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';
    }
    
    function isProfesor() {
      return isSignedIn() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Profesor';
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    // Users: Solo admins pueden crear, los usuarios pueden leer/editar lo suyo
    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if isAdmin();
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
      
      // Subcolecciones de usuario
      match /notifications/{notifId} {
        allow read, write: if isOwner(userId);
      }
      
      match /earnedBadges/{badgeId} {
        allow read: if isSignedIn();
        allow write: if isAdmin();
      }
    }
    
    // Schools: Solo admins
    match /schools/{schoolId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
    
    // Groups: Profesores pueden crear, miembros pueden leer
    match /groups/{groupId} {
      allow read: if isSignedIn() && 
                    (request.auth.uid in resource.data.members.keys() || isAdmin());
      allow create: if isProfesor() || isAdmin();
      allow update, delete: if isOwner(resource.data.ownerId) || isAdmin();
      
      // Subcollections
      match /posts/{postId} {
        allow read: if request.auth.uid in get(/databases/$(database)/documents/groups/$(groupId)).data.members.keys();
        allow create: if isSignedIn();
        allow update, delete: if isOwner(resource.data.authorId) || isAdmin();
      }
      
      match /assignments/{assignmentId} {
        allow read: if request.auth.uid in get(/databases/$(database)/documents/groups/$(groupId)).data.members.keys();
        allow write: if isProfesor() || isAdmin();
      }
    }
    
    // Chats: Solo los dos miembros pueden leer/escribir
    match /chats/{chatId} {
      allow read, write: if isSignedIn() && 
                            request.auth.uid in resource.data.members;
    }
    
    // Courses, labGames, badges: Solo admins pueden escribir, todos pueden leer
    match /courses/{courseId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
    
    match /labGames/{gameId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
    
    match /badges/{badgeId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
  }
}
```

---

## 8. Recomendaciones Visuales (UI/UX)

### Inspiración
- **Microsoft Teams**: Estructura de paneles
- **Duolingo**: Gamificación, colores, feedback visual
- **Notion**: Limpieza y claridad

### Tips de UI con TailwindCSS
- `bg-gradient-to-r`, `rounded-xl`, `shadow-lg`: Tarjetas atractivas
- `hover:scale-105`: Animaciones sutiles en hover
- Iconos grandes y coloridos (Lucide/FontAwesome)
- Avatares circulares con borde de color según rol
- Barras de progreso animadas con `transition-all duration-300`
- Modales con animación de entrada/salida
- Feedback inmediato en cada acción (toasts, banners, loaders)

### Colores Según Rol
- **Estudiante**: Azul/Índigo (`bg-indigo-600`)
- **Profesor**: Naranja/Rojo (`bg-orange-600`)
- **Admin**: Rojo/Rosa (`bg-red-600`)

---

## 9. Cloud Functions (Recomendadas)

### `createUser`
- Recibe: `email`, `password`, `displayName`, `role`, `schoolId`
- Crea usuario en Authentication
- Crea documento en Firestore con todos los campos
- Devuelve: `uid` y `password`

### `deleteUser`
- Recibe: `userId`
- Elimina de Authentication
- Elimina documento de Firestore
- Limpia referencias en grupos, chats, etc.

### `sendNotification`
- Recibe: `userId`, `text`, `link`
- Crea documento en `/users/{userId}/notifications`

---

## 10. Próximos Pasos

- [ ] Implementar lógica completa de lecciones con desbloqueo
- [ ] Crear minijuegos de ejemplo con comunicación iframe
- [ ] Implementar sistema de chats con emojis e imágenes
- [ ] Desarrollar cuaderno de calificaciones interactivo
- [ ] Crear sistema de insignias automáticas
- [ ] Implementar modo oscuro completo
- [ ] Optimizar queries de Firestore con índices compuestos
- [ ] Añadir tests unitarios y E2E
- [ ] Configurar CI/CD con GitHub Actions
- [ ] Documentar API de Cloud Functions

---

**🎉 ¡Feliz desarrollo con CodeKids!**
