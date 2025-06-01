// src/services/auth.ts
import { supabase } from '../lib/supabase';
import { SignUpWithPasswordCredentials, SignInWithPasswordCredentials, User, Session, AuthError } from '@supabase/supabase-js';

interface SignUpOptionsData {
  name?: string;
  specialty?: string;
  role?: 'doctor' | 'patient' | string;
  [key: string]: any;
}

export interface ExtendedSignUpCredentials extends SignUpWithPasswordCredentials {
  options?: {
    data?: { // Asegúrate que esto pueda incluir name y role
      name?: string;
      specialty?: string; // Puede ser null o no estar presente para pacientes
      role?: 'doctor' | 'patient' | string; // 'patient' es clave aquí
      [key: string]: any;
    };
    emailRedirectTo?: string;
    captchaToken?: string;
  };
}
interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

export interface CreatePatientUserCredentials {
  email: string;
  password: string;
  options?: {
    data?: {
      name?: string; // Nombre del paciente para metadata si es útil
      // Otros metadatos específicos del paciente
      role: 'patient'; // Forzar rol paciente
    };
    emailRedirectTo?: string;
  };
}

export const authService = {
  async signIn(credentials: SignInWithPasswordCredentials): Promise<AuthResponse> {
    console.log("authService.signIn: called with credentials:", JSON.stringify({email: credentials.email}, null, 2));
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    
    if (error) {
      console.error("authService.signIn: Supabase error:", error);
      return { user: null, session: null, error };
    }
    if (!data.user || !data.session) {
      console.error("authService.signIn: No user or session data returned from Supabase.");
      const missingDataError: AuthError = {
        name: 'AuthMissingDataError',
        message: 'Sign in successful but no user or session data returned.',
        status: 500,
      };
      return { user: null, session: null, error: missingDataError };
    }
    console.log("authService.signIn: Success. User ID:", data.user.id);
    return { user: data.user, session: data.session, error: null };
  },

  async signUp(credentials: ExtendedSignUpCredentials): Promise<AuthResponse> {
    const options = credentials.options || {};
    const dataForMetaData = options.data || {};

    // Para la aplicación web de doctores, el rol siempre será 'doctor'
    const finalMetaData: SignUpOptionsData = {
      ...dataForMetaData, // Incluye name, specialty pasados desde SignUp.tsx
      role: 'doctor',    // Forzar rol 'doctor' para registros desde la web
    };

    const finalOptions = {
      ...options,
      data: finalMetaData,
    };
    
    console.log("authService.signUp: Credentials for Supabase signUp:", JSON.stringify({
        email: credentials.email,
        // No loguear password
        options: finalOptions
    }, null, 2));
    
    const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: finalOptions // Pasa las opciones con el rol 'doctor'
    });
    
    if (error) {
      console.error("authService.signUp: Supabase error:", error);
      return { user: null, session: null, error };
    }
    console.log("authService.signUp: Supabase response data (user, session):", {user: data.user, session: data.session});
    return { user: data.user, session: data.session, error: null };
  },

  async signOut(): Promise<{ error: AuthError | null }> {
    console.log("authService.signOut: called");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("authService.signOut: Supabase error:", error);
    } else {
      console.log("authService.signOut: Success.");
    }
    return { error };
  },

  async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
        console.error("authService.getCurrentUser: Error getting current user:", error.message);
        return null;
    }
    return user;
  },

  async getSession(): Promise<Session | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error("authService.getSession: Error getting session:", error.message);
        return null;
    }
    return session;
  }
};

async createPatientUser(credentials: CreatePatientUserCredentials): Promise<AuthResponse> {
  // Paso 1: Guardar la sesión actual del doctor
  const { data: { session: doctorSession } } = await supabase.auth.getSession();

  // Paso 2: Intentar crear el usuario paciente
  const { data: patientAuthData, error: signUpError } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      data: { ...credentials.options?.data, role: 'patient' }, // Asegura rol 'patient'
      emailRedirectTo: credentials.options?.emailRedirectTo,
    },
  });

  // Paso 3: Restaurar la sesión del doctor INMEDIATAMENTE
  // Esto es crucial si signUp establece una sesión para el nuevo usuario.
  if (doctorSession) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: doctorSession.access_token,
      refresh_token: doctorSession.refresh_token,
    });
    if (sessionError) {
      console.error("authService.createPatientUser: Error restoring doctor session:", sessionError);
      // Aquí podría ser necesario forzar un logout del doctor o mostrar un error crítico.
    }
  } else {
    // Si no había sesión de doctor, algo está mal, pero continuamos con el resultado del signUp.
    console.warn("authService.createPatientUser: No doctor session found to restore.");
  }

  if (signUpError) {
    console.error("authService.createPatientUser: Supabase signUp error:", signUpError);
    return { user: null, session: null, error: signUpError };
  }

  // signUp por defecto devuelve una sesión para el nuevo usuario.
  // devolvemos el usuario creado, pero la sesión activa debe ser la del doctor.
  return { user: patientAuthData.user, session: null, error: null }; // Session es null porque no queremos que el frontend la use para el paciente
}