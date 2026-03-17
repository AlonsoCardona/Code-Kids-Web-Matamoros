# Sistema de Tareas - CodeKids

## 🎯 Resumen General

Sistema completo de gestión de tareas estilo **Microsoft Teams** con sincronización bidireccional entre profesores y estudiantes, notificaciones en tiempo real, sistema de XP gamificado y contadores regresivos.

---

## 🎓 Dashboard del Profesor

### Sección "Mis Grupos"
- ✅ Crear grupos con nombre, materia, nivel, periodo y descripción
- ✅ Editar y eliminar grupos existentes
- ✅ Agregar/remover estudiantes a grupos
- ✅ Ver lista de estudiantes en cada grupo
- ✅ Búsqueda de estudiantes disponibles por nombre/email

### Sección "Tareas"
- ✅ Crear tareas asignadas a grupos específicos
- ✅ Configurar: título, descripción, instrucciones, fecha límite, puntos máximos
- ✅ Editar y eliminar tareas
- ✅ Filtros: Todas / Pendientes / Pasadas
- ✅ Ver entregas de estudiantes con detalles
- ✅ Sistema de calificación con retroalimentación
- ✅ **Notificaciones automáticas** al estudiante cuando se califica
- ✅ **Otorgamiento automático de XP** al calificar (bonus según rendimiento)

### Funciones Automáticas del Profesor
Al calificar una tarea:
1. Actualiza el documento de entrega con calificación y feedback
2. Calcula bonus de XP según porcentaje obtenido:
   - 90-100%: +30 XP bonus
   - 80-89%: +20 XP bonus
   - 70-79%: +10 XP bonus
3. Actualiza XP del estudiante en Firestore
4. Envía notificación al estudiante con detalles de calificación

---

## 👨‍🎓 Dashboard del Estudiante

### Sección "Mis Grupos"
- ✅ Ver grupos donde ha sido asignado
- ✅ Detalles de grupo: materia, nivel, periodo, profesor
- ✅ Ver compañeros del grupo con avatares
- ✅ Sincronización automática cuando el profesor lo agrega

### Sección "Tareas" (anteriormente "Laboratorio")
- ✅ Ver todas las tareas asignadas a sus grupos
- ✅ Filtros por estado: Todas / Pendientes / Entregadas / Calificadas
- ✅ **Contador regresivo** en tiempo real ("Vence en 2 días 5 horas")
- ✅ Estados visuales:
  - 🔴 **Vencida** (pasó la fecha límite sin entregar)
  - ⚪ **Pendiente** (no entregada, dentro del plazo)
  - 🟡 **Entregada** (esperando calificación)
  - 🟢 **Calificada** (revisada por el profesor)
- ✅ Detalles de tarea: descripción, instrucciones, puntos, fecha límite
- ✅ **Sistema de entrega**: Subir enlace (Google Drive, OneDrive, etc.)
- ✅ Ver calificación y comentarios del profesor
- ✅ **Ganancia de XP visible**: muestra XP base + bonus al ser calificada

### Widget "Próximas Tareas" (Sección Inicio)
- ✅ Muestra hasta 5 tareas próximas a vencer (dentro de 7 días)
- ✅ Ordenadas por fecha de vencimiento
- ✅ Colores de alerta:
  - **Rojo**: Menos de 24 horas
  - **Amarillo**: Menos de 48 horas
  - **Normal**: Más de 48 horas
- ✅ Click directo a la tarea

### Funciones Automáticas del Estudiante
Al entregar una tarea:
1. Crea documento en `/tasks/{taskId}/submissions/{studentId}`
2. **Otorga +50 XP base** inmediatamente
3. Envía notificación al profesor
4. Actualiza estado de la tarea a "Entregada"
5. Actualiza header de gamificación con nuevo XP

---

## 🎮 Sistema de XP y Gamificación

### Ganancia de XP por Tareas

| Acción | XP Otorgado | Cuándo |
|--------|-------------|--------|
| Entregar tarea a tiempo | +50 XP (base) | Al hacer submit |
| Calificación 90-100% | +30 XP (bonus) | Al ser calificada |
| Calificación 80-89% | +20 XP (bonus) | Al ser calificada |
| Calificación 70-79% | +10 XP (bonus) | Al ser calificada |

**Ejemplo**: 
- Estudiante entrega tarea → **+50 XP** inmediatamente
- Profesor califica con 95/100 → **+30 XP** adicionales
- **Total: 80 XP ganados**

