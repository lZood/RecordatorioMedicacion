// src/pages/SignUp.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User as UserIcon, Briefcase, Mail, Eye, EyeOff } from 'lucide-react';
import { authService, ExtendedSignUpCredentials } from '../services/auth';
import toast from 'react-hot-toast';

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("El nombre completo es requerido.");
      return;
    }
    if (!specialty.trim()) {
      toast.error("La especialidad es requerida.");
      return;
    }
     if (!email.trim()) {
      toast.error("El correo electrónico es requerido.");
      return;
    }
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading('Creando cuenta de doctor...');

    const credentials: ExtendedSignUpCredentials = {
      email,
      password,
      options: {
        data: {
          name: name.trim(),
          specialty: specialty.trim(),
          role: 'doctor',
        }
      }
    };

    try {
      const result = await authService.signUp(credentials);
      toast.dismiss(toastId);

      if (result.error) {
        console.error("SignUp.tsx: authService.signUp error:", result.error);
        throw result.error;
      }
      
      if (result.user) {
        toast.success(result.session ? '¡Cuenta de doctor creada! Sesión iniciada.' : '¡Cuenta de doctor creada! Por favor, revisa tu correo para confirmar.');
        if (result.session) {
            navigate('/'); 
        } else {
            navigate('/login', { 
              state: { 
                message: "¡Cuenta de doctor creada! Por favor, revisa tu correo para confirmar tu cuenta antes de iniciar sesión." 
              } 
            });
        }
      } else {
        toast.error('Registro completado, pero no se devolvieron datos de usuario. Intenta iniciar sesión o revisa tu correo.');
        navigate('/login');
      }

    } catch (error: any) {
      toast.dismiss(toastId);
      console.error("Sign up error:", error);
      toast.error(error.message || 'Falló el registro. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Sección Izquierda / Branding (visible en md y superior) */}
      <div className="hidden md:flex md:w-1/2 lg:w-2/5 bg-teal-600 items-center justify-center p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600 to-cyan-600 opacity-90"></div>
        <div className="relative z-10 text-center">
          <Link to="/" className="inline-block mb-8">
            <Briefcase size={64} className="text-white" />
          </Link>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">MediRemind</h1>
          <p className="text-lg lg:text-xl text-teal-100">
            Únete a nuestra plataforma para doctores y optimiza el cuidado de tus pacientes.
          </p>
           <p className="mt-10 text-sm text-teal-200">
            &copy; {new Date().getFullYear()} MediRemind. Innovación en salud.
          </p>
        </div>
      </div>
      
      {/* Sección Derecha / Formulario */}
      <div className="w-full md:w-1/2 lg:w-3/5 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
           {/* Logo para móviles */}
          <div className="md:hidden text-center mb-8">
            <Link to="/" className="inline-block mb-4 text-teal-600">
              <Briefcase size={48} />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">MediRemind</h1>
          </div>

          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-3 text-center md:text-left">
            Crear Cuenta de Doctor
          </h2>
          <p className="text-gray-600 mb-8 text-center md:text-left">
            Completa el formulario para registrarte.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon size={18} className="text-gray-400" />
                </div>
                <input id="name" name="name" type="text" required value={name} onChange={(e) => setName(e.target.value)}
                       className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition duration-150 ease-in-out"
                       placeholder="Dr. Juan Pérez"/>
              </div>
            </div>

            <div>
              <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase size={18} className="text-gray-400" />
                </div>
                <input id="specialty" name="specialty" type="text" required value={specialty} onChange={(e) => setSpecialty(e.target.value)}
                       className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition duration-150 ease-in-out"
                       placeholder="Cardiología, Pediatría, etc."/>
              </div>
            </div>
            
            <div>
              <label htmlFor="email-signup" className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gray-400" />
                </div>
                <input id="email-signup" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                       className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition duration-150 ease-in-out"
                       placeholder="tu@email.com"/>
              </div>
            </div>

            <div>
              <label htmlFor="password-signup" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input id="password-signup" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)}
                       className="appearance-none block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition duration-150 ease-in-out"
                       placeholder="Mínimo 6 caracteres"/>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

             <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
              <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                       className="appearance-none block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition duration-150 ease-in-out"
                       placeholder="Repite tu contraseña"/>
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700">
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <button type="submit" disabled={isLoading}
                      className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition duration-150 ease-in-out ${
                        isLoading 
                          ? 'bg-teal-400 cursor-not-allowed' 
                          : 'bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500'
                      }`}>
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  'Crear Cuenta'
                )}
              </button>
            </div>
          </form>
           <p className="mt-8 text-center text-sm text-gray-600">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="font-medium text-teal-600 hover:text-teal-500">
              Iniciar Sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
