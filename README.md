# EduPlan - Cuaderno Digital de Gestión de Clases y Asistencia

Inspirado en los flujos esenciales de aplicaciones docentes (como Additio / iDoceo), **EduPlan** es una solución integral diseñada para profesores:

1. **Gestión de Grupos y Aulas**: Creación de clases, asignación de cursos escolares y niveles académicos.
2. **Fichas de Estudiantes e Incidencias**: Matrícula de alumnos, datos de contacto de familiares/tutores y registro de incidencias (positivas, negativas o notas de observación).
3. **Control Rápido de Asistencia**: Interfaz optimizada para pasar lista en 1 clic (Presente, Retraso, Falta justificada/injustificada) con estadísticas diarias en tiempo real.

---

## 📂 Estructura del Proyecto

El código está organizado en:
- `index.html`, `style.css`, `app.js`: **Aplicación Interactiva Inmediata** (Offline-First en `localStorage`), lista para abrirse en cualquier navegador, tablet o emulador WebView.
- `src/models.ts` & `src/storage.ts`: Modelos de datos TypeScript y contratos de almacenamiento.
- `flutter/lib/main.dart` & `flutter/pubspec.yaml`: Implementación **Flutter / Dart** para compilar la aplicación en Android (`APK/AAB`), iOS y Desktop cuando tengas Flutter SDK instalado.

---

## 🚀 Cómo Ejecutar la Aplicación

### Opción 1: Probar de Inmediato en el Navegador (Sin dependencias)
Simplemente abre el archivo [`index.html`](file:///c:/Users/Alexis645/.gemini/antigravity-ide/scratch/educap/index.html) en tu navegador web (Google Chrome, Edge, Safari, Firefox). 

### Opción 2: Compilar en Flutter (Android / Multiplataforma)
1. Instala el [Flutter SDK](https://flutter.dev/docs/get-started/install/windows).
2. Abre la carpeta `educap/flutter` en Android Studio o VS Code.
3. Ejecuta en tu terminal:
   ```bash
   cd c:/Users/Alexis645/.gemini/antigravity-ide/scratch/educap/flutter
   flutter pub get
   flutter run
   ```
