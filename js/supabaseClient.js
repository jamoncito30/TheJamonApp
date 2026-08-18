// Supabase Client & Multi-User Authentication Engine
const SUPABASE_URL_KEY = 'thejamonapp_supabase_url';
const SUPABASE_ANON_KEY = 'thejamonapp_supabase_anon';

// Default Supabase configuration placeholders
let supabaseUrl = localStorage.getItem(SUPABASE_URL_KEY) || '';
let supabaseAnonKey = localStorage.getItem(SUPABASE_ANON_KEY) || '';

let supabaseClient = null;

export function initSupabase() {
  if (window.supabase && supabaseUrl && supabaseAnonKey) {
    try {
      supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    } catch (err) {
      console.warn('Supabase initialization warning:', err);
    }
  }
  return supabaseClient;
}

export function getSupabase() {
  if (!supabaseClient) {
    initSupabase();
  }
  return supabaseClient;
}

export function isSupabaseConfigured() {
  return !!getSupabase();
}

export function getSupabaseConfig() {
  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey
  };
}

export function saveSupabaseConfig(url, anonKey) {
  supabaseUrl = url.trim();
  supabaseAnonKey = anonKey.trim();
  localStorage.setItem(SUPABASE_URL_KEY, supabaseUrl);
  localStorage.setItem(SUPABASE_ANON_KEY, supabaseAnonKey);
  return initSupabase();
}

// -------------------------------------------------------------
// AUTHENTICATION APIs
// -------------------------------------------------------------
export async function signUpWithEmail(email, password) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase no está configurado. Por favor ingresa la URL y Anon Key.');

  const { data, error } = await client.auth.signUp({
    email,
    password
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email, password) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase no está configurado. Por favor ingresa la URL y Anon Key.');

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const client = getSupabase();
  if (!client) throw new Error('Supabase no está configurado.');

  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const client = getSupabase();
  if (client) {
    await client.auth.signOut();
  }
}

export async function getCurrentUser() {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data: { user } } = await client.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export async function getSession() {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data: { session } } = await client.auth.getSession();
    return session;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// DATABASE (CRUD FOR COURSES)
// -------------------------------------------------------------
export async function fetchUserCoursesFromSupabase() {
  const client = getSupabase();
  if (!client) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await client
    .from('courses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching courses from Supabase:', error);
    return null;
  }

  return data.map(dbCourse => ({
    id: dbCourse.id,
    name: dbCourse.name,
    code: dbCourse.code,
    credits: dbCourse.credits,
    requiredAttendancePercent: dbCourse.required_attendance_percent,
    totalClasses: dbCourse.total_classes,
    classDays: dbCourse.class_days || [],
    academicPeriod: dbCourse.academic_period || 'semestre2',
    modulesPerDay: dbCourse.modules_per_day,
    examWeight: dbCourse.exam_weight,
    examGrade: dbCourse.exam_grade,
    attended: dbCourse.attended || 0,
    absent: dbCourse.absent || 0,
    isUddRuleEnabled: dbCourse.is_udd_rule_enabled,
    evaluations: dbCourse.evaluations || []
  }));
}

export async function saveCourseToSupabase(course) {
  const client = getSupabase();
  if (!client) return false;

  const user = await getCurrentUser();
  if (!user) return false;

  const payload = {
    id: course.id,
    user_id: user.id,
    code: course.code,
    name: course.name,
    credits: course.credits,
    required_attendance_percent: course.requiredAttendancePercent,
    total_classes: course.totalClasses,
    class_days: course.classDays || [],
    academic_period: course.academicPeriod || 'semestre2',
    modules_per_day: course.modulesPerDay || 2,
    exam_weight: course.examWeight || 30,
    exam_grade: course.examGrade,
    attended: course.attended || 0,
    absent: course.absent || 0,
    is_udd_rule_enabled: course.isUddRuleEnabled ?? true,
    evaluations: course.evaluations || []
  };

  const { error } = await client
    .from('courses')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('Error saving course to Supabase:', error);
    return false;
  }
  return true;
}

export async function deleteCourseFromSupabase(courseId) {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('courses')
    .delete()
    .eq('id', courseId);

  if (error) {
    console.error('Error deleting course from Supabase:', error);
    return false;
  }
  return true;
}
