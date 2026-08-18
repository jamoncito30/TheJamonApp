import { 
  saveCourseToSupabase, 
  deleteCourseFromSupabase 
} from './supabaseClient.js';

const STORAGE_KEY = 'marginapp_courses_v1';
const HISTORY_KEY = 'marginapp_history_v1';
const SETTINGS_KEY = 'marginapp_settings_v1';

// Official UDD Class Modules (Módulos UDD 2023-2026)
export const UDD_MODULES = [
  { id: 'H1', label: 'H1 (08:30 - 09:40)' },
  { id: 'H2', label: 'H2 (09:50 - 11:00)' },
  { id: 'H3', label: 'H3 (11:10 - 12:20)' },
  { id: 'H4', label: 'H4 (12:30 - 13:40)' },
  { id: 'H5', label: 'H5 (13:50 - 15:00)' },
  { id: 'H6', label: 'H6 (15:10 - 16:20)' },
  { id: 'H7', label: 'H7 (16:30 - 17:40)' },
  { id: 'H8', label: 'H8 (17:50 - 19:00)' },
  { id: 'H9', label: 'H9 (19:10 - 20:20)' },
  { id: 'H10', label: 'H10 (20:30 - 21:40)' }
];

// Fresh production state starts with empty courses
export function initStorage() {
  if (!localStorage.getItem(STORAGE_KEY)) {
    saveCourses([]);
  }
  if (!localStorage.getItem(HISTORY_KEY)) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
  }
}

export function getCourses() {
  initStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading localStorage:', err);
    return [];
  }
}

export function saveCourses(courses) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  } catch (err) {
    console.error('Error saving to localStorage:', err);
  }
}

export function resetToDemoData() {
  saveCourses([]);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
  return [];
}

export function saveCourse(courseData) {
  const courses = getCourses();
  const index = courses.findIndex(c => c.id === courseData.id);
  
  if (index >= 0) {
    courses[index] = { ...courses[index], ...courseData };
  } else {
    courseData.id = courseData.id || `course-${Date.now()}`;
    courses.push(courseData);
  }
  
  saveCourses(courses);
  saveCourseToSupabase(courseData).catch(e => console.warn('Supabase sync notice:', e));
  return courses;
}

export function deleteCourse(courseId) {
  const courses = getCourses().filter(c => c.id !== courseId);
  saveCourses(courses);
  deleteCourseFromSupabase(courseId).catch(e => console.warn('Supabase delete notice:', e));
  return courses;
}

// Math logic considering Modules per day
// UDD Calendar Engine 2026 (Semestre 2)
export const UDD_PERIODS_2026 = {
  "semestre2": { start: '2026-08-03T00:00:00-04:00', end: '2026-11-24T00:00:00-04:00' },
  "bimestre3": { start: '2026-08-03T00:00:00-04:00', end: '2026-09-30T00:00:00-04:00' },
  "bimestre4": { start: '2026-10-01T00:00:00-04:00', end: '2026-11-24T00:00:00-04:00' }
};

export const UDD_CALENDAR_2026 = {
  holidays: [
    '2026-08-15', // Asunción de la Virgen
    '2026-09-11', // Suspensión PM
    '2026-09-12', // Suspensión UDD
    '2026-09-13', // Suspensión UDD
    '2026-09-14', // Suspensión UDD
    '2026-09-15', // Suspensión UDD
    '2026-09-16', // Suspensión UDD
    '2026-09-17', // Suspensión UDD
    '2026-09-18', // Fiestas Patrias
    '2026-09-19', // Fiestas Patrias
    '2026-10-12', // Encuentro Dos Mundos
    '2026-10-31', // Día Iglesias Evangélicas
    '2026-11-01', // Todos los Santos
  ]
};

