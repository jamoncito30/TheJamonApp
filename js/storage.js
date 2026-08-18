// TheJamonApp Storage Manager & Helper Formulas

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
  return courses;
}

export function deleteCourse(courseId) {
  const courses = getCourses().filter(c => c.id !== courseId);
  saveCourses(courses);
  return courses;
}

// Math logic considering Modules per day
export function calculateAttendanceMetrics(course) {
  const daysTotal = Number(course.totalClasses) || 30;
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
    statusMessage
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

// UDD Grade Calculation Engine
export function calculateCourseGrades(course, passingGrade = 4.0) {
  const isUddRule = !!course.isUddRuleEnabled;
  const evals = course.evaluations || [];

  if (evals.length === 0) {
    return { currentAverage: null, totalGradedWeight: 0, requiredRemainingGrade: null, isExempt: false };
  }

  const examEval = evals.find(e => e.name.toLowerCase().includes('examen')) || evals[evals.length - 1];
  const nonExamEvals = evals.filter(e => e !== examEval);

  let certamenSum = 0;
  let certamenWeight = 0;
  let gradedCertamens = [];

  nonExamEvals.forEach(ev => {
    const w = Number(ev.weight) || 0;
    if (ev.grade !== null && ev.grade !== undefined && !isNaN(ev.grade)) {
      certamenSum += Number(ev.grade) * w;
      certamenWeight += w;
      gradedCertamens.push(ev);
    }
  });

  const currentCertamenAvg = certamenWeight > 0 ? (certamenSum / certamenWeight) : null;
  const isExempt = isUddRule && currentCertamenAvg !== null && currentCertamenAvg >= 5.0;

  let effectiveEvals = evals.map(e => ({ ...e }));
  let replacedCertamenName = null;
  let originalCertamenGrade = null;

  if (isUddRule && examEval && examEval.grade !== null && examEval.grade !== undefined && Number(examEval.grade) >= 4.0) {
    if (gradedCertamens.length > 0) {
      let lowestCertamen = gradedCertamens[0];
      gradedCertamens.forEach(c => {
        if (Number(c.grade) < Number(lowestCertamen.grade)) {
          lowestCertamen = c;
        }
      });

      if (Number(examEval.grade) > Number(lowestCertamen.grade)) {
        replacedCertamenName = lowestCertamen.name;
        originalCertamenGrade = lowestCertamen.grade;
        
        const targetInEffective = effectiveEvals.find(e => e.id === lowestCertamen.id);
        if (targetInEffective) {
          targetInEffective.grade = examEval.grade;
        }
      }
    }
  }

  let totalWeightedGradedSum = 0;
  let totalGradedWeight = 0;
  let totalUngradedWeight = 0;

  effectiveEvals.forEach(ev => {
    const w = Number(ev.weight) || 0;
    if (ev.grade !== null && ev.grade !== undefined && !isNaN(ev.grade)) {
      totalWeightedGradedSum += Number(ev.grade) * (w / 100);
      totalGradedWeight += w;
    } else {
      totalUngradedWeight += w;
    }
  });

  const currentAverage = totalGradedWeight > 0 
    ? (totalWeightedGradedSum / (totalGradedWeight / 100)).toFixed(2)
    : null;

  let requiredRemainingGrade = null;
  
  if (totalUngradedWeight > 0 && examEval && (examEval.grade === null || examEval.grade === undefined)) {
    if (isExempt) {
      requiredRemainingGrade = 'Eximido (0.0)';
    } else {
      const examWeight = Number(examEval.weight) || 30;

      if (!isUddRule || gradedCertamens.length === 0) {
        const pointsNeeded = passingGrade - totalWeightedGradedSum;
        const needed = (pointsNeeded / (examWeight / 100));
        requiredRemainingGrade = Math.max(1.0, Math.min(7.0, needed)).toFixed(1);
      } else {
        let lowestCertamen = gradedCertamens[0];
        gradedCertamens.forEach(c => {
          if (Number(c.grade) < Number(lowestCertamen.grade)) lowestCertamen = c;
        });

        const lowestWeight = Number(lowestCertamen.weight) || 0;
        const otherCertamensSum = totalWeightedGradedSum - (Number(lowestCertamen.grade) * (lowestWeight / 100));

        const combinedWeightPercent = (lowestWeight + examWeight) / 100;
        const neededWithUDD = (4.0 - otherCertamensSum) / combinedWeightPercent;

        if (neededWithUDD <= 4.0) {
          requiredRemainingGrade = Math.max(1.0, neededWithUDD).toFixed(1);
        } else {
          requiredRemainingGrade = Math.min(7.0, neededWithUDD).toFixed(1);
        }
      }
    }
  }

  return {
    currentAverage: currentAverage ? Number(currentAverage) : null,
    totalGradedWeight,
    totalUngradedWeight,
    requiredRemainingGrade,
    isExempt,
    isUddRule,
    replacedCertamenName,
    originalCertamenGrade,
    passingGrade
  };
}
