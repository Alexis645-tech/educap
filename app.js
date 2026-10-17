// ========================================================
// EDUPLAN - LÓGICA DE GESTIÓN Y PERSISTENCIA (APP.JS)
// ========================================================

const STORAGE_KEYS = {
  CLASSROOMS: 'educap_classrooms_v1',
  STUDENTS: 'educap_students_v1',
  ATTENDANCE: 'educap_attendance_v1',
  INCIDENTS: 'educap_incidents_v1',
  THEME: 'educap_theme_v1',
  GRADE_ITEMS: 'educap_grade_items_v1',
  GRADES: 'educap_grades_v1',
  TEACHER: 'educap_teacher_v1',
  VIEW_MODE: 'educap_view_mode_v1',
  AUTH_MODE: 'educap_auth_mode_v1',
  HINTS_VISIBLE: 'educap_hints_visible_v1',
  LOCAL_MODIFIED: 'educap_local_modified_time'
};
window.STORAGE_KEYS = STORAGE_KEYS;

// Helper para sincronizar en segundo plano con IndexedDB manteniendo velocidad síncrona
const syncToIndexedDB = (key, data) => {
  if (window.EduDB && window.EduDB.setItem) {
    window.EduDB.setItem(key, data).catch(e => console.warn('[Storage] Error IndexedDB:', e));
  }
};

// --- SERVICIO DE DATOS LOCALES ---
const DataService = {
  initDefaults() {
    if (!localStorage.getItem(STORAGE_KEYS.TEACHER)) {
      const defaultTeacher = {
        prefix: 'Prof.',
        name: 'Alexis',
        specialty: 'Matemáticas y Ciencias',
        school: 'Colegio Digital',
        email: 'alexis.docente@educap.app',
        avatarColor: '#6366F1'
      };
      localStorage.setItem(STORAGE_KEYS.TEACHER, JSON.stringify(defaultTeacher));
      syncToIndexedDB(STORAGE_KEYS.TEACHER, defaultTeacher);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CLASSROOMS)) {
      const defaultClasses = [
        {
          id: 'cls_1',
          name: 'Matemáticas y Álgebra',
          gradeLevel: '10º Grado - Grupo A',
          academicYear: '2026 - 2027',
          color: '#4F46E5',
          description: 'Aritmética, cálculo básico y resolución de problemas.',
          createdAt: new Date().toISOString()
        },
        {
          id: 'cls_2',
          name: 'Física y Química',
          gradeLevel: '11º Grado - Grupo B',
          academicYear: '2026 - 2027',
          color: '#059669',
          description: 'Cinemática, dinámica y laboratorio de ciencias.',
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(defaultClasses));
    }

    if (!localStorage.getItem(STORAGE_KEYS.STUDENTS)) {
      const defaultStudents = [
        { id: 'std_1', classroomIds: ['cls_1', 'cls_2'], firstName: 'Sofía', lastName: 'Rodríguez Martínez', email: 'sofia.rodriguez@colegio.edu', phone: '+52 555 123 4567', avatarColor: '#EC4899' },
        { id: 'std_2', classroomIds: ['cls_1'], firstName: 'Mateo', lastName: 'Gómez Hernández', email: 'mateo.gomez@colegio.edu', phone: '+52 555 234 5678', avatarColor: '#3B82F6' },
        { id: 'std_3', classroomIds: ['cls_1'], firstName: 'Valentina', lastName: 'López Castro', email: 'valentina.l@colegio.edu', phone: '+52 555 345 6789', avatarColor: '#10B981' },
        { id: 'std_4', classroomIds: ['cls_1'], firstName: 'Santiago', lastName: 'Torres Morales', email: 'santiago.t@colegio.edu', phone: '+52 555 456 7890', avatarColor: '#F59E0B' },
        { id: 'std_5', classroomIds: ['cls_2'], firstName: 'Camila', lastName: 'Vargas Silva', email: 'camila.v@colegio.edu', phone: '+52 555 567 8901', avatarColor: '#8B5CF6' },
        { id: 'std_6', classroomIds: ['cls_2'], firstName: 'Alejandro', lastName: 'Mendoza Ruiz', email: 'alejandro.m@colegio.edu', phone: '+52 555 678 9012', avatarColor: '#EF4444' }
      ];
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(defaultStudents));
    }

    if (!localStorage.getItem(STORAGE_KEYS.INCIDENTS)) {
      const defaultIncidents = [
        { id: 'inc_1', studentId: 'std_1', type: 'positive', title: 'Participación Destacada', comment: 'Resolvió el problema en la pizarra con gran claridad.', date: '2026-10-12' },
        { id: 'inc_2', studentId: 'std_2', type: 'negative', title: 'Sin material de trabajo', comment: 'Olvidó la calculadora científica para la prueba práctica.', date: '2026-10-11' }
      ];
      localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(defaultIncidents));
    }

    if (!localStorage.getItem(STORAGE_KEYS.GRADE_ITEMS)) {
      const defaultGradeItems = [
        { id: 'gi_1', classroomId: 'cls_1', title: 'Examen Parcial 1', type: 'exam', maxScore: 10, createdAt: new Date().toISOString() },
        { id: 'gi_2', classroomId: 'cls_1', title: 'Taller Álgebra', type: 'homework', maxScore: 10, createdAt: new Date().toISOString() },
        { id: 'gi_3', classroomId: 'cls_2', title: 'Práctica Laboratorio', type: 'project', maxScore: 10, createdAt: new Date().toISOString() }
      ];
      localStorage.setItem(STORAGE_KEYS.GRADE_ITEMS, JSON.stringify(defaultGradeItems));
    }

    if (!localStorage.getItem(STORAGE_KEYS.GRADES)) {
      const defaultGrades = [
        { id: 'gr_1', gradeItemId: 'gi_1', studentId: 'std_1', classroomId: 'cls_1', score: 9.5 },
        { id: 'gr_2', gradeItemId: 'gi_2', studentId: 'std_1', classroomId: 'cls_1', score: 10.0 },
        { id: 'gr_3', gradeItemId: 'gi_1', studentId: 'std_2', classroomId: 'cls_1', score: 7.0 },
        { id: 'gr_4', gradeItemId: 'gi_2', studentId: 'std_2', classroomId: 'cls_1', score: 6.5 },
        { id: 'gr_5', gradeItemId: 'gi_1', studentId: 'std_3', classroomId: 'cls_1', score: 8.5 },
        { id: 'gr_6', gradeItemId: 'gi_2', studentId: 'std_3', classroomId: 'cls_1', score: 9.0 },
        { id: 'gr_7', gradeItemId: 'gi_1', studentId: 'std_4', classroomId: 'cls_1', score: 5.5 },
        { id: 'gr_8', gradeItemId: 'gi_2', studentId: 'std_4', classroomId: 'cls_1', score: 7.0 }
      ];
      localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(defaultGrades));
      syncToIndexedDB(STORAGE_KEYS.GRADES, defaultGrades);
    }

    // Asegurar migración de datos hacia IndexedDB en segundo plano
    if (window.EduDB && window.EduDB.migrateFromLocalStorage) {
      window.EduDB.migrateFromLocalStorage();
    }
  },

  getClassrooms() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CLASSROOMS) || '[]');
  },

  addClassroom(cls) {
    const list = this.getClassrooms();
    list.push(cls);
    localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(list));
    syncToIndexedDB(STORAGE_KEYS.CLASSROOMS, list);

    if (window.GoogleDriveService && window.GoogleDriveService.scheduleAutoSync) {
      window.GoogleDriveService.scheduleAutoSync();
    }
  },

  updateClassroom(id, updatedFields) {
    const list = this.getClassrooms();
    const index = list.findIndex(c => c.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updatedFields };
      localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(list));
      syncToIndexedDB(STORAGE_KEYS.CLASSROOMS, list);

      if (window.GoogleDriveService && window.GoogleDriveService.scheduleAutoSync) {
        window.GoogleDriveService.scheduleAutoSync();
      }
      return list[index];
    }
    return null;
  },

  deleteClassroom(classroomId) {
    // 1. Eliminar la clase
    const classrooms = this.getClassrooms().filter(c => c.id !== classroomId);
    localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(classrooms));
    syncToIndexedDB(STORAGE_KEYS.CLASSROOMS, classrooms);

    // 2. Alumnos: desvincular de la clase; si el alumno solo pertenecía a esta clase, se elimina completamente
    const allStudents = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
    const studentIdsFullyRemoved = new Set();

    const updatedStudents = [];
    allStudents.forEach(s => {
      const groups = Array.isArray(s.classroomIds) ? s.classroomIds : (s.classroomId ? [s.classroomId] : []);
      const remainingGroups = groups.filter(id => id !== classroomId);
      if (remainingGroups.length > 0) {
        updatedStudents.push({
          ...s,
          classroomIds: remainingGroups,
          classroomId: remainingGroups[0]
        });
      } else {
        studentIdsFullyRemoved.add(s.id);
      }
    });

    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedStudents));
    syncToIndexedDB(STORAGE_KEYS.STUDENTS, updatedStudents);

    // 3. Limpiar incidencias sólo de los alumnos que fueron eliminados totalmente
    const allIncidents = JSON.parse(localStorage.getItem(STORAGE_KEYS.INCIDENTS) || '[]');
    const remainingIncidents = allIncidents.filter(i => !studentIdsFullyRemoved.has(i.studentId));
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(remainingIncidents));
    syncToIndexedDB(STORAGE_KEYS.INCIDENTS, remainingIncidents);

    // 4. Limpiar registros de asistencia de la clase eliminada
    const allAttendance = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]');
    const remainingAttendance = allAttendance.filter(a => a.classroomId !== classroomId);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(remainingAttendance));
    syncToIndexedDB(STORAGE_KEYS.ATTENDANCE, remainingAttendance);

    // 5. Limpiar evaluaciones y notas de la clase eliminada
    const allGradeItems = JSON.parse(localStorage.getItem(STORAGE_KEYS.GRADE_ITEMS) || '[]');
    const remainingGradeItems = allGradeItems.filter(g => g.classroomId !== classroomId);
    localStorage.setItem(STORAGE_KEYS.GRADE_ITEMS, JSON.stringify(remainingGradeItems));
    syncToIndexedDB(STORAGE_KEYS.GRADE_ITEMS, remainingGradeItems);

    const allGrades = JSON.parse(localStorage.getItem(STORAGE_KEYS.GRADES) || '[]');
    const remainingGrades = allGrades.filter(g => g.classroomId !== classroomId);
    localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(remainingGrades));
    syncToIndexedDB(STORAGE_KEYS.GRADES, remainingGrades);

    if (window.GoogleDriveService && window.GoogleDriveService.scheduleAutoSync) {
      window.GoogleDriveService.scheduleAutoSync();
    }
  },

  getStudents(classroomId = null) {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
    // Normalizar estudiantes para asegurar classroomIds
    const normalized = all.map(s => {
      const groups = Array.isArray(s.classroomIds) ? s.classroomIds : (s.classroomId ? [s.classroomId] : []);
      return {
        ...s,
        classroomIds: groups,
        classroomId: groups[0] || ''
      };
    });

    if (classroomId) {
      return normalized.filter(s => s.classroomIds.includes(classroomId));
    }
    return normalized;
  },

  addStudent(student) {
    const list = this.getStudents();
    const groups = Array.isArray(student.classroomIds) && student.classroomIds.length > 0 
      ? student.classroomIds 
      : (student.classroomId ? [student.classroomId] : []);
    
    const normalized = {
      ...student,
      classroomIds: groups,
      classroomId: groups[0] || ''
    };

    list.push(normalized);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(list));
    syncToIndexedDB(STORAGE_KEYS.STUDENTS, list);

    if (window.GoogleDriveService && window.GoogleDriveService.scheduleAutoSync) {
      window.GoogleDriveService.scheduleAutoSync();
    }
  },

  updateStudent(id, updatedFields) {
    const list = this.getStudents();
    const index = list.findIndex(s => s.id === id);
    if (index !== -1) {
      const current = list[index];
      let groups = current.classroomIds || [];
      if (updatedFields.classroomIds) {
        groups = updatedFields.classroomIds;
      } else if (updatedFields.classroomId) {
        groups = [updatedFields.classroomId];
      }

      list[index] = { 
        ...current, 
        ...updatedFields,
        classroomIds: groups,
        classroomId: groups[0] || ''
      };

      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(list));
      syncToIndexedDB(STORAGE_KEYS.STUDENTS, list);

      if (window.GoogleDriveService && window.GoogleDriveService.scheduleAutoSync) {
        window.GoogleDriveService.scheduleAutoSync();
      }
      return list[index];
    }
    return null;
  },

  deleteStudent(id) {
    const list = this.getStudents().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(list));
    syncToIndexedDB(STORAGE_KEYS.STUDENTS, list);

    // Limpiar notas del alumno eliminado
    const allGrades = JSON.parse(localStorage.getItem(STORAGE_KEYS.GRADES) || '[]');
    const remainingGrades = allGrades.filter(g => g.studentId !== id);
    localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(remainingGrades));
    syncToIndexedDB(STORAGE_KEYS.GRADES, remainingGrades);

    if (window.GoogleDriveService && window.GoogleDriveService.scheduleAutoSync) {
      window.GoogleDriveService.scheduleAutoSync();
    }
  },

  getAttendanceRecords(classroomId, date = null) {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]');
    if (date) {
      return all.filter(a => a.classroomId === classroomId && a.date === date);
    }
    return all.filter(a => a.classroomId === classroomId);
  },

  setAttendanceStatus(studentId, classroomId, date, status) {
    let all = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]');
    const idx = all.findIndex(a => a.studentId === studentId && a.date === date);
    if (idx >= 0) {
      all[idx].status = status;
    } else {
      all.push({ id: 'att_' + Date.now(), studentId, classroomId, date, status });
    }
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(all));
    syncToIndexedDB(STORAGE_KEYS.ATTENDANCE, all);

    // Sincronización automática o encolado offline
    if (window.GoogleDriveService && window.GoogleDriveService.scheduleAutoSync) {
      window.GoogleDriveService.scheduleAutoSync();
    }
  },

  setBulkAttendanceStatus(studentIds, classroomId, date, status) {
    let all = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]');
    studentIds.forEach(studentId => {
      const idx = all.findIndex(a => a.studentId === studentId && a.classroomId === classroomId && a.date === date);
      if (idx >= 0) {
        all[idx].status = status;
      } else {
        all.push({ id: 'att_' + Date.now() + '_' + Math.floor(Math.random()*1000), studentId, classroomId, date, status });
      }
    });
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(all));
    syncToIndexedDB(STORAGE_KEYS.ATTENDANCE, all);

    if (window.GoogleDriveService && window.GoogleDriveService.scheduleAutoSync) {
      window.GoogleDriveService.scheduleAutoSync();
    }
  },

  getIncidents(studentId) {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.INCIDENTS) || '[]');
    return all.filter(i => i.studentId === studentId);
  },

  addIncident(incident) {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.INCIDENTS) || '[]');
    all.unshift(incident);
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(all));
    syncToIndexedDB(STORAGE_KEYS.INCIDENTS, all);

    // Sincronización automática o encolado offline
    if (window.GoogleDriveService && window.GoogleDriveService.scheduleAutoSync) {
      window.GoogleDriveService.scheduleAutoSync();
    }
  },

  addBulkIncidents(studentIds, incidentData) {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.INCIDENTS) || '[]');
    const date = incidentData.date || new Date().toISOString().split('T')[0];
    studentIds.forEach((studentId, i) => {
      all.unshift({
        id: 'inc_' + (Date.now() + i) + '_' + Math.floor(Math.random()*1000),
        studentId,
        type: incidentData.type,
        title: incidentData.title,
        comment: incidentData.comment || '',
        date
      });
    });
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(all));
    syncToIndexedDB(STORAGE_KEYS.INCIDENTS, all);

    if (window.GoogleDriveService && window.GoogleDriveService.scheduleAutoSync) {
      window.GoogleDriveService.scheduleAutoSync();
    }
  },

  // --- CALIFICACIONES Y EVALUACIONES ---
  getGradeItems(classroomId = null) {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.GRADE_ITEMS) || '[]');
    if (classroomId) return all.filter(g => g.classroomId === classroomId);
    return all;
  },

  addGradeItem(item) {
    const list = this.getGradeItems();
    list.push(item);
    localStorage.setItem(STORAGE_KEYS.GRADE_ITEMS, JSON.stringify(list));
    syncToIndexedDB(STORAGE_KEYS.GRADE_ITEMS, list);

    if (window.GoogleDriveService && window.GoogleDriveService.scheduleAutoSync) {
      window.GoogleDriveService.scheduleAutoSync();
    }
  },

  getGrades(classroomId = null) {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.GRADES) || '[]');
    if (classroomId) return all.filter(g => g.classroomId === classroomId);
    return all;
  },

  setStudentGrade(studentId, gradeItemId, classroomId, score) {
    let all = JSON.parse(localStorage.getItem(STORAGE_KEYS.GRADES) || '[]');
    const idx = all.findIndex(g => g.studentId === studentId && g.gradeItemId === gradeItemId);

    if (score === null || score === undefined || score === '' || isNaN(score)) {
      // Si se borra la calificación, remover el registro
      if (idx >= 0) {
        all.splice(idx, 1);
      }
    } else {
      const numScore = parseFloat(score);
      if (idx >= 0) {
        all[idx].score = numScore;
      } else {
        all.push({
          id: 'gr_' + Date.now() + '_' + Math.floor(Math.random()*1000),
          gradeItemId,
          studentId,
          classroomId,
          score: numScore
        });
      }
    }
    localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(all));
    syncToIndexedDB(STORAGE_KEYS.GRADES, all);

    if (window.GoogleDriveService && window.GoogleDriveService.scheduleAutoSync) {
      window.GoogleDriveService.scheduleAutoSync();
    }
  },

  setBulkGrades(gradeItemId, classroomId, score, overwriteMode = 'all') {
    let all = JSON.parse(localStorage.getItem(STORAGE_KEYS.GRADES) || '[]');
    const students = this.getStudents(classroomId);
    const numScore = parseFloat(score);

    students.forEach((student, i) => {
      const idx = all.findIndex(g => g.studentId === student.id && g.gradeItemId === gradeItemId);
      if (idx >= 0) {
        if (overwriteMode === 'all') {
          all[idx].score = numScore;
        }
        // Si es 'empty-only', no sobreescribir si ya tiene nota
      } else {
        all.push({
          id: 'gr_' + (Date.now() + i) + '_' + Math.floor(Math.random()*1000),
          gradeItemId,
          studentId: student.id,
          classroomId,
          score: numScore
        });
      }
    });

    localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(all));
    syncToIndexedDB(STORAGE_KEYS.GRADES, all);

    if (window.GoogleDriveService && window.GoogleDriveService.scheduleAutoSync) {
      window.GoogleDriveService.scheduleAutoSync();
    }
  },

  // --- PERFIL DEL DOCENTE ---
  getTeacherProfile() {
    const raw = localStorage.getItem(STORAGE_KEYS.TEACHER);
    if (!raw) {
      return {
        prefix: 'Prof.',
        name: 'Alexis',
        specialty: 'Docente',
        school: 'Educación Digital',
        email: '',
        avatarColor: '#6366F1'
      };
    }
    return JSON.parse(raw);
  },

  saveTeacherProfile(profile) {
    localStorage.setItem(STORAGE_KEYS.TEACHER, JSON.stringify(profile));
    syncToIndexedDB(STORAGE_KEYS.TEACHER, profile);

    if (window.GoogleDriveService && window.GoogleDriveService.scheduleAutoSync) {
      window.GoogleDriveService.scheduleAutoSync();
    }
  }
};

