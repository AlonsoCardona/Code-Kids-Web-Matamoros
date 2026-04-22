/**
 * Script para inicializar datos de prueba para Dashboard Profesor
 * Ejecutar: node scripts/init-profesor-data.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../service-account-dev.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function initProfesorData() {
  console.log('🚀 Inicializando datos para Dashboard Profesor...');

  try {
    // 1. Crear algunas lecciones de ejemplo
    console.log('\n📚 Creando lecciones...');
    const lecciones = [
      {
        titulo: 'Introducción a la Programación',
        descripcion: 'Aprende los conceptos básicos de programación',
        orden: 1,
        duracion: 30,
        nivel: 'Principiante',
        imagen: 'https://via.placeholder.com/300x200?text=Lección+1',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        titulo: 'Variables y Tipos de Datos',
        descripcion: 'Entiende cómo funcionan las variables',
        orden: 2,
        duracion: 45,
        nivel: 'Principiante',
        imagen: 'https://via.placeholder.com/300x200?text=Lección+2',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        titulo: 'Condicionales y Bucles',
        descripcion: 'Controla el flujo de tu programa',
        orden: 3,
        duracion: 60,
        nivel: 'Intermedio',
        imagen: 'https://via.placeholder.com/300x200?text=Lección+3',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    for (const leccion of lecciones) {
      await db.collection('lecciones').add(leccion);
      console.log(`✅ Lección creada: ${leccion.titulo}`);
    }

    // 2. Crear anuncios de ejemplo
    console.log('\n📢 Creando anuncios...');
    const anuncios = [
      {
        title: 'Bienvenido al Dashboard de Profesor',
        content: 'Aquí podrás gestionar tus grupos, tareas y calificaciones de forma sencilla.',
        authorName: 'Sistema',
        authorRole: 'Admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        priority: 'high'
      },
      {
        title: 'Nueva función: Chat con estudiantes',
        content: 'Ahora puedes comunicarte directamente con tus estudiantes a través del chat integrado.',
        authorName: 'Sistema',
        authorRole: 'Admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        priority: 'medium'
      }
    ];

    for (const anuncio of anuncios) {
      await db.collection('announcements').add(anuncio);
      console.log(`✅ Anuncio creado: ${anuncio.title}`);
    }

    // 3. Crear insignias de ejemplo
    console.log('\n🏆 Creando insignias...');
    const badges = [
      {
        name: 'Primer Paso',
        description: 'Completaste tu primera lección',
        icon: '🎯',
        requirement: 'Completar 1 lección',
        xpReward: 50,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        name: 'Estudiante Dedicado',
        description: 'Mantén una racha de 7 días',
        icon: '🔥',
        requirement: 'Racha de 7 días',
        xpReward: 100,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        name: 'Maestro del Código',
        description: 'Completa 10 lecciones',
        icon: '👨‍💻',
        requirement: 'Completar 10 lecciones',
        xpReward: 200,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    for (const badge of badges) {
      await db.collection('badges').add(badge);
      console.log(`✅ Insignia creada: ${badge.name}`);
    }

    console.log('\n✅ Datos inicializados correctamente');
    console.log('\n📝 Notas:');
    console.log('- Para crear grupos, usa la interfaz del dashboard');
    console.log('- Para crear tareas, necesitas tener grupos primero');
    console.log('- Los estudiantes se deben crear desde el panel de administrador');

  } catch (error) {
    console.error('❌ Error inicializando datos:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar
initProfesorData();
