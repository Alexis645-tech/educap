import 'package:flutter/material.dart';

void main() {
  runApp(const EduPlanApp());
}

class EduPlanApp extends StatelessWidget {
  const EduPlanApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EduPlan - Cuaderno Docente',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4F46E5),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF6366F1),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFF0B0F19),
      ),
      themeMode: ThemeMode.system,
      home: const ClassroomDashboardPage(),
    );
  }
}

// ==========================================
// MODELOS EN FLUTTER / DART
// ==========================================

enum AttendanceStatus { present, late, absent }

class Student {
  final String id;
  final String name;
  final String email;
  final Color avatarColor;
  AttendanceStatus attendance;
  Map<String, double> grades;

  Student({
    required this.id,
    required this.name,
    required this.email,
    required this.avatarColor,
    this.attendance = AttendanceStatus.present,
    Map<String, double>? grades,
  }) : grades = grades ?? {};
}

class Classroom {
  final String id;
  final String title;
  final String grade;
  final Color color;
  final List<Student> students;

  Classroom({
    required this.id,
    required this.title,
    required this.grade,
    required this.color,
    required this.students,
  });
}

// ==========================================
// PANTALLA PRINCIPAL: DASHBOARD DOCENTE
// ==========================================

class ClassroomDashboardPage extends StatefulWidget {
  const ClassroomDashboardPage({super.key});

  @override
  State<ClassroomDashboardPage> createState() => _ClassroomDashboardPageState();
}

class _ClassroomDashboardPageState extends State<ClassroomDashboardPage> {
  int _selectedIndex = 0;

  String _teacherName = 'Alexis';
  String _teacherPrefix = 'Prof.';
  Color _teacherColor = const Color(0xFF6366F1);

