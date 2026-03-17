# 🎓 CodeKids - Plataforma Educativa de Programación# 🚀 CodeKids - Plataforma Educativa# Proyecto CodeKids



<div align="center">



![CodeKids](https://img.shields.io/badge/CodeKids-Platform-667eea?style=for-the-badge)## 📖 DescripciónEste proyecto es una plataforma educativa para niños, donde pueden aprender a programar a través de juegos y actividades interactivas.

![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

![TailwindCSS](https://img.shields.io/badge/Tailwind-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)



**Plataforma educativa segura para enseñar programación a niños (8-14 años)****CodeKids** es una plataforma educativa gamificada para niños y adolescentes de 8-14 años, diseñada con un enfoque de **"Entorno Amurallado"** (Walled Garden) para garantizar seguridad, control y un ambiente de aprendizaje óptimo.## Estructura del Proyecto



[Demo en Vivo](https://codekidsv1.web.app) • [Documentación](#-documentación) • [Contribuir](#-contribuir)



</div>### ✨ Características Principales- **js/**: Contiene los archivos JavaScript para la lógica de la aplicación.



---- **css/**: Contiene los estilos CSS personalizados.



## 📖 Sobre el Proyecto- 🔒 **Seguridad Total**: No existe registro público, solo administradores pueden crear usuarios- **games/**: Contiene los juegos desarrollados para la plataforma.



**CodeKids** es una plataforma educativa diseñada para enseñar programación de manera **interactiva, segura y divertida**.- 🎮 **Gamificación**: Puntos, insignias, minijuegos desbloqueables- **firestore.rules**: Reglas de seguridad para Firestore.



### 🎯 Misión- 📚 **Aprendizaje Progresivo**: Lecciones que desbloquean contenido nuevo- **functions/**: Funciones en la nube para manejar eventos y lógica del servidor.



Democratizar la educación tecnológica, proporcionando herramientas gratuitas para que cualquier niño aprenda programación en un entorno 100% seguro.- 👥 **Grupos Colaborativos**: Estilo Microsoft Teams para profesores y estudiantes



---- 💬 **Chats Seguros**: Solo entre profesores y estudiantes, nunca entre estudiantes## Configuración



## ✨ Características- 🏆 **Sistema de Recompensas**: Progreso visual y motivador



### Para Estudiantes 👦👧1. Clona el repositorio.

- 📚 Lecciones interactivas con videos

- 🎮 Laboratorio de juegos educativos---2. Instala las dependencias necesarias:

- 🏆 Sistema de gamificación (XP, niveles, insignias)

- 💬 Chat seguro solo con profesores   ```bash

- 📊 Seguimiento de progreso

## 🛠️ Stack Tecnológico   npm install

### Para Profesores 👨‍🏫

- 👥 Gestión de grupos y clases   ```

- 📈 Dashboard con progreso de alumnos

- 📝 Creación de lecciones### Frontend3. Configura Firebase en tu proyecto:

- 💬 Chat con estudiantes

- HTML5   - Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).

### Para Administradores ⚙️

- 🔐 Control total de usuarios- TailwindCSS   - Agrega tu configuración de Firebase en `firebase-config.js`.

- 📊 Estadísticas globales

- 🛡️ Moderación y seguridad- JavaScript ES6+ (Módulos)



---## Despliegue



## 🛠️ Tecnologías### Backend (Firebase)



- **Frontend**: HTML5, TailwindCSS, JavaScript ES6+- Firebase AuthenticationPara desplegar las funciones en la nube, usa el siguiente comando:

- **Backend**: Firebase (Auth, Firestore, Hosting, Storage)

- **Herramientas**: VS Code, Git, Firebase CLI- Firebase Firestore```bash



---- Firebase Storagefirebase deploy --only functions



## 🚀 Instalación- Firebase Hosting```



### Requisitos

- Node.js v18+

- Firebase CLI### Librerías## Contribuciones

- Cuenta de Firebase

- Leaflet.js (Mapas)

### Pasos

- Lucide Icons / FontAwesome (Iconos)Las contribuciones son bienvenidas. Si deseas contribuir, por favor abre un issue o envía un pull request.

1. **Instalar Firebase CLI**

```powershell

npm install -g firebase-tools

```---## Licencia



2. **Clonar proyecto**

```powershell

git clone https://github.com/tu-usuario/proyecto-codekids.git## 📂 Estructura del ProyectoEste proyecto está bajo la Licencia MIT.

cd proyecto-codekids

``````

Proyecto_CodeKids/

3. **Instalar dependencias**├── index.html              # Landing page pública

```powershell├── app.html                # Aplicación interna (Estudiantes y Profesores)

cd functions├── admin.html              # Panel de administración (Solo Admins)

npm install├── css/

cd ..│   └── style.css           # Estilos personalizados

```├── js/

│   ├── firebase-config.js  # Configuración de Firebase

4. **Iniciar emuladores**│   ├── auth.js             # Gestión de autenticación

```powershell│   ├── main.js             # Lógica del landing page

firebase emulators:start│   ├── app.js              # Lógica de la app interna

```│   └── admin.js            # Lógica del panel de admin

├── games/

5. **Abrir en navegador**│   └── maze-runner/        # Minijuego de ejemplo

```│       └── index.html

http://localhost:5000├── firestore.rules         # Reglas de seguridad de Firestore

```├── firestore.indexes.json  # Índices de Firestore

├── firebase.json           # Configuración de Firebase Hosting

---├── ARQUITECTURA.md         # Documentación completa de la arquitectura

└── README.md               # Este archivo

## 📂 Estructura```



```---

Proyecto_CodeKids/

├── auth/              # Login y registro## 🚀 Despliegue

├── app/               # Dashboard y módulos

├── admin/             # Panel de admin### Opción 1: Despliegue Rápido

├── css/               # Estilos

├── js/                # JavaScript```bash

├── games/             # Juegos educativosfirebase deploy --only hosting

├── functions/         # Firebase Functions```

├── index.html         # Landing page

├── firebase.json      # Config Firebase### Opción 2: Despliegue Completo (Hosting + Reglas)

└── README.md

``````bash

firebase deploy --only firestore:rules,hosting

---```



## 🔥 Firebase - Base de Datos---



### Colecciones Principales## 👤 Roles y Acceso



**users**: Perfiles de usuario### 🔴 Administrador (Admin)

**lecciones**: Contenido educativo- **URL**: `admin.html`

**grupos**: Clases y grupos- **Funciones**: Crear usuarios, gestionar escuelas, gestionar contenidos

**mensajes**: Sistema de chat

### 🟢 Profesor

---- **URL**: `app.html`

- **Funciones**: Crear grupos, publicar tareas, calificar, chatear

## 🔒 Seguridad

### 🔵 Estudiante

- ✅ Sin registro público- **URL**: `app.html`

- ✅ Autenticación obligatoria- **Funciones**: Completar lecciones, jugar minijuegos, entregar tareas, chatear con profesores

- ✅ Sistema de roles

- ✅ Chat moderado---

- ✅ Reglas de Firestore

- ✅ HTTPS en producción## 🔐 Seguridad



---### Principios Fundamentales



## 🚀 Despliegue1. **NO existe registro público** - Solo Admins crean usuarios

2. **Cambio de contraseña obligatorio** - En el primer login

### A Producción3. **Chats controlados** - Estudiantes solo con Profesores

4. **Moderación de grupos** - Profesores controlan sus grupos

```powershell5. **Firestore Rules estrictas** - Ver `firestore.rules`

firebase deploy

```---



### Solo Hosting## 📊 Estructura de Firestore



```powershell### Colecciones Principales

firebase deploy --only hosting- `/users/{userId}`: Usuarios del sistema

```- `/schools/{schoolId}`: Escuelas participantes

- `/groups/{groupId}`: Grupos/clases

---- `/courses/{courseId}`: Cursos y lecciones

- `/labGames/{gameId}`: Minijuegos

## 📊 Comandos Útiles- `/badges/{badgeId}`: Insignias/logros

- `/chats/{chatId}`: Chats 1-a-1

Ver [`COMANDOS_POWERSHELL.md`](./COMANDOS_POWERSHELL.md) para más detalles.

Ver `ARQUITECTURA.md` para documentación completa.

```powershell

# Iniciar emuladores---

firebase emulators:start

## 📝 Cómo Usar

# Desplegar

firebase deploy### Para Administradores

1. Iniciar sesión en `admin.html`

# Ver logs2. Crear usuarios (Gestión de Usuarios → Crear Usuario)

firebase functions:log3. Crear escuelas (Gestión de Escuelas → Crear Escuela)

```4. Gestionar contenidos (Cursos, lecciones, minijuegos)



---### Para Profesores

1. Iniciar sesión con credenciales del Admin

## 🎮 Gamificación2. Cambiar contraseña en primer login

3. Crear grupo y obtener código de unión

- Ver lección: +10 XP4. Gestionar grupo (publicaciones, tareas, calificaciones)

- Completar lección: +50 XP

- Jugar juego: +20 XP### Para Estudiantes

- Completar juego: +100 XP1. Iniciar sesión con credenciales del Admin

- Racha 7 días: +200 XP2. Cambiar contraseña en primer login

3. Unirse a grupo con código

---4. Completar lecciones, jugar, chatear con profesores



## 🤝 Contribuir---



1. Fork el proyecto## 🐛 Solución de Problemas

2. Crea una rama (`git checkout -b feature/NuevaFeature`)

3. Commit cambios (`git commit -m 'Add NuevaFeature'`)### Error: "Firebase is not defined"

4. Push (`git push origin feature/NuevaFeature`)- Verifica `js/firebase-config.js` con tus credenciales

5. Abre un Pull Request

### Error: "Permission denied"

---- Despliega reglas de Firestore: `firebase deploy --only firestore:rules`



## 📄 Licencia### La página no carga

- Limpia caché: Ctrl + Shift + R

MIT License - Proyecto de código abierto y sin ánimo de lucro.- Despliega de nuevo: `firebase deploy --only hosting`



------



## 🙏 Agradecimientos## 📄 Documentación



- A los profesores que inspiran- **ARQUITECTURA.md**: Documentación técnica completa

- A las escuelas que confían en CodeKids- **firestore.rules**: Reglas de seguridad comentadas

- A la comunidad open source- **js/app.js**: Comentarios sobre flujos de usuario

- A Firebase por su plataforma gratuita- **js/admin.js**: Comentarios sobre panel de admin

- **js/auth.js**: Comentarios sobre autenticación

---

---

## 📞 Contacto

## 🎉 ¡Gracias por usar CodeKids!

- **Website**: https://codekidsv1.web.app

- **GitHub**: https://github.com/tu-usuario/proyecto-codekids**🚀 ¡Feliz aprendizaje!**


---

<div align="center">

**⭐ Dale una estrella si te gusta CodeKids! ⭐**

Hecho con ❤️ para los futuros programadores del mundo

</div>
