// iOS UI Component Renderer Functions for TheJamonApp
import { calculateAttendanceMetrics, calculateCourseGrades, computeSubEvaluationsGrade, UDD_MODULES } from './storage.js';
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

          <div class="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 text-left space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i>
                <span>Comienza agregando tus ramos fácilmente:</span>
              </div>
            </div>
            <ul class="text-[11px] text-slate-400 space-y-1 pl-6 list-disc">
              <li>Descarga la <b>Calendarización</b> en <b>Canvas Student UDD</b> (PDF o texto).</li>
              <li>Súbela a la app para calcular tus comodines y notas al instante.</li>
            </ul>

            <button id="welcome-tutorial-btn" class="w-full py-2 px-3 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5">
              <i data-lucide="book-open-check" class="w-3.5 h-3.5"></i>
              Ver Tutorial de Calendarización & Canvas
            </button>
          </div>

          <div class="pt-1">
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
          <div class="flex items-center gap-2">
            <button id="dashboard-tutorial-btn" class="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
              <i data-lucide="book-open-check" class="w-3.5 h-3.5"></i>
              Guía Canvas
            </button>
            <button id="view-history-btn" class="text-xs text-slate-400 hover:text-slate-300 font-semibold flex items-center gap-1">
              <i data-lucide="history" class="w-3.5 h-3.5"></i>
              Historial
            </button>
          </div>
        </div>

        ${courseCardsHtml}
      </div>
    </div>
  `;
}

// Canvas Logo SVG Vector Icon (Red Instructure Flower)
export function getCanvasLogoSvg(customClass = "w-4 h-4") {
  return `
    <svg class="${customClass}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g fill="#E62739">
        <circle cx="50" cy="27" r="5.5"/>
        <circle cx="50" cy="73" r="5.5"/>
        <circle cx="27" cy="50" r="5.5"/>
        <circle cx="73" cy="50" r="5.5"/>
        <circle cx="33.7" cy="33.7" r="5.5"/>
        <circle cx="66.3" cy="33.7" r="5.5"/>
        <circle cx="33.7" cy="66.3" r="5.5"/>
        <circle cx="66.3" cy="66.3" r="5.5"/>
        
        <path d="M38 10 C46 6.5 54 6.5 62 10 C58 17 42 17 38 10 Z"/>
        <path d="M38 90 C46 93.5 54 93.5 62 90 C58 83 42 83 38 90 Z"/>
        <path d="M10 38 C6.5 46 6.5 54 10 62 C17 58 17 42 10 38 Z"/>
        <path d="M90 38 C93.5 46 93.5 54 90 62 C83 58 83 42 90 38 Z"/>
        <path d="M18 27 C25 20 30 25 33 29 C27 33 22 30 18 27 Z"/>
        <path d="M82 27 C75 20 70 25 67 29 C73 33 78 30 82 27 Z"/>
        <path d="M18 73 C25 80 30 75 33 71 C27 67 22 70 18 73 Z"/>
        <path d="M82 73 C75 80 70 75 67 71 C73 67 78 70 82 73 Z"/>
      </g>
    </svg>
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

      <!-- Canvas UDD Helper Card / Launcher Banner -->
      <div class="ios-card p-3.5 rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
            <i data-lucide="book-open-check" class="w-5 h-5"></i>
          </div>
          <div class="truncate">
            <h3 class="text-xs font-bold text-white flex items-center gap-1.5 truncate">
              ¿No sabes qué archivo subir?
              <span class="text-[8px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-extrabold">UDD</span>
            </h3>
            <p class="text-[10px] text-slate-400 truncate">Descarga tu calendarización en Canvas Student UDD</p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button id="syllabus-open-tutorial-btn" class="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] shadow-sm shadow-blue-600/30 transition-all flex items-center gap-1">
            <i data-lucide="book-open" class="w-3 h-3"></i>
            Tutorial
          </button>
          <button id="syllabus-quick-canvas-btn" class="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-[10px] shadow-md shadow-white/10 transition-all flex items-center gap-1.5 active:scale-95">
            ${getCanvasLogoSvg("w-3.5 h-3.5 shrink-0")}
            <span>Canvas App</span>
          </button>
        </div>
      </div>

      <!-- Gemini AI Status Banner (Active for all) -->
      <div class="ios-card p-3.5 rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30 shadow-lg shadow-purple-500/10">
            <i data-lucide="sparkles" class="w-5 h-5"></i>
          </div>
          <div class="truncate">
            <h3 class="text-xs font-bold text-white flex items-center gap-1.5 truncate">
              Motor IA Gemini 2.5 Flash
              <span class="text-[8px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">Activo para todos ✨</span>
            </h3>
            <p class="text-[10px] text-slate-400 truncate">Extracción inteligente de calendarizaciones UDD</p>
          </div>
        </div>
        
        <button id="toggle-custom-key-btn" title="Configurar API Key personalizada" class="text-slate-400 hover:text-purple-300 text-[10px] font-bold py-1 px-2 rounded-lg bg-slate-800/80 border border-slate-700/60 transition-colors shrink-0 flex items-center gap-1">
          <i data-lucide="key" class="w-3 h-3"></i>
          <span>Personalizar</span>
        </button>
      </div>

      <!-- Collapsible Custom Key Input (Discreet / Optional) -->
      <div id="custom-key-drawer" class="hidden ios-card p-3.5 rounded-2xl border border-purple-500/20 bg-slate-900/90 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold text-slate-200">Clave API de Gemini Personalizada</span>
          <span class="text-[9px] text-slate-400">Opcional (ya incluye una compartida)</span>
        </div>
        <div class="flex items-center gap-2">
          <input type="password" id="gemini-key-input" value="${apiKey}" placeholder="Pega tu propia Gemini API Key aquí..." class="flex-1 bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-purple-500 focus:outline-none" />
          <button id="save-gemini-key-btn" class="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30 shrink-0">
            Guardar
          </button>
        </div>
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
                <span class="text-xs text-slate-500 font-bold">%</span>
              </div>
            </div>

            <div>
              <label class="text-[11px] font-bold text-slate-300">Periodo Académico</label>
              <select id="form-academic-period" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold mt-1 focus:border-blue-500 focus:outline-none">
                <option value="semestre2" ${!parsedData.name.toLowerCase().includes('bimestre') ? 'selected' : ''}>Semestral (Ago - Nov)</option>
                <option value="bimestre3" ${parsedData.name.toLowerCase().includes('bimestre 3') ? 'selected' : ''}>Bimestre 3 (Ago - Sep)</option>
                <option value="bimestre4" ${parsedData.name.toLowerCase().includes('bimestre 4') ? 'selected' : ''}>Bimestre 4 (Oct - Nov)</option>
              </select>
            </div>

            <div>
              <label class="text-[11px] font-bold text-slate-300">Días de Clases</label>
              <div class="grid grid-cols-3 gap-1 mt-1">
                ${[
                  {id:1, label:'Lun'},
                  {id:2, label:'Mar'},
                  {id:3, label:'Mié'},
                  {id:4, label:'Jue'},
                  {id:5, label:'Vie'},
                  {id:6, label:'Sáb'}
                ].map(day => `
                  <label class="flex items-center gap-1 bg-slate-800 p-1.5 rounded-lg border border-slate-700 cursor-pointer hover:border-blue-500">
                    <input type="checkbox" name="form-class-days" value="${day.id}" ${parsedData.classDays && parsedData.classDays.includes(day.id) ? 'checked' : ''} class="w-3 h-3 text-blue-600 rounded border-slate-600 focus:ring-0 focus:ring-offset-0 bg-slate-900" />
                    <span class="text-[10px] font-bold text-slate-300">${day.label}</span>
                  </label>
                `).join('')}
              </div>
              <div id="dynamic-classes-info" class="mt-2 text-[9px] text-emerald-400 font-semibold bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                Selecciona días para calcular fechas y feriados.
              </div>
              <input type="hidden" id="form-total-classes" value="${parsedData.totalClasses}" />
            </div>
          </div>

          <div>
            <label class="text-[11px] font-bold text-slate-300">Ponderación Examen Final (%)</label>
            <div class="flex items-center gap-1 mt-1">
              <input type="number" id="form-exam-weight" value="${parsedData.examWeight || 30}" min="0" max="100" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold focus:border-blue-500 focus:outline-none" />
              <span class="text-xs text-slate-500 font-bold">%</span>
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
    const isSub = !!ev.isSubEvaluationsEnabled && Array.isArray(ev.subEvaluations) && ev.subEvaluations.length > 0;
    const computedGrade = isSub ? computeSubEvaluationsGrade(ev) : (ev.grade !== null && ev.grade !== undefined && ev.grade !== '' ? Number(ev.grade) : null);
    
    let subStats = '';
    if (isSub) {
      const validCount = ev.subEvaluations.filter(s => s.grade !== null && s.grade !== undefined && s.grade !== '' && !isNaN(Number(s.grade))).length;
      const totalCount = ev.subEvaluations.length;
      subStats = `${validCount}/${totalCount} notas`;
    }

    return `
      <div class="bg-slate-900/80 p-3.5 rounded-2xl border ${isReplaced ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-800'} flex items-center justify-between gap-3 transition-all">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <h4 class="text-xs font-bold text-white truncate">${ev.name}</h4>
            <span class="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">${ev.weight}%</span>
            ${isReplaced ? `<span class="text-[9px] font-extrabold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded-md">Reemplazado por Examen</span>` : ''}
            ${isSub && ev.dropLowestCount > 0 ? `<span class="text-[8px] font-bold text-indigo-300 bg-indigo-500/20 px-1.5 py-0.2 rounded border border-indigo-500/30">Elimina peor</span>` : ''}
          </div>
          
          ${isSub ? `
            <div class="flex items-center gap-2 mt-1.5">
              <span class="text-[10px] text-slate-400 font-semibold">${subStats}</span>
              <button type="button" class="open-subevals-btn px-2 py-0.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-300 hover:text-white text-[10px] font-bold flex items-center gap-1 transition-colors" data-course-id="${course.id}" data-eval-id="${ev.id}">
                <i data-lucide="edit-3" class="w-3 h-3"></i> Ingresar / Ver Notas
              </button>
            </div>
          ` : `
            <div class="flex items-center gap-2 mt-1">
              <button type="button" class="enable-subevals-btn text-[9px] text-slate-500 hover:text-purple-400 font-medium flex items-center gap-1 transition-colors" data-course-id="${course.id}" data-eval-id="${ev.id}">
                <i data-lucide="split" class="w-2.5 h-2.5"></i> Desglosar en controles/sub-notas
              </button>
            </div>
          `}
          
          ${isReplaced ? `<span class="text-[9px] text-slate-400 block mt-0.5">Nota original: ${metrics.originalCertamenGrade}</span>` : ''}
        </div>

        <div class="flex items-center gap-2 shrink-0">
          ${isSub ? `
            <div class="flex flex-col items-end">
              <div class="w-16 py-1.5 bg-purple-950/50 border border-purple-500/40 text-purple-300 font-black text-sm text-center rounded-xl shadow-inner cursor-pointer open-subevals-btn" data-course-id="${course.id}" data-eval-id="${ev.id}" title="Toca para ver o modificar controles">
                ${computedGrade !== null ? computedGrade.toFixed(1) : 'S/I'}
              </div>
              <span class="text-[8px] text-purple-400/80 font-semibold mt-0.5">Auto-promedio</span>
            </div>
          ` : `
            <input type="number" step="0.1" min="1.0" max="7.0" value="${ev.grade !== null && ev.grade !== undefined && ev.grade !== '' ? ev.grade : ''}" data-eval-id="${ev.id}" class="grade-input w-16 bg-slate-800 border border-slate-700 text-white font-extrabold text-sm text-center rounded-xl py-1.5 focus:border-blue-500 focus:outline-none" placeholder="1.0 - 7.0" />
          `}
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

    <!-- RECUADRO 1: Evaluaciones de Presentación (70% de la Nota Final) -->
    <div class="ios-card p-4 rounded-3xl space-y-3 border border-slate-800">
      <div class="flex items-center justify-between px-1">
        <div>
          <h3 class="text-xs font-bold text-slate-200">Notas de Presentación</h3>
          <p class="text-[10px] text-blue-400 font-semibold">Suman 100% de la Nota de Presentación (${metrics.presentationWeight || 70}% Final)</p>
        </div>
        
        <div class="flex items-center gap-2">
          <div class="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700 text-right">
            <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Promedio Presentación</span>
            <span id="promedio-presentacion-val" class="text-sm font-extrabold ${metrics.presentationGrade >= 4.0 ? 'text-emerald-400' : (metrics.presentationGrade !== null ? 'text-rose-400' : 'text-slate-400')}">
              ${metrics.presentationGrade !== null ? metrics.presentationGrade : 'S/I'}
            </span>
          </div>

          <button id="save-grades-btn" data-course-id="${course.id}" class="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center gap-1">
            <i data-lucide="save" class="w-3.5 h-3.5"></i> Guardar
          </button>
        </div>
      </div>

      <div class="space-y-2 pt-1 border-t border-slate-800/60">
        ${rowsHtml}
      </div>
    </div>

    <!-- RECUADRO 2: Examen Final & Calificación Definitiva -->
    <div class="ios-card p-4 rounded-3xl space-y-4 border border-indigo-500/30 bg-gradient-to-b from-indigo-950/20 to-slate-900/90 shadow-xl shadow-indigo-950/20">
      <div class="flex items-center justify-between border-b border-indigo-500/20 pb-3">
        <h3 class="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
          <i data-lucide="graduation-cap" class="w-4 h-4 text-indigo-400"></i>
          Examen Final & Promedio Definitivo
        </h3>
        <span class="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-md border border-indigo-500/30">
          Examen ${metrics.examWeight || 30}%
        </span>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <!-- Input Examen -->
        <div class="bg-slate-900/90 p-3 rounded-2xl border border-indigo-500/30 flex items-center justify-between gap-2">
          <div>
            <span class="text-[10px] font-bold text-indigo-200 block">Examen Final (${metrics.examWeight || 30}%)</span>
            <span class="text-[9px] text-slate-400">Ingresa tu nota</span>
          </div>
          <input type="number" step="0.1" min="1.0" max="7.0" value="${course.examGrade !== null && course.examGrade !== undefined ? course.examGrade : ''}" id="exam-grade-input" class="w-16 bg-slate-800 border border-indigo-500/50 text-white font-extrabold text-sm text-center rounded-xl py-1.5 focus:border-indigo-400 focus:outline-none" placeholder="1.0 - 7.0" />
        </div>

        <!-- Requirement Box -->
        <div class="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 text-center">
          <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Nota Examen Requerida</span>
          <div id="nota-examen-requerida-val" class="text-base font-extrabold ${metrics.requiredRemainingGrade === 'Reprobado' ? 'text-rose-400' : (metrics.isExempt || metrics.requiredRemainingGrade === 'Aprobado' ? 'text-emerald-400' : 'text-amber-400')} mt-0.5">
            ${metrics.requiredRemainingGrade !== null ? metrics.requiredRemainingGrade : 'Aprobado'}
          </div>
          <span class="text-[8px] text-slate-500 block">${metrics.isExempt ? '¡Eximido UDD!' : 'para aprobación (4.0)'}</span>
        </div>
      </div>

      <!-- Final Grade Highlight Card -->
      <div class="bg-slate-900 p-3.5 rounded-2xl border border-slate-700/80 flex items-center justify-between">
        <div>
          <span class="text-xs font-bold text-white block">Nota Final Ponderada (100%)</span>
          <span id="nota-final-subtext-val" class="text-[10px] text-slate-400">
            ${metrics.presentationWeight || 70}% Presentación (${metrics.presentationGrade !== null ? metrics.presentationGrade : 'S/I'}) + ${metrics.examWeight || 30}% Examen
          </span>
        </div>
        <div id="nota-final-ponderada-val" class="text-2xl font-black ${metrics.currentAverage >= 4.0 ? 'text-emerald-400' : (metrics.currentAverage !== null ? 'text-rose-400' : 'text-slate-500')} px-3 py-1 rounded-xl bg-slate-950 border border-slate-800">
          ${metrics.currentAverage !== null ? metrics.currentAverage : 'S/I'}
        </div>
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

// 6. AUTHENTICATION & MULTI-USER VIEW (iOS Style)
export function renderAuthView(isConfigured = false) {
  return `
    <div class="space-y-5 animate-ios-fade py-4 px-2">
      <!-- App Identity Badge -->
      <div class="text-center space-y-2">
        <div class="w-16 h-16 rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/20 mx-auto border-2 border-amber-500/50">
          <img src="jamon_logo.jpg" alt="TheJamonApp Logo" class="w-full h-full object-cover" />
        </div>
        <h2 class="text-xl font-black text-white tracking-tight">Bienvenido a TheJamonApp</h2>
        <p class="text-xs text-slate-400 max-w-xs mx-auto">Tu plataforma multi-usuario para gestión de asistencia, ramos y notas UDD.</p>
      </div>

      <!-- Auth Form Card -->
      <div class="ios-card p-5 rounded-3xl space-y-4 border border-slate-800 shadow-2xl">
        <!-- Segmented Tab Switcher -->
        <div class="bg-slate-900 p-1 rounded-2xl grid grid-cols-2 gap-1 border border-slate-800">
          <button id="auth-tab-login" class="auth-mode-btn active py-2 rounded-xl text-xs font-bold transition-all text-white bg-blue-600 shadow-md">
            Iniciar Sesión
          </button>
          <button id="auth-tab-signup" class="auth-mode-btn py-2 rounded-xl text-xs font-bold transition-all text-slate-400 hover:text-white">
            Registrarse
          </button>
        </div>

        <form id="auth-form" class="space-y-3 pt-2">
          <div>
            <label class="text-[11px] font-bold text-slate-300">Correo Electrónico</label>
            <input type="email" id="auth-email" required placeholder="alumno@udd.cl" class="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-xs font-semibold mt-1 focus:border-blue-500 focus:outline-none" />
          </div>

          <div>
            <label class="text-[11px] font-bold text-slate-300">Contraseña</label>
            <input type="password" id="auth-password" required minlength="6" placeholder="••••••••" class="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-xs font-semibold mt-1 focus:border-blue-500 focus:outline-none" />
          </div>

          <button type="submit" id="auth-submit-btn" class="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 mt-2">
            <i data-lucide="log-in" class="w-4 h-4"></i>
            <span id="auth-submit-label">Iniciar Sesión</span>
          </button>
        </form>

        <div class="relative flex py-2 items-center">
          <div class="flex-grow border-t border-slate-800"></div>
          <span class="flex-shrink mx-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold">O también</span>
          <div class="flex-grow border-t border-slate-800"></div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <!-- Google OAuth Button -->
          <button id="auth-google-btn" class="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5">
            <svg class="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Google
          </button>

          <!-- Apple OAuth Button (En Desarrollo) -->
          <button id="auth-apple-btn" title="En desarrollo" class="py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-400 text-xs font-bold transition-all flex items-center justify-center gap-1 opacity-75 hover:opacity-100">
            <svg class="w-4 h-4 fill-current text-slate-400" viewBox="0 0 170 170">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.82.13-9.74-1.94-14.77-6.23-3.38-2.88-7.31-7.6-11.8-14.15-6.52-9.48-11.66-20.16-15.42-32.04-3.76-11.88-5.64-23.23-5.64-34.05 0-15.47 3.86-28.53 11.58-39.18 7.72-10.65 17.56-16.09 29.53-16.32 4.29 0 9.38 1.15 15.28 3.47 5.9 2.31 9.77 3.47 11.6 3.47 1.54 0 5.48-1.21 11.83-3.63 6.35-2.42 11.19-3.55 14.53-3.39 12.83.67 23.11 5.37 30.84 14.1-11.45 6.94-17.06 16.71-16.83 29.31.23 9.87 4.12 18.25 11.67 25.14 4.54 4.16 9.84 7.23 15.9 9.21-2.58 7.62-5.99 15.24-10.23 22.86zM119.22 31.08c0-7.39 2.66-14.44 7.98-21.15 5.32-6.71 12.1-11.02 20.34-12.93.59 7.72-1.92 14.88-7.53 21.48-5.61 6.6-12.39 10.74-20.34 12.43-.16-.36-.26-.71-.26-1.05-.13-1.07-.19-2.14-.19-3.21z"/>
            </svg>
            Apple <span class="text-[7px] uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 py-0.2 rounded font-extrabold">Dev</span>
          </button>
        </div>

        <!-- Guest / Configuration Links -->
        <div class="pt-2 flex flex-col items-center gap-2 text-center">
          <button id="guest-mode-btn" class="text-xs font-semibold text-slate-400 hover:text-white transition-colors">
            Continuar en Modo Invitado (Almacenamiento Local)
          </button>
          
          <button id="open-config-btn" class="text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:underline flex items-center justify-center gap-1 mt-1">
            <i data-lucide="lock" class="w-3 h-3 text-slate-400"></i>
            Configuración Servidor Supabase (Admin)
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderSupabaseConfigModal(currentUrl = '', currentKey = '') {
  return `
    <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div class="ios-card w-full max-w-sm p-5 rounded-3xl space-y-4 border border-blue-500/30 shadow-2xl animate-ios-fade">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <i data-lucide="database" class="w-4 h-4 text-blue-400"></i>
            Configuración de Supabase
          </h3>
          <button id="close-config-modal" class="text-slate-400 hover:text-white">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <p class="text-xs text-slate-400">Ingresa las credenciales de tu proyecto de Supabase para activar la base de datos multi-usuario.</p>

        <form id="supabase-config-form" class="space-y-3">
          <div>
            <label class="text-[11px] font-bold text-slate-300">Project URL</label>
            <input type="url" id="config-url" value="${currentUrl}" placeholder="https://xxxx.supabase.co" required class="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono mt-1 focus:border-blue-500 focus:outline-none" />
          </div>

          <div>
            <label class="text-[11px] font-bold text-slate-300">Anon API Key</label>
            <textarea id="config-key" rows="3" placeholder="eyJhbGciOi..." required class="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono mt-1 focus:border-blue-500 focus:outline-none resize-none">${currentKey}</textarea>
          </div>

          <div class="flex gap-2 pt-2">
            <button type="button" id="cancel-config-btn" class="w-1/3 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs">
              Cancelar
            </button>
            <button type="submit" class="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30">
              Guardar y Conectar
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// 8. TUTORIAL & CANVAS UDD ONBOARDING MODAL
export function renderCanvasTutorialModal() {
  return `
    <div id="canvas-tutorial-modal" class="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div class="ios-card w-full max-w-md p-5 rounded-3xl space-y-4 border border-blue-500/30 shadow-2xl animate-ios-fade max-h-[92vh] flex flex-col justify-between overflow-hidden bg-slate-900/95">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-2 border-b border-slate-800/80 shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <i data-lucide="book-open-check" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                Guía de Archivos & Canvas
                <span class="text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full">UDD</span>
              </h3>
              <p class="text-[10px] text-slate-400">Cómo obtener y cargar tu calendarización</p>
            </div>
          </div>
          <button id="close-tutorial-modal-btn" class="text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- Scrollable Guide Content -->
        <div class="space-y-4 overflow-y-auto pr-1 text-slate-200 text-xs">
          
          <!-- Fast Canvas Launcher Card -->
          <div class="p-3.5 rounded-2xl bg-gradient-to-br from-blue-950/50 via-slate-800/80 to-indigo-950/50 border border-blue-500/30 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-extrabold text-blue-300 flex items-center gap-1.5 uppercase tracking-wider">
                <i data-lucide="compass" class="w-3.5 h-3.5 text-blue-400"></i>
                Acceso Rápido a Canvas UDD
              </span>
              <span class="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-full border border-emerald-500/30">Instructure</span>
            </div>
            
            <p class="text-[11px] text-slate-300 leading-snug">
              Ingresa con tu correo institucional UDD (<span class="font-mono text-blue-300">@udd.cl</span> / <span class="font-mono text-blue-300">@alumnos.udd.cl</span>) para descargar tus programas de estudio.
            </p>

            <div class="grid grid-cols-2 gap-2 pt-1">
              <button id="tutorial-open-canvas-app-btn" class="ios-tap-active py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs shadow-md shadow-white/10 flex items-center justify-center gap-2 transition-all active:scale-95">
                ${getCanvasLogoSvg("w-4 h-4 shrink-0")}
                <span>Abrir App Canvas</span>
              </button>
              
              <a href="https://udd.instructure.com" target="_blank" rel="noopener noreferrer" class="ios-tap-active py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-center">
                <i data-lucide="external-link" class="w-3.5 h-3.5 text-slate-400"></i>
                Canvas Web UDD
              </a>
            </div>
            
            <p class="text-[9.5px] text-slate-400 italic">
              💡 En teléfonos (iOS/Android) intentará abrir directamente la app Canvas Student. Si estás en PC o no la tienes instalada, abrirá el portal web institucional.
            </p>
          </div>

          <!-- Step 1: Qué archivo necesitas -->
          <div class="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[11px] font-black flex items-center justify-center shrink-0">1</div>
                <h4 class="font-bold text-white text-xs">¿Qué archivo necesitas?</h4>
              </div>
              <span class="text-[9px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <i data-lucide="chevrons-up-down" class="w-3 h-3"></i>
                Desliza el PDF ↓
              </span>
            </div>
            <p class="text-[11px] text-slate-300 leading-relaxed">
              Necesitas el documento PDF de <b>"Calendarización / Programación de Estudios"</b> oficial de tu ramo (como este ejemplo real de la UDD):
            </p>
            
            <!-- Real Scrollable UDD Document Sheet Preview -->
            <div class="bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-300 max-h-56 overflow-y-auto p-3.5 text-[10px] font-sans leading-tight space-y-3 select-none scroll-smooth">
              
              <!-- PDF Document Header -->
              <div class="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <div class="font-extrabold text-blue-900 text-[11px] tracking-tight">UDD Universidad del Desarrollo</div>
                <div class="font-bold text-slate-700 text-[9.5px]">Ingenieros UDD</div>
              </div>

              <!-- Title -->
              <div class="text-center font-extrabold text-slate-900 text-[10.5px] border-b border-slate-100 pb-1 uppercase tracking-wide">
                Calendarización Programación de Estudios Bimestrales
              </div>

              <!-- 1. Antecedentes Generales Table -->
              <div class="space-y-1">
                <div class="font-bold text-slate-800 text-[9.5px]">1. ANTECEDENTES GENERALES</div>
                <table class="w-full text-left border-collapse border border-slate-300 text-[9px]">
                  <tbody>
                    <tr class="border-b border-slate-200"><td class="font-semibold bg-slate-50 p-1 w-1/3 border-r border-slate-200">Asignatura</td><td class="p-1 font-bold text-blue-800">Cálculo Diferencial</td></tr>
                    <tr class="border-b border-slate-200"><td class="font-semibold bg-slate-50 p-1 border-r border-slate-200">Bimestre / Código</td><td class="p-1">3-2026 | <span class="font-bold">IPC126N</span></td></tr>
                    <tr class="border-b border-slate-200"><td class="font-semibold bg-slate-50 p-1 border-r border-slate-200">Duración / Créditos</td><td class="p-1">Bimestral | <span class="font-bold text-amber-700">10 Créditos SCT</span></td></tr>
                  </tbody>
                </table>
              </div>

              <!-- 2. Horarios -->
              <div class="space-y-1">
                <div class="font-bold text-slate-800 text-[9.5px]">2. HORARIOS (Módulos)</div>
                <table class="w-full text-center border-collapse border border-slate-300 text-[8.5px]">
                  <thead class="bg-slate-100 font-bold border-b border-slate-300">
                    <tr><th class="p-1 border-r border-slate-300">Día</th><th class="p-1 border-r border-slate-300">Módulo</th><th class="p-1">Sala</th></tr>
                  </thead>
                  <tbody>
                    <tr class="border-b border-slate-200"><td class="p-1 border-r border-slate-200 font-semibold">Lunes a Viernes</td><td class="p-1 border-r border-slate-200 font-bold text-indigo-800">H1 y H2 (Bloque Doble)</td><td class="p-1">Y419 / S335</td></tr>
                  </tbody>
                </table>
              </div>

              <!-- 3. Profesores -->
              <div class="space-y-1">
                <div class="font-bold text-slate-800 text-[9.5px]">3. PROFESORES</div>
                <div class="p-1 bg-slate-50 rounded border border-slate-200 text-[8.5px] flex justify-between">
                  <span>Profesor: <b>Javier Diaz</b></span>
                  <span class="text-blue-700">javier.diazg@udd.cl</span>
                </div>
              </div>

              <!-- 4. Ponderación de Notas -->
              <div class="space-y-1">
                <div class="font-bold text-slate-800 text-[9.5px]">4. PONDERACIÓN DE NOTAS</div>
                <table class="w-full text-left border-collapse border border-slate-300 text-[9px]">
                  <thead class="bg-slate-100 font-bold border-b border-slate-300">
                    <tr><th class="p-1 border-r border-slate-300">Evaluación</th><th class="p-1 text-center">Ponderación</th></tr>
                  </thead>
                  <tbody>
                    <tr class="border-b border-slate-200"><td class="p-1 border-r border-slate-200">Certamen N°1</td><td class="p-1 text-center font-bold text-blue-700">35%</td></tr>
                    <tr class="border-b border-slate-200"><td class="p-1 border-r border-slate-200">Certamen N°2</td><td class="p-1 text-center font-bold text-blue-700">35%</td></tr>
                    <tr class="border-b border-slate-200"><td class="p-1 border-r border-slate-200">Controles</td><td class="p-1 text-center font-bold text-blue-700">20%</td></tr>
                    <tr class="border-b border-slate-200"><td class="p-1 border-r border-slate-200">Talleres</td><td class="p-1 text-center font-bold text-blue-700">10%</td></tr>
                    <tr class="border-b border-slate-300 bg-amber-50 font-bold"><td class="p-1 border-r border-slate-300">Nota de Presentación</td><td class="p-1 text-center text-amber-800">70%</td></tr>
                    <tr class="border-b border-slate-200"><td class="p-1 border-r border-slate-200 font-bold">Examen Final</td><td class="p-1 text-center font-extrabold text-indigo-700">30%</td></tr>
                    <tr class="bg-emerald-50"><td class="p-1 border-r border-slate-200 font-semibold text-emerald-900">Asistencia Exigida</td><td class="p-1 text-center font-extrabold text-emerald-800">Sobre 70%</td></tr>
                  </tbody>
                </table>
              </div>

              <!-- 6. Cronograma Semanal -->
              <div class="space-y-1">
                <div class="font-bold text-slate-800 text-[9.5px]">6. CRONOGRAMA DE EVALUACIONES</div>
                <div class="grid grid-cols-2 gap-1 text-[8.5px]">
                  <div class="p-1 bg-slate-50 rounded border border-slate-200">Sem 2: <b>Control 1</b></div>
                  <div class="p-1 bg-slate-50 rounded border border-slate-200">Sem 3: <b>Control 2</b></div>
                  <div class="p-1 bg-blue-50 rounded border border-blue-200 text-blue-900 font-bold">Sem 4: CERTAMEN 1</div>
                  <div class="p-1 bg-slate-50 rounded border border-slate-200">Sem 5: <b>Control 3</b></div>
                  <div class="p-1 bg-slate-50 rounded border border-slate-200">Sem 6: <b>Control 4</b></div>
                  <div class="p-1 bg-blue-50 rounded border border-blue-200 text-blue-900 font-bold">Sem 7: CERTAMEN 2</div>
                  <div class="col-span-2 p-1 bg-indigo-50 rounded border border-indigo-200 text-indigo-900 font-bold text-center">Sem 8: EXAMEN ACUMULATIVO</div>
                </div>
              </div>

              <!-- 8. Reglas UDD -->
              <div class="p-1.5 bg-slate-50 rounded-lg border border-slate-200 text-[8.5px] text-slate-600 space-y-0.5">
                <div>• <b>Controles:</b> Se elimina la nota más baja.</div>
                <div>• <b>Examen:</b> Si nota ≥ 4.0 sustituye el peor certamen.</div>
                <div>• <b>Asistencia:</b> Exigencia mínima 70% de asistencia.</div>
              </div>

            </div>
          </div>

          <!-- Step 2: Cómo descargarlo en Canvas -->
          <div class="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div class="flex items-center gap-2">
              <div class="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[11px] font-black flex items-center justify-center shrink-0">2</div>
              <h4 class="font-bold text-white text-xs">¿Cómo encontrarlo en Canvas Student?</h4>
            </div>
            <ol class="space-y-1.5 text-[11px] text-slate-300 pl-1">
              <li class="flex items-start gap-2">
                <span class="text-blue-400 font-bold">•</span>
                <span><b>Paso A:</b> Entra a la asignatura en Canvas (ej: <i>Cálculo Diferencial</i>).</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-blue-400 font-bold">•</span>
                <span><b>Paso B:</b> En el menú lateral o pestañas, ve a <b>"Archivos"</b> o <b>"Programa del Curso" / "Módulos"</b>.</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-blue-400 font-bold">•</span>
                <span><b>Paso C:</b> Abre y descarga el archivo PDF de la <b>"Calendarización..."</b> a tu dispositivo (o copia su texto).</span>
              </li>
            </ol>
          </div>

          <!-- Step 3: Carga en TheJamonApp -->
          <div class="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div class="flex items-center gap-2">
              <div class="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[11px] font-black flex items-center justify-center shrink-0">3</div>
              <h4 class="font-bold text-white text-xs">Súbelo a TheJamonApp</h4>
            </div>
            <p class="text-[11px] text-slate-300 leading-relaxed">
              Ve a la pestaña <b>"Subir Ramos"</b>, arrastra el PDF o pega el texto. La app calculará tus comodines y notas al instante.
            </p>
          </div>

        </div>

        <!-- Modal Footer Controls -->
        <div class="pt-2 border-t border-slate-800/80 space-y-2 shrink-0">
          <div class="flex items-center justify-between px-1">
            <label class="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer select-none">
              <input type="checkbox" id="dont-show-tutorial-checkbox" class="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0" />
              <span>No mostrar automáticamente al entrar</span>
            </label>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button id="close-tutorial-action-btn" class="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all">
              Entendido
            </button>
            <button id="tutorial-go-to-upload" class="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5">
              <i data-lucide="file-up" class="w-3.5 h-3.5"></i>
              Subir Calendarización
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}

