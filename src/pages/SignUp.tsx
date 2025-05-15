// src/pages/SignUp.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Lock, User as UserIcon, Briefcase, Mail } from 'lucide-react';
import { authService, ExtendedSignUpCredentials } from '../services/auth';
import toast from 'react-hot-toast';
// El AppContext no se usa directamente aquí para setCurrentUser o loadInitialData
// ya que onAuthStateChange en AppContext se encargará de eso.

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState(''); // Campo obligatorio para doctores
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    // Nombre y especialidad son requeridos para el registro de doctores en la web
    if (!name.trim() || !specialty.trim() || !email.trim()) {
        toast.error("Full Name, Specialty, and Email are required.");
        return;
    }

    setIsLoading(true);
    const toastId = toast.loading('Creating doctor account...');

    const credentials: ExtendedSignUpCredentials = {
      email,
      password,
      options: {
        data: {
          name: name.trim(),
          specialty: specialty.trim(),
          role: 'doctor', // Rol asignado automáticamente a 'doctor'
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
        // El trigger en Supabase (handle_new_user) usará el rol 'doctor' de options.data
        toast.success(result.session ? 'Doctor account created! Logged in.' : 'Doctor account created! Please check your email to confirm.');
        if (result.session) {
            navigate('/'); // onAuthStateChange en AppContext se encargará de cargar datos
        } else {
            // Mostrar mensaje para revisar email y redirigir a login
            navigate('/login', { 
              state: { 
                message: "Doctor account created! Please check your email to confirm your account before logging in." 
              } 
            });
        }
      } else {
        // Este caso es si Supabase devuelve éxito pero sin objeto user
        toast.error('Sign up completed, but no user data returned. Please try logging in or check email.');
        navigate('/login');
      }

    } catch (error: any) {
      toast.dismiss(toastId);
      console.error("Sign up error:", error);
      toast.error(error.message || 'Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link to="/" className="p-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition">
            <Activity size={32} className="text-white" />
          </Link>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create Doctor Account
        </h2>
         <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* No hay selector de rol, se asume 'doctor' */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon size={16} className="text-gray-400" />
                </div>
                <input id="name" name="name" type="text" required value={name} onChange={(e) => setName(e.target.value)}
                       className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                       placeholder="Dr. John Doe"/>
              </div>
            </div>

            <div>
              <label htmlFor="specialty" className="block text-sm font-medium text-gray-700">Specialty</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase size={16} className="text-gray-400" />
                </div>
                <input id="specialty" name="specialty" type="text" required value={specialty} onChange={(e) => setSpecialty(e.target.value)}
                       className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                       placeholder="Cardiology"/>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={16} className="text-gray-400" />
                </div>
                <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                       className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                       placeholder="doctor@example.com"/>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={16} className="text-gray-400" />
                </div>
                <input id="password" name="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)}
                       className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                       placeholder="••••••••"/>
              </div>
            </div>

             <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={16} className="text-gray-400" />
                </div>
                <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                       className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                       placeholder="••••••••"/>
              </div>
            </div>

            <div>
              <button type="submit" disabled={isLoading}
                      className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                        isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                      } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}>
                {isLoading ? 'Creating Account...' : 'Create Doctor Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
