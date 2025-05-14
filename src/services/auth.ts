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
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    
    if (error) throw error;
    if (!data.user || !data.session) throw new Error("Sign in successful but no user or session data returned.");
    return { user: data.user, session: data.session };
  },

  async signUp(credentials: ExtendedSignUpCredentials): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
    // credentials incluirá email, password, y opcionalmente options: { data: { name: 'John Doe', specialty: 'Cardiology' } }
    const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: credentials.options // Pasa todas las opciones, incluyendo data
    });
    
    // signUp devuelve { data: { user, session }, error }
    // Si la confirmación por email está activada, data.session será null hasta que se confirme.
    // data.user tendrá el usuario incluso si no está confirmado.
    if (error) {
        return { user: null, session: null, error };
    }
    return { user: data.user, session: data.session, error: null };
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) { // No lanzar error si simplemente no hay usuario, solo si hay un error de API
        console.error("Error getting current user:", error.message);
        return null; // Opcional: podrías lanzar el error si es crítico
    }
    return user;
  },

  async getSession(): Promise<Session | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error("Error getting session:", error.message);
        return null;
    }
    return session;
  }
};