// --- CONTROLADOR DE LA INTERFAZ (UI STATE) ---
const UIController = {
  currentTab: 'classes-tab',
  selectedClassroomId: '',
  selectedGradeType: '',
  selectedGradeItemId: '',
  selectedDate: new Date().toISOString().split('T')[0],
  studentSortOrder: 'lastName-asc', // 'lastName-asc' | 'lastName-desc' | 'firstName-asc' | 'firstName-desc'
  selectedStudentIds: new Set(), // Conjunto para selección múltiple / Bulk Actions

  sortStudents(studentsList) {
    const list = [...studentsList];
    const order = this.studentSortOrder || 'lastName-asc';

    list.sort((a, b) => {
      const aFirst = (a.firstName || '').trim();
      const bFirst = (b.firstName || '').trim();
      const aLast = (a.lastName || '').trim();
      const bLast = (b.lastName || '').trim();

      switch (order) {
        case 'lastName-asc':
          return aLast.localeCompare(bLast, 'es', { sensitivity: 'base' }) || aFirst.localeCompare(bFirst, 'es', { sensitivity: 'base' });
        case 'lastName-desc':
          return bLast.localeCompare(aLast, 'es', { sensitivity: 'base' }) || bFirst.localeCompare(aFirst, 'es', { sensitivity: 'base' });
        case 'firstName-asc':
          return aFirst.localeCompare(bFirst, 'es', { sensitivity: 'base' }) || aLast.localeCompare(bLast, 'es', { sensitivity: 'base' });
        case 'firstName-desc':
          return bFirst.localeCompare(aFirst, 'es', { sensitivity: 'base' }) || bLast.localeCompare(aLast, 'es', { sensitivity: 'base' });
        default:
          return aLast.localeCompare(bLast, 'es', { sensitivity: 'base' });
      }
    });

    return list;
  },

  syncSortSelects() {
    const selects = ['student-sort-select', 'attendance-sort-select', 'grades-sort-select'];
    selects.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.value !== this.studentSortOrder) {
        el.value = this.studentSortOrder;
      }
    });
  },

  init() {
    this.initTheme();
    this.initViewMode();
    this.initKeyboardHints();
    DataService.initDefaults();

    const classrooms = DataService.getClassrooms();
    if (classrooms.length > 0) {
      this.selectedClassroomId = classrooms[0].id;
    }

    this.renderTeacherProfile();
    if (window.GoogleDriveService) {
      window.GoogleDriveService.init();
      this.renderGoogleAuthStatus();
    }
    this.checkAuthScreen();
    this.bindEvents();
    this.renderCurrentView();
  },

  checkAuthScreen() {
    const isLogged = window.GoogleDriveService && window.GoogleDriveService.currentUser;
    const isOfflineChoice = localStorage.getItem(STORAGE_KEYS.AUTH_MODE) === 'offline';

    if (isLogged || isOfflineChoice) {
      this.showApp();
    } else {
      this.showAuthScreen();
    }
  },

  showApp() {
    const authScreen = document.getElementById('auth-screen');
    const appLayout = document.getElementById('app-layout');
    if (authScreen) authScreen.style.display = 'none';
    if (appLayout) appLayout.style.display = 'flex';
  },

  showAuthScreen() {
    const authScreen = document.getElementById('auth-screen');
    const appLayout = document.getElementById('app-layout');
    if (authScreen) authScreen.style.display = 'flex';
    if (appLayout) appLayout.style.display = 'none';
  },

  renderTeacherProfile() {
    const teacher = DataService.getTeacherProfile();
    const displayName = `${teacher.prefix || 'Prof.'} ${teacher.name || 'Docente'}`;
    const schoolOrRole = teacher.school || teacher.specialty || 'Modo Offline Activo';
    const initial = (teacher.name && teacher.name.trim().length > 0) ? teacher.name.trim()[0].toUpperCase() : 'P';
    const color = teacher.avatarColor || '#6366F1';

    const nameEl = document.getElementById('sidebar-teacher-name');
    const schoolEl = document.getElementById('sidebar-teacher-school');
    const avatarEl = document.getElementById('sidebar-teacher-avatar');

    if (nameEl) nameEl.textContent = displayName;
    if (schoolEl) schoolEl.textContent = schoolOrRole;
    if (avatarEl) {
      avatarEl.textContent = initial;
      avatarEl.style.backgroundColor = color;
    }
  },

  initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const activeTheme = savedTheme || (prefersDark ? 'dark' : 'light');

    document.documentElement.setAttribute('data-theme', activeTheme);

    // Escuchar cambios de preferencia del sistema si el usuario no ha forzado uno
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(STORAGE_KEYS.THEME)) {
          document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
      });
    }
  },

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, nextTheme);
  },

  initViewMode() {
    const savedMode = localStorage.getItem(STORAGE_KEYS.VIEW_MODE) || 'cards';
    this.setViewMode(savedMode, false);
  },

  setViewMode(mode, save = true) {
    const validMode = mode === 'table' ? 'table' : 'cards';
    document.documentElement.setAttribute('data-view-mode', validMode);
    if (save) {
      localStorage.setItem(STORAGE_KEYS.VIEW_MODE, validMode);
    }
    // Sincronizar todos los segmented controls de vista
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
      const btnMode = btn.getAttribute('data-view');
      btn.classList.toggle('active', btnMode === validMode);
    });

    // Resetear posición de scroll en contenedores de tabla para evitar desalineación al alternar
    const gradesContainer = document.querySelector('.grades-table-container');
    if (gradesContainer) {
      gradesContainer.scrollLeft = 0;
      gradesContainer.scrollTop = 0;
    }
    const studentsContainer = document.querySelector('.students-table-container');
    if (studentsContainer) {
      studentsContainer.scrollLeft = 0;
      studentsContainer.scrollTop = 0;
    }

    // Re-renderizar calificaciones si existe estado virtual activo
    if (this.gradesVirtualState) {
      this.renderVirtualGradesWindow();
    }
  },

  toggleViewMode() {
    const current = document.documentElement.getAttribute('data-view-mode') || 'cards';
    const next = current === 'cards' ? 'table' : 'cards';
    this.setViewMode(next, true);
  },

  initKeyboardHints() {
    const saved = localStorage.getItem(STORAGE_KEYS.HINTS_VISIBLE);
    const isMobile = window.innerWidth <= 768;
    // Si el usuario ya guardó preferencia, usarla; si no, en móviles ocultar por defecto
    const isVisible = saved !== null ? saved === 'true' : !isMobile;
    this.setKeyboardHintsVisible(isVisible, false);
  },

  setKeyboardHintsVisible(visible, save = true) {
    const bar = document.getElementById('grades-keyboard-hints');
    const toggleBtnText = document.getElementById('btn-toggle-keyboard-hints-text');
    const toggleBtn = document.getElementById('btn-toggle-keyboard-hints');

    if (bar) {
      bar.classList.toggle('is-hidden', !visible);
    }

    if (toggleBtnText) {
      toggleBtnText.textContent = visible ? 'Ocultar Guía' : 'Guía de Teclas';
    }

    if (toggleBtn) {
      toggleBtn.classList.toggle('active', visible);
      toggleBtn.title = visible 
        ? 'Ocultar consejos de navegación por teclado' 
        : 'Mostrar consejos de atajos de teclado tipo Excel';
    }

    if (save) {
      localStorage.setItem(STORAGE_KEYS.HINTS_VISIBLE, visible ? 'true' : 'false');
    }
  },

  toggleKeyboardHints() {
    const bar = document.getElementById('grades-keyboard-hints');
    const isCurrentlyHidden = bar ? bar.classList.contains('is-hidden') : false;
    this.setKeyboardHintsVisible(isCurrentlyHidden, true);
  },

  bindEvents() {
    // Alternancia de tema Claro / Oscuro
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        this.toggleTheme();
      });
    }

    // Botón de instalación PWA en el header
    const pwaBtn = document.getElementById('btn-pwa-install');
    if (pwaBtn) {
      pwaBtn.addEventListener('click', () => {
        this.triggerPwaInstall();
      });
    }

    // Selector de vista en móvil: Tarjetas vs Tabla
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-view');
        this.setViewMode(mode, true);
      });
    });

    // Navegación lateral y navegación inferior móvil
    document.querySelectorAll('.nav-item[data-tab], .bottom-nav-item[data-tab]').forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        if (tabId) {
          this.switchTab(tabId);
          this.closeMobileSidebar();
        }
      });
    });

    // Menú hamburguesa móvil y backdrop
    const toggleBtn = document.getElementById('btn-toggle-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const sidebar = document.querySelector('.sidebar');
        const isOpen = sidebar.classList.toggle('mobile-open');
        if (backdrop) backdrop.classList.toggle('active', isOpen);
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', () => {
        this.closeMobileSidebar();
      });
    }

    // Botón de acción rápida superior
    document.getElementById('btn-quick-action').addEventListener('click', () => {
      if (this.currentTab === 'classes-tab') {
        this.openClassroomModal();
      } else if (this.currentTab === 'students-tab') {
        this.openStudentModal();
      } else if (this.currentTab === 'attendance-tab') {
        // En asistencia, marca a todos presentes
        this.markAllPresent();
      } else if (this.currentTab === 'grades-tab') {
        this.openGradeItemModal();
      }
    });

    // Abrir modal de personalización de perfil docente (desde sidebar y desde header)
    const btnTeacherProfile = document.getElementById('btn-open-teacher-profile');
    if (btnTeacherProfile) {
      btnTeacherProfile.addEventListener('click', () => {
        this.openTeacherProfileModal();
      });
    }

    const btnHeaderTeacher = document.getElementById('btn-header-teacher-profile');
    if (btnHeaderTeacher) {
      btnHeaderTeacher.addEventListener('click', () => {
        this.openTeacherProfileModal();
      });
    }

    // Envío del formulario de perfil docente
    const formTeacher = document.getElementById('form-teacher-profile');
    if (formTeacher) {
      formTeacher.addEventListener('submit', (e) => {
        e.preventDefault();
        const prefix = document.getElementById('teacher-prefix').value;
        const name = document.getElementById('teacher-name-input').value.trim();
        const specialty = document.getElementById('teacher-specialty').value.trim();
        const school = document.getElementById('teacher-school-input').value.trim();
        const email = document.getElementById('teacher-email-input').value.trim();
        const checkedColor = document.querySelector('input[name="teacher-avatar-color"]:checked');
        const avatarColor = checkedColor ? checkedColor.value : '#6366F1';

        DataService.saveTeacherProfile({
          prefix,
          name,
          specialty,
          school,
          email,
          avatarColor
        });

        this.renderTeacherProfile();
        this.closeModal('modal-teacher-profile');
      });

      // Preview en tiempo real al escribir el nombre o cambiar color
      const nameInput = document.getElementById('teacher-name-input');
      if (nameInput) {
        nameInput.addEventListener('input', () => {
          const preview = document.getElementById('preview-teacher-avatar');
          if (preview) {
            const val = nameInput.value.trim();
            preview.textContent = val.length > 0 ? val[0].toUpperCase() : 'P';
          }
        });
      }

      document.querySelectorAll('input[name="teacher-avatar-color"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          const preview = document.getElementById('preview-teacher-avatar');
          if (preview) {
            preview.style.backgroundColor = e.target.value;
          }
        });
      });
    }

    // Abrir modal de nueva actividad de calificación
    const btnNewGradeItem = document.getElementById('btn-new-grade-item');
    if (btnNewGradeItem) {
      btnNewGradeItem.addEventListener('click', () => {
        this.openGradeItemModal();
      });
    }

    // Botones para alternar y ocultar barra de navegación tipo Excel (especialmente en pantallas móviles)
    const btnHideHints = document.getElementById('btn-hide-keyboard-hints');
    if (btnHideHints) {
      btnHideHints.addEventListener('click', () => {
        this.setKeyboardHintsVisible(false, true);
      });
    }

    const btnToggleHints = document.getElementById('btn-toggle-keyboard-hints');
    if (btnToggleHints) {
      btnToggleHints.addEventListener('click', () => {
        this.toggleKeyboardHints();
      });
    }

    // Cerrar modales
    document.querySelectorAll('.modal-close-btn, .btn-cancel-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
      });
    });

    // Envío formulario actividad / evaluación
    const formGradeItem = document.getElementById('form-create-grade-item');
    if (formGradeItem) {
      formGradeItem.addEventListener('submit', (e) => {
        e.preventDefault();
        const classroomId = document.getElementById('grade-item-class-select').value;
        const title = document.getElementById('grade-item-title').value.trim();
        const type = document.getElementById('grade-item-type').value;
        const maxScore = parseFloat(document.getElementById('grade-item-max').value) || 10;

        DataService.addGradeItem({
          id: 'gi_' + Date.now(),
          classroomId,
          title,
          type,
          maxScore,
          createdAt: new Date().toISOString()
        });

        formGradeItem.reset();
        this.closeModal('modal-grade-item');
        if (classroomId) {
          this.selectedClassroomId = classroomId;
        }
        this.renderGrades();
      });
    }

    // Filtros de calificaciones
    const gradesClassSelect = document.getElementById('grades-classroom-select');
    if (gradesClassSelect) {
      gradesClassSelect.addEventListener('change', (e) => {
        this.selectedClassroomId = e.target.value;
        this.selectedGradeItemId = ''; // Reiniciar filtro específico de actividad al cambiar clase
        this.renderGrades();
      });
    }

    const gradesTypeSelect = document.getElementById('grades-type-select');
    if (gradesTypeSelect) {
      gradesTypeSelect.addEventListener('change', (e) => {
        this.selectedGradeType = e.target.value;
        this.selectedGradeItemId = ''; // Reiniciar actividad seleccionada si cambia el tipo
        this.renderGrades();
      });
    }

    const gradesActivitySelect = document.getElementById('grades-activity-select');
    if (gradesActivitySelect) {
      gradesActivitySelect.addEventListener('change', (e) => {
        this.selectedGradeItemId = e.target.value;
        this.renderGrades();
      });
    }

    // Envío formulario clase (Crear o Editar)
    document.getElementById('form-create-class').addEventListener('submit', (e) => {
      e.preventDefault();
      const editId = document.getElementById('class-edit-id').value;
      const name = document.getElementById('class-name').value.trim();
      const grade = document.getElementById('class-grade').value.trim();
      const year = document.getElementById('class-year').value.trim();
      const desc = document.getElementById('class-desc').value.trim();
      const color = document.querySelector('input[name="class-color"]:checked').value;

      if (editId) {
        // Actualizar clase existente
        DataService.updateClassroom(editId, {
          name,
          gradeLevel: grade,
          academicYear: year,
          description: desc,
          color
        });
      } else {
        // Crear nueva clase
        DataService.addClassroom({
          id: 'cls_' + Date.now(),
          name,
          gradeLevel: grade,
          academicYear: year,
          description: desc,
          color,
          createdAt: new Date().toISOString()
        });
      }

      document.getElementById('form-create-class').reset();
      document.getElementById('class-edit-id').value = '';
      this.closeModal('modal-class');
      this.renderClassrooms();
      this.populateClassroomSelects();
    });

    // Envío formulario estudiante
    document.getElementById('form-create-student').addEventListener('submit', (e) => {
      e.preventDefault();
      const checkedBoxes = Array.from(document.querySelectorAll('input[name="student-assigned-classrooms"]:checked'));
      const classroomIds = checkedBoxes.map(cb => cb.value);

      if (classroomIds.length === 0) {
        alert('Por favor selecciona al menos un grupo o materia para el alumno.');
        return;
      }

      const editId = document.getElementById('student-edit-id').value;
      const firstName = document.getElementById('student-firstname').value.trim();
      const lastName = document.getElementById('student-lastname').value.trim();
      const email = document.getElementById('student-email').value.trim();
      const phone = document.getElementById('student-phone').value.trim();

      if (editId) {
        // Actualizar estudiante existente
        DataService.updateStudent(editId, {
          classroomIds,
          firstName,
          lastName,
          email,
          phone
        });
      } else {
        // Crear nuevo estudiante
        const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#3B82F6'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        DataService.addStudent({
          id: 'std_' + Date.now(),
          classroomIds,
          firstName,
          lastName,
          email,
          phone,
          avatarColor: randomColor
        });
      }

      document.getElementById('form-create-student').reset();
      document.getElementById('student-edit-id').value = '';
      this.closeModal('modal-student');
      this.renderStudents();
      // Si la pestaña de notas o asistencia está activa, refrescarlas
      if (this.currentTab === 'attendance-tab') this.renderAttendance();
      if (this.currentTab === 'grades-tab') this.renderGrades();
    });

    // Filtros y ordenamiento de estudiantes
    document.getElementById('filter-classroom-select').addEventListener('change', (e) => {
      this.selectedClassroomId = e.target.value;
      this.selectedStudentIds.clear();
      this.renderStudents();
    });

    const sortSelect = document.getElementById('student-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.studentSortOrder = e.target.value;
        this.syncSortSelects();
        this.renderStudents();
      });
    }

    document.getElementById('student-search-input').addEventListener('input', () => {
      this.renderStudents();
    });

    // Checkbox 'Seleccionar Todos' en cabecera de la tabla de estudiantes
    const selectAllCheckbox = document.getElementById('students-select-all');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (e) => {
        this.toggleSelectAllStudents(e.target.checked);
      });
    }

    // Botones de la barra flotante de acciones masivas de estudiantes
    const btnBulkIncident = document.getElementById('btn-bulk-incident');
    if (btnBulkIncident) {
      btnBulkIncident.addEventListener('click', () => {
        this.openBulkIncidentModal();
      });
    }

    const btnBulkClear = document.getElementById('btn-bulk-clear-selection');
    if (btnBulkClear) {
      btnBulkClear.addEventListener('click', () => {
        this.selectedStudentIds.clear();
        this.renderStudents();
      });
    }

    // Envío del formulario de Anotación Masiva para Alumnos
    const formBulkIncident = document.getElementById('form-bulk-incident');
    if (formBulkIncident) {
      formBulkIncident.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.getElementById('bulk-incident-type').value;
        const title = document.getElementById('bulk-incident-title').value.trim();
        const comment = document.getElementById('bulk-incident-comment').value.trim();

        if (!title) return alert('Por favor indica un título para la anotación');

        const studentIdsArray = Array.from(this.selectedStudentIds);
        DataService.addBulkIncidents(studentIdsArray, {
          type,
          title,
          comment,
          date: new Date().toISOString().split('T')[0]
        });

        alert(`¡Anotación asignada con éxito a ${studentIdsArray.length} alumno(s)!`);
        this.closeModal('modal-bulk-incident');
        this.renderStudents();
      });
    }

    // Botones de Operaciones en Lote de Asistencia (Cabecera)
    const btnAttendPresent = document.getElementById('btn-bulk-attend-present');
    if (btnAttendPresent) {
      btnAttendPresent.addEventListener('click', () => {
        this.markAllAttendanceStatus('PRESENT');
      });
    }

    const btnAttendLate = document.getElementById('btn-bulk-attend-late');
    if (btnAttendLate) {
      btnAttendLate.addEventListener('click', () => {
        this.markAllAttendanceStatus('LATE');
      });
    }

    const btnAttendAbsent = document.getElementById('btn-bulk-attend-absent');
    if (btnAttendAbsent) {
      btnAttendAbsent.addEventListener('click', () => {
        this.markAllAttendanceStatus('ABSENT');
      });
    }

    // Botón de Operación en Lote: Asignar Calificación Base (Cabecera de Notas)
    const btnBulkAssignGrade = document.getElementById('btn-bulk-assign-grade');
    if (btnBulkAssignGrade) {
      btnBulkAssignGrade.addEventListener('click', () => {
        this.openBulkGradeModal();
      });
    }

    // Envío del formulario de Calificación Base Masiva
    const formBulkGrade = document.getElementById('form-bulk-grade');
    if (formBulkGrade) {
      formBulkGrade.addEventListener('submit', (e) => {
        e.preventDefault();
        const select = document.getElementById('grades-classroom-select');
        const currentClassId = select ? select.value : this.selectedClassroomId;
        const gradeItemId = document.getElementById('bulk-grade-activity-select').value;
        const score = document.getElementById('bulk-grade-score-input').value;
        const overwriteMode = document.getElementById('bulk-grade-overwrite-select').value;

        if (!currentClassId || !gradeItemId || score === '') {
          return alert('Por favor completa todos los campos requeridos.');
        }

        DataService.setBulkGrades(gradeItemId, currentClassId, score, overwriteMode);
        this.closeModal('modal-bulk-grade');
        this.renderGrades();
        alert('Calificación base asignada exitosamente a todos los alumnos del grupo.');
      });
    }

    // Filtros de asistencia
    const attSelect = document.getElementById('attendance-classroom-select');
    attSelect.addEventListener('change', (e) => {
      this.selectedClassroomId = e.target.value;
      this.renderAttendance();
    });

    const attSortSelect = document.getElementById('attendance-sort-select');
    if (attSortSelect) {
      attSortSelect.addEventListener('change', (e) => {
        this.studentSortOrder = e.target.value;
        this.syncSortSelects();
        this.renderAttendance();
      });
    }

    const dateInput = document.getElementById('attendance-date-input');
    dateInput.value = this.selectedDate;
    dateInput.addEventListener('change', (e) => {
      this.selectedDate = e.target.value;
      this.renderAttendance();
    });

    // Ordenamiento en calificaciones
    const gradesSortSelect = document.getElementById('grades-sort-select');
    if (gradesSortSelect) {
      gradesSortSelect.addEventListener('change', (e) => {
        this.studentSortOrder = e.target.value;
        this.syncSortSelects();
        this.renderGrades();
      });
    }

    // --- BOTÓN CENTRAL DE EXPORTACIÓN DE REPORTES A EXCEL (.XLSX) ---
    const btnHeaderReports = document.getElementById('btn-header-export-reports');
    if (btnHeaderReports) {
      btnHeaderReports.addEventListener('click', () => {
        this.openExportModal();
      });
    }

    const btnSidebarReports = document.getElementById('sidebar-btn-export-reports');
    if (btnSidebarReports) {
      btnSidebarReports.addEventListener('click', () => {
        this.closeMobileSidebar();
        this.openExportModal();
      });
    }

    // Selección interactiva de opciones en modal de exportación
    document.querySelectorAll('.export-option-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.export-option-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });

    // Envío del formulario de exportación de reportes
    const formExportReport = document.getElementById('form-export-report');
    if (formExportReport) {
      formExportReport.addEventListener('submit', (e) => {
        e.preventDefault();
        const targetClassId = document.getElementById('export-classroom-select').value;
        const selectedRadio = document.querySelector('input[name="export-doc-type"]:checked');
        const docType = selectedRadio ? selectedRadio.value : 'grades';

        if (!window.ExportService) {
          alert('El servicio de exportación Excel aún está cargando. Por favor intenta en unos segundos.');
          return;
        }

        if (docType === 'grades') {
          window.ExportService.exportGradesToExcel(targetClassId);
        } else if (docType === 'attendance-consolidated') {
          window.ExportService.exportAttendanceToExcel(targetClassId, null, 'consolidated');
        } else if (docType === 'attendance-day') {
          window.ExportService.exportAttendanceToExcel(targetClassId, this.selectedDate, 'day');
        } else if (docType === 'course-integral') {
          window.ExportService.exportCompleteCourseExcel(targetClassId);
        }

        this.closeModal('modal-export-reports');
      });
    }

    // Guardar incidencia
    document.getElementById('btn-save-incident').addEventListener('click', () => {
      const studentId = document.getElementById('incident-student-id').value;
      const type = document.getElementById('incident-type').value;
      const title = document.getElementById('incident-title').value.trim();
      const comment = document.getElementById('incident-comment').value.trim();

      if (!title) return alert('Por favor indica un título para la anotación');

      DataService.addIncident({
        id: 'inc_' + Date.now(),
        studentId,
        type,
        title,
        comment,
        date: new Date().toISOString().split('T')[0]
      });

      document.getElementById('incident-title').value = '';
      document.getElementById('incident-comment').value = '';
      this.renderIncidentsModal(studentId);
      this.renderStudents(); // Actualizar contador en tabla
    });

    // Editar estudiante desde la cabecera de la ficha de incidencias
    const btnEditFromIncidents = document.getElementById('btn-edit-student-from-incidents');
    if (btnEditFromIncidents) {
      btnEditFromIncidents.addEventListener('click', () => {
        const studentId = document.getElementById('incident-student-id').value;
        if (studentId) {
          this.closeModal('modal-incidents');
          this.openEditStudentModal(studentId);
        }
      });
    }

    // --- INTEGRACIÓN GOOGLE SIGN-IN & DRIVE API ---
    const btnGoogleDrive = document.getElementById('btn-google-drive');
    if (btnGoogleDrive) {
      btnGoogleDrive.addEventListener('click', () => {
        if (window.GoogleDriveService && window.GoogleDriveService.syncStatus === 'conflict' && window.GoogleDriveService.pendingConflict) {
          window.GoogleDriveService.showConflictResolutionModal();
        } else {
          this.openGoogleSyncModal();
        }
      });
    }

    const btnOpenConflictFromSync = document.getElementById('btn-open-conflict-modal-from-sync');
    if (btnOpenConflictFromSync) {
      btnOpenConflictFromSync.addEventListener('click', () => {
        this.closeModal('modal-google-sync');
        if (window.GoogleDriveService) {
          window.GoogleDriveService.showConflictResolutionModal();
        }
      });
    }

    const btnGoogleLoginModal = document.getElementById('btn-google-login-modal');
    if (btnGoogleLoginModal) {
      btnGoogleLoginModal.addEventListener('click', () => {
        if (window.GoogleDriveService) {
          window.GoogleDriveService.signIn();
        }
      });
    }

    // Botones de la Pantalla de Bienvenida / Login
    const btnLoginScreenGoogle = document.getElementById('btn-login-screen-google');
    if (btnLoginScreenGoogle) {
      btnLoginScreenGoogle.addEventListener('click', () => {
        if (window.GoogleDriveService) {
          window.GoogleDriveService.signIn();
        }
      });
    }

    const btnLoginScreenOffline = document.getElementById('btn-login-screen-offline');
    if (btnLoginScreenOffline) {
      btnLoginScreenOffline.addEventListener('click', () => {
        localStorage.setItem(STORAGE_KEYS.AUTH_MODE, 'offline');
        this.showApp();
      });
    }

    const btnGoogleSignout = document.getElementById('btn-google-signout');
    if (btnGoogleSignout) {
      btnGoogleSignout.addEventListener('click', () => {
        if (confirm('¿Deseas cerrar la sesión de Google en este dispositivo? Tus datos locales se conservarán.')) {
          if (window.GoogleDriveService) {
            window.GoogleDriveService.signOut();
          }
          localStorage.removeItem(STORAGE_KEYS.AUTH_MODE);
          this.closeModal('modal-google-sync');
          this.showAuthScreen();
        }
      });
    }

    const btnSyncNow = document.getElementById('btn-sync-now');
    if (btnSyncNow) {
      btnSyncNow.addEventListener('click', async () => {
        if (window.GoogleDriveService) {
          btnSyncNow.disabled = true;
          await window.GoogleDriveService.syncToDrive();
          btnSyncNow.disabled = false;
        }
      });
    }

    const btnRestoreNow = document.getElementById('btn-restore-now');
    if (btnRestoreNow) {
      btnRestoreNow.addEventListener('click', async () => {
        if (confirm('Esto reemplazará los datos actuales de la app por la copia guardada en Google Drive. ¿Deseas continuar?')) {
          if (window.GoogleDriveService) {
            btnRestoreNow.disabled = true;
            await window.GoogleDriveService.restoreFromDrive();
            btnRestoreNow.disabled = false;
          }
        }
      });
    }
  },

  openGoogleSyncModal() {
    this.renderGoogleAuthStatus();
    this.openModal('modal-google-sync');
  },

  renderGoogleAuthStatus() {
    if (!window.GoogleDriveService) return;
    const isAuth = Boolean(window.GoogleDriveService.currentUser);
    const userConnected = document.getElementById('google-user-connected');
    const userDisconnected = document.getElementById('google-user-disconnected');
    const btnSignout = document.getElementById('btn-google-signout');
    const googleBtnText = document.getElementById('google-btn-text');

    if (isAuth && window.GoogleDriveService.currentUser) {
      const u = window.GoogleDriveService.currentUser;
      if (userConnected) userConnected.style.display = 'flex';
      if (userDisconnected) userDisconnected.style.display = 'none';
      if (btnSignout) btnSignout.style.display = 'inline-block';

      const nameEl = document.getElementById('google-user-name');
      const emailEl = document.getElementById('google-user-email');
      const avatarEl = document.getElementById('google-avatar-img');

      if (nameEl) nameEl.textContent = u.name || 'Docente Google';
      if (emailEl) emailEl.textContent = u.email || '';
      if (avatarEl) {
        if (u.picture) {
          avatarEl.style.backgroundImage = `url(${u.picture})`;
          avatarEl.textContent = '';
        } else {
          avatarEl.style.backgroundImage = 'none';
          avatarEl.textContent = (u.name && u.name[0]) ? u.name[0].toUpperCase() : 'G';
        }
      }

      if (googleBtnText) {
        const shortName = (u.name || 'Conectado').split(' ')[0];
        googleBtnText.textContent = shortName;
      }
    } else {
      if (userConnected) userConnected.style.display = 'none';
      if (userDisconnected) userDisconnected.style.display = 'flex';
      if (btnSignout) btnSignout.style.display = 'none';
      if (googleBtnText) googleBtnText.textContent = 'Google Drive';
    }

    const conflictBox = document.getElementById('google-sync-conflict-box');
    if (conflictBox) {
      if (window.GoogleDriveService && window.GoogleDriveService.pendingConflict) {
        conflictBox.style.display = 'flex';
      } else {
        conflictBox.style.display = 'none';
      }
    }

    if (window.GoogleDriveService.syncStatus) {
      const msg = window.GoogleDriveService.syncStatus === 'conflict'
        ? '⚠️ Conflicto detectado: Datos en Drive más recientes'
        : (window.GoogleDriveService.lastSyncTime
            ? `Última sincronización: ${window.GoogleDriveService.lastSyncTime}`
            : (isAuth ? 'Conectado con Drive' : 'Sin sincronizar'));
      window.GoogleDriveService.setSyncStatus(window.GoogleDriveService.syncStatus, msg);
    }
  },

  closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('active');
  },

  switchTab(tabId) {
    this.currentTab = tabId;
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });

    // Actualizar encabezado dinámico
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    const quickBtnText = document.getElementById('quick-action-text');

    if (tabId === 'classes-tab') {
      pageTitle.textContent = 'Mis Grupos y Clases';
      pageSubtitle.textContent = 'Organiza tus asignaturas, niveles académicos y matrículas';
      quickBtnText.textContent = 'Nueva Clase';
    } else if (tabId === 'students-tab') {
      pageTitle.textContent = 'Fichas de Alumnos';
      pageSubtitle.textContent = 'Gestión integral, contactos e incidencias de conducta';
      quickBtnText.textContent = 'Añadir Alumno';
    } else if (tabId === 'attendance-tab') {
      pageTitle.textContent = 'Control de Asistencia';
      pageSubtitle.textContent = 'Pasa lista de forma rápida en un solo clic';
      quickBtnText.textContent = 'Todos Presentes';
    } else if (tabId === 'grades-tab') {
      pageTitle.textContent = 'Cuaderno de Calificaciones';
      pageSubtitle.textContent = 'Evalúa actividades, registra notas y obtén promedios en tiempo real';
      quickBtnText.textContent = 'Nueva Actividad';
    }

    this.renderCurrentView();
  },

  renderCurrentView() {
    if (this.currentTab === 'classes-tab') {
      this.renderClassrooms();
    } else if (this.currentTab === 'students-tab') {
      this.renderStudents();
    } else if (this.currentTab === 'attendance-tab') {
      this.renderAttendance();
    } else if (this.currentTab === 'grades-tab') {
      this.renderGrades();
    }
  },

  renderClassrooms() {
    const container = document.getElementById('classrooms-container');
    const classrooms = DataService.getClassrooms();
    const allStudents = DataService.getStudents();

    container.innerHTML = '';
    classrooms.forEach(cls => {
      const studentCount = allStudents.filter(s => (s.classroomIds || [s.classroomId]).includes(cls.id)).length;
      const card = document.createElement('div');
      card.className = 'classroom-card';
      card.innerHTML = `
        <div class="classroom-card-banner" style="background-color: ${cls.color}"></div>
        <div class="classroom-card-body">
          <div class="classroom-card-header">
            <h3 class="classroom-card-title">${cls.name}</h3>
            <span class="classroom-card-badge">${cls.gradeLevel}</span>
          </div>
          <p class="classroom-card-desc">${cls.description || 'Sin descripción adicional.'}</p>
          <div class="classroom-card-meta">
            <span><strong>${studentCount}</strong> Alumnos</span>
            <span>${cls.academicYear}</span>
          </div>
        </div>
        <div class="classroom-card-actions">
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="btn btn-secondary-ghost btn-sm" title="Editar información del grupo" aria-label="Editar grupo" onclick="UIController.openEditClassroomModal('${cls.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>Editar</span>
            </button>
            <button class="btn btn-danger-ghost btn-sm" title="Eliminar clase" aria-label="Eliminar clase" onclick="UIController.confirmDeleteClassroom('${cls.id}', '${cls.name.replace(/'/g, "\\'")}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              <span class="btn-delete-text">Eliminar</span>
            </button>
          </div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end;">
            <button class="btn btn-secondary btn-sm" onclick="UIController.goToAttendance('${cls.id}')">Asistencia</button>
            <button class="btn btn-secondary btn-sm" onclick="UIController.goToGrades('${cls.id}')">Notas</button>
            <button class="btn btn-primary btn-sm" onclick="UIController.goToStudents('${cls.id}')">Alumnos</button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    if (classrooms.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: var(--color-surface); border-radius: var(--radius-lg); border: 1px dashed var(--color-border);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-subtle)" stroke-width="1.5" style="margin-bottom: 12px;"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <h3 style="font-size: 1.1rem; margin-bottom: 6px;">No tienes ningún grupo registrado</h3>
          <p style="color: var(--color-text-muted); font-size: 0.85rem; margin-bottom: 18px;">Crea una nueva clase para comenzar a gestionar alumnos y asistencia.</p>
          <button class="btn btn-primary" onclick="UIController.openClassroomModal()">Crear Nueva Clase</button>
        </div>
      `;
    }
  },

  confirmDeleteClassroom(classroomId, className) {
    const students = DataService.getStudents(classroomId);
    const count = students.length;
    let message = `¿Estás seguro de que deseas eliminar la clase "${className}"?`;
    if (count > 0) {
      message += `\n\n⚠️ Atención: Afectará a los ${count} alumno(s) asignados a esta materia o grupo (se desvincularán de esta clase, y si no pertenecen a otro grupo serán eliminados).`;
    }

    if (confirm(message)) {
      DataService.deleteClassroom(classroomId);

      // Si la clase eliminada era la seleccionada actualmente, reasignar a la primera disponible o limpiar
      const remainingClasses = DataService.getClassrooms();
      if (this.selectedClassroomId === classroomId) {
        this.selectedClassroomId = remainingClasses.length > 0 ? remainingClasses[0].id : null;
      }

      this.renderClassrooms();
      // Si estamos en otra pestaña o hay selects abiertos, mantenerlos actualizados
      this.populateClassroomSelects();
    }
  },

  openClassroomModal() {
    const form = document.getElementById('form-create-class');
    if (form) form.reset();
    const editIdInput = document.getElementById('class-edit-id');
    if (editIdInput) editIdInput.value = '';

    const modalTitle = document.getElementById('modal-class-title');
    if (modalTitle) modalTitle.textContent = 'Crear Nuevo Grupo de Alumnos';

    const submitBtn = document.getElementById('btn-submit-class');
    if (submitBtn) submitBtn.textContent = 'Guardar Grupo';

    // Seleccionar color por defecto
    const defaultColorRadio = document.querySelector('input[name="class-color"][value="#4F46E5"]');
    if (defaultColorRadio) defaultColorRadio.checked = true;

    this.openModal('modal-class');
  },

  openEditClassroomModal(classroomId) {
    const classroom = DataService.getClassrooms().find(c => c.id === classroomId);
    if (!classroom) return;

    const modalTitle = document.getElementById('modal-class-title');
    if (modalTitle) modalTitle.textContent = 'Editar Grupo de Alumnos';

    const submitBtn = document.getElementById('btn-submit-class');
    if (submitBtn) submitBtn.textContent = 'Guardar Cambios';

    document.getElementById('class-edit-id').value = classroom.id;
    document.getElementById('class-name').value = classroom.name || '';
    document.getElementById('class-grade').value = classroom.gradeLevel || '';
    document.getElementById('class-year').value = classroom.academicYear || '';
    document.getElementById('class-desc').value = classroom.description || '';

    // Marcar color correspondiente
    const colorRadio = document.querySelector(`input[name="class-color"][value="${classroom.color}"]`);
    if (colorRadio) {
      colorRadio.checked = true;
    }

    this.openModal('modal-class');
  },

  goToStudents(classroomId) {
    this.selectedClassroomId = classroomId;
    this.switchTab('students-tab');
  },

  goToAttendance(classroomId) {
    this.selectedClassroomId = classroomId;
    this.switchTab('attendance-tab');
  },

  goToGrades(classroomId) {
    this.selectedClassroomId = classroomId;
    this.switchTab('grades-tab');
  },

  populateClassroomSelects() {
    const classrooms = DataService.getClassrooms();
    const selects = ['filter-classroom-select', 'attendance-classroom-select', 'grades-classroom-select', 'student-class-select', 'grade-item-class-select', 'export-classroom-select'];
    selects.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === 'filter-classroom-select') {
        el.innerHTML = '<option value="">Todos los grupos</option>' + 
          classrooms.map(c => `<option value="${c.id}" ${c.id === this.selectedClassroomId ? 'selected' : ''}>${c.name} (${c.gradeLevel})</option>`).join('');
      } else {
        el.innerHTML = classrooms.map(c => `<option value="${c.id}" ${c.id === this.selectedClassroomId ? 'selected' : ''}>${c.name} (${c.gradeLevel})</option>`).join('');
      }
    });
  },

  renderStudents() {
    const classrooms = DataService.getClassrooms();
    const select = document.getElementById('filter-classroom-select');
    select.innerHTML = '<option value="">Todos los grupos</option>' + 
      classrooms.map(c => `<option value="${c.id}" ${c.id === this.selectedClassroomId ? 'selected' : ''}>${c.name} (${c.gradeLevel})</option>`).join('');

    const search = document.getElementById('student-search-input').value.toLowerCase().trim();
    let students = DataService.getStudents(this.selectedClassroomId || undefined);

    if (search) {
      students = students.filter(s => 
        (s.firstName + ' ' + s.lastName).toLowerCase().includes(search) ||
        (s.email && s.email.toLowerCase().includes(search))
      );
    }

    students = this.sortStudents(students);

    // Filtrar IDs seleccionados para que solo permanezcan los que existen en el listado actual
    const currentStudentIds = new Set(students.map(s => s.id));
    this.selectedStudentIds = new Set(Array.from(this.selectedStudentIds).filter(id => currentStudentIds.has(id)));
    this.updateBulkStudentsUI(students.length);

    const tbody = document.getElementById('students-table-body');
    tbody.innerHTML = '';

    if (students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted); padding: 32px;">No hay alumnos registrados en este grupo.</td></tr>`;
      return;
    }

    students.forEach(std => {
      const studentClassIds = Array.isArray(std.classroomIds) ? std.classroomIds : (std.classroomId ? [std.classroomId] : []);
      const assignedClasses = classrooms.filter(c => studentClassIds.includes(c.id));
      const incidents = DataService.getIncidents(std.id);
      const initials = (std.firstName[0] || '') + (std.lastName[0] || '');
      const isSelected = this.selectedStudentIds.has(std.id);

      let groupsHTML = '<span style="color: var(--color-text-muted); font-size: 0.75rem;">Sin grupo</span>';
      if (assignedClasses.length > 0) {
        groupsHTML = assignedClasses.map(c => `
          <span class="group-pill-badge" title="${c.name} (${c.gradeLevel})">
            <span class="group-pill-dot" style="background-color: ${c.color || '#4F46E5'};"></span>
            <span>${c.name}</span>
          </span>
        `).join('');
      }

      const tr = document.createElement('tr');
      if (isSelected) tr.classList.add('row-selected');

      tr.innerHTML = `
        <td class="student-select-cell" style="width: 44px; text-align: center;">
          <input type="checkbox" class="student-row-checkbox form-checkbox" data-student-id="${std.id}" ${isSelected ? 'checked' : ''} title="Seleccionar para acción en lote">
        </td>
        <td data-label="Alumno">
          <div class="student-identity">
            <div class="student-avatar" style="background-color: ${std.avatarColor || '#4F46E5'}">${initials}</div>
            <div>
              <div class="student-full-name">${std.firstName} ${std.lastName}</div>
              <span style="font-size: 0.75rem; color: var(--color-text-muted);">${std.phone || 'Sin teléfono'}</span>
            </div>
          </div>
        </td>
        <td data-label="Grupo(s)">
          <div class="student-groups-cell">
            ${groupsHTML}
          </div>
        </td>
        <td data-label="Email de Contacto">${std.email || '—'}</td>
        <td data-label="Incidencias">
          <button class="btn btn-secondary btn-sm" onclick="UIController.openIncidentsModal('${std.id}')">
            ${incidents.length} Anotaciones
          </button>
        </td>
        <td data-label="Acciones">
          <div class="actions-cell">
            <button class="btn-icon-ghost" title="Editar datos del alumno" onclick="UIController.openEditStudentModal('${std.id}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-danger-ghost" title="Eliminar alumno" onclick="UIController.removeStudent('${std.id}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      `;

      // Escuchar clic en el checkbox individual
      const chk = tr.querySelector('.student-row-checkbox');
      const selectCell = tr.querySelector('.student-select-cell');
      chk.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.selectedStudentIds.add(std.id);
          tr.classList.add('row-selected');
        } else {
          this.selectedStudentIds.delete(std.id);
          tr.classList.remove('row-selected');
        }
        this.updateBulkStudentsUI(students.length);
      });

      if (selectCell) {
        selectCell.addEventListener('click', (e) => {
          if (e.target !== chk) {
            chk.checked = !chk.checked;
            chk.dispatchEvent(new Event('change'));
          }
        });
      }

      tbody.appendChild(tr);
    });
  },

  updateBulkStudentsUI(totalVisibleStudents = 0) {
    const bulkBar = document.getElementById('students-bulk-bar');
    const bulkCount = document.getElementById('students-bulk-count');
    const selectAllCheckbox = document.getElementById('students-select-all');
    const selectedCount = this.selectedStudentIds.size;

    if (bulkCount) bulkCount.textContent = selectedCount;

    if (bulkBar) {
      if (selectedCount > 0) {
        bulkBar.style.display = 'flex';
      } else {
        bulkBar.style.display = 'none';
      }
    }

    if (selectAllCheckbox) {
      if (totalVisibleStudents > 0 && selectedCount === totalVisibleStudents) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
      } else if (selectedCount > 0 && selectedCount < totalVisibleStudents) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
      } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
      }
    }
  },

  toggleSelectAllStudents(checkAll) {
    const search = document.getElementById('student-search-input').value.toLowerCase().trim();
    let students = DataService.getStudents(this.selectedClassroomId || undefined);

    if (search) {
      students = students.filter(s => 
        (s.firstName + ' ' + s.lastName).toLowerCase().includes(search) ||
        (s.email && s.email.toLowerCase().includes(search))
      );
    }

    if (checkAll) {
      students.forEach(s => this.selectedStudentIds.add(s.id));
    } else {
      this.selectedStudentIds.clear();
    }

    this.renderStudents();
  },

  renderAttendance() {
    const classrooms = DataService.getClassrooms();
    const select = document.getElementById('attendance-classroom-select');
    select.innerHTML = classrooms.map(c => `<option value="${c.id}" ${c.id === this.selectedClassroomId ? 'selected' : ''}>${c.name}</option>`).join('');

    const targetClassroomId = select.value;
    let students = DataService.getStudents(targetClassroomId);
    students = this.sortStudents(students);
    const records = DataService.getAttendanceRecords(targetClassroomId, this.selectedDate);

    // Contadores estadísticos
    let pCount = 0, lCount = 0, aCount = 0;
    records.forEach(r => {
      if (r.status === 'PRESENT') pCount++;
      if (r.status === 'LATE') lCount++;
      if (r.status === 'ABSENT') aCount++;
    });

    document.getElementById('stat-present-count').textContent = pCount;
    document.getElementById('stat-late-count').textContent = lCount;
    document.getElementById('stat-absent-count').textContent = aCount;

    const roster = document.getElementById('attendance-roster-container');
    roster.innerHTML = '';

    if (students.length === 0) {
      roster.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--color-text-muted);">No hay estudiantes en este grupo para pasar lista.</div>';
      return;
    }

    students.forEach(std => {
      const record = records.find(r => r.studentId === std.id);
      const currentStatus = record ? record.status : 'PRESENT'; // Por defecto presente si no hay registro
      const initials = (std.firstName[0] || '') + (std.lastName[0] || '');

      const card = document.createElement('div');
      card.className = 'roster-card';
      card.innerHTML = `
        <div class="student-identity">
          <div class="student-avatar" style="background-color: ${std.avatarColor || '#4F46E5'}">${initials}</div>
          <div class="student-full-name">${std.firstName} ${std.lastName}</div>
        </div>
        <div class="roster-actions">
          <button class="status-btn ${currentStatus === 'PRESENT' ? 'selected-PRESENT' : ''}" onclick="UIController.updateStatus('${std.id}', '${targetClassroomId}', 'PRESENT')">Presente</button>
          <button class="status-btn ${currentStatus === 'LATE' ? 'selected-LATE' : ''}" onclick="UIController.updateStatus('${std.id}', '${targetClassroomId}', 'LATE')">Atraso</button>
          <button class="status-btn ${currentStatus === 'ABSENT' ? 'selected-ABSENT' : ''}" onclick="UIController.updateStatus('${std.id}', '${targetClassroomId}', 'ABSENT')">Falta</button>
        </div>
      `;
      roster.appendChild(card);
    });
  },

  updateStatus(studentId, classroomId, status) {
    DataService.setAttendanceStatus(studentId, classroomId, this.selectedDate, status);
    this.renderAttendance();
  },

  markAllAttendanceStatus(status = 'PRESENT') {
    const select = document.getElementById('attendance-classroom-select');
    const targetClassroomId = select ? select.value : this.selectedClassroomId;
    if (!targetClassroomId) return alert('Por favor selecciona un grupo primero.');

    const students = DataService.getStudents(targetClassroomId);
    if (students.length === 0) return alert('No hay estudiantes en este grupo para registrar asistencia.');

    const studentIds = students.map(s => s.id);
    DataService.setBulkAttendanceStatus(studentIds, targetClassroomId, this.selectedDate, status);
    this.renderAttendance();
  },

  markAllPresent() {
    this.markAllAttendanceStatus('PRESENT');
  },

  openBulkGradeModal() {
    const select = document.getElementById('grades-classroom-select');
    const currentClassId = select ? select.value : this.selectedClassroomId;
    if (!currentClassId) return alert('Por favor selecciona un grupo primero.');

    const gradeItems = DataService.getGradeItems(currentClassId);
    if (gradeItems.length === 0) {
      alert('Este grupo aún no tiene actividades o exámenes creados. Crea primero una actividad para poder asignarle calificación.');
      this.openGradeItemModal();
      return;
    }

    const activitySelect = document.getElementById('bulk-grade-activity-select');
    if (activitySelect) {
      activitySelect.innerHTML = gradeItems.map(g => `<option value="${g.id}">${g.title} (Máx: ${g.maxScore})</option>`).join('');
    }

    const scoreInput = document.getElementById('bulk-grade-score-input');
    if (scoreInput) {
      scoreInput.value = gradeItems[0].maxScore || 10;
    }

    this.openModal('modal-bulk-grade');
  },

  openBulkIncidentModal() {
    const count = this.selectedStudentIds.size;
    if (count === 0) {
      return alert('Por favor selecciona al menos una casilla de alumno para aplicar una anotación masiva.');
    }

    const countLabel = document.getElementById('bulk-incident-count-label');
    if (countLabel) countLabel.textContent = count;

    document.getElementById('bulk-incident-title').value = '';
    document.getElementById('bulk-incident-comment').value = '';

    this.openModal('modal-bulk-incident');
  },

  removeStudent(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este alumno de la lista?')) {
      DataService.deleteStudent(id);
      this.renderStudents();
    }
  },

  renderStudentClassroomsCheckboxes(selectedClassroomIds = []) {
    const container = document.getElementById('student-classrooms-checkboxes');
    if (!container) return;

    const classrooms = DataService.getClassrooms();
    if (classrooms.length === 0) {
      container.innerHTML = '<span style="font-size: 0.8rem; color: var(--color-text-muted);">No tienes clases creadas aún. Por favor crea una clase primero.</span>';
      return;
    }

    container.innerHTML = classrooms.map(c => {
      const isChecked = selectedClassroomIds.includes(c.id);
      return `
        <label class="classroom-checkbox-item">
          <input type="checkbox" name="student-assigned-classrooms" value="${c.id}" ${isChecked ? 'checked' : ''}>
          <span class="classroom-checkbox-color-dot" style="background-color: ${c.color || '#4F46E5'};"></span>
          <span class="classroom-checkbox-name">${c.name}</span>
          <span class="classroom-checkbox-grade">${c.gradeLevel}</span>
        </label>
      `;
    }).join('');
  },

  openStudentModal() {
    const form = document.getElementById('form-create-student');
    if (form) form.reset();
    const editIdInput = document.getElementById('student-edit-id');
    if (editIdInput) editIdInput.value = '';

    const modalTitle = document.getElementById('modal-student-title');
    if (modalTitle) modalTitle.textContent = 'Registrar Nuevo Alumno';

    const submitBtn = document.getElementById('btn-submit-student');
    if (submitBtn) submitBtn.textContent = 'Matricular Alumno';

    // Por defecto, preseleccionar la clase actual si existe
    const defaultSelection = this.selectedClassroomId ? [this.selectedClassroomId] : [];
    this.renderStudentClassroomsCheckboxes(defaultSelection);

    this.openModal('modal-student');
  },

  openEditStudentModal(studentId) {
    const student = DataService.getStudents().find(s => s.id === studentId);
    if (!student) return;

    const modalTitle = document.getElementById('modal-student-title');
    if (modalTitle) modalTitle.textContent = 'Editar Información del Alumno';

    const submitBtn = document.getElementById('btn-submit-student');
    if (submitBtn) submitBtn.textContent = 'Guardar Cambios';

    document.getElementById('student-edit-id').value = student.id;
    document.getElementById('student-firstname').value = student.firstName || '';
    document.getElementById('student-lastname').value = student.lastName || '';
    document.getElementById('student-email').value = student.email || '';
    document.getElementById('student-phone').value = student.phone || '';

    const currentGroups = Array.isArray(student.classroomIds) ? student.classroomIds : (student.classroomId ? [student.classroomId] : []);
    this.renderStudentClassroomsCheckboxes(currentGroups);

    this.openModal('modal-student');
  },

  openIncidentsModal(studentId) {
    const student = DataService.getStudents().find(s => s.id === studentId);
    if (!student) return;

    document.getElementById('incident-student-id').value = student.id;
    document.getElementById('modal-student-name').textContent = `${student.firstName} ${student.lastName}`;
    document.getElementById('modal-student-details').textContent = student.email || 'Sin correo asociado';
    document.getElementById('modal-student-avatar').textContent = (student.firstName[0] || '') + (student.lastName[0] || '');
    document.getElementById('modal-student-avatar').style.backgroundColor = student.avatarColor || '#4F46E5';

    this.renderIncidentsModal(studentId);
    this.openModal('modal-incidents');
  },

  renderIncidentsModal(studentId) {
    const list = DataService.getIncidents(studentId);
    const container = document.getElementById('incidents-list-container');
    container.innerHTML = '';

    if (list.length === 0) {
      container.innerHTML = '<div style="font-size: 0.85rem; color: var(--color-text-muted); text-align: center; padding: 16px;">Sin incidencias registradas aún.</div>';
      return;
    }

    list.forEach(item => {
      const div = document.createElement('div');
      div.className = `incident-item ${item.type}`;
      div.innerHTML = `
        <div>
          <strong style="font-size: 0.85rem;">${item.title}</strong>
          <p style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 2px;">${item.comment}</p>
        </div>
        <span style="font-size: 0.75rem; color: var(--color-text-muted);">${item.date}</span>
      `;
      container.appendChild(div);
    });
  },

  // --- GESTIÓN DE CALIFICACIONES ---
  openGradeItemModal() {
    const classrooms = DataService.getClassrooms();
    const select = document.getElementById('grade-item-class-select');
    if (select) {
      select.innerHTML = classrooms.map(c => `<option value="${c.id}" ${c.id === this.selectedClassroomId ? 'selected' : ''}>${c.name} (${c.gradeLevel})</option>`).join('');
    }
    this.openModal('modal-grade-item');
  },

  renderGrades() {
    const classrooms = DataService.getClassrooms();
    const selectClass = document.getElementById('grades-classroom-select');
    if (selectClass) {
      selectClass.innerHTML = classrooms.map(c => `<option value="${c.id}" ${c.id === this.selectedClassroomId ? 'selected' : ''}>${c.name} (${c.gradeLevel})</option>`).join('');
    }

    const currentClassId = this.selectedClassroomId || (classrooms[0] ? classrooms[0].id : null);
    const headerRow = document.getElementById('grades-table-header');
    const tableBody = document.getElementById('grades-table-body');
    const activitySelect = document.getElementById('grades-activity-select');

    if (!currentClassId) {
      if (headerRow) headerRow.innerHTML = '<th>Alumno</th><th>Promedio</th>';
      if (tableBody) tableBody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: var(--color-text-muted); padding: 32px;">No hay clases disponibles. Crea un grupo primero.</td></tr>';
      return;
    }

    let students = DataService.getStudents(currentClassId);
    students = this.sortStudents(students);
    const allGradeItems = DataService.getGradeItems(currentClassId);
    const allGrades = DataService.getGrades(currentClassId);

    // Sincronizar select de tipo si existe
    const typeSelect = document.getElementById('grades-type-select');
    if (typeSelect && typeSelect.value !== this.selectedGradeType) {
      typeSelect.value = this.selectedGradeType;
    }

    // Filtrar actividades según el tipo seleccionado
    const itemsMatchingType = this.selectedGradeType
      ? allGradeItems.filter(g => g.type === this.selectedGradeType)
      : allGradeItems;

    // Actualizar filtro secundario de actividades con opciones acordes al tipo
    if (activitySelect) {
      let optionsHTML = '<option value="">Todas las actividades</option>';
      itemsMatchingType.forEach(g => {
        optionsHTML += `<option value="${g.id}" ${g.id === this.selectedGradeItemId ? 'selected' : ''}>${g.title} (Máx: ${g.maxScore})</option>`;
      });
      activitySelect.innerHTML = optionsHTML;
    }

    // Items de evaluación visibles en la tabla (filtrados por tipo y opcionalmente por actividad específica)
    let visibleGradeItems = itemsMatchingType;
    if (this.selectedGradeItemId) {
      const singleItem = itemsMatchingType.find(g => g.id === this.selectedGradeItemId);
      if (singleItem) {
        visibleGradeItems = [singleItem];
      }
    }

    // Cabecera de la tabla con cada actividad / examen visible
    let headerHTML = '<th>Alumno</th>';
    visibleGradeItems.forEach(item => {
      const typeLabels = { exam: 'Examen', homework: 'Tarea', project: 'Proyecto', participation: 'Part.' };
      headerHTML += `
        <th class="grade-col-activity">
          <div class="activity-th-header">
            <span class="activity-th-title">${item.title}</span>
            <div style="display: flex; gap: 4px; align-items: center;">
              <span class="activity-th-badge">${typeLabels[item.type] || item.type} • /${item.maxScore}</span>
              <button class="btn-danger-ghost" title="Eliminar actividad" onclick="UIController.confirmDeleteGradeItem('${item.id}', '${item.title.replace(/'/g, "\\'")}')" style="padding: 2px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
              </button>
            </div>
          </div>
        </th>
      `;
    });
    const avgHeaderTitle = this.selectedGradeType ? 'Promedio (Filtro)' : 'Promedio';
    headerHTML += `<th style="text-align: center; min-width: 90px;" title="Promedio de notas visibles">${avgHeaderTitle}</th>`;
    if (headerRow) headerRow.innerHTML = headerHTML;

    // Filas con cada estudiante y sus calificaciones
    if (tableBody) {
      tableBody.innerHTML = '';

      if (students.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${visibleGradeItems.length + 2}" style="text-align: center; color: var(--color-text-muted); padding: 32px;">No hay alumnos matriculados en esta clase.</td></tr>`;
        return;
      }

      if (visibleGradeItems.length === 0) {
        const noItemsMsg = this.selectedGradeType
          ? 'No hay actividades registradas con el tipo de evaluación seleccionado.'
          : 'No hay actividades ni exámenes creados para este grupo todavía.';
        tableBody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--color-text-muted); padding: 32px;">${noItemsMsg}</td></tr>`;
        return;
      }
    }

    // Estado y renderizado con Windowing / Virtualización de filas para alto rendimiento
    this.gradesVirtualState = {
      students,
      visibleGradeItems,
      allGrades,
      currentClassId,
      avgHeaderTitle,
      rowHeight: 58,
      overscan: 4,
      totalCount: students.length
    };

    if (!this.gradesScrollBound) {
      const container = document.querySelector('.grades-table-container');
      if (container) {
        container.addEventListener('scroll', () => {
          const isMobileCards = document.documentElement.getAttribute('data-view-mode') !== 'table' && window.innerWidth <= 768;
          if (isMobileCards) return;
          this.renderVirtualGradesWindow();
        }, { passive: true });
        window.addEventListener('resize', () => {
          this.renderVirtualGradesWindow();
        }, { passive: true });
        this.gradesScrollBound = true;
      }
    }

    this.renderVirtualGradesWindow();
  },

  gradesVirtualState: null,
  gradesScrollBound: false,

  renderVirtualGradesWindow() {
    if (!this.gradesVirtualState) return;
    const { students, visibleGradeItems, allGrades, currentClassId, avgHeaderTitle, rowHeight, overscan, totalCount } = this.gradesVirtualState;
    const tableBody = document.getElementById('grades-table-body');
    const container = document.querySelector('.grades-table-container');
    if (!tableBody || !container) return;

    if (totalCount === 0 || visibleGradeItems.length === 0) return;

    // Detectar si está en modo tarjetas móvil (no usar virtualización fija si no está en modo tabla)
    const isMobileCards = document.documentElement.getAttribute('data-view-mode') !== 'table' && window.innerWidth <= 768;
    if (isMobileCards) {
      // En vista móvil de tarjetas, renderizar sin spacers
      this.renderFullGradesRows(students, visibleGradeItems, allGrades, currentClassId, avgHeaderTitle, tableBody);
      const statsBadge = document.getElementById('grades-virtual-stats');
      if (statsBadge) statsBadge.style.display = 'none';
      return;
    }

    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight || 450;
    const totalCols = visibleGradeItems.length + 2;

    // Cálculo del rango visible (Windowing / Virtual Window)
    let startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    let endIndex = Math.min(totalCount - 1, Math.ceil((scrollTop + clientHeight) / rowHeight) + overscan);

    const topSpacerHeight = startIndex * rowHeight;
    const bottomSpacerHeight = Math.max(0, (totalCount - 1 - endIndex) * rowHeight);

    let html = '';

    // Spacer superior que mantiene el scrollbar nativo idéntico al de Excel
    if (topSpacerHeight > 0) {
      html += `<tr class="virtual-spacer-row" style="height: ${topSpacerHeight}px;"><td colspan="${totalCols}" style="height: ${topSpacerHeight}px; padding: 0; border: none;"></td></tr>`;
    }

    // Renderizar únicamente las filas dentro de la ventana de visualización activa
    for (let rowIndex = startIndex; rowIndex <= endIndex; rowIndex++) {
      const std = students[rowIndex];
      if (!std) continue;

      const initials = (std.firstName[0] || '') + (std.lastName[0] || '');
      let cellsHTML = `
        <td data-label="Alumno">
          <div class="student-identity">
            <div class="student-avatar" style="background-color: ${std.avatarColor || '#4F46E5'}">${initials}</div>
            <div class="student-full-name">${std.firstName} ${std.lastName}</div>
          </div>
        </td>
      `;

      let totalScores = 0;
      let ratedCount = 0;

      visibleGradeItems.forEach((item, colIndex) => {
        const gradeRecord = allGrades.find(g => g.studentId === std.id && g.gradeItemId === item.id);
        const currentScore = gradeRecord !== undefined && gradeRecord.score !== null ? gradeRecord.score : '';

        if (currentScore !== '') {
          const normalized = (parseFloat(currentScore) / item.maxScore) * 10;
          totalScores += normalized;
          ratedCount++;
        }

        cellsHTML += `
          <td data-label="${item.title} (/${item.maxScore})" class="grade-cell-activity" data-cell-row="${rowIndex}" data-cell-col="${colIndex}">
            <input 
              type="number" 
              class="grade-input" 
              value="${currentScore}" 
              min="0" 
              max="${item.maxScore}" 
              step="0.1" 
              placeholder="—"
              title="Nota para ${item.title} (Máx: ${item.maxScore})"
              data-row="${rowIndex}"
              data-col="${colIndex}"
              data-student-id="${std.id}"
              data-item-id="${item.id}"
              data-class-id="${currentClassId}"
              data-max-score="${item.maxScore}"
              onfocus="UIController.handleGradeInputFocus(this)"
              onblur="UIController.handleGradeInputBlur(this)"
              onkeydown="UIController.handleGradeInputKeydown(event, this)"
              onchange="UIController.updateStudentGrade('${std.id}', '${item.id}', '${currentClassId}', this.value, false)"
            >
          </td>
        `;
      });

      let averageHTML = '';
      if (ratedCount > 0) {
        const avg = (totalScores / ratedCount).toFixed(1);
        let avgClass = 'grade-average-medium';
        if (avg >= 7.0) avgClass = 'grade-average-high';
        else if (avg < 5.0) avgClass = 'grade-average-low';
        averageHTML = `<span class="grade-average-badge ${avgClass}">${avg}</span>`;
      } else {
        averageHTML = `<span class="grade-average-badge grade-average-none">—</span>`;
      }

      cellsHTML += `<td data-label="${avgHeaderTitle}" class="grade-cell-average" id="avg-student-${std.id}">${averageHTML}</td>`;
      html += `<tr class="virtual-row" data-student-id="${std.id}" data-row-index="${rowIndex}">${cellsHTML}</tr>`;
    }

    // Spacer inferior
    if (bottomSpacerHeight > 0) {
      html += `<tr class="virtual-spacer-row" style="height: ${bottomSpacerHeight}px;"><td colspan="${totalCols}" style="height: ${bottomSpacerHeight}px; padding: 0; border: none;"></td></tr>`;
    }

    tableBody.innerHTML = html;

    // Actualizar indicador de estadísticas de virtualización
    const statsBadge = document.getElementById('grades-virtual-stats');
    const statsText = document.getElementById('grades-virtual-text');
    if (statsBadge && statsText) {
      const renderedCount = (endIndex - startIndex + 1);
      statsBadge.style.display = 'inline-flex';
      statsText.textContent = `Renderizando ${renderedCount} de ${totalCount} alumnos (DOM Windowing)`;
    }
  },

  renderFullGradesRows(students, visibleGradeItems, allGrades, currentClassId, avgHeaderTitle, tableBody) {
    const container = document.querySelector('.grades-table-container');
    if (container) {
      container.scrollLeft = 0;
      container.scrollTop = 0;
    }
    const statsBadge = document.getElementById('grades-virtual-stats');
    if (statsBadge) statsBadge.style.display = 'none';

    let html = '';
    students.forEach((std, rowIndex) => {
      const initials = (std.firstName[0] || '') + (std.lastName[0] || '');
      let cellsHTML = `
        <td data-label="Alumno">
          <div class="student-identity">
            <div class="student-avatar" style="background-color: ${std.avatarColor || '#4F46E5'}">${initials}</div>
            <div class="student-full-name">${std.firstName} ${std.lastName}</div>
          </div>
        </td>
      `;

      let totalScores = 0;
      let ratedCount = 0;

      visibleGradeItems.forEach((item, colIndex) => {
        const gradeRecord = allGrades.find(g => g.studentId === std.id && g.gradeItemId === item.id);
        const currentScore = gradeRecord !== undefined && gradeRecord.score !== null ? gradeRecord.score : '';

        if (currentScore !== '') {
          const normalized = (parseFloat(currentScore) / item.maxScore) * 10;
          totalScores += normalized;
          ratedCount++;
        }

        cellsHTML += `
          <td data-label="${item.title} (/${item.maxScore})" class="grade-cell-activity" data-cell-row="${rowIndex}" data-cell-col="${colIndex}">
            <input 
              type="number" 
              class="grade-input" 
              value="${currentScore}" 
              min="0" 
              max="${item.maxScore}" 
              step="0.1" 
              placeholder="—"
              title="Nota para ${item.title} (Máx: ${item.maxScore})"
              data-row="${rowIndex}"
              data-col="${colIndex}"
              data-student-id="${std.id}"
              data-item-id="${item.id}"
              data-class-id="${currentClassId}"
              data-max-score="${item.maxScore}"
              onfocus="UIController.handleGradeInputFocus(this)"
              onblur="UIController.handleGradeInputBlur(this)"
              onkeydown="UIController.handleGradeInputKeydown(event, this)"
              onchange="UIController.updateStudentGrade('${std.id}', '${item.id}', '${currentClassId}', this.value, false)"
            >
          </td>
        `;
      });

      let averageHTML = '';
      if (ratedCount > 0) {
        const avg = (totalScores / ratedCount).toFixed(1);
        let avgClass = 'grade-average-medium';
        if (avg >= 7.0) avgClass = 'grade-average-high';
        else if (avg < 5.0) avgClass = 'grade-average-low';
        averageHTML = `<span class="grade-average-badge ${avgClass}">${avg}</span>`;
      } else {
        averageHTML = `<span class="grade-average-badge grade-average-none">—</span>`;
      }

      cellsHTML += `<td data-label="${avgHeaderTitle}" class="grade-cell-average" id="avg-student-${std.id}">${averageHTML}</td>`;
      html += `<tr data-student-id="${std.id}" data-row-index="${rowIndex}">${cellsHTML}</tr>`;
    });
    tableBody.innerHTML = html;
  },

  handleGradeInputFocus(input) {
    const tr = input.closest('tr');
    if (tr) tr.classList.add('row-focused');
    const td = input.closest('td');
    if (td) td.classList.add('cell-focused');

    setTimeout(() => {
      try { input.select(); } catch (e) {}
    }, 10);
  },

  handleGradeInputBlur(input) {
    const tr = input.closest('tr');
    if (tr) tr.classList.remove('row-focused');
    const td = input.closest('td');
    if (td) td.classList.remove('cell-focused');
  },

  handleGradeInputKeydown(event, input) {
    const key = event.key;
    const isEnter = key === 'Enter';
    const isTab = key === 'Tab';
    const isArrowUp = key === 'ArrowUp';
    const isArrowDown = key === 'ArrowDown';
    const isArrowLeft = key === 'ArrowLeft';
    const isArrowRight = key === 'ArrowRight';
    const isEscape = key === 'Escape';

    if (isEscape) {
      input.blur();
      return;
    }

    if (!isEnter && !isTab && !isArrowUp && !isArrowDown && !isArrowLeft && !isArrowRight) {
      return;
    }

    const currentRow = parseInt(input.getAttribute('data-row'), 10);
    const currentCol = parseInt(input.getAttribute('data-col'), 10);

    let nextRow = currentRow;
    let nextCol = currentCol;

    if (isEnter) {
      event.preventDefault();
      nextRow = event.shiftKey ? currentRow - 1 : currentRow + 1;
    } else if (isArrowDown) {
      event.preventDefault();
      nextRow = currentRow + 1;
    } else if (isArrowUp) {
      event.preventDefault();
      nextRow = currentRow - 1;
    } else if (isTab) {
      event.preventDefault();
      nextCol = event.shiftKey ? currentCol - 1 : currentCol + 1;
    } else if (isArrowRight) {
      if (input.selectionEnd === input.value.length) {
        event.preventDefault();
        nextCol = currentCol + 1;
      }
    } else if (isArrowLeft) {
      if (input.selectionStart === 0) {
        event.preventDefault();
        nextCol = currentCol - 1;
      }
    }

    // Guardar valor actual
    const studentId = input.getAttribute('data-student-id');
    const itemId = input.getAttribute('data-item-id');
    const classId = input.getAttribute('data-class-id');
    this.updateStudentGrade(studentId, itemId, classId, input.value, false);

    // Mover foco asegurando que si la celda está fuera de la ventana virtual, se haga scroll automático
    const container = document.querySelector('.grades-table-container');
    const rowHeight = (this.gradesVirtualState && this.gradesVirtualState.rowHeight) || 58;

    if (container && nextRow !== currentRow) {
      const isMobileCards = document.documentElement.getAttribute('data-view-mode') !== 'table' && window.innerWidth <= 768;
      if (!isMobileCards) {
        const targetScrollTop = nextRow * rowHeight;
        const currentScrollTop = container.scrollTop;
        const clientHeight = container.clientHeight || 450;

        if (targetScrollTop < currentScrollTop || targetScrollTop + rowHeight > currentScrollTop + clientHeight) {
          container.scrollTop = Math.max(0, targetScrollTop - (clientHeight / 2));
          this.renderVirtualGradesWindow();
        }
      }
    }

    setTimeout(() => {
      const targetInput = document.querySelector(`.grade-input[data-row="${nextRow}"][data-col="${nextCol}"]`);
      if (targetInput) {
        targetInput.focus();
        targetInput.select();
      }
    }, 20);
  },

  updateStudentGrade(studentId, gradeItemId, classroomId, value, triggerFullRender = true) {
    DataService.setStudentGrade(studentId, gradeItemId, classroomId, value);

    if (triggerFullRender) {
      this.renderGrades();
    } else {
      // Actualización quirúrgica del promedio del alumno sin parpadear ni perder foco
      this.refreshStudentRowAverage(studentId, classroomId);
    }

    // Respaldo automático transparente en Google Drive
    if (window.GoogleDriveService && window.GoogleDriveService.scheduleAutoSync) {
      window.GoogleDriveService.scheduleAutoSync();
    }
  },

  refreshStudentRowAverage(studentId, classroomId) {
    const avgCell = document.getElementById(`avg-student-${studentId}`);
    if (!avgCell) return;

    const allGrades = DataService.getGrades(classroomId);
    const allGradeItems = DataService.getGradeItems(classroomId);

    let totalScores = 0;
    let ratedCount = 0;

    allGradeItems.forEach(item => {
      const g = allGrades.find(r => r.studentId === studentId && r.gradeItemId === item.id);
      if (g && g.score !== null && g.score !== undefined && !isNaN(g.score)) {
        totalScores += (parseFloat(g.score) / item.maxScore) * 10;
        ratedCount++;
      }
    });

    if (ratedCount > 0) {
      const avg = (totalScores / ratedCount).toFixed(1);
      let avgClass = 'grade-average-medium';
      if (avg >= 7.0) avgClass = 'grade-average-high';
      else if (avg < 5.0) avgClass = 'grade-average-low';

      avgCell.innerHTML = `<span class="grade-average-badge ${avgClass}">${avg}</span>`;
    } else {
      avgCell.innerHTML = `<span class="grade-average-badge grade-average-none">—</span>`;
    }
  },

  confirmDeleteGradeItem(gradeItemId, title) {
    if (confirm(`¿Estás seguro de que deseas eliminar la actividad "${title}" y todas sus calificaciones registradas?`)) {
      const allGradeItems = DataService.getGradeItems().filter(g => g.id !== gradeItemId);
      localStorage.setItem(STORAGE_KEYS.GRADE_ITEMS, JSON.stringify(allGradeItems));

      const allGrades = DataService.getGrades().filter(g => g.gradeItemId !== gradeItemId);
      localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(allGrades));

      this.renderGrades();
    }
  },

  openExportModal(defaultDocType = null) {
    this.populateClassroomSelects();
    const select = document.getElementById('export-classroom-select');
    if (select && this.selectedClassroomId) {
      select.value = this.selectedClassroomId;
    }

    // Si no se especificó un tipo por parámetro, preseleccionar según la pestaña activa del docente
    let targetType = defaultDocType;
    if (!targetType) {
      if (this.currentTab === 'attendance-tab') {
        targetType = 'attendance-consolidated';
      } else if (this.currentTab === 'grades-tab') {
        targetType = 'grades';
      } else {
        targetType = 'grades';
      }
    }

    if (targetType) {
      const radio = document.querySelector(`input[name="export-doc-type"][value="${targetType}"]`);
      if (radio) {
        radio.checked = true;
        document.querySelectorAll('.export-option-card').forEach(c => c.classList.remove('selected'));
        const parentCard = radio.closest('.export-option-card');
        if (parentCard) parentCard.classList.add('selected');
      }
    }
    this.openModal('modal-export-reports');
  },

  openTeacherProfileModal() {
    const teacher = DataService.getTeacherProfile();
    const prefixEl = document.getElementById('teacher-prefix');
    const nameEl = document.getElementById('teacher-name-input');
    const specialtyEl = document.getElementById('teacher-specialty');
    const schoolEl = document.getElementById('teacher-school-input');
    const emailEl = document.getElementById('teacher-email-input');
    const previewEl = document.getElementById('preview-teacher-avatar');

    if (prefixEl) prefixEl.value = teacher.prefix || 'Prof.';
    if (nameEl) nameEl.value = teacher.name || '';
    if (specialtyEl) specialtyEl.value = teacher.specialty || '';
    if (schoolEl) schoolEl.value = teacher.school || '';
    if (emailEl) emailEl.value = teacher.email || '';

    // Color del avatar
    const color = teacher.avatarColor || '#6366F1';
    const radio = document.querySelector(`input[name="teacher-avatar-color"][value="${color}"]`);
    if (radio) radio.checked = true;

    if (previewEl) {
      const initial = (teacher.name && teacher.name.trim().length > 0) ? teacher.name.trim()[0].toUpperCase() : 'P';
      previewEl.textContent = initial;
      previewEl.style.backgroundColor = color;
    }

    this.openModal('modal-teacher-profile');
  },

  openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
  },

  closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
  },

  // --- PROGRESSIVE WEB APP (PWA) & INSTALACIÓN ---
  deferredInstallPrompt: null,

  initPWA() {
    // 1. Registro del Service Worker para funcionamiento 100% offline
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('✅ [PWA] Service Worker registrado con éxito. Ámbito:', reg.scope);
            // Comprobar si hay una nueva versión disponible
            reg.onupdatefound = () => {
              const installingWorker = reg.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('⚡ [PWA] Nueva versión disponible en segundo plano.');
                  }
                };
              }
            };
          })
          .catch((err) => {
            console.warn('⚠️ [PWA] Error registrando Service Worker:', err);
          });
      });
    }

    // 2. Capturar evento de instalación nativo (beforeinstallprompt)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      console.log('📱 [PWA] Evento beforeinstallprompt capturado. Listo para instalación.');

      const installBtn = document.getElementById('btn-pwa-install');
      if (installBtn) {
        installBtn.style.display = 'inline-flex';
      }

      // Mostrar banner de invitación a instalar si no se ha descartado previamente en la sesión
      const hasDismissed = sessionStorage.getItem('educap_pwa_banner_dismissed');
      if (!hasDismissed && !window.matchMedia('(display-mode: standalone)').matches) {
        setTimeout(() => this.showPwaInstallBanner(), 2500);
      }
    });

    // 3. Manejar evento cuando la app ya fue instalada
    window.addEventListener('appinstalled', () => {
      console.log('🎉 [PWA] ¡EduPlan se ha instalado exitosamente como App Nativa!');
      this.deferredInstallPrompt = null;
      this.hidePwaInstallBanner();
      const installBtn = document.getElementById('btn-pwa-install');
      if (installBtn) installBtn.classList.add('installed');
      if (window.GoogleDriveService && window.GoogleDriveService.showToast) {
        window.GoogleDriveService.showToast('¡EduPlan se ha instalado en tu dispositivo!');
      }
    });

    // 4. Si ya está corriendo como PWA independiente (standalone)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      const installBtn = document.getElementById('btn-pwa-install');
      if (installBtn) installBtn.classList.add('installed');
    }
  },

  async triggerPwaInstall() {
    if (this.deferredInstallPrompt) {
      this.deferredInstallPrompt.prompt();
      const choiceResult = await this.deferredInstallPrompt.userChoice;
      console.log('Resultado de instalación:', choiceResult.outcome);
      if (choiceResult.outcome === 'accepted') {
        this.hidePwaInstallBanner();
      }
      this.deferredInstallPrompt = null;
    } else {
      // Si el navegador no soporta o no emitió beforeinstallprompt (ej. iOS Safari o ya instalada)
      alert('Para instalar EduPlan en tu pantalla de inicio:\n\n• En Chrome / Edge: Haz clic en el ícono de instalación en la barra de direcciones o en Menú > Instalar EduPlan.\n• En iPhone/iPad (Safari): Toca el botón "Compartir" y selecciona "Agregar a la pantalla de inicio".');
    }
  },

  showPwaInstallBanner() {
    if (document.getElementById('pwa-install-banner') || window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'pwa-install-banner';
    banner.innerHTML = `
      <div class="pwa-banner-header">
        <div class="pwa-banner-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
            <path d="M6 6h10M6 10h10"/>
          </svg>
        </div>
        <div class="pwa-banner-info">
          <h4>Instala EduPlan</h4>
          <p>Úsalo como app nativa directamente en tu pantalla de inicio, sin consumir datos y con soporte offline total.</p>
        </div>
      </div>
      <div class="pwa-banner-actions">
        <button type="button" class="btn btn-secondary" id="btn-pwa-dismiss">Ahora no</button>
        <button type="button" class="btn btn-primary" id="btn-pwa-confirm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Instalar App
        </button>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('btn-pwa-confirm').addEventListener('click', () => {
      this.triggerPwaInstall();
    });

    document.getElementById('btn-pwa-dismiss').addEventListener('click', () => {
      sessionStorage.setItem('educap_pwa_banner_dismissed', 'true');
      this.hidePwaInstallBanner();
    });
  },

  hidePwaInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.remove();
    }
  }
};

// Exportar UIController globalmente
window.UIController = UIController;

// Iniciar aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  UIController.init();
  UIController.initPWA();
});
