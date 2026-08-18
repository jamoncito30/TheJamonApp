// iOS UI Component Renderer Functions for TheJamonApp
import { calculateAttendanceMetrics, calculateCourseGrades, UDD_MODULES } from './storage.js';
import { getGeminiApiKey } from './syllabusParser.js';

// 1. DASHBOARD VIEW (SEMÁFORO DE ASISTENCIA)
export function renderDashboardView(courses) {
  if (!courses || courses.length === 0) {
    return `
      <div class="space-y-4 animate-ios-fade">
        <div class="ios-glass p-6 rounded-3xl text-center space-y-4 border border-blue-500/30 relative overflow-hidden">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
            <i data-lucide="shield-check" class="w-9 h-9"></i>
          </div>

          <div>
            <h2 class="text-xl font-bold text-white tracking-tight">¡Bienvenido a TheJamonApp! 🎓</h2>
            <p class="text-xs text-slate-300 max-w-xs mx-auto mt-1.5 leading-relaxed">
              Tu asistente para el control del margen de faltas por módulo (UDD) y estimación de notas.
            </p>
          </div>

          <div class="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 text-left space-y-2">
            <div class="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i>
              <span>Comienza agregando tus ramos fácilmente:</span>
            </div>
            <ul class="text-[11px] text-slate-400 space-y-1 pl-6 list-disc">
              <li>Adjuntando la calendarización/syllabus (PDF o texto).</li>
              <li>Ingresando los datos de tu asignatura manualmente.</li>
            </ul>
          </div>

          <div class="pt-2">
            <button id="welcome-upload-btn" class="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2">
              <i data-lucide="file-up" class="w-4 h-4"></i>
              Subir Ramos o Calendarización
            </button>
          </div>
        </div>
      </div>
    `;
  }

  let totalWildcardModules = 0;
  let totalUsedWildcardModules = 0;
  let alertCoursesCount = 0;
  let dangerCoursesCount = 0;

  const courseCardsHtml = courses.map(course => {
    const metrics = calculateAttendanceMetrics(course);
    totalWildcardModules += metrics.maxAllowedAbsences;
    totalUsedWildcardModules += metrics.absent;

    if (metrics.status === 'yellow') alertCoursesCount++;
    if (metrics.status === 'red') dangerCoursesCount++;

    const progressPercent = metrics.maxAllowedAbsences > 0 
      ? Math.min(100, Math.round((metrics.absent / metrics.maxAllowedAbsences) * 100))
      : 100;

    const isDoubleModule = metrics.modulesPerDay === 2;

    return `
      <div class="ios-card p-5 relative overflow-hidden transition-all duration-300 hover:border-slate-700 animate-ios-fade group" data-course-id="${course.id}">
        
        <!-- Header Ramo -->
        <div class="flex items-start justify-between mb-3">
          <div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700/50">${course.code || 'ASIG'}</span>
              <span class="text-[9px] font-bold ${isDoubleModule ? 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30' : 'text-slate-400 bg-slate-800'} px-1.5 py-0.5 rounded-md border">
                ${isDoubleModule ? '2 Módulos/Día (UDD)' : '1 Módulo/Día'}
              </span>
              ${course.isUddRuleEnabled ? `<span class="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">UDD Math</span>` : ''}
            </div>
            <h3 class="text-base font-bold text-white mt-1 group-hover:text-blue-400 transition-colors">${course.name}</h3>
            <p class="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <i data-lucide="clock" class="w-3 h-3 text-slate-500"></i>
              ${course.schedule || 'Sin horario'}
            </p>
          </div>

          <!-- Status Badge (Semáforo) -->
          <div class="flex flex-col items-end">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${metrics.statusBg} ${metrics.status === 'green' ? 'glow-green' : metrics.status === 'yellow' ? 'glow-yellow' : 'glow-red'}">
              <i data-lucide="${metrics.statusIcon}" class="w-3.5 h-3.5"></i>
              ${metrics.statusLabel}
            </span>
            <span class="text-[10px] text-slate-400 mt-1 font-medium">${metrics.reqPercent}% Asistencia Mínima</span>
          </div>
        </div>

        <!-- Metric Highlight Card -->
        <div class="bg-slate-900/80 rounded-2xl p-3 my-3 border border-slate-800/80 grid grid-cols-3 gap-2 text-center">
          <div class="flex flex-col items-center border-r border-slate-800/80 pr-1">
            <span class="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Comodines</span>
            <span class="text-xl font-extrabold ${metrics.remainingWildcards < 0 ? 'text-rose-400' : metrics.remainingWildcards <= metrics.modulesPerDay ? 'text-amber-400' : 'text-emerald-400'} mt-0.5">
              ${metrics.remainingWildcards}
            </span>
            <span class="text-[9px] text-slate-500">de ${metrics.maxAllowedAbsences} módulos</span>
          </div>

          <div class="flex flex-col items-center border-r border-slate-800/80 px-1">
            <span class="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Asistencias</span>
            <span class="text-xl font-extrabold text-blue-400 mt-0.5">${metrics.attended}</span>
            <span class="text-[9px] text-slate-500">mód (${metrics.currentAttendanceRate}%)</span>
          </div>

          <div class="flex flex-col items-center pl-1">
            <span class="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Faltas</span>
            <span class="text-xl font-extrabold text-rose-400 mt-0.5">${metrics.absent}</span>
            <span class="text-[9px] text-slate-500">módulos</span>
          </div>
        </div>

        <!-- Progress Bar for Wildcards used -->
        <div class="space-y-1 mb-3">
          <div class="flex justify-between text-[11px] font-medium text-slate-400">
            <span>Margen de faltas ocupado</span>
            <span class="font-bold ${metrics.absent >= metrics.maxAllowedAbsences ? 'text-rose-400' : 'text-slate-300'}">${progressPercent}%</span>
          </div>
          <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
            <div class="h-full rounded-full transition-all duration-500 ${metrics.status === 'red' ? 'bg-rose-500' : metrics.status === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'}" style="width: ${Math.min(100, progressPercent)}%"></div>
          </div>
          <p class="text-[10px] text-slate-400 italic">${metrics.statusMessage}</p>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-2 pt-2 border-t border-slate-800/60">
          <div class="grid grid-cols-2 gap-2">
            <button data-action="attend" data-amount="1" data-id="${course.id}" class="ios-tap-active py-2 px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1 transition-all">
              <i data-lucide="check" class="w-3.5 h-3.5"></i>
              + Asistí (1 Mód)
            </button>
            
            <button data-action="absent" data-amount="1" data-id="${course.id}" class="ios-tap-active py-2 px-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-1 transition-all">
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
              + Falté (1 Mód)
            </button>
          </div>

          ${isDoubleModule ? `
            <div class="grid grid-cols-2 gap-2">
              <button data-action="attend" data-amount="2" data-id="${course.id}" class="ios-tap-active py-1.5 px-2.5 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all">
                <i data-lucide="check-check" class="w-3.5 h-3.5"></i>
                + Asistí Día Completo (2 Mód)
              </button>
              
              <button data-action="absent" data-amount="2" data-id="${course.id}" class="ios-tap-active py-1.5 px-2.5 rounded-xl bg-rose-600/25 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all">
                <i data-lucide="alert-circle" class="w-3.5 h-3.5"></i>
                + Falté Día Completo (2 Mód)
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  const remainingGlobalWildcards = Math.max(0, totalWildcardModules - totalUsedWildcardModules);

  return `
    <div class="space-y-4 animate-ios-fade">
      
      <!-- Top Global Status Summary KPI Widget -->
      <div class="ios-glass p-4 rounded-3xl space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <i data-lucide="activity" class="w-4 h-4 text-blue-400"></i>
            Resumen de Comodines
          </span>
          <span class="text-[11px] font-semibold text-slate-400">${courses.length} Ramos Activos</span>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <div class="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/50 text-center">
            <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Comodines Módulos</span>
            <div class="text-xl font-extrabold text-blue-400 mt-0.5">${remainingGlobalWildcards}</div>
          </div>

          <div class="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/50 text-center">
            <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold">En Alerta</span>
            <div class="text-xl font-extrabold ${alertCoursesCount > 0 ? 'text-amber-400' : 'text-slate-400'} mt-0.5">${alertCoursesCount}</div>
          </div>

          <div class="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/50 text-center">
            <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold">En Riesgo</span>
            <div class="text-xl font-extrabold ${dangerCoursesCount > 0 ? 'text-rose-400' : 'text-slate-400'} mt-0.5">${dangerCoursesCount}</div>
          </div>
        </div>
      </div>

      <!-- Course Cards Container -->
      <div class="space-y-4">
        <div class="flex items-center justify-between px-1">
          <h2 class="text-sm font-bold text-slate-200 tracking-tight flex items-center gap-1.5">
            <i data-lucide="layers" class="w-4 h-4 text-slate-400"></i>
            Mis Asignaturas (${courses.length})
          </h2>
          <button id="view-history-btn" class="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
            <i data-lucide="history" class="w-3.5 h-3.5"></i>
            Historial
          </button>
        </div>

        ${courseCardsHtml}
      </div>
    </div>
  `;
}

// 2. SUBIR RAMOS / SYLLABUS READER VIEW WITH GEMINI AI OPTION
export function renderSyllabusView() {
  const apiKey = getGeminiApiKey();
  const hasKey = !!apiKey;

  return `
    <div class="space-y-5 animate-ios-fade">
      <div>
        <h2 class="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <i data-lucide="file-up" class="w-5 h-5 text-blue-400"></i>
          Subir Ramos & Calendarización
        </h2>
        <p class="text-xs text-slate-400 mt-1">Sube o pega la calendarización de tus asignaturas para extraer la asistencia exigida, certámenes y módulos.</p>
      </div>

      <!-- Gemini AI Integration Card -->
      <div class="ios-card p-4 rounded-3xl border border-indigo-500/30 space-y-3 bg-gradient-to-br from-indigo-950/40 to-purple-950/30">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <i data-lucide="sparkles" class="w-4 h-4"></i>
            </div>
            <div>
              <h3 class="text-xs font-bold text-white flex items-center gap-1.5">
                Procesamiento IA con Gemini 2.5 Flash
                <span class="text-[9px] font-extrabold ${hasKey ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'} px-1.5 py-0.5 rounded-full border">
                  ${hasKey ? 'IA Activa ✨' : 'Opcional'}
                </span>
              </h3>
              <p class="text-[10px] text-slate-400">Lee PDFs complejos, imágenes y calendarios UDD con máxima precisión</p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 pt-1">
          <input type="password" id="gemini-key-input" value="${apiKey}" placeholder="Pega tu Gemini API Key aquí..." class="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-purple-500 focus:outline-none" />
          <button id="save-gemini-key-btn" class="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30 shrink-0">
            Guardar
          </button>
        </div>
        <p class="text-[9.5px] text-slate-400 flex items-center justify-between">
          <span>Obtén una API Key gratuita en 10 segundos en Google AI Studio:</span>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-purple-400 underline font-bold hover:text-purple-300">Conseguir Key →</a>
        </p>
      </div>

      <!-- Drag & Drop Upload Zone -->
      <div id="drop-zone" class="ios-card border-2 border-dashed border-blue-500/30 hover:border-blue-500/60 bg-blue-500/5 p-6 rounded-3xl text-center transition-all cursor-pointer relative group">
        <input type="file" id="syllabus-file-input" accept=".pdf,.txt" class="hidden" />
        <div class="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
          <i data-lucide="upload-cloud" class="w-7 h-7"></i>
        </div>
        <h3 class="text-sm font-bold text-white">Arrastra aquí la Calendarización (PDF o TXT)</h3>
        <p class="text-xs text-slate-400 mt-1">o toca para seleccionar desde tu dispositivo</p>
        <span class="inline-block mt-3 px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-[10px] font-semibold border border-slate-700">
          Procesamiento ${hasKey ? 'con IA Gemini 2.5 Flash' : 'seguro en tu dispositivo'}
        </span>
      </div>

      <!-- OR Paste Text directly -->
      <div class="ios-card p-4 rounded-3xl space-y-3">
        <label class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <i data-lucide="clipboard-text" class="w-4 h-4 text-slate-400"></i>
          O pega el texto de la Calendarización aquí:
        </label>
        <textarea id="syllabus-text-input" rows="5" placeholder="Pega aquí el contenido del syllabus (asistencia %, total de clases, certámenes...)" class="w-full bg-slate-900 border border-slate-700/80 rounded-2xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors resize-none"></textarea>
        <button id="process-text-btn" class="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2">
          <i data-lucide="sparkles" class="w-4 h-4"></i>
          Analizar Calendarización ${hasKey ? 'con Gemini IA' : ''}
        </button>
      </div>
    </div>
  `;
}

// 3. AUTO-FILL CONFIRMATION MODAL FORM WITH MODULE QUESTION
export function renderConfirmationModal(parsedData) {
  const evalsRows = parsedData.evaluations.map((ev, idx) => `
    <div class="grid grid-cols-12 gap-2 items-center bg-slate-900/60 p-2 rounded-xl border border-slate-800">
      <input type="text" value="${ev.name}" data-idx="${idx}" data-field="name" class="col-span-6 eval-input bg-transparent text-xs text-slate-200 font-semibold focus:outline-none px-1" placeholder="Nombre" />
      <div class="col-span-5 flex items-center gap-1">
        <input type="number" value="${ev.weight}" data-idx="${idx}" data-field="weight" class="eval-input w-full bg-slate-800 text-xs text-blue-400 font-bold text-center rounded-lg py-1 focus:outline-none border border-slate-700" placeholder="%" />
        <span class="text-xs text-slate-400 font-bold">%</span>
      </div>
      <button data-remove-eval="${idx}" class="col-span-1 text-slate-500 hover:text-rose-400 flex justify-center">
        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
      </button>
    </div>
  `).join('');

  return `
    <div id="confirmation-modal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div class="ios-card w-full max-w-md max-h-[90vh] overflow-y-auto p-5 rounded-3xl space-y-4 border border-blue-500/30 animate-ios-fade">
        
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <i data-lucide="check-circle" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="text-base font-bold text-white">Confirmar Ramo Extraído</h3>
              <p class="text-[11px] text-slate-400">Verifica la configuración de asistencia y certámenes</p>
            </div>
          </div>
          <button id="close-modal-btn" class="text-slate-400 hover:text-white p-1">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <form id="confirm-course-form" class="space-y-3 text-left">
          
          <div>
            <label class="text-[11px] font-bold text-slate-300">Nombre de la Asignatura</label>
            <input type="text" id="form-name" value="${parsedData.name}" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold mt-1 focus:border-blue-500 focus:outline-none" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[11px] font-bold text-slate-300">Código Ramo</label>
              <input type="text" id="form-code" value="${parsedData.code}" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold mt-1 focus:border-blue-500 focus:outline-none" />
            </div>

            <div>
              <label class="text-[11px] font-bold text-slate-300">Créditos (SCT)</label>
              <input type="number" id="form-credits" value="${parsedData.credits}" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold mt-1 focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          <!-- QUESTION: Attendance per Module (UDD Style) -->
          <div class="bg-slate-900/90 p-3 rounded-2xl border border-indigo-500/40 space-y-2">
            <label class="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <i data-lucide="clock-3" class="w-4 h-4 text-indigo-400"></i>
              ¿Cómo registran la asistencia en este ramo?
            </label>
            
            <div class="grid grid-cols-2 gap-2 pt-1">
              <label class="p-2 bg-slate-800 rounded-xl border border-slate-700 flex items-center gap-2 cursor-pointer hover:border-indigo-500 transition-colors">
                <input type="radio" name="form-modules-per-day" value="2" ${parsedData.modulesPerDay === 2 ? 'checked' : ''} class="text-indigo-600 focus:ring-0" />
                <div>
                  <span class="text-xs font-bold text-white block">Por Módulo (2 al día)</span>
                  <span class="text-[9px] text-slate-400 block">Formato UDD (H1-H2, etc)</span>
                </div>
              </label>

              <label class="p-2 bg-slate-800 rounded-xl border border-slate-700 flex items-center gap-2 cursor-pointer hover:border-indigo-500 transition-colors">
                <input type="radio" name="form-modules-per-day" value="1" ${parsedData.modulesPerDay === 1 ? 'checked' : ''} class="text-indigo-600 focus:ring-0" />
                <div>
                  <span class="text-xs font-bold text-white block">Por Clase (1 al día)</span>
                  <span class="text-[9px] text-slate-400 block">1 asistencia por sesión</span>
                </div>
              </label>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[11px] font-bold text-slate-300">% Asistencia Exigida</label>
              <div class="flex items-center gap-1 mt-1">
                <input type="number" id="form-req-att" value="${parsedData.requiredAttendancePercent}" min="50" max="100" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-400 font-bold focus:border-blue-500 focus:outline-none" />
                <span class="text-xs font-bold text-slate-400">%</span>
              </div>
            </div>

            <div>
              <label class="text-[11px] font-bold text-slate-300">Días / Clases en Semestre</label>
              <input type="number" id="form-total-classes" value="${parsedData.totalClasses}" min="1" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold mt-1 focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          <!-- UDD Special Grade Rule Checkbox -->
          <div class="bg-slate-900/90 p-3 rounded-2xl border border-blue-500/30 flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-blue-400 block">Normativa UDD (Ingeniería / Matemáticas)</span>
              <span class="text-[10px] text-slate-400 block">Eximición $\ge 5.0$ + Reemplazo del peor certamen si Examen $\ge 4.0$</span>
            </div>
            <input type="checkbox" id="form-udd-rule" checked class="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0" />
          </div>

          <!-- Evaluation Breakdown -->
          <div class="space-y-2 pt-2 border-t border-slate-800">
            <div class="flex items-center justify-between">
              <label class="text-[11px] font-bold text-slate-300">Evaluaciones Detectadas</label>
              <button type="button" id="add-eval-btn" class="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1">
                <i data-lucide="plus" class="w-3 h-3"></i> Agregar Evaluacion
              </button>
            </div>
            <div id="evals-container" class="space-y-2 max-h-36 overflow-y-auto pr-1">
              ${evalsRows}
            </div>
          </div>

          <div class="pt-3 flex gap-2">
            <button type="button" id="cancel-modal-btn" class="w-1/3 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700">
              Cancelar
            </button>
            <button type="submit" class="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5">
              <i data-lucide="save" class="w-4 h-4"></i>
              Guardar Ramo
            </button>
          </div>
        </form>

      </div>
    </div>
  `;
}

// 4. GRADE CALCULATOR VIEW WITH UDD SPECIAL RULES
export function renderGradesView(courses) {
  if (!courses || courses.length === 0) {
    return `<div class="p-6 text-center text-slate-400 text-xs">No tienes ramos registrados para calcular notas. Sube o crea tu primer ramo primero.</div>`;
  }

  const courseOptions = courses.map(c => `
    <option value="${c.id}">${c.code} - ${c.name} ${c.isUddRuleEnabled ? '(UDD)' : ''}</option>
  `).join('');

  return `
    <div class="space-y-4 animate-ios-fade">
      <div>
        <h2 class="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <i data-lucide="calculator" class="w-5 h-5 text-blue-400"></i>
          Calculadora de Notas & Normativa UDD
        </h2>
        <p class="text-xs text-slate-400 mt-1">Calcula tu promedio y la nota mínima en el examen aplicando la regla UDD de reemplazo de certamen.</p>
      </div>

      <!-- Course Selector -->
      <div class="ios-card p-4 rounded-3xl space-y-3">
        <label class="text-xs font-bold text-slate-300">Seleccionar Asignatura:</label>
        <select id="grade-course-select" class="w-full bg-slate-900 border border-slate-700 text-white rounded-2xl p-3 text-xs font-bold focus:outline-none focus:border-blue-500">
          ${courseOptions}
        </select>
      </div>

      <!-- Dynamic Grade Container -->
      <div id="grade-details-container" class="space-y-4">
        <!-- Rendered dynamically on selection -->
      </div>
    </div>
  `;
}

export function renderGradeDetails(course) {
  const metrics = calculateCourseGrades(course, 4.0);
  const evals = course.evaluations || [];

  const rowsHtml = evals.map(ev => {
    const isReplaced = metrics.replacedCertamenName === ev.name;

    return `
      <div class="bg-slate-900/80 p-3 rounded-2xl border ${isReplaced ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-800'} flex items-center justify-between gap-2">
        <div class="flex-1">
          <div class="flex items-center gap-1.5">
            <h4 class="text-xs font-bold text-white">${ev.name}</h4>
            ${isReplaced ? `<span class="text-[9px] font-extrabold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded-md">Reemplazado por Examen</span>` : ''}
          </div>
          <span class="text-[10px] text-blue-400 font-semibold">Ponderación: ${ev.weight}%</span>
          ${isReplaced ? `<span class="text-[9px] text-slate-400 block">Nota original: ${metrics.originalCertamenGrade}</span>` : ''}
        </div>

        <div class="flex items-center gap-2">
          <input type="number" step="0.1" min="1.0" max="7.0" value="${ev.grade !== null && ev.grade !== undefined ? ev.grade : ''}" data-eval-id="${ev.id}" class="grade-input w-16 bg-slate-800 border border-slate-700 text-white font-extrabold text-sm text-center rounded-xl py-1.5 focus:border-blue-500 focus:outline-none" placeholder="1.0 - 7.0" />
        </div>
      </div>
    `;
  }).join('');

  return `
    <!-- UDD Special Rule Banner -->
    <div class="bg-slate-900/90 p-4 rounded-3xl border border-blue-500/30 flex items-center justify-between space-x-3">
      <div>
        <div class="flex items-center gap-1.5">
          <i data-lucide="award" class="w-4 h-4 text-blue-400"></i>
          <span class="text-xs font-bold text-white">Normativa UDD (Ingeniería / Matemáticas)</span>
        </div>
        <p class="text-[10px] text-slate-400 mt-0.5">Eximición $\ge 5.0$ + Si Examen $\ge 4.0$ reemplaza el certamen más bajo.</p>
      </div>

      <label class="relative inline-flex items-center cursor-pointer shrink-0">
        <input type="checkbox" id="toggle-udd-rule" ${metrics.isUddRule ? 'checked' : ''} data-course-id="${course.id}" class="sr-only peer">
        <div class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
      </label>
    </div>

    <!-- Promedio KPI Box -->
    <div class="ios-glass p-4 rounded-3xl grid grid-cols-2 gap-3 text-center border border-slate-800">
      <div class="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
        <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Promedio Ponderado</span>
        <div class="text-2xl font-extrabold ${metrics.currentAverage >= 4.0 ? 'text-emerald-400' : 'text-rose-400'} mt-1">
          ${metrics.currentAverage !== null ? metrics.currentAverage : 'S/I'}
        </div>
        <span class="text-[9px] text-slate-500 font-medium">Evaluado: ${metrics.totalGradedWeight}%</span>
      </div>

      <div class="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
        <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Nota Examen Necesaria</span>
        <div class="text-xl font-extrabold ${metrics.isExempt ? 'text-emerald-400' : 'text-amber-400'} mt-1">
          ${metrics.requiredRemainingGrade !== null ? metrics.requiredRemainingGrade : 'Aprobado'}
        </div>
        <span class="text-[9px] text-slate-500 font-medium">${metrics.isExempt ? '¡Eximido UDD!' : 'para aprobar con 4.0'}</span>
      </div>
    </div>

    <!-- Evaluations Table -->
    <div class="ios-card p-4 rounded-3xl space-y-3">
      <div class="flex items-center justify-between px-1">
        <h3 class="text-xs font-bold text-slate-200">Notas Obtenidas (Escala 1.0 - 7.0)</h3>
        <button id="save-grades-btn" data-course-id="${course.id}" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center gap-1">
          <i data-lucide="check" class="w-3.5 h-3.5"></i>
          Guardar Notas
        </button>
      </div>

      <div class="space-y-2">
        ${rowsHtml}
      </div>
    </div>
  `;
}

// 5. COURSE MANAGEMENT VIEW
export function renderCoursesView(courses) {
  if (!courses || courses.length === 0) {
    return `<div class="p-6 text-center text-slate-400 text-xs">No tienes asignaturas registradas.</div>`;
  }

  const rows = courses.map(c => `
    <div class="ios-card p-4 rounded-3xl space-y-3 flex items-center justify-between">
      <div>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">${c.code}</span>
          <span class="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-md border border-indigo-500/20">
            ${c.modulesPerDay === 2 ? '2 Módulos/Día' : '1 Módulo/Día'}
          </span>
        </div>
        <h3 class="text-sm font-bold text-white mt-1">${c.name}</h3>
        <p class="text-xs text-slate-400">${c.credits} Créditos SCT | ${c.requiredAttendancePercent}% Asistencia exigida (${c.totalClasses} días)</p>
      </div>

      <div class="flex items-center gap-2">
        <button data-reset-course="${c.id}" title="Restablecer Faltas" class="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-amber-400 transition-colors">
          <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
        </button>
        <button data-delete-course="${c.id}" title="Eliminar Ramo" class="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-rose-400 transition-colors">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `).join('');

  return `
    <div class="space-y-4 animate-ios-fade">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <i data-lucide="book-open" class="w-5 h-5 text-blue-400"></i>
            Gestión de Ramos
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Administra tus asignaturas guardadas en localStorage.</p>
        </div>
      </div>

      <div class="space-y-3">
        ${rows}
      </div>

      <!-- Action Buttons -->
      <div class="pt-4 border-t border-slate-800">
        <div class="grid grid-cols-2 gap-2">
          <button id="export-json-btn" class="py-2.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5">
            <i data-lucide="download" class="w-4 h-4"></i>
            Exportar JSON
          </button>

          <label class="py-2.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
            <i data-lucide="upload" class="w-4 h-4"></i>
            Importar JSON
            <input type="file" id="import-json-input" accept=".json" class="hidden" />
          </label>
        </div>
      </div>
    </div>
  `;
}