export function calculateExactClasses(classDaysArray, periodKey = 'semestre2') {
  if (!classDaysArray || classDaysArray.length === 0) return { totalClasses: 32, holidaysFound: 0 };

  const period = UDD_PERIODS_2026[periodKey] || UDD_PERIODS_2026['semestre2'];
  const start = new Date(period.start);
  const end = new Date(period.end);
  const holidaysSet = new Set(UDD_CALENDAR_2026.holidays);

  let totalClassesCount = 0;
  let holidaysEncounteredCount = 0;
  
  const activeDays = classDaysArray.map(d => Number(d));

  let current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    
    if (activeDays.includes(dayOfWeek)) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      if (holidaysSet.has(dateString)) {
        holidaysEncounteredCount++;
      } else {
        totalClassesCount++;
      }
    }
    
    current.setDate(current.getDate() + 1);
  }

  return {
    totalClasses: totalClassesCount,
    holidaysFound: holidaysEncounteredCount
  };
}

export function calculateAttendanceMetrics(course) {
  let daysTotal = Number(course.totalClasses) || 30;
  let holidaysFound = 0;
  if (course.classDays && course.classDays.length > 0) {
     const calc = calculateExactClasses(course.classDays, course.academicPeriod || 'semestre2');
     daysTotal = calc.totalClasses;
     holidaysFound = calc.holidaysFound;
  }
  
  const modulesPerDay = Number(course.modulesPerDay) || 2;
  const totalModuleUnits = daysTotal * modulesPerDay;

  const reqPercent = Number(course.requiredAttendancePercent) || 75;
  const attended = Number(course.attended) || 0;
  const absent = Number(course.absent) || 0;

  const minRequiredModules = Math.ceil(totalModuleUnits * (reqPercent / 100));
  const maxAllowedAbsences = Math.max(0, totalModuleUnits - minRequiredModules);
  const remainingWildcards = maxAllowedAbsences - absent;
  
  const modulesHeldSoFar = attended + absent;
  const currentAttendanceRate = modulesHeldSoFar > 0 
    ? Math.round((attended / modulesHeldSoFar) * 100)
    : 100;
  
  const remainingModules = Math.max(0, totalModuleUnits - modulesHeldSoFar);
  const maxPossibleAttended = attended + remainingModules;
  const projectedMaxRate = Math.round((maxPossibleAttended / totalModuleUnits) * 100);

  let status = 'green';
  let statusLabel = 'Seguro';
  let statusBg = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  let statusIcon = 'check-circle-2';
  let statusMessage = `Tienes ${remainingWildcards} comodines (módulos) disponibles.`;

  if (remainingWildcards <= (modulesPerDay * 1) && remainingWildcards > 0) {
    status = 'yellow';
    statusLabel = 'Alerta';
    statusBg = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    statusIcon = 'alert-triangle';
    statusMessage = `¡Atención! Te queda solo ${remainingWildcards} comodín(es) de módulo.`;
  } else if (remainingWildcards <= 0) {
    status = 'red';
    statusLabel = remainingWildcards === 0 ? 'Sin Comodines' : 'Riesgo Reprobación';
    statusBg = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    statusIcon = 'alert-octagon';
    statusMessage = remainingWildcards === 0 
      ? '¡No puedes faltar a ningún módulo más!' 
      : `Excediste las faltas en ${Math.abs(remainingWildcards)} módulo(s).`;
  }

  return {
    daysTotal,
    modulesPerDay,
    totalModuleUnits,
    reqPercent,
    attended,
    absent,
    minRequiredModules,
    maxAllowedAbsences,
    remainingWildcards,
    modulesHeldSoFar,
    remainingModules,
    currentAttendanceRate,
    projectedMaxRate,
    status,
    statusLabel,
    statusBg,
    statusIcon,
    statusMessage,
    holidaysFound
  };
}

export function logAttendance(courseId, type, amount = 1) {
  const courses = getCourses();
  const course = courses.find(c => c.id === courseId);
  if (!course) return null;

  const count = Number(amount) || 1;

  if (type === 'attended') {
    course.attended = (course.attended || 0) + count;
  } else if (type === 'absent') {
    course.absent = (course.absent || 0) + count;
  }

  saveCourses(courses);

  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      id: `h-${Date.now()}`,
      courseId,
      courseName: course.name,
      type,
      amount: count,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
  } catch (err) {
    console.error('History log error:', err);
  }

  return course;
}

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

