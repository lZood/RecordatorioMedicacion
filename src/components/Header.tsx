// src/components/Header.tsx
import React from 'react';
import { Bell, Search, User as UserIcon } from 'lucide-react'; // Renombrado User a UserIcon
import { useAppContext } from '../contexts/AppContext'; // Importa el contexto

const Header: React.FC = () => {
  const { currentUser } = useAppContext(); // Obtén el usuario actual del contexto

  // Extrae el nombre y la especialidad de user_metadata
  // El trigger que creamos inserta 'name' y 'specialty' en la tabla profiles
  // usando raw_user_meta_data, que se pobla con options.data en signUp.
  // El objeto User de Supabase en el cliente debería tener estos datos en user_metadata.
  const userName = currentUser?.user_metadata?.name || "Doctor";
  const userSpecialty = currentUser?.user_metadata?.specialty || "Specialist";
  const userInitials = userName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || <UserIcon size={16} />;


  return (
    <header className="bg-white border-b border-gray-200 py-3 px-4 md:px-6 flex items-center justify-between">
      {/* Contenedor del input de búsqueda - ajustado para mejor responsividad */}
      <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
        />
      </div>
      
      <div className="flex items-center space-x-3 md:space-x-4">
        <button className="relative p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
          <Bell size={20} />
          {/* Ejemplo de contador de notificaciones */}
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center border-2 border-white">
            3 
          </span>
        </button>
        
        <div className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-gray-100 rounded-lg transition-colors">
          {/* Avatar del Usuario */}
          <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {/* Aquí podrías poner una imagen si la tuvieras, o iniciales */}
            {userInitials}
          </div>
          {/* Información del Usuario (visible en pantallas más grandes) */}
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-gray-800 truncate max-w-[150px]">
              {userName}
            </p>
            <p className="text-xs text-gray-500 truncate max-w-[150px]">
              {userSpecialty}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
