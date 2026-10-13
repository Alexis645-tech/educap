import { Classroom, Student, AttendanceRecord, AttendanceStatus, StudentIncident } from './models';

// ========================================================
// SERVICIO DE ALMACENAMIENTO LOCAL OFFLINE-FIRST (LocalStorage)
// ========================================================

const STORAGE_KEYS = {
  CLASSROOMS: 'educap_classrooms_v1',
  STUDENTS: 'educap_students_v1',
  ATTENDANCE: 'educap_attendance_v1',
  INCIDENTS: 'educap_incidents_v1'
};

export class StorageService {
  static getClassrooms(): Classroom[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CLASSROOMS);
    if (!raw) {
      const defaults = this.initDefaultData();
      return defaults.classrooms;
    }
    return JSON.parse(raw);
  }

  static saveClassrooms(classrooms: Classroom[]): void {
    localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(classrooms));
  }

  static addClassroom(classroom: Classroom): void {
    const list = this.getClassrooms();
    list.push(classroom);
    this.saveClassrooms(list);
  }

  static getStudents(classroomId?: string): Student[] {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    let list: Student[] = raw ? JSON.parse(raw) : [];
    if (!raw) {
      const defaults = this.initDefaultData();
      list = defaults.students;
    }
    if (classroomId) {
      return list.filter(s => s.classroomId === classroomId);
    }
    return list;
  }

  static saveStudents(students: Student[]): void {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }

  static addStudent(student: Student): void {
    const list = this.getStudents();
    list.push(student);
    this.saveStudents(list);
  }

  static deleteStudent(studentId: string): void {
    const list = this.getStudents().filter(s => s.id !== studentId);
    this.saveStudents(list);
  }

  static getAttendance(classroomId: string, date: string): AttendanceRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    const list: AttendanceRecord[] = raw ? JSON.parse(raw) : [];
    return list.filter(a => a.classroomId === classroomId && a.date === date);
  }

  static setAttendance(record: AttendanceRecord): void {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    let list: AttendanceRecord[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex(a => a.studentId === record.studentId && a.date === record.date);
    if (index >= 0) {
      list[index] = record;
    } else {
      list.push(record);
    }
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(list));
  }

  static getIncidents(studentId: string): StudentIncident[] {
    const raw = localStorage.getItem(STORAGE_KEYS.INCIDENTS);
    const list: StudentIncident[] = raw ? JSON.parse(raw) : [];
    return list.filter(i => i.studentId === studentId);
  }

  static addIncident(incident: StudentIncident): void {
    const raw = localStorage.getItem(STORAGE_KEYS.INCIDENTS);
    const list: StudentIncident[] = raw ? JSON.parse(raw) : [];
    list.unshift(incident);
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(list));
  }

  private static initDefaultData() {
    const sampleClassroom: Classroom = {
      id: 'cls_1',
      name: 'Matemáticas y Cálculo',
      gradeLevel: '10º Grado - Grupo A',
      academicYear: '2026 - 2027',
      color: '#4F46E5', // Indigo
      description: 'Aula general de ciencias exactas',
      createdAt: new Date().toISOString()
    };

    const sampleStudents: Student[] = [
      { id: 'std_1', classroomId: 'cls_1', firstName: 'Sofía', lastName: 'Rodríguez Martínez', email: 'sofia.rodriguez@colegio.edu', avatarColor: '#EC4899', phone: '+52 555 123 4567' },
      { id: 'std_2', classroomId: 'cls_1', firstName: 'Mateo', lastName: 'Gómez Hernández', email: 'mateo.gomez@colegio.edu', avatarColor: '#3B82F6', phone: '+52 555 234 5678' },
      { id: 'std_3', classroomId: 'cls_1', firstName: 'Valentina', lastName: 'López Castro', email: 'valentina.l@colegio.edu', avatarColor: '#10B981', phone: '+52 555 345 6789' },
      { id: 'std_4', classroomId: 'cls_1', firstName: 'Santiago', lastName: 'Torres Morales', email: 'santiago.t@colegio.edu', avatarColor: '#F59E0B', phone: '+52 555 456 7890' },
      { id: 'std_5', classroomId: 'cls_1', firstName: 'Camila', lastName: 'Vargas Silva', email: 'camila.v@colegio.edu', avatarColor: '#8B5CF6', phone: '+52 555 567 8901' }
    ];

    this.saveClassrooms([sampleClassroom]);
    this.saveStudents(sampleStudents);
    return { classrooms: [sampleClassroom], students: sampleStudents };
  }
}
