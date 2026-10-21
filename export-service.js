// ========================================================
// EDUPLAN - SERVICIO DE EXPORTACIÓN EXCEL (.XLSX)
// ========================================================

const ExportService = {
  // Verificar si la biblioteca SheetJS está disponible
  isXlsxReady() {
    return typeof XLSX !== 'undefined';
  },

  // Limpiar cadenas para nombres de archivo válidos
  sanitizeFilename(str) {
    return (str || 'Reporte')
      .replace(/[\/\\:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .trim();
  },

  // Formatear fechas ISO (YYYY-MM-DD) a formato legible escolar (DD/MM/YYYY)
  formatDateStr(isoOrDateStr) {
    if (!isoOrDateStr) return '—';
    try {
      const parts = isoOrDateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return isoOrDateStr;
    } catch {
      return isoOrDateStr;
    }
  },

  // -------------------------------------------------------------
  // 1. EXPORTACIÓN DE CALIFICACIONES Y NOTAS A EXCEL (.XLSX)
  // -------------------------------------------------------------
  exportGradesToExcel(classroomId) {
    if (!this.isXlsxReady()) {
      alert('La biblioteca de exportación Excel aún está cargando. Por favor intenta de nuevo en unos segundos.');
      return false;
    }

    const classrooms = DataService.getClassrooms();
    const classroom = classrooms.find(c => c.id === classroomId) || classrooms[0];
    if (!classroom) {
      alert('Por favor crea o selecciona un grupo antes de exportar.');
      return false;
    }

    let students = DataService.getStudents(classroom.id);
    if (UIController && typeof UIController.sortStudents === 'function') {
      students = UIController.sortStudents(students);
    }

    const gradeItems = DataService.getGradeItems(classroom.id);
    const allGrades = DataService.getGrades(classroom.id);
    const teacher = DataService.getTeacherProfile();

    const schoolName = (teacher.school || 'INSTITUCIÓN EDUCATIVA').toUpperCase();
    const teacherFull = `${teacher.prefix || 'Prof.'} ${teacher.name || 'Docente'}`;
    const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const wb = XLSX.utils.book_new();

    // --- HOJA 1: ACTA DE CALIFICACIONES ---
    const sheetData = [];

    // Membrete Institucional
    sheetData.push([schoolName]);
    sheetData.push(['ACTA OFICIAL DE CALIFICACIONES Y RENDIMIENTO ACADÉMICO']);
    sheetData.push(['Docente a cargo:', teacherFull, '', 'Asignatura / Grupo:', `${classroom.name} (${classroom.gradeLevel})`]);
    sheetData.push(['Año Escolar:', classroom.academicYear || '2026 - 2027', '', 'Fecha de Emisión:', today]);
    sheetData.push([]); // fila separadora en blanco

    // Encabezados de Columnas
    const typeLabels = { exam: 'Examen', homework: 'Tarea', project: 'Proyecto', participation: 'Participación' };
    const headerRow = ['Nº', 'Apellidos y Nombres', 'Correo Electrónico'];
    
    gradeItems.forEach(item => {
      const tLabel = typeLabels[item.type] || item.type;
      headerRow.push(`${item.title} (${tLabel} - Máx ${item.maxScore})`);
    });

    headerRow.push('Promedio Final (Base 10)');
    headerRow.push('Rendimiento / Estado');
    sheetData.push(headerRow);

    // Filas de Estudiantes
    let totalAveragesSum = 0;
    let studentsWithGradesCount = 0;
    let passedCount = 0;
    let atRiskCount = 0;

    const activityScoresSum = new Array(gradeItems.length).fill(0);
    const activityScoresCount = new Array(gradeItems.length).fill(0);

    students.forEach((std, idx) => {
      const row = [
        idx + 1,
        `${std.lastName || ''} ${std.firstName || ''}`.trim(),
        std.email || '—'
      ];

      let studentTotalWeighted = 0;
      let studentRatedCount = 0;

      gradeItems.forEach((item, itemIdx) => {
        const record = allGrades.find(g => g.studentId === std.id && g.gradeItemId === item.id);
        const score = record !== undefined && record.score !== null ? record.score : '';

        if (score !== '' && !isNaN(score)) {
          const numScore = parseFloat(score);
          row.push(numScore);
          // Normalizar a escala base 10 para cálculo de promedio
          const normalized = (numScore / item.maxScore) * 10;
          studentTotalWeighted += normalized;
          studentRatedCount++;

          activityScoresSum[itemIdx] += numScore;
          activityScoresCount[itemIdx]++;
        } else {
          row.push('—');
        }
      });

      let avgVal = null;
      let statusStr = 'Sin Calificar';

      if (studentRatedCount > 0) {
        avgVal = parseFloat((studentTotalWeighted / studentRatedCount).toFixed(2));
        totalAveragesSum += avgVal;
        studentsWithGradesCount++;

        if (avgVal >= 7.0) {
          statusStr = 'Aprobado (Destacado)';
          passedCount++;
        } else if (avgVal >= 6.0) {
          statusStr = 'Aprobado';
          passedCount++;
        } else {
          statusStr = 'En Riesgo / Requiere Apoyo';
          atRiskCount++;
        }
        row.push(avgVal);
      } else {
        row.push('—');
      }

      row.push(statusStr);
      sheetData.push(row);
    });

    if (students.length === 0) {
      sheetData.push(['—', 'No hay estudiantes matriculados en esta clase.', '—']);
    }

    // Fila en blanco
    sheetData.push([]);

    // Fila de Promedio Grupal por Evaluación
    if (gradeItems.length > 0) {
      const activityAvgRow = ['', 'PROMEDIO GRUPAL POR ACTIVIDAD:', ''];
      gradeItems.forEach((item, itemIdx) => {
        if (activityScoresCount[itemIdx] > 0) {
          const itemAvg = parseFloat((activityScoresSum[itemIdx] / activityScoresCount[itemIdx]).toFixed(2));
          activityAvgRow.push(itemAvg);
        } else {
          activityAvgRow.push('—');
        }
      });

      const generalGroupAvg = studentsWithGradesCount > 0 
        ? parseFloat((totalAveragesSum / studentsWithGradesCount).toFixed(2)) 
        : '—';

      activityAvgRow.push(generalGroupAvg);
      activityAvgRow.push('');
      sheetData.push(activityAvgRow);
    }

    // Resumen estadístico institucional al pie
    const generalGroupAvg = studentsWithGradesCount > 0 
      ? parseFloat((totalAveragesSum / studentsWithGradesCount).toFixed(2)) 
      : '—';
    const approvalRate = studentsWithGradesCount > 0 
      ? ((passedCount / studentsWithGradesCount) * 100).toFixed(1) + '%' 
      : '0%';

    sheetData.push([]);
    sheetData.push(['', 'RESUMEN ESTADÍSTICO INSTITUCIONAL']);
    sheetData.push(['', 'Total Estudiantes Matriculados:', students.length]);
    sheetData.push(['', 'Estudiantes con Evaluaciones:', studentsWithGradesCount]);
    sheetData.push(['', 'Promedio General del Curso:', generalGroupAvg]);
    sheetData.push(['', 'Estudiantes Aprobados:', passedCount]);
    sheetData.push(['', 'Estudiantes en Riesgo Académico:', atRiskCount]);
    sheetData.push(['', 'Tasa de Aprobación Trimestral:', approvalRate]);

    const wsGrades = XLSX.utils.aoa_to_sheet(sheetData);

    // Ajuste dinámico de anchos de columna
    const cols = [
      { wch: 6 },  // Nº
      { wch: 32 }, // Apellidos y Nombres
      { wch: 28 }, // Correo
    ];
    gradeItems.forEach(item => {
      cols.push({ wch: Math.max(20, item.title.length + 8) });
    });
    cols.push({ wch: 22 }); // Promedio Final
    cols.push({ wch: 26 }); // Estado
    wsGrades['!cols'] = cols;

    XLSX.utils.book_append_sheet(wb, wsGrades, 'Acta de Calificaciones');

    // --- HOJA 2: DETALLE DE ACTIVIDADES ---
    if (gradeItems.length > 0) {
      const itemsSheetData = [
        [schoolName],
        ['DESGLOSE DE ACTIVIDADES EVALUADAS'],
        ['Grupo:', `${classroom.name} (${classroom.gradeLevel})`, '', 'Docente:', teacherFull],
        [],
        ['Nº', 'Título de la Actividad', 'Tipo de Evaluación', 'Puntaje Máximo', 'Fecha de Registro', 'Promedio Obtenido', 'Estudiantes Evaluados']
      ];

      gradeItems.forEach((item, idx) => {
        const itemAvg = activityScoresCount[idx] > 0 
          ? parseFloat((activityScoresSum[idx] / activityScoresCount[idx]).toFixed(2)) 
          : '—';
        itemsSheetData.push([
          idx + 1,
          item.title,
          typeLabels[item.type] || item.type,
          item.maxScore,
          this.formatDateStr(item.createdAt),
          itemAvg,
          activityScoresCount[idx]
        ]);
      });

      const wsItems = XLSX.utils.aoa_to_sheet(itemsSheetData);
      wsItems['!cols'] = [
        { wch: 6 },
        { wch: 30 },
        { wch: 22 },
        { wch: 16 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(wb, wsItems, 'Detalle de Actividades');
    }

    const safeName = this.sanitizeFilename(classroom.name);
    const dateStamp = new Date().toISOString().split('T')[0];
    const fileName = `Calificaciones_${safeName}_${dateStamp}.xlsx`;

    XLSX.writeFile(wb, fileName);
    this.showExportSuccessToast(fileName, 'Calificaciones');
    return true;
  },

  // -------------------------------------------------------------
  // 2. EXPORTACIÓN DE ASISTENCIA A EXCEL (.XLSX)
  // -------------------------------------------------------------
  exportAttendanceToExcel(classroomId, selectedDate = null, mode = 'consolidated') {
    if (!this.isXlsxReady()) {
      alert('La biblioteca de exportación Excel aún está cargando. Por favor intenta de nuevo en unos segundos.');
      return false;
    }

    const classrooms = DataService.getClassrooms();
    const classroom = classrooms.find(c => c.id === classroomId) || classrooms[0];
    if (!classroom) {
      alert('Por favor crea o selecciona un grupo antes de exportar.');
      return false;
    }

    let students = DataService.getStudents(classroom.id);
    if (UIController && typeof UIController.sortStudents === 'function') {
      students = UIController.sortStudents(students);
    }

    const teacher = DataService.getTeacherProfile();
    const schoolName = (teacher.school || 'INSTITUCIÓN EDUCATIVA').toUpperCase();
    const teacherFull = `${teacher.prefix || 'Prof.'} ${teacher.name || 'Docente'}`;
    const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const allAttendance = DataService.getAttendanceRecords(classroom.id);
    const uniqueDates = [...new Set(allAttendance.map(a => a.date))].sort();

    const wb = XLSX.utils.book_new();

    // MODO CONSOLIDADO TRIMESTRAL (RECOMENDADO PARA INSTITUCIONES)
    if (mode === 'consolidated' || mode === 'full') {
      const consolData = [
        [schoolName],
        ['REPORTE CONSOLIDADO DE ASISTENCIA Y PUNTUALIDAD TRIMESTRAL'],
        ['Docente a cargo:', teacherFull, '', 'Asignatura / Grupo:', `${classroom.name} (${classroom.gradeLevel})`],
        ['Año Escolar:', classroom.academicYear || '2026 - 2027', '', 'Fecha de Emisión:', today],
        [],
        ['Nº', 'Apellidos y Nombres', 'Correo Electrónico', 'Total Sesiones', 'Presentes (P)', 'Atrasos (A)', 'Faltas (F)', '% Asistencia', 'Condición']
      ];

      const groupTotalSessions = uniqueDates.length;
      let groupPresentSum = 0;
      let groupLateSum = 0;
      let groupAbsentSum = 0;

      students.forEach((std, idx) => {
        let pCount = 0;
        let lCount = 0;
        let aCount = 0;

        uniqueDates.forEach(date => {
          const rec = allAttendance.find(a => a.studentId === std.id && a.date === date);
          if (rec) {
            if (rec.status === 'PRESENT') pCount++;
            else if (rec.status === 'LATE') lCount++;
            else if (rec.status === 'ABSENT') aCount++;
          }
        });

        const totalRecorded = pCount + lCount + aCount;
        groupPresentSum += pCount;
        groupLateSum += lCount;
        groupAbsentSum += aCount;

        // Porcentaje ponderado: (Presente + 0.5 * Atraso) / Total
        let pct = totalRecorded > 0 ? ((pCount + (lCount * 0.5)) / totalRecorded) * 100 : 100;
        pct = parseFloat(pct.toFixed(1));

        let condicion = 'Regular';
        if (pct < 75) {
          condicion = 'En Riesgo por Inasistencias';
        } else if (lCount >= 4) {
          condicion = 'Atrasos Frecuentes';
        }

        consolData.push([
          idx + 1,
          `${std.lastName || ''} ${std.firstName || ''}`.trim(),
          std.email || '—',
          totalRecorded || groupTotalSessions,
          pCount,
          lCount,
          aCount,
          `${pct}%`,
          condicion
        ]);
      });

      if (students.length === 0) {
        consolData.push(['—', 'No hay estudiantes matriculados en esta clase.', '—']);
      }

      // Resumen institucional al pie
      consolData.push([]);
      consolData.push(['', 'TOTALES GENERALES DEL PERÍODO']);
      consolData.push(['', 'Total Sesiones Dictadas:', groupTotalSessions]);
      consolData.push(['', 'Total Presentes:', groupPresentSum]);
      consolData.push(['', 'Total Atrasos:', groupLateSum]);
      consolData.push(['', 'Total Inasistencias (Faltas):', groupAbsentSum]);
      const totalEvents = groupPresentSum + groupLateSum + groupAbsentSum;
      const groupPct = totalEvents > 0 
        ? (((groupPresentSum + (groupLateSum * 0.5)) / totalEvents) * 100).toFixed(1) + '%' 
        : '100%';
      consolData.push(['', 'Promedio General de Asistencia Grupal:', groupPct]);

      const wsConsol = XLSX.utils.aoa_to_sheet(consolData);
      wsConsol['!cols'] = [
        { wch: 6 },  // Nº
        { wch: 32 }, // Estudiante
        { wch: 28 }, // Email
        { wch: 15 }, // Sesiones
        { wch: 14 }, // Presentes
        { wch: 14 }, // Atrasos
        { wch: 14 }, // Faltas
        { wch: 16 }, // % Asistencia
        { wch: 26 }  // Condición
      ];
      XLSX.utils.book_append_sheet(wb, wsConsol, 'Consolidado Asistencia');

      // HOJA 2: MATRIZ DIARIA DETALLADA POR FECHAS
      if (uniqueDates.length > 0) {
        const matrixData = [
          [schoolName],
          ['MATRIZ DIARIA DE ASISTENCIA'],
          ['Grupo:', `${classroom.name} (${classroom.gradeLevel})`, '', 'Docente:', teacherFull],
          []
        ];

        const matrixHeader = ['Nº', 'Apellidos y Nombres'];
        uniqueDates.forEach(d => {
          matrixHeader.push(this.formatDateStr(d));
        });
        matrixHeader.push('Total Presentes');
        matrixHeader.push('Total Atrasos');
        matrixHeader.push('Total Faltas');
        matrixData.push(matrixHeader);

        students.forEach((std, idx) => {
          let pCount = 0;
          let lCount = 0;
          let aCount = 0;

          const row = [
            idx + 1,
            `${std.lastName || ''} ${std.firstName || ''}`.trim()
          ];

          uniqueDates.forEach(date => {
            const rec = allAttendance.find(a => a.studentId === std.id && a.date === date);
            if (rec) {
              if (rec.status === 'PRESENT') { row.push('P'); pCount++; }
              else if (rec.status === 'LATE') { row.push('A'); lCount++; }
              else if (rec.status === 'ABSENT') { row.push('F'); aCount++; }
              else { row.push('—'); }
            } else {
              row.push('—');
            }
          });

          row.push(pCount);
          row.push(lCount);
          row.push(aCount);
          matrixData.push(row);
        });

        matrixData.push([]);
        matrixData.push(['', 'Convenciones: P = Presente | A = Atraso | F = Falta']);

        const wsMatrix = XLSX.utils.aoa_to_sheet(matrixData);
        const matrixCols = [
          { wch: 6 },
          { wch: 32 }
        ];
        uniqueDates.forEach(() => matrixCols.push({ wch: 14 }));
        matrixCols.push({ wch: 16 });
        matrixCols.push({ wch: 14 });
        matrixCols.push({ wch: 14 });
        wsMatrix['!cols'] = matrixCols;

        XLSX.utils.book_append_sheet(wb, wsMatrix, 'Detalle por Fechas');
      }

      const safeName = this.sanitizeFilename(classroom.name);
      const dateStamp = new Date().toISOString().split('T')[0];
      const fileName = `Asistencia_Consolidada_${safeName}_${dateStamp}.xlsx`;

      XLSX.writeFile(wb, fileName);
      this.showExportSuccessToast(fileName, 'Asistencia Consolidada');
      return true;
    }

    // MODO PASE DE LISTA DIARIO
    if (mode === 'day') {
      const targetDate = selectedDate || new Date().toISOString().split('T')[0];
      const dateFormatted = this.formatDateStr(targetDate);
      const records = allAttendance.filter(a => a.date === targetDate);

      const dayData = [
        [schoolName],
        ['PASE DE LISTA DIARIO OFICIAL'],
        ['Fecha de la Sesión:', dateFormatted, '', 'Asignatura / Grupo:', `${classroom.name} (${classroom.gradeLevel})`],
        ['Docente a cargo:', teacherFull, '', 'Año Escolar:', classroom.academicYear || '2026 - 2027'],
        [],
        ['Nº', 'Apellidos y Nombres', 'Correo Electrónico', 'Estado de Asistencia', 'Observaciones']
      ];

      let p = 0, l = 0, a = 0;

      students.forEach((std, idx) => {
        const rec = records.find(r => r.studentId === std.id);
        const st = rec ? rec.status : 'PRESENT';
        let stLabel = 'Presente';
        if (st === 'PRESENT') { stLabel = 'Presente'; p++; }
        else if (st === 'LATE') { stLabel = 'Atraso'; l++; }
        else if (st === 'ABSENT') { stLabel = 'Falta / Inasistencia'; a++; }

        dayData.push([
          idx + 1,
          `${std.lastName || ''} ${std.firstName || ''}`.trim(),
          std.email || '—',
          stLabel,
          ''
        ]);
      });

      if (students.length === 0) {
        dayData.push(['—', 'No hay estudiantes matriculados en esta clase.', '—']);
      }

      dayData.push([]);
      dayData.push(['', 'RESUMEN DEL DÍA']);
      dayData.push(['', 'Estudiantes Presentes:', p]);
      dayData.push(['', 'Estudiantes con Atraso:', l]);
      dayData.push(['', 'Inasistencias (Faltas):', a]);
      dayData.push(['', 'Total Estudiantes:', students.length]);

      const wsDay = XLSX.utils.aoa_to_sheet(dayData);
      wsDay['!cols'] = [
        { wch: 6 },
        { wch: 32 },
        { wch: 28 },
        { wch: 22 },
        { wch: 25 }
      ];
      XLSX.utils.book_append_sheet(wb, wsDay, 'Pase de Lista');

      const safeName = this.sanitizeFilename(classroom.name);
      const fileName = `Asistencia_Diaria_${safeName}_${targetDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
      this.showExportSuccessToast(fileName, 'Pase de Lista Diario');
      return true;
    }
  },

  // -------------------------------------------------------------
  // 3. EXPORTACIÓN DEL LIBRO ACADÉMICO INTEGRAL (Notas + Asistencia + Directorio)
  // -------------------------------------------------------------
  exportCompleteCourseExcel(classroomId) {
    if (!this.isXlsxReady()) {
      alert('La biblioteca de exportación Excel aún está cargando. Por favor intenta de nuevo en unos segundos.');
      return false;
    }

    const classrooms = DataService.getClassrooms();
    const classroom = classrooms.find(c => c.id === classroomId) || classrooms[0];
    if (!classroom) {
      alert('Por favor crea o selecciona un grupo antes de exportar.');
      return false;
    }

    let students = DataService.getStudents(classroom.id);
    if (UIController && typeof UIController.sortStudents === 'function') {
      students = UIController.sortStudents(students);
    }

    const gradeItems = DataService.getGradeItems(classroom.id);
    const allGrades = DataService.getGrades(classroom.id);
    const allAttendance = DataService.getAttendanceRecords(classroom.id);
    const uniqueDates = [...new Set(allAttendance.map(a => a.date))].sort();
    const teacher = DataService.getTeacherProfile();

    const schoolName = (teacher.school || 'INSTITUCIÓN EDUCATIVA').toUpperCase();
    const teacherFull = `${teacher.prefix || 'Prof.'} ${teacher.name || 'Docente'}`;
    const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const wb = XLSX.utils.book_new();

    // HOJA 1: ACTA DE CALIFICACIONES
    const typeLabels = { exam: 'Examen', homework: 'Tarea', project: 'Proyecto', participation: 'Participación' };
    const gradesSheetData = [
      [schoolName],
      ['LIBRO DE CALIFICACIONES TRIMESTRALES'],
      ['Docente:', teacherFull, '', 'Asignatura:', `${classroom.name} (${classroom.gradeLevel})`],
      ['Año Escolar:', classroom.academicYear || '2026 - 2027', '', 'Fecha:', today],
      []
    ];

    const gradesHeader = ['Nº', 'Apellidos y Nombres', 'Correo'];
    gradeItems.forEach(item => {
      gradesHeader.push(`${item.title} (${typeLabels[item.type] || item.type} - Máx ${item.maxScore})`);
    });
    gradesHeader.push('Promedio Final');
    gradesHeader.push('Estado');
    gradesSheetData.push(gradesHeader);

    students.forEach((std, idx) => {
      const row = [idx + 1, `${std.lastName || ''} ${std.firstName || ''}`.trim(), std.email || '—'];
      let sum = 0, cnt = 0;
      gradeItems.forEach(item => {
        const rec = allGrades.find(g => g.studentId === std.id && g.gradeItemId === item.id);
        if (rec !== undefined && rec.score !== null && rec.score !== '') {
          const s = parseFloat(rec.score);
          row.push(s);
          sum += (s / item.maxScore) * 10;
          cnt++;
        } else {
          row.push('—');
        }
      });
      if (cnt > 0) {
        const avg = parseFloat((sum / cnt).toFixed(2));
        row.push(avg);
        row.push(avg >= 6.0 ? 'Aprobado' : 'En Riesgo');
      } else {
        row.push('—');
        row.push('Sin Notas');
      }
      gradesSheetData.push(row);
    });

    const wsG = XLSX.utils.aoa_to_sheet(gradesSheetData);
    const gCols = [{ wch: 6 }, { wch: 32 }, { wch: 28 }];
    gradeItems.forEach(item => gCols.push({ wch: Math.max(20, item.title.length + 8) }));
    gCols.push({ wch: 18 }, { wch: 20 });
    wsG['!cols'] = gCols;
    XLSX.utils.book_append_sheet(wb, wsG, 'Calificaciones');

    // HOJA 2: ASISTENCIA CONSOLIDADA
    const attData = [
      [schoolName],
      ['CONSOLIDADO DE ASISTENCIA Y PUNTUALIDAD'],
      ['Docente:', teacherFull, '', 'Asignatura:', `${classroom.name} (${classroom.gradeLevel})`],
      ['Año Escolar:', classroom.academicYear || '2026 - 2027', '', 'Fecha:', today],
      [],
      ['Nº', 'Apellidos y Nombres', 'Total Sesiones', 'Presentes (P)', 'Atrasos (A)', 'Faltas (F)', '% Asistencia', 'Condición']
    ];

    students.forEach((std, idx) => {
      let p = 0, l = 0, a = 0;
      uniqueDates.forEach(d => {
        const rec = allAttendance.find(att => att.studentId === std.id && att.date === d);
        if (rec) {
          if (rec.status === 'PRESENT') p++;
          else if (rec.status === 'LATE') l++;
          else if (rec.status === 'ABSENT') a++;
        }
      });
      const tot = p + l + a;
      const pct = tot > 0 ? parseFloat((((p + l * 0.5) / tot) * 100).toFixed(1)) : 100;
      attData.push([
        idx + 1,
        `${std.lastName || ''} ${std.firstName || ''}`.trim(),
        tot || uniqueDates.length,
        p,
        l,
        a,
        `${pct}%`,
        pct >= 75 ? 'Regular' : 'En Riesgo'
      ]);
    });
    const wsA = XLSX.utils.aoa_to_sheet(attData);
    wsA['!cols'] = [
      { wch: 6 }, { wch: 32 }, { wch: 15 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 24 }
    ];
    XLSX.utils.book_append_sheet(wb, wsA, 'Asistencia Consolidada');

    // HOJA 3: DIRECTORIO DE ESTUDIANTES E INCIDENCIAS
    const dirData = [
      [schoolName],
      ['DIRECTORIO DE ESTUDIANTES E HISTORIAL CONDUCTUAL'],
      ['Grupo:', `${classroom.name} (${classroom.gradeLevel})`, '', 'Docente:', teacherFull],
      [],
      ['Nº', 'Apellidos y Nombres', 'Correo Electrónico', 'Teléfono de Contacto', 'Anotaciones Positivas', 'Anotaciones Negativas', 'Total Incidencias']
    ];

    students.forEach((std, idx) => {
      const incs = DataService.getIncidents(std.id);
      const pos = incs.filter(i => i.type === 'positive').length;
      const neg = incs.filter(i => i.type === 'negative').length;
      dirData.push([
        idx + 1,
        `${std.lastName || ''} ${std.firstName || ''}`.trim(),
        std.email || '—',
        std.phone || '—',
        pos,
        neg,
        incs.length
      ]);
    });
    const wsDir = XLSX.utils.aoa_to_sheet(dirData);
    wsDir['!cols'] = [
      { wch: 6 }, { wch: 32 }, { wch: 28 }, { wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, wsDir, 'Directorio e Incidencias');

    const safeName = this.sanitizeFilename(classroom.name);
    const dateStamp = new Date().toISOString().split('T')[0];
    const fileName = `Informe_Integral_${safeName}_${dateStamp}.xlsx`;

    XLSX.writeFile(wb, fileName);
    this.showExportSuccessToast(fileName, 'Informe Académico Integral');
    return true;
  },

  // Toast flotante de confirmación de descarga exitosa
  showExportSuccessToast(fileName, reportType) {
    let toast = document.getElementById('export-excel-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'export-excel-toast';
      toast.className = 'export-excel-toast';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <div class="export-toast-content">
        <div class="export-toast-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <path d="m9 15 2 2 4-4"/>
          </svg>
        </div>
        <div class="export-toast-info">
          <h4>Reporte Generado con Éxito</h4>
          <p><strong>${fileName}</strong> listo para entregar a la institución.</p>
        </div>
      </div>
    `;

    toast.classList.add('active');
    setTimeout(() => {
      toast.classList.remove('active');
    }, 4500);
  },

  // -------------------------------------------------------------
  // 4. PLANTILLA E IMPORTACIÓN MASIVA DE ESTUDIANTES (.XLSX / .CSV)
  // -------------------------------------------------------------
  downloadStudentTemplate(format = 'xlsx') {
    if (format === 'csv') {
      const csvHeader = 'Nombres,Apellidos,Correo Electrónico,Teléfono de Contacto\r\n';
      const sampleRows = [
        'Sofía,Rodríguez Martínez,sofia.rodriguez@colegio.edu,+52 555 123 4567',
        'Mateo,Gómez Hernández,mateo.gomez@colegio.edu,+52 555 234 5678',
        'Valentina,López Castro,valentina.lopez@colegio.edu,+52 555 345 6789',
        'Santiago,Torres Morales,santiago.torres@colegio.edu,+52 555 456 7890',
        'Camila,Vargas Silva,camila.vargas@colegio.edu,+52 555 567 8901',
        'Alejandro,Mendoza Ruiz,alejandro.mendoza@colegio.edu,+52 555 678 9012'
      ].join('\r\n');
      
      const blob = new Blob(['\uFEFF' + csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Plantilla_Estudiantes_EduPlan.csv';
      link.click();
      this.showExportSuccessToast('Plantilla_Estudiantes_EduPlan.csv', 'Plantilla Oficial CSV');
      return true;
    }

    if (!this.isXlsxReady()) {
      alert('La biblioteca de procesamiento Excel aún está cargando. Por favor intenta de nuevo en unos segundos.');
      return false;
    }

    const wb = XLSX.utils.book_new();
    const templateData = [
      ['Nombres', 'Apellidos', 'Correo Electrónico', 'Teléfono de Contacto'],
      ['Sofía', 'Rodríguez Martínez', 'sofia.rodriguez@colegio.edu', '+52 555 123 4567'],
      ['Mateo', 'Gómez Hernández', 'mateo.gomez@colegio.edu', '+52 555 234 5678'],
      ['Valentina', 'López Castro', 'valentina.lopez@colegio.edu', '+52 555 345 6789'],
      ['Santiago', 'Torres Morales', 'santiago.torres@colegio.edu', '+52 555 456 7890'],
      ['Camila', 'Vargas Silva', 'camila.vargas@colegio.edu', '+52 555 567 8901'],
      ['Alejandro', 'Mendoza Ruiz', 'alejandro.mendoza@colegio.edu', '+52 555 678 9012']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 22 },
      { wch: 26 },
      { wch: 32 },
      { wch: 22 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');

    // Hoja secundaria con Guía e Instrucciones
    const guideData = [
      ['GUÍA RÁPIDA PARA RELLENAR LA PLANTILLA DE ESTUDIANTES - EDUPLAN'],
      [],
      ['1. Columnas obligatorias:', 'Nombres y Apellidos del alumno.'],
      ['2. Columnas opcionales:', 'Correo electrónico y Teléfono de contacto (tutor o estudiante).'],
      ['3. Nombre completo en 1 columna:', 'Si tienes los nombres y apellidos juntos (ej: "Pérez Gómez, Juan"), ¡EduPlan los separa automáticamente al importar!'],
      ['4. Carga fácil:', 'Guarda este archivo e impórtalo directamente en EduPlan.'],
      [],
      ['¡Listo para importar en un solo clic!']
    ];
    const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
    wsGuide['!cols'] = [{ wch: 28 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsGuide, 'Instrucciones');

    const fileName = 'Plantilla_Estudiantes_EduPlan.xlsx';
    XLSX.writeFile(wb, fileName);
    this.showExportSuccessToast(fileName, 'Plantilla Oficial Excel');
    return true;
  },

  // Analizar matriz 2D de filas
  parseStudentsData(rawRows) {
    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return { success: false, error: 'El archivo o texto no contiene filas legibles.' };
    }

    const cleanRows = rawRows.filter(r => Array.isArray(r) && r.some(cell => String(cell ?? '').trim().length > 0));
    if (cleanRows.length === 0) {
      return { success: false, error: 'No se detectaron datos en el archivo.' };
    }

    const normalize = (str) => String(str ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    let headerRowIndex = -1;
    let firstIdx = -1;
    let lastIdx = -1;
    let fullIdx = -1;
    let emailIdx = -1;
    let phoneIdx = -1;

    for (let r = 0; r < Math.min(4, cleanRows.length); r++) {
      const row = cleanRows[r];
      let foundHeadersInRow = 0;
      for (let c = 0; c < row.length; c++) {
        const text = normalize(row[c]);
        if (/^(nombres?|first\s*name)$/.test(text)) { firstIdx = c; foundHeadersInRow++; }
        else if (/^(apellidos?|last\s*name)$/.test(text)) { lastIdx = c; foundHeadersInRow++; }
        else if (/^(nombre\s*completo|estudiante|alumno|estudiantes|alumnos|nombres?\s*y\s*apellidos?|apellidos?\s*y\s*nombres?)$/.test(text)) { fullIdx = c; foundHeadersInRow++; }
        else if (/^(correo|email|e-mail|correo\s*electronico|mail)$/.test(text)) { emailIdx = c; foundHeadersInRow++; }
        else if (/^(telefono|celular|movil|phone|contacto|acudiente|tutor)$/.test(text)) { phoneIdx = c; foundHeadersInRow++; }
      }
      if (foundHeadersInRow > 0 && (firstIdx !== -1 || fullIdx !== -1 || (lastIdx !== -1 && row.length >= 2))) {
        headerRowIndex = r;
        break;
      }
    }

    const dataRows = (headerRowIndex !== -1) ? cleanRows.slice(headerRowIndex + 1) : cleanRows;
    if (dataRows.length === 0) {
      return { success: false, error: 'Solo se encontraron encabezados pero ninguna fila de estudiantes.' };
    }

    if (firstIdx === -1 && fullIdx === -1 && lastIdx === -1) {
      if (cleanRows[0].length >= 2) {
        firstIdx = 0;
        lastIdx = 1;
        if (cleanRows[0].length >= 3) emailIdx = 2;
        if (cleanRows[0].length >= 4) phoneIdx = 3;
      } else {
        fullIdx = 0;
      }
    }

    const students = [];
    const warnings = [];

    const titleCase = (s) => s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());

    dataRows.forEach((row, i) => {
      let firstName = '';
      let lastName = '';
      let email = emailIdx !== -1 ? String(row[emailIdx] ?? '').trim() : '';
      let phone = phoneIdx !== -1 ? String(row[phoneIdx] ?? '').trim() : '';

      if (firstIdx !== -1 && lastIdx !== -1) {
        firstName = String(row[firstIdx] ?? '').trim();
        lastName = String(row[lastIdx] ?? '').trim();
      } else if (firstIdx !== -1) {
        firstName = String(row[firstIdx] ?? '').trim();
        lastName = (lastIdx !== -1 ? String(row[lastIdx] ?? '') : '').trim();
      } else if (fullIdx !== -1) {
        const rawFull = String(row[fullIdx] ?? '').trim();
        if (rawFull.includes(',')) {
          const parts = rawFull.split(',');
          lastName = parts[0].trim();
          firstName = parts.slice(1).join(' ').trim();
        } else {
          const words = rawFull.split(/\s+/).filter(w => w.length > 0);
          if (words.length <= 1) {
            firstName = words[0] || '';
            lastName = '';
          } else if (words.length === 2) {
            firstName = words[0];
            lastName = words[1];
          } else if (words.length === 3) {
            firstName = words[0];
            lastName = words.slice(1).join(' ');
          } else {
            firstName = words.slice(0, 2).join(' ');
            lastName = words.slice(2).join(' ');
          }
        }
      } else {
        firstName = String(row[0] ?? '').trim();
        lastName = String(row[1] ?? '').trim();
      }

      if (firstName && (firstName === firstName.toUpperCase() || firstName === firstName.toLowerCase())) {
        firstName = titleCase(firstName);
      }
      if (lastName && (lastName === lastName.toUpperCase() || lastName === lastName.toLowerCase())) {
        lastName = titleCase(lastName);
      }

      if (firstName || lastName) {
        students.push({
          firstName: firstName || '(Sin nombre)',
          lastName: lastName || '',
          email,
          phone,
          rowNumber: i + 1
        });
      } else {
        warnings.push(`Fila ${i + 1} omitida por no contener nombre.`);
      }
    });

    if (students.length === 0) {
      return { success: false, error: 'No se encontraron estudiantes válidos en las filas procesadas.' };
    }

    return {
      success: true,
      students,
      totalCount: students.length,
      warnings
    };
  },

  // Parsear archivo cargado (.xlsx, .xls, .csv)
  parseStudentsFile(file) {
    return new Promise((resolve) => {
      if (!file) {
        return resolve({ success: false, error: 'No se ha seleccionado ningún archivo.' });
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          if (!this.isXlsxReady()) {
            return resolve({ success: false, error: 'La biblioteca SheetJS aún no está cargada.' });
          }

          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            return resolve({ success: false, error: 'El archivo Excel no contiene hojas de cálculo.' });
          }

          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
          const result = this.parseStudentsData(rawRows);
          resolve(result);
        } catch (err) {
          console.error('[ExportService] Error procesando archivo:', err);
          resolve({ success: false, error: 'Error al leer el archivo. Asegúrate de que sea un archivo Excel (.xlsx, .xls) o CSV válido.' });
        }
      };

      reader.onerror = () => {
        resolve({ success: false, error: 'Error al abrir el archivo en tu navegador.' });
      };

      reader.readAsArrayBuffer(file);
    });
  },

  // Parsear texto pegado desde portapapeles
  parseStudentsText(text) {
    if (!text || !text.trim()) {
      return { success: false, error: 'Por favor pega el contenido antes de analizar.' };
    }

    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      return { success: false, error: 'El texto pegado no contiene líneas válidas.' };
    }

    const firstLine = lines[0];
    let sep = '\t';
    if (!firstLine.includes('\t')) {
      if (firstLine.includes(';')) sep = ';';
      else if (firstLine.includes(',')) sep = ',';
    }

    const rawRows = lines.map(line => line.split(sep).map(cell => cell.trim()));
    return this.parseStudentsData(rawRows);
  }
};

// Exponer globalmente
window.ExportService = ExportService;
