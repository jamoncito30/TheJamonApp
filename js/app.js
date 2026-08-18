// Main Application Controller for TheJamonApp PWA
import { 
  getCourses, 
  saveCourse, 
  deleteCourse, 
  saveCourses,
  resetToDemoData, 
  logAttendance,
  calculateAttendanceMetrics,
  calculateExactClasses,
  getHistory
} from './storage.js';

import { 
  parseSyllabusContent, 
  extractMetadataFromText,
  saveGeminiApiKey
} from './syllabusParser.js';

import { 
  renderDashboardView, 
  renderSyllabusView, 
  renderConfirmationModal, 
  renderGradesView, 
  renderGradeDetails,
  renderCoursesView,
  renderAuthView,
  renderSupabaseConfigModal,
  renderCanvasTutorialModal
} from './components.js';

import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signInWithApple,
  signOut,
  getCurrentUser,
  fetchUserCoursesFromSupabase,
  isSupabaseConfigured,
  getSupabaseConfig,
  saveSupabaseConfig
} from './supabaseClient.js';

// Application State
const state = {
  currentTab: 'dashboard',
  courses: [],
  currentUser: null,
  isGuestMode: false,
  pendingParsedCourse: null,
  isMobileFrame: true
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  state.courses = getCourses();
  initClock();
  setupTabNavigation();
  setupGlobalListeners();
  registerServiceWorker();
  await checkAuthState();
  renderCurrentTab();

  // If user is already authenticated or guest, show tutorial once if not seen yet
  if ((state.currentUser || state.isGuestMode) && !localStorage.getItem('thejamonapp_seen_tutorial_v1')) {
    setTimeout(() => openCanvasTutorialModal(true), 600);
  }
});

async function checkAuthState() {
  try {
    const user = await getCurrentUser();
    state.currentUser = user;
    
    if (user) {
      const remoteCourses = await fetchUserCoursesFromSupabase();
      if (remoteCourses && remoteCourses.length > 0) {
        state.courses = remoteCourses;
        saveCourses(remoteCourses);
      }
    }
  } catch (err) {
    console.warn('Auth check notice:', err);
  }
  updateAuthUserWidget();
}

