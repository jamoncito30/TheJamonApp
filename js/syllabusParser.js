// Syllabus & Calendar Parser Module for TheJamonApp with Gemini 2.5 Flash AI Integration

// Pre-configured shared Gemini API Key for cohort users (Base64 decoded at runtime)
export const DEFAULT_GEMINI_API_KEY = typeof atob === 'function' ? atob('QVEuQWI4Uk42SW9TVE5QeUNTblRvTzlwT1NoUE1uZ3hoTDdDdGtfV2ZwM2daOUNmOEJ0aXc=') : '';

export function getGeminiApiKey() {
  return localStorage.getItem('thejamonapp_gemini_key') || DEFAULT_GEMINI_API_KEY || '';
}

export function saveGeminiApiKey(key) {
  if (key && key.trim()) {
    localStorage.setItem('thejamonapp_gemini_key', key.trim());
  } else {
    localStorage.removeItem('thejamonapp_gemini_key');
  }
}

// Main Extractor Function with Gemini AI + Local Fallback
export async function parseSyllabusContent(inputSource) {
  let rawText = '';

  if (typeof inputSource === 'string') {
    rawText = inputSource;
  } else if (inputSource instanceof File) {
    if (inputSource.type === 'application/pdf') {
      rawText = await extractTextFromPDF(inputSource);
    } else {
      rawText = await readAsPlainText(inputSource);
    }
  }

  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      console.log('Procesando Syllabus mediante la API de Google Gemini...');
      return await parseWithGeminiAPI(rawText, apiKey);
    } catch (err) {
      console.warn('Falló el análisis con Gemini API, usando analizador local fallback:', err);
      // Fallback to local regex parser
      return extractMetadataFromText(rawText);
    }
  } else {
    return extractMetadataFromText(rawText);
  }
}

