// src/services/auth.ts
import { supabase } from '../lib/supabase';
import { SignUpWithPasswordCredentials, SignInWithPasswordCredentials, User, Session } from '@supabase/supabase-js';

// Definimos un tipo para los datos adicionales que podemos pasar en options.data
interface SignUpOptionsData {
  name?: string;
  specialty?: string;
  [key: string]: any; // Para permitir otras propiedades si es necesario
}

// Tipo para las credenciales de signUp, incluyendo las opciones de data
export interface ExtendedSignUpCredentials extends SignUpWithPasswordCredentials {
  options?: {
    data?: SignUpOptionsData;
    emailRedirectTo?: string;
    captchaToken?: string;
  };
}

export const authService = {
  async signIn(credentials: SignInWithPasswordCredentials): Promise<{ user: User; session: Session; }> {
    console.log("authService.signIn: called with email:", credentials.email);
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    
    if (error) {
      console.error("authService.signIn: Supabase error:", error);
      throw error;
    }
    if (!data.user || !data.session) {
      console.error("authService.signIn: No user or session data returned from Supabase.");
      throw new Error("Sign in successful but no user or session data returned.");
    }
    console.log("authService.signIn: Success. User ID:", data.user.id);
    return { user: data.user, session: data.session };
  },

  async signUp(credentials: ExtendedSignUpCredentials): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
    // Log para depurar qué se está pasando a Supabase
    console.log("authService.signUp: Credentials received:", JSON.stringify(credentials, null, 2));
    
    const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: credentials.options // Pasa todas las opciones, incluyendo options.data
    });
    
    if (error) {
      console.error("authService.signUp: Supabase error:", error);
      return { user: null, session: null, error };
    }
    console.log("authService.signUp: Supabase response data:", data);
    return { user: data.user, session: data.session, error: null };
  },

  async signOut(): Promise<void> {
    console.log("authService.signOut: called");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("authService.signOut: Supabase error:", error);
      throw error;
    }
    console.log("authService.signOut: Success.");
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