function updateAuthUserWidget() {
  const widgetEl = document.getElementById('auth-user-widget');
  if (!widgetEl) return;

  if (state.currentUser) {
    const shortEmail = state.currentUser.email ? state.currentUser.email.split('@')[0] : 'Usuario';
    widgetEl.innerHTML = `
      <div class="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/30 px-2 py-1 rounded-xl">
        <i data-lucide="user" class="w-3.5 h-3.5 text-blue-400"></i>
        <span class="text-[10px] font-bold text-white max-w-[80px] truncate">${shortEmail}</span>
        <button id="logout-btn" title="Cerrar Sesión" class="text-slate-400 hover:text-rose-400 ml-1 transition-colors">
          <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await signOut();
        state.currentUser = null;
        state.isGuestMode = false;
        showToast('Sesión cerrada correctamente', 'info');
        updateAuthUserWidget();
        renderCurrentTab();
      });
    }
  } else if (state.isGuestMode) {
    widgetEl.innerHTML = `
      <span class="text-[9px] font-extrabold text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2 py-1 rounded-xl">
        Invitado
      </span>
    `;
  } else {
    widgetEl.innerHTML = '';
  }

  if (window.lucide) window.lucide.createIcons();
}

// Update iOS Status Bar Clock
function initClock() {
  const clockEl = document.getElementById('status-clock');
  const update = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    if (clockEl) clockEl.textContent = `${hours}:${minutes}`;
  };
  update();
  setInterval(update, 30000);
}

// Tab Navigation System
function setupTabNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      if (targetTab && targetTab !== state.currentTab) {
        state.currentTab = targetTab;
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderCurrentTab();
      }
    });
  });
}

function switchTab(targetTab) {
  state.currentTab = targetTab;
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(t => {
    if (t.getAttribute('data-tab') === targetTab) {
      t.classList.add('active');
    } else {
      t.classList.remove('active');
    }
  });
  renderCurrentTab();
}

// Render Current Tab View
function renderCurrentTab() {
  const mainEl = document.getElementById('main-content');
  if (!mainEl) return;

  // Protect views: if not logged in and not guest mode, show Auth view
  if (!state.currentUser && !state.isGuestMode) {
    mainEl.innerHTML = renderAuthView(isSupabaseConfigured());
    if (window.lucide) window.lucide.createIcons();
    attachAuthListeners();
    return;
  }

  state.courses = getCourses();

  switch (state.currentTab) {
    case 'dashboard':
      mainEl.innerHTML = renderDashboardView(state.courses);
      attachDashboardListeners();
      break;

    case 'syllabus':
      mainEl.innerHTML = renderSyllabusView();
      attachSyllabusListeners();
      break;

    case 'grades':
      mainEl.innerHTML = renderGradesView(state.courses);
      attachGradesListeners();
      break;

    case 'courses':
      mainEl.innerHTML = renderCoursesView(state.courses);
      attachCoursesListeners();
      break;

    default:
      mainEl.innerHTML = renderDashboardView(state.courses);
      attachDashboardListeners();
  }

  // Refresh Lucide Icons after dynamic HTML injection
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function attachAuthListeners() {
  let mode = 'login';
  const tabLogin = document.getElementById('auth-tab-login');
  const tabSignup = document.getElementById('auth-tab-signup');
  const form = document.getElementById('auth-form');
  const submitLabel = document.getElementById('auth-submit-label');
  const googleBtn = document.getElementById('auth-google-btn');
  const guestBtn = document.getElementById('guest-mode-btn');
  const configBtn = document.getElementById('open-config-btn');

  if (tabLogin && tabSignup) {
    tabLogin.addEventListener('click', () => {
      mode = 'login';
      tabLogin.className = 'auth-mode-btn active py-2 rounded-xl text-xs font-bold transition-all text-white bg-blue-600 shadow-md';
      tabSignup.className = 'auth-mode-btn py-2 rounded-xl text-xs font-bold transition-all text-slate-400 hover:text-white';
      if (submitLabel) submitLabel.textContent = 'Iniciar Sesión';
    });

    tabSignup.addEventListener('click', () => {
      mode = 'signup';
      tabSignup.className = 'auth-mode-btn active py-2 rounded-xl text-xs font-bold transition-all text-white bg-blue-600 shadow-md';
      tabLogin.className = 'auth-mode-btn py-2 rounded-xl text-xs font-bold transition-all text-slate-400 hover:text-white';
      if (submitLabel) submitLabel.textContent = 'Crear Cuenta Nueva';
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value.trim();

      if (!isSupabaseConfigured()) {
        showToast('Debes configurar Supabase primero. Ingresa tus credenciales en el enlace inferior.', 'warning');
        openSupabaseConfigModal();
        return;
      }

      showToast('Procesando solicitud...', 'info');
      try {
        if (mode === 'signup') {
          await signUpWithEmail(email, password);
          showToast('¡Cuenta registrada! Revisa tu correo o inicia sesión.', 'success');
        } else {
          await signInWithEmail(email, password);
          showToast('¡Sesión iniciada correctamente!', 'success');
        }
        await checkAuthState();
        renderCurrentTab();

        // Trigger tutorial automatically on login/signup if not seen
        if (!localStorage.getItem('thejamonapp_seen_tutorial_v1')) {
          setTimeout(() => openCanvasTutorialModal(true), 500);
        }
      } catch (err) {
        showToast(err.message || 'Error en la autenticación', 'danger');
      }
    });
  }

  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      if (!isSupabaseConfigured()) {
        showToast('Debes configurar Supabase primero.', 'warning');
        openSupabaseConfigModal();
        return;
      }
      try {
        await signInWithGoogle();
      } catch (err) {
        showToast(err.message || 'Error al conectar con Google', 'danger');
      }
    });
  }

  const appleBtn = document.getElementById('auth-apple-btn');
  if (appleBtn) {
    appleBtn.addEventListener('click', () => {
      showToast('El inicio de sesión con Apple se encuentra en desarrollo. Usa Correo o Google.', 'info');
    });
  }

  if (guestBtn) {
    guestBtn.addEventListener('click', () => {
      state.isGuestMode = true;
      showToast('Continuando en Modo Invitado local', 'info');
      updateAuthUserWidget();
      renderCurrentTab();

      // Trigger tutorial for first time guests
      if (!localStorage.getItem('thejamonapp_seen_tutorial_v1')) {
        setTimeout(() => openCanvasTutorialModal(true), 500);
      }
    });
  }

  if (configBtn) {
    configBtn.addEventListener('click', openSupabaseConfigModal);
  }
}

function openSupabaseConfigModal() {
  const adminPass = prompt('🔒 Área de Administración:\nIngresa la contraseña Maestra de Administración para modificar la configuración de Supabase:');
  if (adminPass === null) return;

  if (adminPass !== 'Mario1140$1975$') {
    showToast('Acceso denegado: Contraseña de administración incorrecta.', 'danger');
    return;
  }

  const currentConfig = getSupabaseConfig();
  const modalContainer = document.createElement('div');
  modalContainer.id = 'supabase-config-wrapper';
  modalContainer.innerHTML = renderSupabaseConfigModal(currentConfig.url, currentConfig.anonKey);
  document.body.appendChild(modalContainer);
  if (window.lucide) window.lucide.createIcons();

  const closeBtn = document.getElementById('close-config-modal');
  const cancelBtn = document.getElementById('cancel-config-btn');
  const form = document.getElementById('supabase-config-form');

  const closeModal = () => modalContainer.remove();

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const url = document.getElementById('config-url').value.trim();
      const key = document.getElementById('config-key').value.trim();

      saveSupabaseConfig(url, key);
      showToast('¡Configuración de Supabase guardada!', 'success');
      closeModal();
      renderCurrentTab();
    });
  }
}

// -------------------------------------------------------------
// CANVAS STUDENT LAUNCHER & TUTORIAL MODAL
// -------------------------------------------------------------
export function launchCanvasApp() {
  const customUrl = 'canvas-student://udd.instructure.com';
  const webFallbackUrl = 'https://udd.instructure.com';
  
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (isMobile) {
    showToast('Abriendo la App Canvas Student...', 'info');
    
    // Attempt custom URI scheme
    window.location.href = customUrl;
    
    // Fallback: if browser remains active after 1.4s, redirect to web login
    setTimeout(() => {
      if (document.hidden || document.webkitHidden) return;
      window.open(webFallbackUrl, '_blank');
    }, 1400);
  } else {
    showToast('Abriendo Canvas UDD en el navegador...', 'info');
    window.open(webFallbackUrl, '_blank');
  }
}

export function openCanvasTutorialModal(isAuto = false) {
  if (isAuto && localStorage.getItem('thejamonapp_seen_tutorial_v1') === 'true') {
    return;
  }

  if (document.getElementById('canvas-tutorial-modal')) return;

  const modalContainer = document.createElement('div');
  modalContainer.id = 'canvas-tutorial-modal-wrapper';
  modalContainer.innerHTML = renderCanvasTutorialModal();
  document.body.appendChild(modalContainer);
  if (window.lucide) window.lucide.createIcons();

  const closeBtn = document.getElementById('close-tutorial-modal-btn');
  const closeActionBtn = document.getElementById('close-tutorial-action-btn');
  const goToUpload = document.getElementById('tutorial-go-to-upload');
  const openCanvasAppBtn = document.getElementById('tutorial-open-canvas-app-btn');
  const dontShowCheckbox = document.getElementById('dont-show-tutorial-checkbox');

  const closeModal = (markSeen = false) => {
    if (markSeen || (dontShowCheckbox && dontShowCheckbox.checked)) {
      localStorage.setItem('thejamonapp_seen_tutorial_v1', 'true');
    }
    modalContainer.remove();
  };

  if (closeBtn) closeBtn.addEventListener('click', () => closeModal(false));
  if (closeActionBtn) closeActionBtn.addEventListener('click', () => closeModal(true));
  
  if (goToUpload) {
    goToUpload.addEventListener('click', () => {
      closeModal(true);
      switchTab('syllabus');
    });
  }

  if (openCanvasAppBtn) {
    openCanvasAppBtn.addEventListener('click', () => {
      launchCanvasApp();
    });
  }
}

// -------------------------------------------------------------
// DASHBOARD EVENT HANDLERS
// -------------------------------------------------------------
function attachDashboardListeners() {
  const mainEl = document.getElementById('main-content');

  const welcomeUploadBtn = document.getElementById('welcome-upload-btn');
  if (welcomeUploadBtn) {
    welcomeUploadBtn.addEventListener('click', () => {
      switchTab('syllabus');
    });
  }

  const welcomeTutBtn = document.getElementById('welcome-tutorial-btn');
  if (welcomeTutBtn) {
    welcomeTutBtn.addEventListener('click', () => {
      openCanvasTutorialModal(false);
    });
  }

  const dashTutBtn = document.getElementById('dashboard-tutorial-btn');
  if (dashTutBtn) {
    dashTutBtn.addEventListener('click', () => {
      openCanvasTutorialModal(false);
    });
  }

  const histBtn = document.getElementById('view-history-btn');
  if (histBtn) {
    histBtn.addEventListener('click', () => {
      showHistoryModal();
    });
  }

  // Attendance Action Buttons
  mainEl.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const courseId = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      const amount = parseInt(btn.getAttribute('data-amount') || '1', 10);
      const type = action === 'attend' ? 'attended' : 'absent';

      const updatedCourse = logAttendance(courseId, type, amount);
      if (updatedCourse) {
        const metrics = calculateAttendanceMetrics(updatedCourse);
        
        btn.classList.add('pulse-once');
        setTimeout(() => btn.classList.remove('pulse-once'), 300);

        if (action === 'attend') {
          showToast(`¡Asistencia de ${amount} módulo(s) registrada a ${updatedCourse.name}!`, 'success');
          if (metrics.status === 'green' && window.confetti) {
            window.confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
          }
        } else {
          if (metrics.status === 'red') {
            showToast(`⚠️ ¡Alerta! Excediste el límite de faltas en ${updatedCourse.name}`, 'danger');
          } else if (metrics.status === 'yellow') {
            showToast(`⚠️ Cuidado: Te quedan ${metrics.remainingWildcards} comodín(es) de módulo en ${updatedCourse.name}`, 'warning');
          } else {
            showToast(`Falta registrada (${amount} mód). Te quedan ${metrics.remainingWildcards} comodines.`, 'info');
          }
        }

        renderCurrentTab();
      }
    });
  });
}

// -------------------------------------------------------------
// SYLLABUS / SUBIR RAMOS EVENT HANDLERS WITH GEMINI API KEY
// -------------------------------------------------------------
function attachSyllabusListeners() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('syllabus-file-input');
  const textInput = document.getElementById('syllabus-text-input');
  const processBtn = document.getElementById('process-text-btn');
  const geminiInput = document.getElementById('gemini-key-input');
  const saveGeminiBtn = document.getElementById('save-gemini-key-btn');
  const syllabusTutBtn = document.getElementById('syllabus-open-tutorial-btn');
  const syllabusCanvasBtn = document.getElementById('syllabus-quick-canvas-btn');
  const toggleKeyBtn = document.getElementById('toggle-custom-key-btn');
  const keyDrawer = document.getElementById('custom-key-drawer');

  if (toggleKeyBtn && keyDrawer) {
    toggleKeyBtn.addEventListener('click', () => {
      keyDrawer.classList.toggle('hidden');
    });
  }

  if (syllabusTutBtn) {
    syllabusTutBtn.addEventListener('click', () => {
      openCanvasTutorialModal(false);
    });
  }

  if (syllabusCanvasBtn) {
    syllabusCanvasBtn.addEventListener('click', () => {
      launchCanvasApp();
    });
  }

  if (saveGeminiBtn && geminiInput) {
    saveGeminiBtn.addEventListener('click', () => {
      const key = geminiInput.value.trim();
      saveGeminiApiKey(key);
      showToast(key ? '¡Gemini API Key personalizada guardada!' : 'Usando API Key compartida del sistema', 'success');
      renderCurrentTab();
    });
  }

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('bg-blue-500/20', 'border-blue-400');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('bg-blue-500/20', 'border-blue-400');
    });

    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.classList.remove('bg-blue-500/20', 'border-blue-400');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        await processFile(files[0]);
      }
    });

    fileInput.addEventListener('change', async (e) => {
      if (e.target.files.length > 0) {
        await processFile(e.target.files[0]);
      }
    });
  }

  if (processBtn && textInput) {
    processBtn.addEventListener('click', async () => {
      const val = textInput.value.trim();
      if (!val) {
        showToast('Por favor escribe o pega texto de la calendarización primero.', 'warning');
        return;
      }
      showToast('Analizando con IA...', 'info');
      try {
        const parsed = await parseSyllabusContent(val);
        openConfirmationModal(parsed);
      } catch (err) {
        showToast(err.message || 'Error al analizar la calendarización', 'danger');
      }
    });
  }
}

async function processFile(file) {
  showToast('Extrayendo contenido de la calendarización...', 'info');
  try {
    const parsed = await parseSyllabusContent(file);
    openConfirmationModal(parsed);
  } catch (err) {
    showToast(err.message || 'Error al leer el archivo', 'danger');
  }
}

// Open Auto-Fill Confirmation Modal
function openConfirmationModal(parsedData) {
  state.pendingParsedCourse = parsedData;
  const modalContainer = document.createElement('div');
  modalContainer.id = 'modal-wrapper';
  modalContainer.innerHTML = renderConfirmationModal(parsedData);
  document.body.appendChild(modalContainer);

  if (window.lucide) window.lucide.createIcons();

  const closeBtn = document.getElementById('close-modal-btn');
  const cancelBtn = document.getElementById('cancel-modal-btn');
  const form = document.getElementById('confirm-course-form');
  const addEvalBtn = document.getElementById('add-eval-btn');

  const closeModal = () => {
    modalContainer.remove();
    state.pendingParsedCourse = null;
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  modalContainer.querySelectorAll('[data-remove-eval]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-remove-eval'), 10);
      parsedData.evaluations.splice(idx, 1);
      modalContainer.remove();
      openConfirmationModal(parsedData);
    });
  });

  if (addEvalBtn) {
    addEvalBtn.addEventListener('click', () => {
      parsedData.evaluations.push({
        id: `ev-${Date.now()}`,
        name: `Evaluación ${parsedData.evaluations.length + 1}`,
        weight: 20,
        grade: null
      });
      modalContainer.remove();
      openConfirmationModal(parsedData);
    });
  }

  const classDaysCheckboxes = modalContainer.querySelectorAll('input[name="form-class-days"]');
  const infoDiv = document.getElementById('dynamic-classes-info');
  const hiddenTotalClasses = document.getElementById('form-total-classes');
  const periodSelect = document.getElementById('form-academic-period');

  const updateDynamicClasses = () => {
    const selectedDays = Array.from(classDaysCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => Number(cb.value));

    const selectedPeriod = periodSelect ? periodSelect.value : 'semestre2';

    if (selectedDays.length === 0) {
      if (infoDiv) infoDiv.innerHTML = 'Selecciona días para calcular fechas y feriados.';
      if (hiddenTotalClasses) hiddenTotalClasses.value = 32;
      return;
    }

    const calc = calculateExactClasses(selectedDays, selectedPeriod);
    if (infoDiv) {
      infoDiv.innerHTML = `Calculado: <b>${calc.totalClasses} días</b> de clases reales.<br/><span class="text-slate-500">Se descontaron <b>${calc.holidaysFound} feriado(s)</b> de tus clases.</span>`;
    }
    if (hiddenTotalClasses) {
      hiddenTotalClasses.value = calc.totalClasses;
    }
  };

  classDaysCheckboxes.forEach(cb => cb.addEventListener('change', updateDynamicClasses));
  if (periodSelect) periodSelect.addEventListener('change', updateDynamicClasses);
  updateDynamicClasses();

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const updatedName = document.getElementById('form-name').value.trim();
      const updatedCode = document.getElementById('form-code').value.trim();
      const updatedCredits = parseInt(document.getElementById('form-credits').value, 10);
      const updatedReqAtt = parseInt(document.getElementById('form-req-att').value, 10);
      const updatedTotalClasses = parseInt(document.getElementById('form-total-classes').value, 10);
      const updatedClassDays = Array.from(modalContainer.querySelectorAll('input[name="form-class-days"]'))
        .filter(cb => cb.checked)
        .map(cb => Number(cb.value));
      const updatedPeriod = periodSelect ? periodSelect.value : 'semestre2';
      const updatedExamWeight = parseInt(document.getElementById('form-exam-weight').value, 10);
      const modulesPerDay = parseInt(document.querySelector('input[name="form-modules-per-day"]:checked')?.value || '2', 10);
      const isUddRuleEnabled = document.getElementById('form-udd-rule')?.checked ?? true;

      const evalInputs = modalContainer.querySelectorAll('.eval-input');
      const evalsMap = {};
      evalInputs.forEach(input => {
        const idx = input.getAttribute('data-idx');
        const field = input.getAttribute('data-field');
        if (!evalsMap[idx]) evalsMap[idx] = {};
        if (field === 'weight') {
          evalsMap[idx][field] = parseFloat(input.value) || 0;
        } else {
          evalsMap[idx][field] = input.value;
        }
      });

      const updatedEvals = Object.values(evalsMap).map((ev, i) => ({
        id: parsedData.evaluations[i]?.id || `ev-${Date.now()}-${i}`,
        name: ev.name || `Evaluación ${i+1}`,
        weight: Number(ev.weight) || 20,
        grade: parsedData.evaluations[i]?.grade || null
      }));

      const finalCourse = {
        id: `course-${Date.now()}`,
        name: updatedName,
        code: updatedCode,
        credits: updatedCredits,
        requiredAttendancePercent: updatedReqAtt,
        totalClasses: updatedTotalClasses,
        classDays: updatedClassDays,
        academicPeriod: updatedPeriod,
        modulesPerDay: modulesPerDay,
        examWeight: updatedExamWeight || 30,
        examGrade: null,
        attended: 0,
        absent: 0,
        isUddRuleEnabled,
        evaluations: updatedEvals,
        schedule: modulesPerDay === 2 ? 'Lun/Mie H1-H2 (08:30 - 11:00)' : 'Mar/Jue H3 (11:10 - 12:20)'
      };

      saveCourse(finalCourse);
      closeModal();
      showToast(`¡Asignatura "${updatedName}" guardada exitosamente!`, 'success');
      switchTab('dashboard');
    });
  }
}

// -------------------------------------------------------------
// GRADE CALCULATOR EVENT HANDLERS
// -------------------------------------------------------------
function attachGradesListeners() {
  const select = document.getElementById('grade-course-select');
  const detailsContainer = document.getElementById('grade-details-container');

  const updateDetails = () => {
    if (!select || !detailsContainer) return;
    const courseId = select.value;
    state.courses = getCourses();
    const course = state.courses.find(c => c.id === courseId);
    if (course) {
      detailsContainer.innerHTML = renderGradeDetails(course);
      if (window.lucide) window.lucide.createIcons();
      attachGradeSaveHandler(course, updateDetails);
    }
  };

  if (select) {
    select.addEventListener('change', updateDetails);
    updateDetails();
  }
}

function attachGradeSaveHandler(course, onFullReRender) {
  const saveBtn = document.getElementById('save-grades-btn');
  const toggleUdd = document.getElementById('toggle-udd-rule');

  const syncInputsToCourse = () => {
    const inputs = document.querySelectorAll('.grade-input');
    inputs.forEach(input => {
      const evalId = input.getAttribute('data-eval-id');
      const valStr = input.value.trim();
      const ev = course.evaluations.find(e => e.id === evalId);
      if (ev) {
        ev.grade = valStr !== '' ? parseFloat(valStr) : null;
      }
    });

    const examInput = document.getElementById('exam-grade-input');
    if (examInput) {
      const examVal = examInput.value.trim();
      course.examGrade = examVal !== '' ? parseFloat(examVal) : null;
    }

    saveCourse(course);
  };

  const updateCalculationsRealTime = () => {
    syncInputsToCourse();
    const metrics = calculateCourseGrades(course, 4.0);

    const presEl = document.getElementById('promedio-presentacion-val');
    if (presEl) {
      presEl.textContent = metrics.presentationGrade !== null ? metrics.presentationGrade : 'S/I';
      presEl.className = `text-sm font-extrabold ${metrics.presentationGrade >= 4.0 ? 'text-emerald-400' : (metrics.presentationGrade !== null ? 'text-rose-400' : 'text-slate-400')}`;
    }

    const reqEl = document.getElementById('nota-examen-requerida-val');
    if (reqEl) {
      reqEl.textContent = metrics.requiredRemainingGrade !== null ? metrics.requiredRemainingGrade : 'Aprobado';
      reqEl.className = `text-base font-extrabold ${metrics.requiredRemainingGrade === 'Reprobado' ? 'text-rose-400' : (metrics.isExempt || metrics.requiredRemainingGrade === 'Aprobado' ? 'text-emerald-400' : 'text-amber-400')} mt-0.5`;
    }

    const subEl = document.getElementById('nota-final-subtext-val');
    if (subEl) {
      subEl.textContent = `${metrics.presentationWeight || 70}% Presentación (${metrics.presentationGrade !== null ? metrics.presentationGrade : 'S/I'}) + ${metrics.examWeight || 30}% Examen`;
    }

    const finalEl = document.getElementById('nota-final-ponderada-val');
    if (finalEl) {
      finalEl.textContent = metrics.currentAverage !== null ? metrics.currentAverage : 'S/I';
      finalEl.className = `text-2xl font-black ${metrics.currentAverage >= 4.0 ? 'text-emerald-400' : (metrics.currentAverage !== null ? 'text-rose-400' : 'text-slate-500')} px-3 py-1 rounded-xl bg-slate-950 border border-slate-800`;
    }
  };

  // Attach real-time input listeners to all grade inputs
  document.querySelectorAll('.grade-input, #exam-grade-input').forEach(input => {
    input.addEventListener('input', updateCalculationsRealTime);
    input.addEventListener('change', () => {
      syncInputsToCourse();
      if (onFullReRender) onFullReRender();
    });
  });

  if (toggleUdd) {
    toggleUdd.addEventListener('change', (e) => {
      course.isUddRuleEnabled = e.target.checked;
      saveCourse(course);
      showToast(course.isUddRuleEnabled ? 'Regla UDD activada' : 'Regla estándar activada', 'info');
      if (onFullReRender) onFullReRender();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      syncInputsToCourse();
      showToast('¡Notas guardadas correctamente!', 'success');
      if (onFullReRender) onFullReRender();
    });
  }
}

// -------------------------------------------------------------
// COURSE MANAGER EVENT HANDLERS
// -------------------------------------------------------------
function attachCoursesListeners() {
  document.querySelectorAll('[data-reset-course]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-reset-course');
      const course = state.courses.find(c => c.id === id);
      if (course) {
        course.attended = 0;
        course.absent = 0;
        saveCourse(course);
        showToast(`Faltas restablecidas para ${course.name}`, 'info');
        renderCurrentTab();
      }
    });
  });

  document.querySelectorAll('[data-delete-course]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-delete-course');
      if (confirm('¿Eliminar esta asignatura?')) {
        state.courses = deleteCourse(id);
        showToast('Asignatura eliminada', 'warning');
        renderCurrentTab();
      }
    });
  });

  const exportBtn = document.getElementById('export-json-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.courses, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `TheJamonApp_Backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Respaldo JSON descargado', 'success');
    });
  }

  const importInput = document.getElementById('import-json-input');
  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const imported = JSON.parse(event.target.result);
            if (Array.isArray(imported)) {
              localStorage.setItem('marginapp_courses_v1', JSON.stringify(imported));
              state.courses = imported;
              showToast('¡Datos importados con éxito!', 'success');
              renderCurrentTab();
            } else {
              showToast('El archivo JSON no tiene un formato válido', 'danger');
            }
          } catch {
            showToast('Error al leer el archivo JSON', 'danger');
          }
        };
        reader.readAsText(file);
      }
    });
  }
}