// Google Gemini 2.5 Flash API Call with JSON Structured Output
async function parseWithGeminiAPI(textContent, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const systemPrompt = `Eres un sistema experto avanzado en análisis de syllabus, programas de curso y calendarizaciones universitarias en Chile, con especialización en la Universidad del Desarrollo (UDD).
Tu tarea es leer detenidamente el texto proporcionado y extraer con precisión quirúrgica la siguiente información en formato JSON estricto.

Reglas de extracción críticas:
1. credits (number): Busca intensivamente términos como "Créditos", "Créditos SCT", "SCT", "UC" o "Créditos UDD". Extrae solo el número entero (ej. 6, 8, 10). Si no encuentras, usa 6.
2. evaluations (array): Extrae ÚNICAMENTE las evaluaciones regulares que conforman la "Nota de Presentación" (Certámenes, Controles, Talleres, Laboratorios, Proyectos).
   - EXCLUYE explícitamente "Examen", "Examen Final" y "Nota de Presentación" de esta lista.
   - Extrae objetos con { "name": string, "weight": number, "date": string }.
   - "name": Conserva el nombre exacto (ej. "Certamen 1", "Controles", "Talleres"). NO inventes números que no existen en el texto.
   - "weight": Extrae el porcentaje exacto (ej. 20 para 20%). NUNCA uses 0 si el documento especifica un porcentaje.
   - Revisa el texto dos veces para asegurarte de incluir TODO: Certámenes, Controles y Talleres.
   - La suma de las ponderaciones (weight) de estos elementos extraídos DEBE sumar 100.
3. examWeight (number): Busca la ponderación del Examen Final (usualmente 30% o 40%). Extrae solo el número. Si no existe, usa 30.
4. modulesPerDay (number): Retorna 2 si el horario indica bloques dobles (ej: H1-H2) o si no se especifica. Retorna 1 solo si es explícitamente un módulo.
5. totalClasses (number): Por defecto 32 (16 semanas x 2).
6. requiredAttendancePercent (number): Busca % de asistencia (ej: "Sobre 70%" -> 70, "75%" -> 75). Por defecto 70.
7. classDays (array): Extrae los días de la semana en los que se imparte la clase y conviértelos a números: 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado. Si no hay horario, retorna [].

El JSON debe tener EXACTAMENTE esta estructura:
{
  "name": "string",
  "code": "string",
  "credits": number,
  "requiredAttendancePercent": number,
  "totalClasses": number,
  "modulesPerDay": number,
  "examWeight": number,
  "classDays": number[],
  "evaluations": [ { "name": "string", "weight": number, "date": "string" } ]
}

Responde ÚNICAMENTE con el objeto JSON estructurado, sin tildes graves de markdown (no uses \`\`\`json), sin texto adicional.`;

  const payload = {
    contents: [
      {
        parts: [
          { text: systemPrompt },
          { text: `Texto del Syllabus a analizar:\n${textContent.substring(0, 10000)}` }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          code: { type: "STRING" },
          credits: { type: "INTEGER" },
          requiredAttendancePercent: { type: "INTEGER" },
          totalClasses: { type: "INTEGER" },
          modulesPerDay: { type: "INTEGER" },
          examWeight: { type: "INTEGER" },
          classDays: {
            type: "ARRAY",
            items: { type: "INTEGER" }
          },
          evaluations: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                weight: { type: "INTEGER" },
                date: { type: "STRING" }
              },
              required: ["name", "weight", "date"]
            }
          }
        },
        required: ["name", "code", "credits", "requiredAttendancePercent", "totalClasses", "modulesPerDay", "examWeight", "classDays", "evaluations"]
      },
      temperature: 0.1
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Error HTTP ${response.status} en la API de Gemini`);
  }

  const data = await response.json();
  const rawJsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawJsonStr) {
    throw new Error('Respuesta vacía de la API de Gemini');
  }

  const parsed = JSON.parse(rawJsonStr);

  return {
    name: parsed.name || 'Asignatura Extraída (Gemini AI)',
    code: parsed.code || 'COD-101',
    credits: Number(parsed.credits) || 6,
    requiredAttendancePercent: Number(parsed.requiredAttendancePercent) || 75,
    totalClasses: Number(parsed.totalClasses) || 32,
    modulesPerDay: Number(parsed.modulesPerDay) || 2,
    examWeight: Number(parsed.examWeight) || 30,
    classDays: Array.isArray(parsed.classDays) ? parsed.classDays : [],
    examGrade: null,
    attended: 0,
    absent: 0,
    isUddRuleEnabled: true,
    evaluations: Array.isArray(parsed.evaluations) ? parsed.evaluations.map((ev, i) => ({
      id: `ev-gemini-${Date.now()}-${i}`,
      name: ev.name || `Evaluación ${i+1}`,
      weight: Number(ev.weight) || 25,
      date: ev.date || 'Por definir',
      grade: null
    })) : [
      { id: 'ev-1', name: 'Certamen 1', weight: 35, date: 'Semana 6', grade: null },
      { id: 'ev-2', name: 'Certamen 2', weight: 35, date: 'Semana 12', grade: null },
      { id: 'ev-3', name: 'Controles y Talleres', weight: 30, date: 'Semana 16', grade: null }
    ]
  };
}

// Read File as Plain Text
function readAsPlainText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result || '');
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

// PDF.js Text Extractor
async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str);
      fullText += strings.join(' ') + '\n';
    }

    return fullText;
  } catch (err) {
    console.error('Error extracting text from PDF:', err);
    throw new Error('No se pudo leer el archivo PDF. Asegúrate de que no tenga contraseña.');
  }
}

// Local Pattern Matching Fallback
export function extractMetadataFromText(text) {
  if (!text || typeof text !== 'string') {
    return createEmptyParsedObject();
  }

  const cleanText = text.replace(/\r\n/g, '\n');

  let name = '';
  const nameRegexes = [
    /(?:ASIGNATURA|RAMO|CURSO|PROGRAMA DE|SYLLABUS DE LA ASIGNATURA|NOMBRE)\s*[:|-]?\s*([A-ZÁÉÍÓÚÑa-záéíóúñ0-9\s]{3,40})/i,
    /(?:CÁLCULO|CÁLCULO DIFERENCIAL|ÁLGEBRA|FÍSICA|QUÍMICA|ESTADÍSTICA|PROGRAMACIÓN|ESTRUCTURA DE DATOS|INTELIGENCIA ARTIFICIAL|BIOLOGÍA|MECÁNICA|DERECHO|ECONOMÍA)[A-ZÁÉÍÓÚÑa-záéíóúñ0-9\s]{0,25}/i
  ];

  for (const regex of nameRegexes) {
    const match = cleanText.match(regex);
    if (match && match[1]) {
      name = match[1].trim().split('\n')[0];
      break;
    } else if (match && match[0]) {
      name = match[0].trim().split('\n')[0];
      break;
    }
  }

  if (!name) name = 'Asignatura Extraída';

  let code = '';
  const codeMatch = cleanText.match(/\b([A-Z]{2,4}\s*[-]?\s*\d{3,4}[A-Z]?)\b/i);
  if (codeMatch) {
    code = codeMatch[1].toUpperCase().replace(/\s+/g, '');
  } else {
    code = 'COD-101';
  }

  // Academic Period Detection (UDD Semestral / Bimestre 3 / Bimestre 4)
  let academicPeriod = 'semestre2';
  if (/(?:bimestre\s*3|3-2026|bimestral)/i.test(cleanText)) {
    academicPeriod = 'bimestre3';
  } else if (/(?:bimestre\s*4|4-2026)/i.test(cleanText)) {
    academicPeriod = 'bimestre4';
  } else if (/(?:semestre\s*1|1-2026)/i.test(cleanText)) {
    academicPeriod = 'semestre1';
  } else if (/(?:semestre\s*2|2-2026)/i.test(cleanText)) {
    academicPeriod = 'semestre2';
  }

  let requiredAttendancePercent = 70; // UDD Default is 70%
  const attMatch = cleanText.match(/(?:asistencia|exigencia|asistencia obligatoria|asistencia mínima)\s*(?:exigida)?\s*[:|-]?\s*(?:sobre|mayor a|>|>=)?\s*(\d{2})\s*%/i) ||
                   cleanText.match(/(\d{2})\s*%\s*(?:de asistencia|asistencia)/i);
  if (attMatch && attMatch[1]) {
    const parsedPercent = parseInt(attMatch[1], 10);
    if (parsedPercent >= 50 && parsedPercent <= 100) {
      requiredAttendancePercent = parsedPercent;
    }
  }

  let totalClasses = academicPeriod.startsWith('bimestre') ? 40 : 32;
  const classMatch = cleanText.match(/(\d{1,2})\s*(?:clases|sesiones|catedras|clases totales)/i) ||
                     cleanText.match(/(?:total de clases|sesiones totales)\s*[:|-]?\s*(\d{1,2})/i);
  if (classMatch && classMatch[1]) {
    const parsedClasses = parseInt(classMatch[1], 10);
    if (parsedClasses >= 10 && parsedClasses <= 80) {
      totalClasses = parsedClasses;
    }
  }

  let credits = 6;
  const credMatch = cleanText.match(/(?:(?:sct|créditos|creditos|uc)\s*[:|-]?\s*(\d{1,2}))|(\d{1,2})\s*(?:sct|créditos|creditos|uc)/i);
  if (credMatch) {
    credits = parseInt(credMatch[1] || credMatch[2], 10);
  }

  let examWeight = 30;
  const examMatch = cleanText.match(/Examen\s*(?:Final)?\s*[:|-]?\s*(?:\((?:ponderaci[oó]n:?\s*)?(\d{1,2})%\)|(\d{1,2})\s*%)/i);
  if (examMatch) {
    examWeight = parseInt(examMatch[1] || examMatch[2], 10);
  }

  // Detect Class Days from Horarios Section (1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab)
  const classDays = [];
  if (/lunes\s+(?:h1|módulo|sala)/i.test(cleanText) || /clases.*lunes/i.test(cleanText)) classDays.push(1);
  if (/martes\s+(?:h1|módulo|sala)/i.test(cleanText) || /clases.*martes/i.test(cleanText)) classDays.push(2);
  if (/mi[eé]rcoles\s+(?:h1|módulo|sala)/i.test(cleanText) || /clases.*mi[eé]rcoles/i.test(cleanText)) classDays.push(3);
  if (/jueves\s+(?:h1|módulo|sala)/i.test(cleanText) || /clases.*jueves/i.test(cleanText)) classDays.push(4);
  if (/viernes\s+(?:h1|módulo|sala)/i.test(cleanText) || /clases.*viernes/i.test(cleanText)) classDays.push(5);
  if (/s[aá]bado\s+(?:h1|módulo|sala)/i.test(cleanText) || /clases.*s[aá]bado/i.test(cleanText)) classDays.push(6);

  // Check double modules (H1 y H2)
  const modulesPerDay = /h1\s*(?:y|-)\s*h2/i.test(cleanText) ? 2 : 2;

  const evaluations = [];
  const evalRegex = /(Certamen|Prueba|Solemne|Tarea|Proyecto|Laboratorio|Control(?:es)?|Taller(?:es)?)\s*(?:N?[°\.]?\s*(\d{1,2})\b)?\s*[:|-]?\s*(?:\((?:ponderaci[oó]n:?\s*)?(\d{1,2})%\)|(\d{1,2})\s*%)/gi;
  
  let match;
  while ((match = evalRegex.exec(cleanText)) !== null) {
    const type = match[1];
    if (type.toLowerCase().includes('examen')) continue; // skip exam

    const num = match[2] ? ` ${match[2]}` : '';
    const weight = parseInt(match[3] || match[4] || '25', 10);
    const date = 'Por definir';

    evaluations.push({
      id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `${type}${num}`.trim(),
      weight: weight,
      date: date,
      grade: null
    });
  }

  if (evaluations.length === 0) {
    evaluations.push(
      { id: 'ev-1', name: 'Certamen 1', weight: 35, date: 'Semana 6', grade: null },
      { id: 'ev-2', name: 'Certamen 2', weight: 35, date: 'Semana 12', grade: null },
      { id: 'ev-3', name: 'Controles', weight: 20, date: 'Semana 15', grade: null },
      { id: 'ev-4', name: 'Talleres', weight: 10, date: 'Semana 16', grade: null }
    );
  }

  return {
    name,
    code,
    credits,
    academicPeriod,
    totalClasses,
    modulesPerDay,
    examWeight,
    classDays,
    examGrade: null,
    requiredAttendancePercent,
    attended: 0,
    absent: 0,
    isUddRuleEnabled: true,
    evaluations,
    rawTextPreview: text.substring(0, 300) + '...'
  };
}

function createEmptyParsedObject() {
  return {
    name: 'Asignatura Nueva',
    code: 'COD-101',
    credits: 6,
    academicPeriod: 'semestre2',
    totalClasses: 32,
    modulesPerDay: 2,
    examWeight: 30,
    classDays: [],
    examGrade: null,
    requiredAttendancePercent: 70,
    attended: 0,
    absent: 0,
    isUddRuleEnabled: true,
    evaluations: [
      { id: 'ev-1', name: 'Certamen 1', weight: 35, date: 'Por definir', grade: null },
      { id: 'ev-2', name: 'Certamen 2', weight: 35, date: 'Por definir', grade: null },
      { id: 'ev-3', name: 'Controles', weight: 20, date: 'Por definir', grade: null },
      { id: 'ev-4', name: 'Talleres', weight: 10, date: 'Por definir', grade: null }
    ],
    rawTextPreview: ''
  };
}
