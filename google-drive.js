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
    scopes: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email'
  },

  tokenClient: null,
  accessToken: null,
  currentUser: null,
  gapiInited: false,
  gisInited: false,
  lastSyncTime: null,
  syncStatus: 'idle', // 'idle' | 'syncing' | 'synced' | 'error'

  init() {
    this.loadSavedAuth();
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
      }
    } catch (e) {
      console.error('Error cargando auth guardada:', e);
    }
  },

  saveAuth(user) {
    this.currentUser = user;
    localStorage.setItem(GOOGLE_AUTH_STORAGE_KEY, JSON.stringify({
      user: this.currentUser,
      lastSyncTime: this.lastSyncTime
    }));
  },

  clearAuth() {
    this.accessToken = null;
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
            this.setSyncStatus('error', 'Error de autenticación: ' + resp.error);
            return;
          }
          this.accessToken = resp.access_token;
          await this.fetchUserProfile();
          this.setSyncStatus('synced', 'Conectado con Google Drive');
          // Disparar sincronización inicial / backup
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
  async fetchUserProfile() {
    if (!this.accessToken) return null;
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      if (res.ok) {
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
    if (!this.accessToken) return null;
    const query = `name = '${DRIVE_FILE_NAME}' and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name, modifiedTime, size)&spaces=drive`;
    
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });
    if (!res.ok) {
      throw new Error('Error al consultar Google Drive: ' + res.statusText);
    }
    const data = await res.json();
    return (data.files && data.files.length > 0) ? data.files[0] : null;
  },

  // Guardar datos en Google Drive (Crea o actualiza educap_backup_data.json)
  async syncToDrive() {
    if (!this.accessToken) {
      this.signIn();
      return;
    }

    this.setSyncStatus('syncing', 'Guardando en tu Google Drive...');
    try {
      const payload = this.getExportPayload();
      const content = JSON.stringify(payload, null, 2);
      const existingFile = await this.findBackupFile();

      if (existingFile) {
        // Actualizar archivo existente (PATCH multipart o upload)
        const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
        const res = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: content
        });
        if (!res.ok) throw new Error('Fallo al actualizar archivo en Drive: ' + res.statusText);
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
        const res = await fetch(createUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartRequestBody
        });
        if (!res.ok) throw new Error('Fallo al crear archivo en Drive: ' + res.statusText);
      }

      this.lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.saveAuth(this.currentUser);
      this.setSyncStatus('synced', `Guardado en Drive (${this.lastSyncTime})`);
      return true;
    } catch (err) {
      console.error('Error sincronizando con Google Drive:', err);
      this.setSyncStatus('error', 'Error al sincronizar con Drive');
      return false;
    }
  },

  // Restaurar datos desde Google Drive hacia la app local
  async restoreFromDrive() {
    if (!this.accessToken) {
      this.signIn();
      return;
    }

    this.setSyncStatus('syncing', 'Descargando datos desde Drive...');
    try {
      const file = await this.findBackupFile();
      if (!file) {
        alert('No se encontró ninguna copia de seguridad de EduPlan en tu Google Drive.');
        this.setSyncStatus('synced', 'Sin copias previas en Drive');
        return false;
      }

      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
      const res = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      if (!res.ok) throw new Error('Error al descargar archivo de Drive');

      const payload = await res.json();
      this.applyImportPayload(payload);

      this.lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  }
};

// Exportar globalmente
window.GoogleDriveService = GoogleDriveService;