### Actualización Automática
- El header de gamificación se actualiza en tiempo real
- La barra de progreso refleja el nuevo nivel
- Sistema compatible con nivel y racha existentes

---

## 📬 Sistema de Notificaciones

### Estructura de Notificaciones
```javascript
{
  type: 'task_submitted' | 'task_graded',
  title: String,
  message: String,
  taskId: String,
  grade: Number (solo en graded),
  maxPoints: Number (solo en graded),
  bonusXP: Number (solo en graded),
  createdAt: Timestamp,
  read: Boolean
}
```

### Notificaciones al Profesor
- 📤 Cuando un estudiante entrega tarea
  - Título: "📤 Nueva entrega"
  - Mensaje: "{Nombre estudiante} ha entregado la tarea '{Título}'"

### Notificaciones al Estudiante
- ✅ Cuando el profesor califica su tarea
  - Título: "✅ Tarea Calificada"
  - Mensaje: "Tu tarea '{Título}' ha sido calificada: {X}/{Y} pts (+Z XP bonus)"

### Almacenamiento
- Ruta Firestore: `/users/{userId}/notifications`
- Campo `read`: para marcar como leída (futuro)
- Reglas: Solo el propietario puede leer/escribir sus notificaciones

---

## 🗄️ Estructura de Firestore

