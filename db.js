// ========================================================
// EDUPLAN - MOTOR DE PERSISTENCIA INDEXEDDB ROBUSTO (DB.JS)
// Proporciona soporte offline completo, alta capacidad y
// sincronización automática bidireccional con LocalStorage y Google Drive.
// ========================================================

const EduDB = {
  DB_NAME: 'EduPlan_LocalDB',
  DB_VERSION: 1,
  STORE_NAME: 'app_state',
  _dbPromise: null,

  // Inicializar o abrir la base de datos IndexedDB
  getDB() {
    if (!this._dbPromise) {
      this._dbPromise = new Promise((resolve, reject) => {
        if (!window.indexedDB) {
          console.warn('[EduDB] IndexedDB no soportado en este entorno. Usando LocalStorage como fallback.');
          resolve(null);
          return;
        }

        const request = window.indexedDB.open(this.DB_NAME, this.DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.STORE_NAME)) {
            // Creamos el almacén de pares clave/valor para el estado completo de la app
            db.createObjectStore(this.STORE_NAME, { keyPath: 'key' });
            console.log('[EduDB] Almacén IndexedDB creado con éxito.');
          }
        };

        request.onsuccess = (event) => {
          resolve(event.target.result);
        };

        request.onerror = (event) => {
          console.error('[EduDB] Error abriendo IndexedDB:', event.target.error);
          resolve(null); // Fallback suave
        };
      });
    }
    return this._dbPromise;
  },

  // Obtener un elemento de IndexedDB
  async getItem(key) {
    const db = await this.getDB();
    if (!db) {
      return localStorage.getItem(key);
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          if (req.result && req.result.value !== undefined) {
            resolve(req.result.value);
          } else {
            // Fallback a localStorage por retrocompatibilidad
            resolve(localStorage.getItem(key));
          }
        };

        req.onerror = () => {
          resolve(localStorage.getItem(key));
        };
      } catch (err) {
        console.warn('[EduDB] Excepción leyendo de IndexedDB:', err);
        resolve(localStorage.getItem(key));
      }
    });
  },

  // Guardar un elemento en IndexedDB (y espejo en localStorage para acceso síncrono instantáneo)
  async setItem(key, value) {
    // 1. Guardar siempre en localStorage como capa de acceso síncrono ultra-rápido
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (e) {
      console.warn('[EduDB] LocalStorage límite alcanzado o bloqueado:', e);
    }

    // 2. Persistir en IndexedDB con almacenamiento de alta capacidad
    const db = await this.getDB();
    if (!db) return;

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const stringVal = typeof value === 'string' ? value : JSON.stringify(value);
        const req = store.put({ key, value: stringVal, updatedAt: new Date().toISOString() });

        req.onsuccess = () => resolve(true);
        req.onerror = (e) => {
          console.error('[EduDB] Error guardando en IndexedDB:', e);
          resolve(false);
        };
      } catch (err) {
        console.warn('[EduDB] Excepción guardando en IndexedDB:', err);
        resolve(false);
      }
    });
  },

  // Eliminar un elemento
  async removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}

    const db = await this.getDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (err) {
        resolve(false);
      }
    });
  },

  // Obtener todo el snapshot de datos de la aplicación
  async getFullSnapshot() {
    const keys = [
      'educap_classrooms_v1',
      'educap_students_v1',
      'educap_attendance_v1',
      'educap_incidents_v1',
      'educap_grade_items_v1',
      'educap_grades_v1',
      'educap_teacher_v1'
    ];

    const snapshot = {};
    for (const k of keys) {
      const val = await this.getItem(k);
      try {
        snapshot[k] = val ? JSON.parse(val) : null;
      } catch (e) {
        snapshot[k] = val;
      }
    }
    return snapshot;
  },

  // Sincronizar / migrar automáticamente datos existentes de localStorage hacia IndexedDB
  async migrateFromLocalStorage() {
    const db = await this.getDB();
    if (!db) return;

    const relevantKeys = [
      'educap_classrooms_v1',
      'educap_students_v1',
      'educap_attendance_v1',
      'educap_incidents_v1',
      'educap_grade_items_v1',
      'educap_grades_v1',
      'educap_teacher_v1',
      'educap_theme_v1',
      'educap_auth_mode_v1'
    ];

    for (const key of relevantKeys) {
      const val = localStorage.getItem(key);
      if (val !== null) {
        await this.setItem(key, val);
      }
    }
    console.log('✅ [EduDB] Migración y sincronización con IndexedDB completada.');
  }
};

window.EduDB = EduDB;
