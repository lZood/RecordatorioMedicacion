// src/services/auth.ts
import { supabase } from '../lib/supabase';
import { SignUpWithPasswordCredentials, SignInWithPasswordCredentials, User, Session, AuthError } from '@supabase/supabase-js';

// Interfaz para los datos adicionales en el signUp (original)
interface SignUpOptionsData {
  name?: string;
  specialty?: string;
  role?: 'doctor' | 'patient' | string;
  [key: string]: any;
}

// Interfaz extendida para signUp (original)
export interface ExtendedSignUpCredentials extends SignUpWithPasswordCredentials {
  options?: {
    data?: SignUpOptionsData;
    emailRedirectTo?: string;
    captchaToken?: string;
  };
}

// Interfaz para la creación de usuarios pacientes (NUEVA)
export interface CreatePatientUserCredentials {
  email: string;
  password: string;
  options?: {
    data?: {
      name?: string;
      role: 'patient';
    };
    emailRedirectTo?: string;
  };
}

// Interfaz de respuesta de autenticación (original)
interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
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
  }, // Asegúrate de que haya una coma aquí si hay más métodos después

  async signUp(credentials: ExtendedSignUpCredentials): Promise<AuthResponse> {
    const options = credentials.options || {};
    const dataForMetaData = options.data || {};

    const finalMetaData: SignUpOptionsData = {
      ...dataForMetaData,
      role: 'doctor',
    };

    const finalOptions = {
      ...options,
      data: finalMetaData,
    };
    
    console.log("authService.signUp: Credentials for Supabase signUp:", JSON.stringify({
        email: credentials.email,
        options: finalOptions
    }, null, 2));
    
    const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: finalOptions
    });
    
    if (error) {
      console.error("authService.signUp: Supabase error:", error);
      return { user: null, session: null, error };
    }
    console.log("authService.signUp: Supabase response data (user, session):", {user: data.user, session: data.session});
    return { user: data.user, session: data.session, error: null };
  }, // Coma aquí

  // MÉTODO NUEVO PARA CREAR USUARIOS PACIENTES
  // Esta es la sintaxis correcta para un método async dentro de un objeto literal
  async createPatientUser(credentials: CreatePatientUserCredentials): Promise<AuthResponse> {
    const { data: { session: doctorSession }, error: getSessionError } = await supabase.auth.getSession();
    if (getSessionError) {
        console.warn("authService.createPatientUser: Could not get current doctor session:", getSessionError);
    }

    const patientSignUpOptions = {
        data: { ...credentials.options?.data, role: 'patient' },
        emailRedirectTo: credentials.options?.emailRedirectTo,
    };

    console.log("authService.createPatientUser: Signing up patient with options:", patientSignUpOptions);
    const { data: patientAuthData, error: signUpError } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: patientSignUpOptions,
    });

    if (doctorSession) {
      console.log("authService.createPatientUser: Restoring doctor session...");
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: doctorSession.access_token,
        refresh_token: doctorSession.refresh_token,
      });
      if (sessionError) {
        console.error("authService.createPatientUser: CRITICAL - Error restoring doctor session:", sessionError);
        return { user: null, session: null, error: { name: "DoctorSessionRestoreError", message: "Failed to restore doctor session.", status: 500 } as AuthError };
      }
      console.log("authService.createPatientUser: Doctor session restored.");
    } else {
      console.warn("authService.createPatientUser: No doctor session found to restore. This might be an issue if the doctor was expected to be logged in.");
    }

    if (signUpError) {
      console.error("authService.createPatientUser: Supabase signUp error for patient:", signUpError);
      return { user: null, session: null, error: signUpError };
    }
    
    console.log("authService.createPatientUser: Patient user created successfully:", patientAuthData.user?.id);
    // Devolvemos el usuario creado, pero la sesión activa en el cliente debe ser la del doctor.
    // La sesión del paciente (patientAuthData.session) no se usa para no cambiar el estado de autenticación del doctor.
    return { user: patientAuthData.user, session: null, error: null };
  }, // Coma aquí

  async signOut(): Promise<{ error: AuthError | null }> {
    console.log("authService.signOut: called");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("authService.signOut: Supabase error:", error);
    } else {
      console.log("authService.signOut: Success.");
    }
    return { error };
  }, // Coma aquí

  async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
        console.error("authService.getCurrentUser: Error getting current user:", error.message);
        return null;
    }
    return user;
  }, // Coma aquí

  async getSession(): Promise<Session | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error("authService.getSession: Error getting session:", error.message);
        return null;
    }
    return session;
  } // Sin coma aquí porque es el último método del objeto
};