// 7. SUB-EVALUATIONS MODAL (CONTROLES / TALLERES DESGLOSE CON ELIMINACIÓN DE PEOR NOTA)
export function renderSubEvaluationsModal(course, evalItem) {
  const isDropActive = Number(evalItem.dropLowestCount) > 0;
  const subItems = Array.isArray(evalItem.subEvaluations) && evalItem.subEvaluations.length > 0
    ? evalItem.subEvaluations
    : [
        { id: `sub-1`, name: `${evalItem.name.replace(/es$/i, '').replace(/s$/i, '')} 1`, grade: null },
        { id: `sub-2`, name: `${evalItem.name.replace(/es$/i, '').replace(/s$/i, '')} 2`, grade: null },
        { id: `sub-3`, name: `${evalItem.name.replace(/es$/i, '').replace(/s$/i, '')} 3`, grade: null },
        { id: `sub-4`, name: `${evalItem.name.replace(/es$/i, '').replace(/s$/i, '')} 4`, grade: null }
      ];

  // Identify lowest grade among valid entries for drop preview
  const validWithGrades = subItems
    .map((s, idx) => ({ ...s, idx, numGrade: (s.grade !== null && s.grade !== undefined && s.grade !== '' && !isNaN(Number(s.grade))) ? Number(s.grade) : null }))
    .filter(s => s.numGrade !== null);

  let lowestIdx = -1;
  if (isDropActive && validWithGrades.length > 1) {
    let minGrade = validWithGrades[0].numGrade;
    lowestIdx = validWithGrades[0].idx;
    validWithGrades.forEach(v => {
      if (v.numGrade < minGrade) {
        minGrade = v.numGrade;
        lowestIdx = v.idx;
      }
    });
  }

  const computedGrade = computeSubEvaluationsGrade({ ...evalItem, isSubEvaluationsEnabled: true, dropLowestCount: isDropActive ? 1 : 0, subEvaluations: subItems });

  const rowsHtml = subItems.map((sub, idx) => {
    const isDropped = isDropActive && idx === lowestIdx;
    return `
      <div class="sub-eval-row bg-slate-900/90 p-3 rounded-2xl border ${isDropped ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-800'} flex items-center justify-between gap-2 transition-all" data-sub-id="${sub.id}">
        <div class="flex-1 min-w-0">
          <input type="text" class="sub-name-input w-full bg-transparent text-white font-bold text-xs focus:outline-none border-b border-transparent focus:border-purple-500" value="${sub.name || `Nota ${idx+1}`}" placeholder="Ej: Control ${idx+1}" />
          ${isDropped ? `
            <span class="text-[9px] font-extrabold text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded inline-block mt-0.5">
              🗑️ Eliminada por regla (Peor nota)
            </span>
          ` : ''}
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <input type="number" step="0.1" min="1.0" max="7.0" value="${sub.grade !== null && sub.grade !== undefined && sub.grade !== '' ? sub.grade : ''}" class="sub-grade-input w-16 bg-slate-800 border ${isDropped ? 'border-amber-500 text-amber-300' : 'border-slate-700 text-white'} font-black text-sm text-center rounded-xl py-1.5 focus:border-purple-500 focus:outline-none" placeholder="1.0-7.0" />
          <button type="button" class="delete-sub-btn text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors" title="Eliminar esta nota">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div id="subevals-modal-backdrop" class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-ios-fade">
      <div class="bg-slate-950 border border-purple-500/30 rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-purple-950/40">
        
        <!-- Header -->
        <div class="p-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-950/40 to-slate-900 shrink-0">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
              <i data-lucide="list-ordered" class="w-5 h-5"></i>
            </div>
            <div class="truncate">
              <h3 class="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                Desglose: ${evalItem.name}
                <span class="text-[10px] text-purple-300 bg-purple-500/20 px-1.5 py-0.2 rounded font-extrabold border border-purple-500/30 shrink-0">${evalItem.weight}%</span>
              </h3>
              <p class="text-[10px] text-slate-400 truncate">${course.name} (${course.code})</p>
            </div>
          </div>
          <button type="button" id="close-subevals-modal" class="text-slate-400 hover:text-white p-1 rounded-lg shrink-0">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Scrollable Content -->
        <div class="p-4 overflow-y-auto space-y-4 flex-1">
          
          <!-- Drop Lowest Grade Option Card -->
          <div class="bg-slate-900/90 p-3.5 rounded-2xl border border-purple-500/30 flex items-center justify-between gap-3">
            <div>
              <span class="text-xs font-bold text-purple-200 block">Eliminar la Peor Nota</span>
              <p class="text-[10px] text-slate-400 mt-0.5">Descarta automáticamente la calificación más baja del promedio final (Regla UDD).</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" id="modal-drop-lowest-toggle" ${isDropActive ? 'checked' : ''} class="sr-only peer">
              <div class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <!-- Notes Container -->
          <div class="space-y-2">
            <div class="flex items-center justify-between px-1">
              <label class="text-xs font-bold text-slate-300">Notas Individuales:</label>
              <button type="button" id="add-subeval-item-btn" class="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1">
                <i data-lucide="plus" class="w-3 h-3"></i> Agregar Nota
              </button>
            </div>

            <div id="subevals-items-list" class="space-y-2 max-h-60 overflow-y-auto pr-1">
              ${rowsHtml}
            </div>
          </div>

          <!-- Dynamic Result Banner -->
          <div class="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/30 via-slate-900 to-indigo-950/30 border border-purple-500/30 flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-white block">Promedio Resultante</span>
              <span id="modal-subeval-stats" class="text-[10px] text-slate-400">
                ${isDropActive && validWithGrades.length > 1 ? `Promedio de las ${validWithGrades.length - 1} mejores notas` : `${validWithGrades.length} nota(s) ingresada(s)`}
              </span>
            </div>
            <div id="modal-subeval-avg-val" class="text-2xl font-black ${computedGrade >= 4.0 ? 'text-emerald-400' : (computedGrade !== null ? 'text-rose-400' : 'text-slate-500')} px-3 py-1 bg-slate-950 rounded-xl border border-slate-800">
              ${computedGrade !== null ? computedGrade.toFixed(2) : 'S/I'}
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="p-4 border-t border-slate-800 bg-slate-900/60 flex gap-2 shrink-0">
          <button type="button" id="cancel-subevals-btn" class="w-1/3 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700">
            Cancelar
          </button>
          <button type="button" id="save-subevals-modal-btn" data-course-id="${course.id}" data-eval-id="${evalItem.id}" class="w-2/3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center justify-center gap-1.5 active:scale-95 transition-all">
            <i data-lucide="check" class="w-4 h-4"></i> Guardar Desglose
          </button>
        </div>

      </div>
    </div>
  `;
}
