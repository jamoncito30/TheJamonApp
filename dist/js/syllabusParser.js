// Syllabus & Calendar Parser Module for TheJamonApp with Gemini 2.5 Flash AI Integration

export function getGeminiApiKey() {
  return localStorage.getItem('thejamonapp_gemini_key') || '';
}

export function saveGeminiApiKey(key) {
  localStorage.setItem('thejamonapp_gemini_key', key.trim());
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

  const systemPrompt = `Eres un sistema experto en análisis de syllabus y calendarizaciones universitarias en Chile (con énfasis en la Universidad del Desarrollo UDD).
Analiza el siguiente texto de syllabus y extrae la información requerida en un objeto JSON estricto con las siguientes claves:
- name (string): Nombre exacto del ramo o asignatura.
- code (string): Código de la asignatura (ej: MAT-201, INF-102).
- credits (number): Créditos SCT (número).
- requiredAttendancePercent (number): Porcentaje de asistencia exigido (ej: 75).
- totalClasses (number): Total de días o sesiones de clases en el semestre (ej: 32).
- modulesPerDay (number): 2 si se imparte en bloques/módulos dobles (ej: H1-H2 UDD) o 1 si es módulo único.
- evaluations (array): Lista de certámenes o evaluaciones con formato [{ name: string, weight: number, date: string }]. Las ponderaciones de las evaluaciones deben sumar 100%.

Responde ÚNICAMENTE con el objeto JSON estructurado.`;

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
      { id: 'ev-1', name: 'Certamen 1', weight: 30, date: 'Semana 6', grade: null },
      { id: 'ev-2', name: 'Certamen 2', weight: 35, date: 'Semana 12', grade: null },
      { id: 'ev-3', name: 'Examen Final', weight: 35, date: 'Semana 16', grade: null }
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
    /(?:CÁLCULO|PROGRAMACIÓN|FÍSICA|QUÍMICA|ÁLGEBRA|ESTADÍSTICA|ESTRUCTURA DE DATOS|INTELIGENCIA ARTIFICIAL|BIOLOGÍA|MECÁNICA|DERECHO|ECONOMÍA)[A-ZÁÉÍÓÚÑa-záéíóúñ0-9\s]{0,25}/i
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
  const codeMatch = cleanText.match(/\b([A-Z]{2,4}\s*[-]?\s*\d{3,4})\b/i);
  if (codeMatch) {
    code = codeMatch[1].toUpperCase().replace(/\s+/g, '');
  } else {
    code = 'COD-101';
  }

  let requiredAttendancePercent = 75;
  const attMatch = cleanText.match(/(?:asistencia|exigencia|asistencia obligatoria|asistencia mínima)\s*[:|-]?\s*(\d{2})\s*%/i) ||
                   cleanText.match(/(\d{2})\s*%\s*(?:de asistencia|asistencia)/i);
  if (attMatch && attMatch[1]) {
    const parsedPercent = parseInt(attMatch[1], 10);
    if (parsedPercent >= 50 && parsedPercent <= 100) {
      requiredAttendancePercent = parsedPercent;
    }
  }

  let totalClasses = 32;
  const classMatch = cleanText.match(/(\d{1,2})\s*(?:clases|sesiones|catedras|clases totales)/i) ||
                     cleanText.match(/(?:total de clases|sesiones totales)\s*[:|-]?\s*(\d{1,2})/i);
  if (classMatch && classMatch[1]) {
    const parsedClasses = parseInt(classMatch[1], 10);
    if (parsedClasses >= 10 && parsedClasses <= 80) {
      totalClasses = parsedClasses;
    }
  }

  let credits = 6;
  const credMatch = cleanText.match(/(\d{1,2})\s*(?:sct|créditos|creditos|uc)/i);
  if (credMatch && credMatch[1]) {
    credits = parseInt(credMatch[1], 10);
  }

  const evaluations = [];
  const evalRegex = /(Certamen|Prueba|Solemne|Examen|Tarea|Proyecto|Laboratorio|Control)\s*(\d{1,2})?\s*(?:\((?:ponderaci[oó]n:?\s*)?(\d{1,2})%\)|(\d{1,2})%)\s*(?:[-:]?\s*([0-9]{1,2}\s+de\s+[a-zA-ZáéíóúÁÉÍÓÚ]+|\d{1,2}\/\d{1,2}))?/gi;
  
  let match;
  while ((match = evalRegex.exec(cleanText)) !== null) {
    const type = match[1];
    const num = match[2] ? ` ${match[2]}` : '';
    const weight = parseInt(match[3] || match[4] || '25', 10);
    const date = match[5] ? match[5].trim() : 'Por definir';

    evaluations.push({
      id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `${type}${num}`,
      weight: weight,
      date: date,
      grade: null
    });
  }

  if (evaluations.length === 0) {
    evaluations.push(
      { id: 'ev-1', name: 'Certamen 1', weight: 30, date: 'Semana 6', grade: null },
      { id: 'ev-2', name: 'Certamen 2', weight: 35, date: 'Semana 12', grade: null },
      { id: 'ev-3', name: 'Examen Final', weight: 35, date: 'Semana 16', grade: null }
    );
  }

  return {
    name,
    code,
    credits,
    totalClasses,
    modulesPerDay: 2,
    requiredAttendancePercent,
    attended: 0,
    absent: 0,
    evaluations,
    rawTextPreview: text.substring(0, 300) + '...'
  };
}

function createEmptyParsedObject() {
  return {
    name: 'Asignatura Nueva',
    code: 'COD-101',
    credits: 6,
    totalClasses: 32,
    modulesPerDay: 2,
    requiredAttendancePercent: 75,
    attended: 0,
    absent: 0,
    evaluations: [
      { id: 'ev-1', name: 'Certamen 1', weight: 30, date: 'Por definir', grade: null },
      { id: 'ev-2', name: 'Certamen 2', weight: 35, date: 'Por definir', grade: null },
      { id: 'ev-3', name: 'Examen Final', weight: 35, date: 'Por definir', grade: null }
    ],
    rawTextPreview: ''
  };
}
