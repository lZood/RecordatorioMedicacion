// src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, Briefcase } from 'lucide-react'; // Briefcase para el logo de la app
import { authService } from '../services/auth';
// import { useAppContext } from '../contexts/AppContext'; // No se usa directamente aquí para setCurrentUser
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // const { setCurrentUser, loadInitialData } = useAppContext(); // AppContext.onAuthStateChange maneja esto

  const from = location.state?.from?.pathname || "/";
  const messageFromSignUp = location.state?.message;


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const toastId = toast.loading('Iniciando sesión...');

    try {
      const result = await authService.signIn({ email, password });
      toast.dismiss(toastId);
      
      if (result.error) {
        console.error("Login.tsx: authService.signIn error:", result.error);
        toast.error(result.error.message || 'Falló el inicio de sesión. Revisa tus credenciales.');
      } else if (result.user && result.session) {
        toast.success('¡Inicio de sesión exitoso!');
        // onAuthStateChange en AppContext se encargará de cargar datos y redirigir si es necesario.
        // Si ProtectedRoute es el padre, simplemente navegar a '/' o a 'from' debería funcionar.
        navigate(from, { replace: true });
      } else {
        toast.error('Falló el inicio de sesión. Respuesta inesperada.');
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      console.error("Login error:", error);
      toast.error(error.message || 'Falló el inicio de sesión. Revisa tus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Sección Izquierda / Branding (visible en md y superior) */}
      <div className="hidden md:flex md:w-1/2 lg:w-2/5 bg-indigo-700 items-center justify-center p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 to-purple-700 opacity-90"></div>
        <div className="relative z-10 text-center">
          <Link to="/" className="inline-block mb-8">
            <Briefcase size={64} className="text-white" />
          </Link>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">MediRemind</h1>
          <p className="text-lg lg:text-xl text-indigo-100">
            Panel de Doctor - Sistema de Recordatorio de Medicación.
          </p>
          <p className="mt-10 text-sm text-indigo-200">
            &copy; {new Date().getFullYear()} MediRemind. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* Sección Derecha / Formulario */}
      <div className="w-full md:w-1/2 lg:w-3/5 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Logo para móviles */}
          <div className="md:hidden text-center mb-8">
            <Link to="/" className="inline-block mb-4 text-indigo-600">
              <Briefcase size={48} />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">MediRemind</h1>
          </div>

          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-3 text-center md:text-left">
            Bienvenido de nuevo
          </h2>
          <p className="text-gray-600 mb-8 text-center md:text-left">
            Ingresa tus credenciales para acceder a tu panel.
          </p>

          {messageFromSignUp && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-md text-sm">
              {messageFromSignUp}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
                  placeholder="Tu contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Recordarme
                </label>
              </div>
              <div className="text-sm">
                <Link to="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition duration-150 ease-in-out ${
                  isLoading 
                    ? 'bg-indigo-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }`}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-gray-600">
            ¿No tienes una cuenta?{' '}
            <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
              Crear una cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