// Helper to calculate the effective average of sub-evaluations (Controles, Talleres, etc.)
export function computeSubEvaluationsGrade(evalItem) {
  if (!evalItem.isSubEvaluationsEnabled || !evalItem.subEvaluations || evalItem.subEvaluations.length === 0) {
    return (evalItem.grade !== undefined && evalItem.grade !== null && evalItem.grade !== '') ? Number(evalItem.grade) : null;
  }

  const validEntries = evalItem.subEvaluations
    .map((s, idx) => ({
      idx,
      name: s.name || `Nota ${idx + 1}`,
      grade: (s.grade !== null && s.grade !== undefined && s.grade !== '' && !isNaN(Number(s.grade))) ? Number(s.grade) : null
    }))
    .filter(s => s.grade !== null);

  if (validEntries.length === 0) return null;

  const dropCount = Number(evalItem.dropLowestCount) || 0;

  // If drop rule is active and we have more than dropCount valid grades
  if (dropCount > 0 && validEntries.length > dropCount) {
    const sorted = [...validEntries].sort((a, b) => a.grade - b.grade);
    const droppedIndices = new Set(sorted.slice(0, dropCount).map(s => s.idx));
    const retained = validEntries.filter(s => !droppedIndices.has(s.idx));
    const sum = retained.reduce((acc, s) => acc + s.grade, 0);
    return Number((sum / retained.length).toFixed(2));
  } else {
    const sum = validEntries.reduce((acc, s) => acc + s.grade, 0);
    return Number((sum / validEntries.length).toFixed(2));
  }
}

