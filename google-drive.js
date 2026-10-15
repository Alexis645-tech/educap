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
  syncStatus: 'idle', // 'idle' | 'syncing' | 'synced' | 'error' | 'expired' | 'offline'
  isReauthorizing: false,
  pendingActionQueue: [], // Acciones pendientes esperando renovación de token sin perder datos
  autoSyncTimer: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  hasPendingOfflineChanges: false,

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
      tokenExpiresAt: this.tokenExpiresAt
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

  // Serializar todos los datos de la app para backup
  getExportPayload() {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appName: 'EduPlan Cuaderno Digital',
      user: this.currentUser || null,
      data: {
        classrooms: JSON.parse(localStorage.getItem(STORAGE_KEYS.CLASSROOMS) || '[]'),
        students: JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]'),
        attendance: JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]'),
        incidents: JSON.parse(localStorage.getItem(STORAGE_KEYS.INCIDENTS) || '[]'),
        gradeItems: JSON.parse(localStorage.getItem(STORAGE_KEYS.GRADE_ITEMS) || '[]'),
        grades: JSON.parse(localStorage.getItem(STORAGE_KEYS.GRADES) || '[]'),
        teacher: JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHER) || '{}')
      }
    };
  },

  // Restaurar datos descargados desde Drive a localStorage
  applyImportPayload(payload) {
    if (!payload || !payload.data) {
      throw new Error('Formato de datos no válido.');
    }
    const d = payload.data;
    if (Array.isArray(d.classrooms)) localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(d.classrooms));
    if (Array.isArray(d.students)) localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(d.students));
    if (Array.isArray(d.attendance)) localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(d.attendance));
    if (Array.isArray(d.incidents)) localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(d.incidents));
    if (Array.isArray(d.gradeItems)) localStorage.setItem(STORAGE_KEYS.GRADE_ITEMS, JSON.stringify(d.gradeItems));
    if (Array.isArray(d.grades)) localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(d.grades));
    if (d.teacher && typeof d.teacher === 'object') localStorage.setItem(STORAGE_KEYS.TEACHER, JSON.stringify(d.teacher));
    
    // Notificar actualización de vistas
    if (window.UIController) {
      window.UIController.renderTeacherProfile();
      window.UIController.renderCurrentView();
    }
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

  // Guardar datos en Google Drive (Crea o actualiza educap_backup_data.json)
  // Guardar datos en Google Drive (Crea o actualiza educap_backup_data.json)
  async syncToDrive() {
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

    this.setSyncStatus('syncing', 'Guardando en tu Google Drive...');
    try {
      const payload = this.getExportPayload();
      const content = JSON.stringify(payload, null, 2);
      const existingFile = await this.findBackupFile();

      if (existingFile) {
        // Actualizar archivo existente (PATCH multipart o upload)
        const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
        const res = await this.authenticatedFetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: content
        });
        if (!res || !res.ok) throw new Error('Fallo al actualizar archivo en Drive');
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
      }

      this.lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.setPendingOfflineFlag(false);
      this.saveAuth(this.currentUser);
      this.setSyncStatus('synced', `Guardado en Drive (${this.lastSyncTime})`);
      return true;
    } catch (err) {
      console.error('Error sincronizando con Google Drive:', err);
      // Si falló por falta de red en pleno request
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

      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
      const res = await this.authenticatedFetch(downloadUrl);
      if (!res || !res.ok) throw new Error('Error al descargar archivo de Drive');

      const payload = await res.json();
      this.applyImportPayload(payload);

      this.lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.setPendingOfflineFlag(false);
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
    if (badge) {
      badge.className = 'google-sync-indicator ' + status;
    }
    if (msgEl) {
      msgEl.textContent = message;
    }
  },

  // Modal amigable flotante para renovar autorización sin recargar la página ni perder notas
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