  final List<Classroom> _classes = [
    Classroom(
      id: 'cls_1',
      title: 'Matemáticas y Álgebra',
      grade: '10º Grado - Grupo A',
      color: const Color(0xFF4F46E5),
      students: [
        Student(id: '1', name: 'Sofía Rodríguez', email: 'sofia.r@colegio.edu', avatarColor: const Color(0xFFEC4899)),
        Student(id: '2', name: 'Mateo Gómez', email: 'mateo.g@colegio.edu', avatarColor: const Color(0xFF3B82F6)),
        Student(id: '3', name: 'Valentina López', email: 'valentina.l@colegio.edu', avatarColor: const Color(0xFF10B981)),
        Student(id: '4', name: 'Santiago Torres', email: 'santiago.t@colegio.edu', avatarColor: const Color(0xFFF59E0B)),
      ],
    ),
    Classroom(
      id: 'cls_2',
      title: 'Física y Química',
      grade: '11º Grado - Grupo B',
      color: const Color(0xFF059669),
      students: [
        Student(id: '5', name: 'Camila Vargas', email: 'camila.v@colegio.edu', avatarColor: const Color(0xFF8B5CF6)),
        Student(id: '6', name: 'Alejandro Mendoza', email: 'alejandro.m@colegio.edu', avatarColor: const Color(0xFFEF4444)),
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF4F46E5),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.school, color: Colors.white, size: 22),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'EduPlan',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                Text(
                  '$_teacherPrefix $_teacherName',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: CircleAvatar(
              radius: 16,
              backgroundColor: _teacherColor,
              child: Text(
                _teacherName.isNotEmpty ? _teacherName[0] : 'P',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
            tooltip: 'Personalizar Perfil Docente',
            onPressed: () {
              final nameCtrl = TextEditingController(text: _teacherName);
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Perfil del Docente'),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextField(
                        controller: nameCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Nombre del Docente',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ],
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Cancelar'),
                    ),
                    ElevatedButton(
                      onPressed: () {
                        if (nameCtrl.text.trim().isNotEmpty) {
                          setState(() {
                            _teacherName = nameCtrl.text.trim();
                          });
                        }
                        Navigator.pop(ctx);
                      },
                      child: const Text('Guardar'),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: _selectedIndex == 0
          ? _buildClassroomsView()
          : (_selectedIndex == 1
              ? _buildAttendanceRosterView(_classes.isNotEmpty ? _classes[0] : null)
              : _buildGradesView(_classes.isNotEmpty ? _classes[0] : null)),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) => setState(() => _selectedIndex = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.class_outlined),
            selectedIcon: Icon(Icons.class_),
            label: 'Grupos y Alumnos',
          ),
          NavigationDestination(
            icon: Icon(Icons.fact_check_outlined),
            selectedIcon: Icon(Icons.fact_check),
            label: 'Asistencia',
          ),
          NavigationDestination(
            icon: Icon(Icons.grade_outlined),
            selectedIcon: Icon(Icons.grade),
            label: 'Calificaciones',
          ),
        ],
      ),
    );
  }

  Widget _buildClassroomsView() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _classes.length,
      itemBuilder: (context, index) {
        final item = _classes[index];
        return Card(
          elevation: 1,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          margin: const EdgeInsets.only(bottom: 16),
          child: Column(
            children: [
              Container(
                height: 6,
                decoration: BoxDecoration(
                  color: item.color,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.between,
                      children: [
                        Text(item.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        Chip(
                          label: Text(item.grade, style: const TextStyle(fontSize: 11)),
                          backgroundColor: const Color(0xFFF1F5F9),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(Icons.people_outline, size: 18, color: Colors.grey.shade600),
                        const SizedBox(width: 6),
                        Text('${item.students.length} Estudiantes Matriculados', style: TextStyle(color: Colors.grey.shade700)),
                      ],
                    ),
                    const Divider(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444)),
                          tooltip: 'Eliminar grupo',
                          onPressed: () {
                            showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                title: Text('¿Eliminar ${item.title}?'),
                                content: Text(
                                  'Esta acción eliminará la clase y a sus ${item.students.length} alumno(s) matriculados con sus historiales.',
                                ),
                                actions: [
                                  TextButton(
                                    onPressed: () => Navigator.pop(ctx),
                                    child: const Text('Cancelar'),
                                  ),
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFFEF4444),
                                      foregroundColor: Colors.white,
                                    ),
                                    onPressed: () {
                                      setState(() {
                                        _classes.removeAt(index);
                                      });
                                      Navigator.pop(ctx);
                                    },
                                    child: const Text('Eliminar'),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                        Row(
                          children: [
                            OutlinedButton(
                              onPressed: () {
                                setState(() => _selectedIndex = 1);
                              },
                              child: const Text('Asistencia'),
                            ),
                            const SizedBox(width: 8),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF4F46E5),
                                foregroundColor: Colors.white,
                              ),
                              onPressed: () {
                                setState(() => _selectedIndex = 1);
                              },
                              child: const Text('Ver Alumnos'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
          ),
        );
      },
    );
  }

  Widget _buildAttendanceRosterView(Classroom classroom) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.white,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                classroom.title,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              ElevatedButton.icon(
                onPressed: () {
                  setState(() {
                    for (var s in classroom.students) {
                      s.attendance = AttendanceStatus.present;
                    }
                  });
                },
                icon: const Icon(Icons.done_all, size: 16),
                label: const Text('Todos Presentes'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                ),
              )
            ],
          ),
        ),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: classroom.students.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final student = classroom.students[index];
              return Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: student.avatarColor,
                      child: Text(student.name.substring(0, 1), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(student.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                    ),
                    Row(
                      children: [
                        _statusChoice(student, AttendanceStatus.present, 'Presente', Colors.green),
                        const SizedBox(width: 4),
                        _statusChoice(student, AttendanceStatus.late, 'Retraso', Colors.orange),
                        const SizedBox(width: 4),
                        _statusChoice(student, AttendanceStatus.absent, 'Falta', Colors.red),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _statusChoice(Student s, AttendanceStatus status, String label, MaterialColor color) {
    final isSelected = s.attendance == status;
    return InkWell(
      onTap: () => setState(() => s.attendance = status),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? color.shade600 : color.shade50,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : color.shade700,
          ),
        ),
      ),
    );
  }

  Widget _buildGradesView(Classroom? classroom) {
    if (classroom == null) {
      return const Center(child: Text('No hay clases registradas.'));
    }

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          color: Theme.of(context).cardColor,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    classroom.title,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  Text(
                    '${classroom.students.length} Estudiantes - Calificaciones',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
              ElevatedButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Actividad creada exitosamente.')),
                  );
                },
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Nueva Actividad'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF4F46E5),
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: classroom.students.length,
            itemBuilder: (context, index) {
              final student = classroom.students[index];
              final currentScore = student.grades['Parcial 1'] ?? 8.5;

              return Card(
                elevation: 0,
                color: Theme.of(context).colorScheme.surface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.grey.shade200),
                ),
                margin: const EdgeInsets.only(bottom: 10),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 18,
                            backgroundColor: student.avatarColor,
                            child: Text(
                              student.name.isNotEmpty ? student.name[0] : 'A',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(student.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                              Text(student.email, style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                            ],
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: currentScore >= 7.0 ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              currentScore.toStringAsFixed(1),
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: currentScore >= 7.0 ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                fontSize: 14,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, size: 18),
                            tooltip: 'Editar Calificación',
                            onPressed: () {
                              final textCtrl = TextEditingController(text: currentScore.toString());
                              showDialog(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  title: Text('Calificar a ${student.name}'),
                                  content: TextField(
                                    controller: textCtrl,
                                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                    decoration: const InputDecoration(
                                      labelText: 'Nota (Escala 0 a 10)',
                                      border: OutlineInputBorder(),
                                    ),
                                  ),
                                  actions: [
                                    TextButton(
                                      onPressed: () => Navigator.pop(ctx),
                                      child: const Text('Cancelar'),
                                    ),
                                    ElevatedButton(
                                      onPressed: () {
                                        final parsed = double.tryParse(textCtrl.text);
                                        if (parsed != null) {
                                          setState(() {
                                            student.grades['Parcial 1'] = parsed;
                                          });
                                        }
                                        Navigator.pop(ctx);
                                      },
                                      child: const Text('Guardar'),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