// UDD Grade Calculation Engine
export function calculateCourseGrades(course, passingGrade = 4.0) {
  const isUddRule = !!course.isUddRuleEnabled;
  const rawEvals = course.evaluations || [];
  const examWeight = Number(course.examWeight) || 30;
  const presentationWeight = 100 - examWeight;
  const examGrade = course.examGrade !== null && course.examGrade !== undefined ? Number(course.examGrade) : null;

  if (rawEvals.length === 0) {
    return { currentAverage: null, totalGradedWeight: 0, requiredRemainingGrade: null, isExempt: false };
  }

  // Pre-process evaluations with sub-evaluations computation
  const evals = rawEvals.map(ev => {
    if (ev.isSubEvaluationsEnabled && ev.subEvaluations && ev.subEvaluations.length > 0) {
      const computedGrade = computeSubEvaluationsGrade(ev);
      return { ...ev, grade: computedGrade };
    }
    return { ...ev };
  });

  let certamenSum = 0;
  let certamenWeight = 0;
  let gradedCertamens = [];

  // Identify certamen / major test types for UDD replacement rule
  const isCertamenName = (name = '') => /certamen|prueba|solemne|parcial|interrogaci[oó]n/i.test(name) && !/control|taller|quiz|tarea|trabajo|laboratorio/i.test(name);

  evals.forEach(ev => {
    const w = Number(ev.weight) || 0;
    if (ev.grade !== null && ev.grade !== undefined && !isNaN(ev.grade)) {
      if (isCertamenName(ev.name)) {
        certamenSum += Number(ev.grade) * w;
        certamenWeight += w;
        gradedCertamens.push(ev);
      }
    }
  });

  const currentCertamenAvg = certamenWeight > 0 ? (certamenSum / certamenWeight) : null;
  const isExempt = isUddRule && currentCertamenAvg !== null && currentCertamenAvg >= 5.0;

  let effectiveEvals = evals.map(e => ({ ...e }));
  let replacedCertamenName = null;
  let originalCertamenGrade = null;

  if (isUddRule && examGrade !== null && examGrade >= 4.0 && !isExempt) {
    if (gradedCertamens.length > 0) {
      let lowestCertamen = gradedCertamens[0];
      gradedCertamens.forEach(c => {
        if (Number(c.grade) < Number(lowestCertamen.grade)) {
          lowestCertamen = c;
        }
      });

      if (examGrade > Number(lowestCertamen.grade)) {
        replacedCertamenName = lowestCertamen.name;
        originalCertamenGrade = lowestCertamen.grade;
        
        const targetInEffective = effectiveEvals.find(e => e.id === lowestCertamen.id);
        if (targetInEffective) {
          targetInEffective.grade = examGrade;
        }
      }
    }
  }

  let totalWeightedEvalsSum = 0;
  let totalEvalsWeight = 0;

  effectiveEvals.forEach(ev => {
    const w = Number(ev.weight) || 0;
    if (ev.grade !== null && ev.grade !== undefined && !isNaN(ev.grade)) {
      totalWeightedEvalsSum += Number(ev.grade) * (w / 100);
      totalEvalsWeight += w;
    }
  });

  const presentationGradeValue = totalEvalsWeight > 0 ? (totalWeightedEvalsSum / (totalEvalsWeight / 100)) : null;

  let finalGradeSum = 0;
  let totalCourseGradedWeight = 0;
  let totalCourseUngradedWeight = 100;

  if (presentationGradeValue !== null) {
    const gradedPresentationCourseWeight = (totalEvalsWeight / 100) * presentationWeight;
    finalGradeSum += presentationGradeValue * (gradedPresentationCourseWeight / 100);
    totalCourseGradedWeight += gradedPresentationCourseWeight;
    totalCourseUngradedWeight -= gradedPresentationCourseWeight;
  }

  if (examGrade !== null) {
    finalGradeSum += examGrade * (examWeight / 100);
    totalCourseGradedWeight += examWeight;
    totalCourseUngradedWeight -= examWeight;
  }

  if (isExempt && examGrade === null) {
    totalCourseGradedWeight += examWeight;
    totalCourseUngradedWeight -= examWeight;
    finalGradeSum += presentationGradeValue * (examWeight / 100);
  }

  const currentAverage = totalCourseGradedWeight > 0 ? (finalGradeSum / (totalCourseGradedWeight / 100)) : null;

  let requiredRemainingGrade = null;

  if (examGrade !== null) {
    requiredRemainingGrade = (currentAverage !== null && currentAverage >= 4.0) ? 'Aprobado' : 'Reprobado';
  } else if (isExempt) {
    requiredRemainingGrade = 'Eximido (0.0)';
  } else {
    if (isUddRule && gradedCertamens.length > 0) {
      let lowestCertamen = gradedCertamens[0];
      gradedCertamens.forEach(c => {
        if (Number(c.grade) < Number(lowestCertamen.grade)) lowestCertamen = c;
      });
      
      const lowestWeight = Number(lowestCertamen.weight) || 0;
      const lowestCertamenCourseWeight = (lowestWeight / 100) * presentationWeight;
      const otherEvalsSum = finalGradeSum - (Number(lowestCertamen.grade) * (lowestCertamenCourseWeight / 100));
      
      const combinedWeightPercent = (lowestCertamenCourseWeight + examWeight) / 100;
      const neededWithUDD = (passingGrade - otherEvalsSum) / combinedWeightPercent;
      const neededNormal = (passingGrade - finalGradeSum) / (examWeight / 100);
      
      if (neededNormal <= 4.0) {
        requiredRemainingGrade = neededNormal <= 1.0 ? 'Aprobado' : Math.max(1.0, neededNormal).toFixed(1);
      } else if (neededWithUDD <= 4.0) {
        requiredRemainingGrade = '4.0 (Regla UDD)';
      } else {
        requiredRemainingGrade = neededWithUDD <= 7.0 ? neededWithUDD.toFixed(1) : 'Inalcanzable';
      }
    } else {
      const neededPoints = passingGrade - finalGradeSum;
      const requiredGrade = neededPoints / (examWeight / 100);
      if (requiredGrade <= 1.0) {
        requiredRemainingGrade = 'Aprobado';
      } else if (requiredGrade > 7.0) {
        requiredRemainingGrade = 'Inalcanzable';
      } else {
        requiredRemainingGrade = requiredGrade.toFixed(1);
      }
    }
  }

  return {
    presentationGrade: presentationGradeValue !== null ? presentationGradeValue.toFixed(2) : null,
    presentationWeight,
    examWeight,
    currentAverage: currentAverage !== null ? currentAverage.toFixed(2) : null,
    totalGradedWeight: totalCourseGradedWeight,
    totalUngradedWeight: totalCourseUngradedWeight,
    requiredRemainingGrade,
    isExempt,
    isUddRule,
    replacedCertamenName,
    originalCertamenGrade,
    passingGrade
  };
}