### Colección `/groups`
```javascript
{
  teacherId: String,
  name: String,
  subject: String,
  level: String,
  period: String,
  description: String,
  studentIds: Array<String>,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Colección `/tasks`
```javascript
{
  teacherId: String,
  groupId: String,
  title: String,
  description: String,
  instructions: String,
  dueDate: Timestamp,
  maxPoints: Number,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Subcolección `/tasks/{taskId}/submissions/{studentId}`
```javascript
{
  status: 'submitted' | 'graded',
  submittedAt: Timestamp,
  attachmentUrl: String,
  grade: Number (opcional),
  feedback: String (opcional),
  gradedAt: Timestamp (opcional)
}
```

### Subcolección `/users/{userId}/notifications/{notifId}`
```javascript
{
  type: String,
  title: String,
  message: String,
  taskId: String,
  createdAt: Timestamp,
  read: Boolean,
  // Campos adicionales según tipo
}
```

---

## 🔐 Reglas de Seguridad Firestore

### Grupos
- **Leer**: Todos los usuarios autenticados
- **Crear**: Usuario autenticado (con teacherId = uid)
- **Actualizar/Eliminar**: Solo el profesor propietario

### Tareas
- **Leer**: Todos los usuarios autenticados
- **Crear**: Usuario autenticado (con teacherId = uid)
- **Actualizar/Eliminar**: Solo el profesor propietario

### Entregas (Submissions)
- **Leer**: Todos los usuarios autenticados
- **Crear/Actualizar**: Estudiante propietario O profesor de la tarea
- **Eliminar**: Solo el profesor de la tarea

### Notificaciones
- **Leer/Escribir**: Solo el usuario propietario

---

## 🎨 Funcionalidades UX/UI

### Contador Regresivo
- Actualización cada minuto
- Formatos:
  - `⏳ Vence en Xd Yh` (más de 1 día)
  - `⏳ Vence en Xh Ym` (menos de 1 día)
  - `⚠️ Vence en Xm` (menos de 1 hora)
  - `⏰ Tiempo vencido` (pasó la fecha)

### Badges de Estado
- 🔴 **Vencida** (bg-red-100, text-red-700)
- ⚪ **Pendiente** (bg-gray-100, text-gray-700)
- 🟡 **Entregada** (bg-yellow-100, text-yellow-700)
- 🟢 **Calificada** (bg-green-100, text-green-700)

### Indicadores de Urgencia
- Borde izquierdo rojo: Tareas con menos de 24h
- Borde izquierdo amarillo: Tareas con menos de 48h
- Texto rojo: Tiempo de vencimiento urgente

---

## 🚀 Flujo Completo de Trabajo

### Escenario: Profesor asigna tarea a grupo

1. **Profesor crea grupo**
   - Llena formulario: nombre, materia, nivel, periodo
   - Agrega estudiantes buscando por nombre/email
   - Grupo visible para estudiantes asignados

2. **Profesor crea tarea**
   - Selecciona grupo destino
   - Define título, descripción, instrucciones
   - Establece fecha límite y puntos máximos
   - Tarea visible para todos los estudiantes del grupo

3. **Estudiante ve tarea**
   - Aparece en sección "Tareas" con estado 🔴 Pendiente
   - Aparece en widget "Próximas Tareas" si vence en ≤7 días
   - Contador regresivo muestra tiempo restante
   - Puede ver todos los detalles e instrucciones

4. **Estudiante entrega tarea**
   - Abre modal de entrega
   - Pega enlace de Google Drive/OneDrive
   - Submit → **Gana +50 XP inmediatamente**
   - Estado cambia a 🟡 Entregada
   - Profesor recibe notificación 📤

5. **Profesor califica**
   - Ve entrega en lista de submissions
   - Abre modal de calificación
   - Asigna puntos y feedback
   - Submit → Calcula bonus XP automáticamente
   - Estudiante recibe notificación ✅

6. **Estudiante ve calificación**
   - Abre tarea calificada
   - Ve calificación, feedback del profesor
   - Ve XP ganado (base + bonus)
   - Estado: 🟢 Calificada
   - Header de gamificación actualizado

---

## 📊 Métricas y Analytics (Futuro)

### Para el Profesor
- Total de tareas creadas
- Promedio de calificaciones por grupo
- Tasa de entregas a tiempo vs tardías
- Estudiantes más activos

### Para el Estudiante
- Total de tareas completadas
- Promedio de calificaciones
- XP acumulado por tareas
- Racha de entregas continuas

---

## 🐛 Debugging y Logs

### Console Logs Implementados
```javascript
// Estudiante - Carga de tareas
'📝 Inicializando vista de tareas para estudiante'
'🔍 Cargando tareas del estudiante: {uid}'
'📊 Grupos del estudiante: [groupIds]'
'📊 Tareas encontradas: {count}'
'✅ Tareas del estudiante renderizadas'

// Estudiante - Entrega
'Entregando tarea...'
'📬 Notificación enviada a: {teacherId}'

// Profesor - Calificación
'Calificando tarea...'
'XP otorgado: {bonusXP}'
```

---

## ✅ Checklist de Implementación

### Dashboard Profesor
- [x] CRUD de grupos
- [x] Sistema de agregar/remover estudiantes
- [x] CRUD de tareas
- [x] Visualización de entregas
- [x] Sistema de calificación
- [x] Otorgamiento automático de XP al calificar
- [x] Envío de notificaciones al calificar

### Dashboard Estudiante
- [x] Vista de grupos asignados
- [x] Vista de tareas con filtros
- [x] Contador regresivo en tiempo real
- [x] Sistema de entrega con enlaces
- [x] Visualización de calificaciones y feedback
- [x] Ganancia de XP al entregar
- [x] Envío de notificación al entregar
- [x] Widget de tareas próximas en inicio
- [x] Actualización automática de header de gamificación

### Backend y Reglas
- [x] Estructura de colecciones en Firestore
- [x] Reglas de seguridad para grupos/tareas/submissions
- [x] Reglas de seguridad para notificaciones
- [x] Despliegue en Firebase Hosting

### Pendiente (Futuras Mejoras)
- [ ] Sistema de notificaciones push (requiere Service Worker)
- [ ] Notificación 24h antes del vencimiento (requiere Cloud Functions)
- [ ] Centro de notificaciones con UI modal
- [ ] Marcar notificaciones como leídas
- [ ] Adjuntar archivos directos (no solo enlaces)
- [ ] Comentarios en tareas
- [ ] Estadísticas avanzadas para profesores

---

## 🌐 URLs de Despliegue

- **Hosting**: https://codekids-dev.web.app
- **Console**: https://console.firebase.google.com/project/codekids-dev/overview
- **Proyecto**: codekids-dev (Spark Plan)

---

## 📝 Notas Técnicas

### Limitaciones del Spark Plan
- No hay Cloud Functions → Notificaciones 24h automáticas no disponibles
- Composite indexes no configurados → Queries sin `orderBy` en cliente
- Límites de lectura/escritura → Optimizar queries

### Optimizaciones Implementadas
- Client-side sorting para evitar composite indexes
- Queries con `array-contains` en lugar de joins
- Lazy loading de entregas (solo al abrir detalle)
- Cache de datos del estudiante en tarjetas

### Compatibilidad
- Firebase SDK v10.7.1
- Vanilla JavaScript (ES6+)
- Tailwind CSS para UI
- Compatible con Chrome, Firefox, Edge, Safari

---

**Última actualización**: 2025-01-XX  
**Versión**: 1.0.0  
**Estado**: ✅ Implementación completa y desplegada
