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
    data?: SignUpOptionsData;
    emailRedirectTo?: string;
    captchaToken?: string;
  };
}

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