// -------------------------------------------------------------
// GLOBAL LISTENERS & MODALS
// -------------------------------------------------------------
function setupGlobalListeners() {
  const toggleFrameBtn = document.getElementById('toggle-frame-btn');
  const container = document.getElementById('mobile-container');
  if (toggleFrameBtn && container) {
    toggleFrameBtn.addEventListener('click', () => {
      state.isMobileFrame = !state.isMobileFrame;
      if (state.isMobileFrame) {
        container.className = "w-full h-full sm:max-w-[430px] sm:h-[900px] sm:max-h-[95vh] bg-slate-900 sm:rounded-[48px] sm:border-[10px] sm:border-slate-800 sm:shadow-2xl overflow-hidden flex flex-col relative sm:ring-1 sm:ring-white/10 transition-all duration-300";
      } else {
        container.className = "w-full h-full bg-slate-900 overflow-hidden flex flex-col relative transition-all duration-300";
      }
    });
  }
}

function showHistoryModal() {
  const history = getHistory();
  const rows = history.length > 0 
    ? history.map(h => `
        <div class="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <h4 class="font-bold text-white">${h.courseName || 'Asignatura'}</h4>
            <span class="text-[10px] text-slate-400">${new Date(h.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${new Date(h.timestamp).toLocaleDateString()} (${h.amount || 1} mód)</span>
          </div>
          <span class="px-2 py-1 rounded-full text-[10px] font-bold ${h.type === 'attended' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}">
            ${h.type === 'attended' ? `+${h.amount || 1} Asistió` : `+${h.amount || 1} Faltó`}
          </span>
        </div>
      `).join('')
    : `<p class="text-xs text-slate-400 text-center py-4">No hay historial registrado.</p>`;

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="ios-card w-full max-w-sm p-5 rounded-3xl space-y-4 border border-slate-700 animate-ios-fade">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 class="text-sm font-bold text-white flex items-center gap-1.5">
          <i data-lucide="history" class="w-4 h-4 text-blue-400"></i>
          Historial Reciente
        </h3>
        <button id="close-hist-btn" class="text-slate-400 hover:text-white">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
        ${rows}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  if (window.lucide) window.lucide.createIcons();

  modal.querySelector('#close-hist-btn').addEventListener('click', () => modal.remove());
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  
  let bgClass = 'bg-slate-800 border-slate-700 text-slate-200';
  let icon = 'info';

  if (type === 'success') {
    bgClass = 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200';
    icon = 'check-circle-2';
  } else if (type === 'warning') {
    bgClass = 'bg-amber-950/90 border-amber-500/40 text-amber-200';
    icon = 'alert-triangle';
  } else if (type === 'danger') {
    bgClass = 'bg-rose-950/90 border-rose-500/40 text-rose-200';
    icon = 'alert-octagon';
  }

  toast.className = `p-3 rounded-2xl border text-xs font-semibold shadow-xl flex items-center gap-2.5 backdrop-blur-md animate-ios-fade ${bgClass}`;
  toast.innerHTML = `
    <i data-lucide="${icon}" class="w-4 h-4 shrink-0"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('PWA ServiceWorker registrado'))
        .catch(err => console.log('Error ServiceWorker:', err));
    });
  }
}
