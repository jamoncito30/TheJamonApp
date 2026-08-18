// Syllabus & Calendar Parser Module for MarginApp

// Preset Demo Syllabus Texts for instant testing
export const DEMO_SYLLABUS_SAMPLES = [
  {
    title: 'Syllabus Demo: Cálculo Avanzado',
    text: `UNIVERSIDAD NACIONAL DE INGENIERÍA
SYLLABUS DE LA ASIGNATURA: CÁLCULO III (MAT-301)
Créditos: 6 SCT
Profesor: Dr. Fernando Alarcón

1. REQUISITOS DE ASISTENCIA:
El curso exige un 75% de asistencia obligatoria a las clases lectivas para tener derecho a presentar el examen final. El semestre consta de 32 clases en total (16 semanas, 2 clases por semana).

2. EVALUACIONES Y PONDERACIONES:
- Certamen 1 (30%): 24 de Septiembre
- Certamen 2 (35%): 05 de Noviembre
- Examen Final (35%): 18 de Diciembre`
  },
  {
    title: 'Syllabus Demo: Inteligencia Artificial',
    text: `DEPARTAMENTO DE CIENCIAS DE LA COMPUTACIÓN
ASIGNATURA: INTELIGENCIA ARTIFICIAL Y MACHINE LEARNING (CC-502)
Créditos: 8 SCT - Total Clases Totales: 36 sesiones

REGLAMENTO INTERNO:
- Asistencia mínima requerida: 80% de asistencia presencial.
- Faltas permitidas máximas calculadas según crédito institucional.

CALENDARIO DE EVALUACIONES:
* Proyecto Parte 1 (25%): Redes Neuronales - 12 de Octubre
* Proyecto Parte 2 (35%): Deep Learning - 16 de Noviembre
* Examen / Defensa Final (40%): 20 de Diciembre`
  },
  {
    title: 'Syllabus Demo: Química Orgánica',
    text: `FACULTAD DE CIENCIAS QUÍMICAS Y FARMACÉUTICAS
PROGRAMA DE ASIGNATURA: QUÍMICA ORGÁNICA I (QUI-202)
Créditos: 5 Créditos SCT | Duración: 28 clases en el semestre

ASISTENCIA A LABORATORIOS Y CÁTEDRAS:
Exigencia de asistencia: 85% a laboratorios y cátedras.

EVALUACIONES:
- Solemne 1: 30% (Semana 6)
- Solemne 2: 30% (Semana 12)
- Laboratorio Práctico: 40% (Semana 15)`
  }
];

// Main Extractor Function
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

  return extractMetadataFromText(rawText);
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

// Extract Structured Metadata from Raw Text using regex patterns
export function extractMetadataFromText(text) {
  if (!text || typeof text !== 'string') {
    return createEmptyParsedObject();
  }

  const cleanText = text.replace(/\r\n/g, '\n');

  // 1. Extract Course Name
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

  // 2. Extract Course Code
  let code = '';
  const codeMatch = cleanText.match(/\b([A-Z]{2,4}\s*[-]?\s*\d{3,4})\b/i);
  if (codeMatch) {
    code = codeMatch[1].toUpperCase().replace(/\s+/g, '');
  } else {
    code = 'COD-101';
  }

  // 3. Extract Required Attendance %
  let requiredAttendancePercent = 75; // Default standard university requirement
  const attMatch = cleanText.match(/(?:asistencia|exigencia|asistencia obligatoria|asistencia mínima)\s*[:|-]?\s*(\d{2})\s*%/i) ||
                   cleanText.match(/(\d{2})\s*%\s*(?:de asistencia|asistencia)/i);
  if (attMatch && attMatch[1]) {
    const parsedPercent = parseInt(attMatch[1], 10);
    if (parsedPercent >= 50 && parsedPercent <= 100) {
      requiredAttendancePercent = parsedPercent;
    }
  }

  // 4. Extract Total Classes
  let totalClasses = 32; // Default standard 16-week semester (2 classes/week)
  const classMatch = cleanText.match(/(\d{1,2})\s*(?:clases|sesiones|catedras|clases totales)/i) ||
                     cleanText.match(/(?:total de clases|sesiones totales)\s*[:|-]?\s*(\d{1,2})/i);
  if (classMatch && classMatch[1]) {
    const parsedClasses = parseInt(classMatch[1], 10);
    if (parsedClasses >= 10 && parsedClasses <= 80) {
      totalClasses = parsedClasses;
    }
  }

  // 5. Extract Credits
  let credits = 6;
  const credMatch = cleanText.match(/(\d{1,2})\s*(?:sct|créditos|creditos|uc)/i);
  if (credMatch && credMatch[1]) {
    credits = parseInt(credMatch[1], 10);
  }

  // 6. Extract Evaluation Key Dates and Weights
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

  // Fallback evaluations if none detected
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
