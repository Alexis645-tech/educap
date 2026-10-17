// ========================================================
// EDUPLAN - INTEGRACIÓN GOOGLE SIGN-IN & DRIVE API (GOOGLE-DRIVE.JS)
// ========================================================

// CREDENCIAL DE LA APLICACIÓN (Configurada por el administrador/creador de la plataforma)
// El docente final no necesita ingresar ningún Client ID ni dato técnico.
const APP_GOOGLE_CONFIG = {
  CLIENT_ID: '880247691892-igr0ffckn9tbuq1nvaqnn3d6um1951u4.apps.googleusercontent.com',
  API_KEY: ''
};

const GOOGLE_AUTH_STORAGE_KEY = 'educap_google_auth_v1';
const DRIVE_FILE_NAME = 'educap_backup_data.json';
const DRIVE_BACKUP_FOLDER = 'EduPlan_Docente';
const GoogleDriveService = {
  config: {
    clientId: APP_GOOGLE_CONFIG.CLIENT_ID || '',
    apiKey: APP_GOOGLE_CONFIG.API_KEY || '',
    // SCOPES RECOMENDADOS (Non-sensitive / Permisos no sensibles):
    // - drive.file: Acceso ÚNICAMENTE a los archivos creados por EduPlan en el Drive del docente.
    // - userinfo.profile y userinfo.email: Para mostrar el nombre/avatar del docente conectado.
    // NO se utiliza https://www.googleapis.com/auth/drive (que requeriría auditoría de seguridad CASA/Tier 2).
    scopes: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email'
  },

  tokenClient: null,
  accessToken: null,
  tokenExpiresAt: null, // Timestamp estimado de expiración del token
  currentUser: null,
  gapiInited: false,
  gisInited: false,
  lastSyncTime: null,
  lastKnownRemoteModified: null, // ISO string de la última versión conocida en Drive
  syncStatus: 'idle', // 'idle' | 'syncing' | 'synced' | 'error' | 'expired' | 'offline' | 'conflict'
  isReauthorizing: false,
  pendingActionQueue: [], // Acciones pendientes esperando renovación de token sin perder datos
  autoSyncTimer: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  hasPendingOfflineChanges: false,
  pendingConflictPayload: null, // Si surge un conflicto, guarda el archivo remoto para que el docente elija

  init() {
    this.loadSavedAuth();
    this.createSessionNotificationUI();
    this.setupNetworkListeners();
    this.checkPendingOfflineSync();
  },

  // Escuchar eventos de desconexión y reconexión a Internet
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('📡 Conexión a Internet restablecida (online).');
      this.isOnline = true;
      this.hideOfflineToast();
      this.showOnlineToast();
      // Si el docente hizo cambios mientras estaba offline, sincronizar de inmediato
      if (this.hasPendingOfflineChanges || this.getPendingOfflineFlag()) {
        console.log('🔄 Sincronizando cambios acumulados en modo offline con Google Drive...');
        this.scheduleAutoSync(500);
      } else if (this.currentUser) {
        this.setSyncStatus('synced', 'Conexión restablecida');
      }
    });

    window.addEventListener('offline', () => {
      console.warn('⚠️ Se perdió la conexión a Internet (offline).');
      this.isOnline = false;
      this.setSyncStatus('offline', 'Sin conexión (guardando localmente)');
      this.showOfflineToast();
    });
  },

  getPendingOfflineFlag() {
    return localStorage.getItem('educap_pending_drive_sync') === 'true';
  },

  setPendingOfflineFlag(pending) {
    this.hasPendingOfflineChanges = pending;
    if (pending) {
      localStorage.setItem('educap_pending_drive_sync', 'true');
    } else {
      localStorage.removeItem('educap_pending_drive_sync');
    }
  },

  checkPendingOfflineSync() {
    if (this.getPendingOfflineFlag() && navigator.onLine && this.currentUser) {
      this.scheduleAutoSync(1000);
    }
  },

  hasCredentials() {
    return Boolean(this.config.clientId && this.config.clientId.length > 5);
  },

  loadSavedAuth() {
    try {
      const saved = localStorage.getItem(GOOGLE_AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.currentUser = parsed.user || null;
        this.lastSyncTime = parsed.lastSyncTime || null;
        this.lastKnownRemoteModified = parsed.lastKnownRemoteModified || null;
        if (parsed.tokenExpiresAt) {
          this.tokenExpiresAt = parsed.tokenExpiresAt;
        }
      }
    } catch (e) {
      console.error('Error cargando auth guardada:', e);
    }
  },

  saveAuth(user) {
    this.currentUser = user;
    localStorage.setItem(GOOGLE_AUTH_STORAGE_KEY, JSON.stringify({
      user: this.currentUser,
      lastSyncTime: this.lastSyncTime,
      tokenExpiresAt: this.tokenExpiresAt,
      lastKnownRemoteModified: this.lastKnownRemoteModified
    }));
  },

  clearAuth() {
    this.accessToken = null;
    this.tokenExpiresAt = null;
    this.currentUser = null;
    localStorage.removeItem(GOOGLE_AUTH_STORAGE_KEY);
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      if (this.accessToken) {
        google.accounts.oauth2.revoke(this.accessToken, () => {});
      }
    }
  },

  // Inicializar Google Identity Services (GIS)
  initGisClient() {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) return;
    if (!this.config.clientId) return;

    try {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: this.config.clientId,
        scope: this.config.scopes,
        callback: async (resp) => {
          if (resp.error) {
            console.error('Error en autenticación Google:', resp);
            // Si el error fue por un prompt silent/none, abrimos el modal amigable sin perder cambios
            if (resp.error === 'interaction_required' || resp.error === 'consent_required') {
              this.showSessionExpiredModal();
            } else {
              this.setSyncStatus('error', 'Error de conexión con Google: ' + resp.error);
            }
            this.isReauthorizing = false;
            return;
          }

          this.accessToken = resp.access_token;
          // Los tokens duran usualmente 3600s (1h). Guardamos timestamp con margen de 5 min
          const expiresInSec = parseInt(resp.expires_in, 10) || 3600;
          this.tokenExpiresAt = Date.now() + ((expiresInSec - 300) * 1000);

          this.hideSessionExpiredModal();
          this.isReauthorizing = false;

          if (!this.currentUser) {
            await this.fetchUserProfile();
          } else {
            this.saveAuth(this.currentUser);
          }

          this.setSyncStatus('synced', 'Conectado con Google Drive');

          // Ejecutar cualquier acción que estaba en cola esperando el token
          this.processPendingActionQueue();

          // Sincronizar cambios pendientes acumulados
          await this.syncToDrive();

          if (window.UIController) {
            if (window.UIController.renderGoogleAuthStatus) {
              window.UIController.renderGoogleAuthStatus();
            }
            if (window.UIController.showApp) {
              window.UIController.showApp();
            }
          }
        }
      });
      this.gisInited = true;
    } catch (err) {
      console.error('Error inicializando GIS tokenClient:', err);
    }
  },

  // Verifica si el token sigue vigente
  isTokenValid() {
    if (!this.accessToken) return false;
    if (this.tokenExpiresAt && Date.now() >= this.tokenExpiresAt) {
      return false;
    }
    return true;
  },

  // Solicitar renovación de token (intenta silencioso primero)
  requestTokenRefresh(interactive = false) {
    if (!this.tokenClient) {
      this.initGisClient();
    }
    if (!this.tokenClient) {
      this.showSessionExpiredModal();
      return;
    }

    this.isReauthorizing = true;
    try {
      if (interactive) {
        // Interactivo: abre el popup de Google si el silencioso no bastó
        this.tokenClient.requestAccessToken({ prompt: '' });
      } else {
        // Silencioso de fondo (sin prompt intrusivo si la sesión de Google sigue abierta en el navegador)
        this.tokenClient.requestAccessToken({ prompt: 'none' });
      }
    } catch (e) {
      console.warn('Fallo intento silencioso de renovación, mostrando aviso interactivo:', e);
      this.showSessionExpiredModal();
    }
  },

  // Interceptor para llamadas fetch a APIs de Google con manejo automático de 401 Unauthorized
  async authenticatedFetch(url, options = {}) {
    // Si no tenemos token o está vencido y tenemos usuario conectado, intentar renovar
    if (!this.isTokenValid() && this.currentUser) {
      console.warn('El token de Google ha expirado o no está presente. Solicitando renovación...');
      return new Promise((resolve, reject) => {
        this.pendingActionQueue.push(async () => {
          try {
            const retryRes = await this.authenticatedFetch(url, options);
            resolve(retryRes);
          } catch (err) {
            reject(err);
          }
        });
        this.requestTokenRefresh(false);
      });
    }

    if (!options.headers) {
      options.headers = {};
    }
    options.headers['Authorization'] = `Bearer ${this.accessToken}`;

    try {
      const response = await fetch(url, options);

      // Si Google responde 401 Unauthorized o 403 con token expirado
      if (response.status === 401) {
        console.warn('API de Google retornó 401 Unauthorized (Token caducado). Encolando petición y renovando...');
        this.accessToken = null;
        this.tokenExpiresAt = null;

        return new Promise((resolve, reject) => {
          this.pendingActionQueue.push(async () => {
            try {
              // Reintentar con el nuevo token inyectado
              options.headers['Authorization'] = `Bearer ${this.accessToken}`;
              const retryResponse = await fetch(url, options);
              resolve(retryResponse);
            } catch (err) {
              reject(err);
            }
          });
          // Notificar y renovar de inmediato
          this.setSyncStatus('expired', 'Sesión de Drive caducada');
          this.requestTokenRefresh(false);
        });
      }

      return response;
    } catch (networkError) {
      console.error('Error de red al conectar con Google Drive:', networkError);
      throw networkError;
    }
  },

  // Procesa y vacía la cola de peticiones pendientes tras re-autorizar
  async processPendingActionQueue() {
    if (!this.pendingActionQueue.length) return;
    console.log(`Procesando ${this.pendingActionQueue.length} acciones pendientes tras renovar token...`);
    const queue = [...this.pendingActionQueue];
    this.pendingActionQueue = [];
    for (const action of queue) {
      try {
        await action();
      } catch (e) {
        console.error('Error procesando acción pendiente:', e);
      }
    }
  },

  // Inicializar GAPI para llamadas Drive v3
  async initGapi() {
    return new Promise((resolve) => {
      if (!window.gapi) {
        resolve(false);
        return;
      }
      gapi.load('client', async () => {
        try {
          if (this.config.apiKey) {
            await gapi.client.init({
              apiKey: this.config.apiKey,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
            });
          }
          this.gapiInited = true;
          resolve(true);
        } catch (e) {
          console.warn('gapi.client.init advertencia (se usará REST fetch directo como fallback):', e);
          resolve(true);
        }
      });
    });
  },

  // Iniciar flujo de Login
  signIn() {
    if (!this.hasCredentials()) {
      alert('El servicio de inicio de sesión de Google está pendiente de activación por el administrador de EduPlan (falta CLIENT_ID en el archivo de configuración). Mientras tanto, puedes usar el Modo Offline.');
      return;
    }

    if (!this.tokenClient) {
      this.initGisClient();
    }

    if (this.tokenClient) {
      // Solicita consentimiento y token de acceso
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      alert('El servicio de autenticación de Google se está cargando. Intenta de nuevo en unos segundos.');
    }
  },

  signOut() {
    this.clearAuth();
    this.setSyncStatus('idle', 'Sesión cerrada');
    if (window.UIController && window.UIController.renderGoogleAuthStatus) {
      window.UIController.renderGoogleAuthStatus();
    }
  },

  // Obtener perfil del usuario autenticado
  // Obtener perfil del usuario autenticado
  async fetchUserProfile() {
    if (!this.accessToken) return null;
    try {
      const res = await this.authenticatedFetch('https://www.googleapis.com/oauth2/v3/userinfo');
      if (res && res.ok) {
        const profile = await res.json();
        this.currentUser = {
          name: profile.name || 'Docente Google',
          email: profile.email || '',
          picture: profile.picture || ''
        };
        this.saveAuth(this.currentUser);
        return this.currentUser;
      }
    } catch (e) {
      console.error('Error obteniendo perfil de Google:', e);
    }
    return null;
  },

  // Storage keys de EduPlan
  getKeys() {
    return window.STORAGE_KEYS || {
      CLASSROOMS: 'educap_classrooms_v1',
      STUDENTS: 'educap_students_v1',
      ATTENDANCE: 'educap_attendance_v1',
      INCIDENTS: 'educap_incidents_v1',
      GRADE_ITEMS: 'educap_grade_items_v1',
      GRADES: 'educap_grades_v1',
      TEACHER: 'educap_teacher_v1',
      LOCAL_MODIFIED: 'educap_local_modified_time'
    };
  },

  // Registro de fecha de modificación local
  getLocalModifiedTime() {
    return localStorage.getItem('educap_local_modified_time') || null;
  },

  recordLocalModifiedTime() {
    const iso = new Date().toISOString();
    localStorage.setItem('educap_local_modified_time', iso);
    return iso;
  },

  formatDateTime(isoString) {
    if (!isoString) return 'Sin registro';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'Fecha no válida';
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return 'Sin registro';
    }
  },

  // Serializar todos los datos de la app para backup
  getExportPayload() {
    const keys = this.getKeys();
    return {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      appName: 'EduPlan Cuaderno Digital',
      user: this.currentUser || null,
      data: {
        classrooms: JSON.parse(localStorage.getItem(keys.CLASSROOMS) || '[]'),
        students: JSON.parse(localStorage.getItem(keys.STUDENTS) || '[]'),
        attendance: JSON.parse(localStorage.getItem(keys.ATTENDANCE) || '[]'),
        incidents: JSON.parse(localStorage.getItem(keys.INCIDENTS) || '[]'),
        gradeItems: JSON.parse(localStorage.getItem(keys.GRADE_ITEMS) || '[]'),
        grades: JSON.parse(localStorage.getItem(keys.GRADES) || '[]'),
        teacher: JSON.parse(localStorage.getItem(keys.TEACHER) || '{}')
      }
    };
  },

  // Restaurar datos descargados desde Drive a localStorage e IndexedDB
  applyImportPayload(payload) {
    if (!payload || !payload.data) {
      throw new Error('Formato de datos no válido.');
    }
    const d = payload.data;
    const keys = this.getKeys();

    if (Array.isArray(d.classrooms)) {
      localStorage.setItem(keys.CLASSROOMS, JSON.stringify(d.classrooms));
      if (window.EduDB && window.EduDB.setItem) window.EduDB.setItem(keys.CLASSROOMS, d.classrooms);
    }
    if (Array.isArray(d.students)) {
      localStorage.setItem(keys.STUDENTS, JSON.stringify(d.students));
      if (window.EduDB && window.EduDB.setItem) window.EduDB.setItem(keys.STUDENTS, d.students);
    }
    if (Array.isArray(d.attendance)) {
      localStorage.setItem(keys.ATTENDANCE, JSON.stringify(d.attendance));
      if (window.EduDB && window.EduDB.setItem) window.EduDB.setItem(keys.ATTENDANCE, d.attendance);
    }
    if (Array.isArray(d.incidents)) {
      localStorage.setItem(keys.INCIDENTS, JSON.stringify(d.incidents));
      if (window.EduDB && window.EduDB.setItem) window.EduDB.setItem(keys.INCIDENTS, d.incidents);
    }
    if (Array.isArray(d.gradeItems)) {
      localStorage.setItem(keys.GRADE_ITEMS, JSON.stringify(d.gradeItems));
      if (window.EduDB && window.EduDB.setItem) window.EduDB.setItem(keys.GRADE_ITEMS, d.gradeItems);
    }
    if (Array.isArray(d.grades)) {
      localStorage.setItem(keys.GRADES, JSON.stringify(d.grades));
      if (window.EduDB && window.EduDB.setItem) window.EduDB.setItem(keys.GRADES, d.grades);
    }
    if (d.teacher && typeof d.teacher === 'object') {
      localStorage.setItem(keys.TEACHER, JSON.stringify(d.teacher));
      if (window.EduDB && window.EduDB.setItem) window.EduDB.setItem(keys.TEACHER, d.teacher);
    }
    
    // Notificar actualización inmediata de las vistas activas
    if (window.UIController) {
      if (typeof window.UIController.renderTeacherProfile === 'function') window.UIController.renderTeacherProfile();
      if (typeof window.UIController.renderCurrentView === 'function') window.UIController.renderCurrentView();
      if (typeof window.UIController.renderStudents === 'function') window.UIController.renderStudents();
    }
  },

  // Descargar contenido en memoria de un archivo de Drive
  async downloadFileContent(fileId) {
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await this.authenticatedFetch(downloadUrl);
    if (!res || !res.ok) {
      throw new Error('Error al descargar archivo de Google Drive: ' + (res ? res.statusText : 'Sin conexión'));
    }
    return await res.json();
  },

  // Buscar archivo existente en Google Drive
  async findBackupFile() {
    const query = `name = '${DRIVE_FILE_NAME}' and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name, modifiedTime, size)&spaces=drive`;
    
    const res = await this.authenticatedFetch(url);
    if (!res || !res.ok) {
      throw new Error('Error al consultar Google Drive: ' + (res ? res.statusText : 'Sin conexión'));
    }
    const data = await res.json();
    return (data.files && data.files.length > 0) ? data.files[0] : null;
  },

  // ALGORITMO DE FUSIÓN INTELIGENTE (MERGING)
  // Combina localPayload y remotePayload sin pérdida de información
  mergePayloads(localPayload, remotePayload) {
    const local = (localPayload && localPayload.data) || {};
    const remote = (remotePayload && remotePayload.data) || {};

    // 1. AULAS (Classrooms) - Fusión por ID
    const classroomsMap = new Map();
    (remote.classrooms || []).forEach(c => {
      if (c && c.id) classroomsMap.set(c.id, { ...c });
    });
    (local.classrooms || []).forEach(c => {
      if (c && c.id) {
        if (classroomsMap.has(c.id)) {
          classroomsMap.set(c.id, { ...classroomsMap.get(c.id), ...c });
        } else {
          classroomsMap.set(c.id, { ...c });
        }
      }
    });
    const mergedClassrooms = Array.from(classroomsMap.values());

    // 2. ESTUDIANTES (Students) - Fusión por ID y unión de classroomIds
    const studentsMap = new Map();
    (remote.students || []).forEach(s => {
      if (s && s.id) {
        const groups = Array.isArray(s.classroomIds) ? s.classroomIds : (s.classroomId ? [s.classroomId] : []);
        studentsMap.set(s.id, { ...s, classroomIds: groups, classroomId: groups[0] || '' });
      }
    });
    (local.students || []).forEach(s => {
      if (s && s.id) {
        const localGroups = Array.isArray(s.classroomIds) ? s.classroomIds : (s.classroomId ? [s.classroomId] : []);
        if (studentsMap.has(s.id)) {
          const existing = studentsMap.get(s.id);
          const combinedGroups = Array.from(new Set([...(existing.classroomIds || []), ...localGroups]));
          studentsMap.set(s.id, {
            ...existing,
            ...s,
            classroomIds: combinedGroups,
            classroomId: combinedGroups[0] || s.classroomId || existing.classroomId || ''
          });
        } else {
          studentsMap.set(s.id, { ...s, classroomIds: localGroups, classroomId: localGroups[0] || '' });
        }
      }
    });
    const mergedStudents = Array.from(studentsMap.values());

    // 3. ACTIVIDADES DE EVALUACIÓN (Grade Items) - Fusión por ID
    const gradeItemsMap = new Map();
    (remote.gradeItems || []).forEach(gi => {
      if (gi && gi.id) gradeItemsMap.set(gi.id, { ...gi });
    });
    (local.gradeItems || []).forEach(gi => {
      if (gi && gi.id) {
        if (gradeItemsMap.has(gi.id)) {
          gradeItemsMap.set(gi.id, { ...gradeItemsMap.get(gi.id), ...gi });
        } else {
          gradeItemsMap.set(gi.id, { ...gi });
        }
      }
    });
    const mergedGradeItems = Array.from(gradeItemsMap.values());

    // 4. CALIFICACIONES (Grades) - Clave única: studentId_gradeItemId (o id)
    const gradesMap = new Map();
    const getGradeKey = (g) => g.id || `${g.studentId}_${g.gradeItemId}`;
    (remote.grades || []).forEach(g => {
      if (g) gradesMap.set(getGradeKey(g), { ...g });
    });
    (local.grades || []).forEach(g => {
      if (g) {
        const key = getGradeKey(g);
        if (gradesMap.has(key)) {
          const remoteG = gradesMap.get(key);
          const hasLocalScore = g.score !== null && g.score !== undefined && !isNaN(g.score);
          const hasRemoteScore = remoteG.score !== null && remoteG.score !== undefined && !isNaN(remoteG.score);
          if (hasLocalScore || !hasRemoteScore) {
            gradesMap.set(key, { ...remoteG, ...g });
          }
        } else {
          gradesMap.set(key, { ...g });
        }
      }
    });
    const mergedGrades = Array.from(gradesMap.values());

    // 5. ASISTENCIA (Attendance) - Clave: studentId_date_classroomId
    const attendanceMap = new Map();
    const getAttKey = (a) => `${a.studentId}_${a.date}_${a.classroomId || ''}`;
    (remote.attendance || []).forEach(a => {
      if (a) attendanceMap.set(getAttKey(a), { ...a });
    });
    (local.attendance || []).forEach(a => {
      if (a) {
        const key = getAttKey(a);
        if (attendanceMap.has(key)) {
          const remoteA = attendanceMap.get(key);
          if (a.status) {
            attendanceMap.set(key, { ...remoteA, ...a });
          }
        } else {
          attendanceMap.set(key, { ...a });
        }
      }
    });
    const mergedAttendance = Array.from(attendanceMap.values());

    // 6. INCIDENCIAS (Incidents) - Fusión por ID
    const incidentsMap = new Map();
    (remote.incidents || []).forEach(inc => {
      if (inc && inc.id) incidentsMap.set(inc.id, { ...inc });
    });
    (local.incidents || []).forEach(inc => {
      if (inc && inc.id) {
        if (incidentsMap.has(inc.id)) {
          incidentsMap.set(inc.id, { ...incidentsMap.get(inc.id), ...inc });
        } else {
          incidentsMap.set(inc.id, { ...inc });
        }
      }
    });
    const mergedIncidents = Array.from(incidentsMap.values());

    // 7. PERFIL DOCENTE (Teacher)
    const remoteTeacher = remote.teacher || {};
    const localTeacher = local.teacher || {};
    const mergedTeacher = {
      ...remoteTeacher,
      ...localTeacher,
      name: localTeacher.name || remoteTeacher.name || 'Docente EduPlan',
      email: localTeacher.email || remoteTeacher.email || '',
      school: localTeacher.school || remoteTeacher.school || ''
    };

    return {
      version: '2.0',
      appName: 'EduPlan Cuaderno Digital',
      mergedAt: new Date().toISOString(),
      user: this.currentUser || localPayload.user || remotePayload.user || null,
      data: {
        classrooms: mergedClassrooms,
        students: mergedStudents,
        gradeItems: mergedGradeItems,
        grades: mergedGrades,
        attendance: mergedAttendance,
        incidents: mergedIncidents,
        teacher: mergedTeacher
      }
    };
  },

  // ACCIONES DE RESOLUCIÓN DE CONFLICTO
  async resolveConflictWithMerge() {
    if (!this.pendingConflict) return false;
    try {
      this.setSyncStatus('syncing', 'Combinando datos inteligentemente...');
      const { localPayload, remotePayload } = this.pendingConflict;
      const mergedPayload = this.mergePayloads(localPayload, remotePayload);

      // 1. Aplicar en este dispositivo (localStorage + IndexedDB)
      this.applyImportPayload(mergedPayload);
      this.recordLocalModifiedTime();

      // 2. Subir a Google Drive forzando guardado sin volver a disparar conflicto
      const success = await this.syncToDrive(true);
      if (success) {
        this.hideConflictModal();
        this.pendingConflict = null;
        alert('✅ ¡Fusión Inteligente Exitosa!\n\nSe han combinado de forma segura las notas, estudiantes y asistencias de ambos dispositivos en una sola versión maestra actualizada en Google Drive.');
        return true;
      } else {
        alert('Los datos locales se fusionaron con éxito. Se reintentará la subida a Google Drive automáticamente.');
        return false;
      }
    } catch (err) {
      console.error('Error durante la fusión de datos:', err);
      alert('Hubo un error al fusionar los datos: ' + err.message);
      this.setSyncStatus('error', 'Error en fusión de datos');
      return false;
    }
  },

  async resolveConflictWithDownload() {
    if (!this.pendingConflict) return false;
    try {
      const { remoteFile, remotePayload } = this.pendingConflict;
      this.applyImportPayload(remotePayload);
      this.lastKnownRemoteModified = remoteFile.modifiedTime || new Date().toISOString();
      this.lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.setPendingOfflineFlag(false);
      this.pendingConflict = null;
      this.saveAuth(this.currentUser);
      this.hideConflictModal();
      this.setSyncStatus('synced', `Restaurado desde Drive (${this.lastSyncTime})`);
      alert('✅ Se restauró la versión de Google Drive en este dispositivo.');
      return true;
    } catch (err) {
      console.error('Error restaurando versión de Drive:', err);
      alert('Error al aplicar la versión de Google Drive: ' + err.message);
      return false;
    }
  },

  async resolveConflictWithOverwrite() {
    if (!this.pendingConflict) return false;
    try {
      this.hideConflictModal();
      this.setSyncStatus('syncing', 'Sobrescribiendo copia en la nube...');
      const success = await this.syncToDrive(true);
      if (success) {
        this.pendingConflict = null;
        alert('✅ Se ha sobrescrito Google Drive con la versión de este dispositivo.');
        return true;
      } else {
        alert('No se pudo sobrescribir en Drive. Por favor verifica tu conexión a Internet.');
        return false;
      }
    } catch (err) {
      console.error('Error sobrescribiendo en Drive:', err);
      alert('Error al sobrescribir en Drive: ' + err.message);
      return false;
    }
  },

  // Guardar datos en Google Drive (Crea o actualiza educap_backup_data.json)
  // Parámetro 'force': Si es true, ignora la verificación de modifiedTime y fuerza la subida
  async syncToDrive(force = false) {
    if (!this.currentUser) {
      return false;
    }

    // Si el navegador no tiene conexión activa, marcar como pendiente y esperar al evento 'online'
    if (!navigator.onLine) {
      console.warn('Dispositivo offline: Cambio guardado en LocalStorage, encolado para sincronización en la nube.');
      this.setPendingOfflineFlag(true);
      this.setSyncStatus('offline', 'Guardado local (pendiente de subir a Drive)');
      return false;
    }

    this.setSyncStatus('syncing', 'Comprobando sincronización con Drive...');
    try {
      const payload = this.getExportPayload();
      const content = JSON.stringify(payload, null, 2);
      const existingFile = await this.findBackupFile();

      // --- ALGORITMO DE VERIFICACIÓN DE CONFLICTOS OFFLINE / MULTI-DISPOSITIVO ---
      if (!force && existingFile && existingFile.modifiedTime) {
        const remoteTime = new Date(existingFile.modifiedTime).getTime();
        const localKnownTime = this.lastKnownRemoteModified ? new Date(this.lastKnownRemoteModified).getTime() : 0;
        const localModTime = this.getLocalModifiedTime() ? new Date(this.getLocalModifiedTime()).getTime() : Date.now();

        // 1. El archivo en Drive fue modificado después de nuestra última sincronización conocida
        const isRemoteNewerThanBaseline = (localKnownTime > 0) && (remoteTime > (localKnownTime + 3000));
        // 2. El archivo en Drive es más reciente que nuestros cambios locales temporales y tenemos cambios pendientes
        const isRemoteNewerThanLocal = (remoteTime > (localModTime + 3000)) && (this.hasPendingOfflineChanges || this.getPendingOfflineFlag());

        if (isRemoteNewerThanBaseline || isRemoteNewerThanLocal) {
          console.warn('⚠️ Conflicto detectado: Se detectó una versión más reciente en Drive.');
          
          let remotePayload = null;
          try {
            remotePayload = await this.downloadFileContent(existingFile.id);
          } catch (e) {
            console.error('Error descargando payload remoto para evaluación de conflicto:', e);
          }

          if (remotePayload && remotePayload.data) {
            // Verificar si hay diferencias reales entre local y remoto
            const isDifferent = JSON.stringify(payload.data) !== JSON.stringify(remotePayload.data);
            if (!isDifferent) {
              // Son exactamente idénticos: no hay conflicto, actualizamos baseline
              this.lastKnownRemoteModified = existingFile.modifiedTime;
              this.setPendingOfflineFlag(false);
              this.pendingConflict = null;
              this.saveAuth(this.currentUser);
              this.setSyncStatus('synced', `Al día con Drive (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
              return true;
            }

            // Hay diferencias reales: alertar visualmente al docente y detener guardado
            this.pendingConflict = {
              remoteFile: existingFile,
              remotePayload: remotePayload,
              localPayload: payload
            };
            this.setSyncStatus('conflict', '⚠️ Conflicto detectado: Datos en Drive más recientes');
            this.showConflictResolutionModal(existingFile, remotePayload, payload);
            return false;
          }
        }
      }

      if (existingFile) {
        // Actualizar archivo existente (PATCH media)
        const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
        const res = await this.authenticatedFetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: content
        });
        if (!res || !res.ok) throw new Error('Fallo al actualizar archivo en Drive');
        
        // Guardar la nueva marca de tiempo del archivo tras la actualización
        const updatedMeta = await res.json();
        this.lastKnownRemoteModified = updatedMeta.modifiedTime || new Date().toISOString();
      } else {
        // Crear nuevo archivo multipart
        const metadata = {
          name: DRIVE_FILE_NAME,
          mimeType: 'application/json',
          description: 'Copia de seguridad automática del Cuaderno Docente EduPlan'
        };

        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const closeDelim = "\r\n--" + boundary + "--";

        const multipartRequestBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          content +
          closeDelim;

        const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        const res = await this.authenticatedFetch(createUrl, {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartRequestBody
        });
        if (!res || !res.ok) throw new Error('Fallo al crear archivo en Drive');
        
        const createdMeta = await res.json();
        this.lastKnownRemoteModified = createdMeta.modifiedTime || new Date().toISOString();
      }

      this.lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.setPendingOfflineFlag(false);
      this.pendingConflict = null;
      this.saveAuth(this.currentUser);
      this.setSyncStatus('synced', `Guardado en Drive (${this.lastSyncTime})`);
      return true;
    } catch (err) {
      console.error('Error sincronizando con Google Drive:', err);
      if (!navigator.onLine) {
        this.setPendingOfflineFlag(true);
        this.setSyncStatus('offline', 'Guardado local (sin internet)');
      } else {
        this.setSyncStatus('error', 'Error al sincronizar con Drive');
      }
      return false;
    }
  },

  // Planifica sincronización automática con debounce para no saturar la API
  scheduleAutoSync(delayMs = 1500) {
    // Registrar el timestamp de la modificación local
    this.recordLocalModifiedTime();

    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer);
    }

    if (!navigator.onLine) {
      this.setPendingOfflineFlag(true);
      this.setSyncStatus('offline', 'Guardado local (sin conexión)');
      return;
    }

    this.autoSyncTimer = setTimeout(() => {
      if (this.currentUser) {
        this.syncToDrive();
      }
    }, delayMs);
  },

  // Restaurar datos desde Google Drive hacia la app local
  async restoreFromDrive() {
    this.setSyncStatus('syncing', 'Descargando datos desde Drive...');
    try {
      const file = await this.findBackupFile();
      if (!file) {
        alert('No se encontró ninguna copia de seguridad de EduPlan en tu Google Drive.');
        this.setSyncStatus('synced', 'Sin copias previas en Drive');
        return false;
      }

      const payload = await this.downloadFileContent(file.id);
      this.applyImportPayload(payload);

      this.lastKnownRemoteModified = file.modifiedTime || new Date().toISOString();
      this.lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.setPendingOfflineFlag(false);
      this.pendingConflict = null;
      this.saveAuth(this.currentUser);
      this.setSyncStatus('synced', `Restaurado con éxito (${this.lastSyncTime})`);
      alert('¡Datos restaurados correctamente desde tu Google Drive!');
      return true;
    } catch (err) {
      console.error('Error restaurando desde Google Drive:', err);
      this.setSyncStatus('error', 'Error al restaurar desde Drive');
      alert('Hubo un error al restaurar los datos desde Drive.');
      return false;
    }
  },

  setSyncStatus(status, message) {
    this.syncStatus = status;
    const badge = document.getElementById('google-sync-indicator');
    const msgEl = document.getElementById('google-sync-text');
    const btnText = document.getElementById('google-btn-text');

    if (badge) {
      badge.className = 'google-sync-indicator ' + status;
      if (status === 'conflict') {
        badge.title = 'Conflicto: Hay cambios más recientes en Google Drive';
      }
    }
    if (msgEl) {
      msgEl.textContent = message;
    }
    if (btnText) {
      if (status === 'conflict') {
        btnText.textContent = '¡Conflicto!';
      } else if (this.currentUser && this.currentUser.name) {
        const shortName = this.currentUser.name.split(' ')[0];
        btnText.textContent = shortName;
      }
    }
  },

  // Modal amigable flotante para renovar autorización y resolver conflictos
  createSessionNotificationUI() {
    if (document.getElementById('google-session-modal')) return;

    const modalHTML = `
      <div id="google-session-modal" class="session-expired-toast" style="display: none;">
        <div class="session-toast-content">
          <div class="session-toast-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="session-toast-info">
            <h4>Tu sesión de Google Drive necesita renovarse</h4>
            <p>Tus notas y cambios están <strong>100% a salvo en tu dispositivo</strong>. Pulsa para reactivar el guardado en la nube sin recargar.</p>
          </div>
          <div class="session-toast-actions">
            <button type="button" id="btn-session-reconnect" class="btn btn-primary btn-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              Reconectar Ahora
            </button>
            <button type="button" id="btn-session-dismiss" class="btn btn-secondary btn-sm">
              Más tarde
            </button>
          </div>
        </div>
      </div>

      <div id="offline-network-banner" class="network-status-toast network-offline" style="display: none;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
        <span><strong>Modo Offline:</strong> Sin conexión a Internet. Todos los datos que ingreses se guardan localmente y se subirán a Drive en cuanto regrese la señal.</span>
      </div>

      <div id="online-network-banner" class="network-status-toast network-online" style="display: none;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
        <span><strong>¡Conexión restablecida!</strong> Sincronizando datos automáticamente con Google Drive...</span>
      </div>

      <!-- MODAL DE CONTROL DE CONFLICTOS MULTI-DISPOSITIVO & MERGING -->
      <div id="google-conflict-modal" class="modal-overlay" style="display: none; z-index: 10002;">
        <div class="modal-card conflict-modal-card">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="modal-icon-badge" style="background: rgba(245, 158, 11, 0.15); color: var(--color-warning);">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </span>
              <div>
                <h3 style="color: var(--color-text-main); font-size: 1.15rem; font-weight: 700;">Conflicto de Sincronización Detectado</h3>
                <p style="font-size: 0.82rem; color: var(--color-text-muted);">Los datos en Google Drive son más recientes que tu versión local temporal</p>
              </div>
            </div>
            <button type="button" class="modal-close-btn" id="btn-conflict-close" aria-label="Cerrar">&times;</button>
          </div>

          <div class="modal-body" style="padding-top: 10px;">
            <div class="conflict-banner-alert">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div>
                Tu archivo en Google Drive fue modificado desde otro dispositivo con fecha posterior a tu última sincronización. EduPlan protege tus notas para evitar sobrescrituras accidentales.
              </div>
            </div>

            <!-- COMPARACIÓN VISUAL LADO A LADO -->
            <div class="conflict-compare-grid">
              <!-- Versión Nube -->
              <div class="conflict-source-card remote-card">
                <div class="conflict-source-header">
                  <span class="source-icon drive-source-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  </span>
                  <div>
                    <h4>Google Drive (Nube)</h4>
                    <span class="source-tag tag-newer">Más reciente</span>
                  </div>
                </div>
                <div class="conflict-source-time">
                  <span class="time-label">Modificado:</span>
                  <strong id="conflict-remote-time">—</strong>
                </div>
                <div class="conflict-metrics-list" id="conflict-remote-metrics">
                  <span class="metric-badge">Cargando datos...</span>
                </div>
              </div>

              <!-- Versión Local -->
              <div class="conflict-source-card local-card">
                <div class="conflict-source-header">
                  <span class="source-icon local-source-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                      <line x1="8" y1="21" x2="16" y2="21"/>
                      <line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                  </span>
                  <div>
                    <h4>Este Dispositivo (Local)</h4>
                    <span class="source-tag tag-local">Versión en pantalla</span>
                  </div>
                </div>
                <div class="conflict-source-time">
                  <span class="time-label">Último cambio:</span>
                  <strong id="conflict-local-time">—</strong>
                </div>
                <div class="conflict-metrics-list" id="conflict-local-metrics">
                  <span class="metric-badge">Cargando datos...</span>
                </div>
              </div>
            </div>

            <!-- OPCIONES DE RESOLUCIÓN -->
            <div class="conflict-options-list">
              <!-- Opción 1: Fusión Inteligente -->
              <div class="conflict-option-card highlight" id="btn-conflict-merge">
                <div class="conflict-option-top">
                  <div class="conflict-card-header">
                    <div class="option-icon merge-icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="18" cy="18" r="3"/>
                        <circle cx="6" cy="6" r="3"/>
                        <path d="M6 9v12"/>
                        <path d="M18 9a9 9 0 0 1-9 9"/>
                      </svg>
                    </div>
                    <div>
                      <h4>Fusión Inteligente (Merging)</h4>
                      <span class="conflict-option-subtitle">Unir ambas versiones sin perder ningún dato</span>
                    </div>
                  </div>
                  <span class="conflict-badge-recommended">⭐ Recomendado</span>
                </div>
                <p>Combina estudiantes, calificaciones, asistencias e incidencias de ambos lados. Guarda la copia unificada en este equipo y actualiza Google Drive automáticamente.</p>
              </div>

              <!-- Opción 2: Descargar de Google Drive -->
              <div class="conflict-option-card" id="btn-conflict-download">
                <div class="conflict-card-header">
                  <div class="option-icon download-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  </div>
                  <div>
                    <h4>Conservar versión de Google Drive</h4>
                    <span class="conflict-option-subtitle">Reemplazar los datos de este equipo con la copia de la nube</span>
                  </div>
                </div>
                <p>Descarga la copia más reciente guardada en Google Drive. Los cambios sin guardar hechos en este dispositivo se descartarán.</p>
              </div>

              <!-- Opción 3: Sobrescribir la Nube con este Dispositivo -->
              <div class="conflict-option-card" id="btn-conflict-overwrite">
                <div class="conflict-card-header">
                  <div class="option-icon overwrite-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                    </svg>
                  </div>
                  <div>
                    <h4>Conservar versión de este Dispositivo</h4>
                    <span class="conflict-option-subtitle">Sobrescribir la nube con estos datos</span>
                  </div>
                </div>
                <p>Fuerza la subida de los datos que estás viendo en tu pantalla, reemplazando la copia en Google Drive.</p>
              </div>
            </div>

            <div class="conflict-modal-footer">
              <button type="button" id="btn-conflict-dismiss" class="btn btn-secondary btn-sm">
                Decidir más tarde (mantener alerta activa)
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const btnReconnect = document.getElementById('btn-session-reconnect');
    if (btnReconnect) {
      btnReconnect.addEventListener('click', () => {
        btnReconnect.disabled = true;
        btnReconnect.innerHTML = 'Conectando...';
        this.requestTokenRefresh(true);
        setTimeout(() => {
          btnReconnect.disabled = false;
          btnReconnect.innerHTML = 'Reconectar Ahora';
        }, 3000);
      });
    }

    const btnDismiss = document.getElementById('btn-session-dismiss');
    if (btnDismiss) {
      btnDismiss.addEventListener('click', () => {
        this.hideSessionExpiredModal();
      });
    }

    // Botones de opciones de resolución de conflicto
    const btnConflictMerge = document.getElementById('btn-conflict-merge');
    if (btnConflictMerge) {
      btnConflictMerge.addEventListener('click', async () => {
        await this.resolveConflictWithMerge();
      });
    }

    const btnConflictDownload = document.getElementById('btn-conflict-download');
    if (btnConflictDownload) {
      btnConflictDownload.addEventListener('click', async () => {
        await this.resolveConflictWithDownload();
      });
    }

    const btnConflictOverwrite = document.getElementById('btn-conflict-overwrite');
    if (btnConflictOverwrite) {
      btnConflictOverwrite.addEventListener('click', async () => {
        await this.resolveConflictWithOverwrite();
      });
    }

    const btnConflictDismiss = document.getElementById('btn-conflict-dismiss');
    if (btnConflictDismiss) {
      btnConflictDismiss.addEventListener('click', () => {
        this.hideConflictModal();
      });
    }

    const btnConflictClose = document.getElementById('btn-conflict-close');
    if (btnConflictClose) {
      btnConflictClose.addEventListener('click', () => {
        this.hideConflictModal();
      });
    }
  },

  showConflictResolutionModal(remoteFile = null, remotePayload = null, localPayload = null) {
    const modal = document.getElementById('google-conflict-modal');
    if (!modal) return;

    const file = remoteFile || (this.pendingConflict && this.pendingConflict.remoteFile);
    const remoteData = (remotePayload && remotePayload.data) || (this.pendingConflict && this.pendingConflict.remotePayload && this.pendingConflict.remotePayload.data) || {};
    const localData = (localPayload && localPayload.data) || (this.pendingConflict && this.pendingConflict.localPayload && this.pendingConflict.localPayload.data) || this.getExportPayload().data;

    // Actualizar timestamps
    const timeRemoteEl = document.getElementById('conflict-remote-time');
    if (timeRemoteEl) {
      timeRemoteEl.textContent = file && file.modifiedTime ? this.formatDateTime(file.modifiedTime) : 'Fecha reciente';
    }

    const timeLocalEl = document.getElementById('conflict-local-time');
    if (timeLocalEl) {
      const localTime = this.getLocalModifiedTime() || new Date().toISOString();
      timeLocalEl.textContent = this.formatDateTime(localTime);
    }

    // Actualizar métricas remotas
    const metricsRemoteEl = document.getElementById('conflict-remote-metrics');
    if (metricsRemoteEl) {
      metricsRemoteEl.innerHTML = `
        <span class="metric-badge">${remoteData.classrooms ? remoteData.classrooms.length : 0} Aulas</span>
        <span class="metric-badge">${remoteData.students ? remoteData.students.length : 0} Estudiantes</span>
        <span class="metric-badge">${remoteData.grades ? remoteData.grades.length : 0} Notas</span>
        <span class="metric-badge">${remoteData.attendance ? remoteData.attendance.length : 0} Asistencias</span>
      `;
    }

    // Actualizar métricas locales
    const metricsLocalEl = document.getElementById('conflict-local-metrics');
    if (metricsLocalEl) {
      metricsLocalEl.innerHTML = `
        <span class="metric-badge">${localData.classrooms ? localData.classrooms.length : 0} Aulas</span>
        <span class="metric-badge">${localData.students ? localData.students.length : 0} Estudiantes</span>
        <span class="metric-badge">${localData.grades ? localData.grades.length : 0} Notas</span>
        <span class="metric-badge">${localData.attendance ? localData.attendance.length : 0} Asistencias</span>
      `;
    }

    modal.style.display = 'flex';
  },

  hideConflictModal() {
    const modal = document.getElementById('google-conflict-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  },

  showOfflineToast() {
    const el = document.getElementById('offline-network-banner');
    if (el) el.style.display = 'flex';
  },

  hideOfflineToast() {
    const el = document.getElementById('offline-network-banner');
    if (el) el.style.display = 'none';
  },

  showOnlineToast() {
    const el = document.getElementById('online-network-banner');
    if (el) {
      el.style.display = 'flex';
      setTimeout(() => {
        el.style.display = 'none';
      }, 4000);
    }
  },

  showSessionExpiredModal() {
    const toast = document.getElementById('google-session-modal');
    if (toast) {
      toast.style.display = 'block';
    }
  },

  hideSessionExpiredModal() {
    const toast = document.getElementById('google-session-modal');
    if (toast) {
      toast.style.display = 'none';
    }
  }
};

// Exportar globalmente
window.GoogleDriveService = GoogleDriveService;
