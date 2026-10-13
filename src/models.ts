// ==========================================
// MODELOS DE DATOS (Entidades del Cuaderno Docente)
// ==========================================

export enum AttendanceStatus {
  PRESENT = 'PRESENT',       // Presente
  LATE = 'LATE',             // Retraso
  ABSENT = 'ABSENT',         // Falta justificada o injustificada
  JUSTIFIED = 'JUSTIFIED'    // Justificado
}

export interface StudentIncident {
  id: string;
  studentId: string;
  date: string; // ISO String (YYYY-MM-DD)
  type: 'positive' | 'negative' | 'note';
  title: string;
  comment: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classroomId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

export interface Student {
  id: string;
  classroomId: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatarColor?: string;
  phone?: string;
  notes?: string;
}

export interface Classroom {
  id: string;
  name: string;
  gradeLevel: string; // Ej: "1º Bachillerato - A"
  academicYear: string; // Ej: "2026 - 2027"
  color: string;
  description?: string;
  createdAt: string;
}

export interface GradeItem {
  id: string;
  classroomId: string;
  title: string;
  type: 'exam' | 'homework' | 'project' | 'participation';
  maxScore: number;
  createdAt: string;
}

export interface Grade {
  id: string;
  gradeItemId: string;
  studentId: string;
  classroomId: string;
  score: number;
}

export interface TeacherProfile {
  prefix: string; // Ej: "Prof.", "Profa.", "Lic.", "Dr."
  name: string;
  specialty?: string;
  school?: string;
  email?: string;
  avatarColor?: string;
}


