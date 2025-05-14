import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Pill, 
  Calendar, 
  Activity, 
  FileText, 
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/patients', icon: <Users size={20} />, label: 'Patients' },
    { to: '/medications', icon: <Pill size={20} />, label: 'Medications' },
    { to: '/appointments', icon: <Calendar size={20} />, label: 'Appointments' },
    { to: '/vitals', icon: <Activity size={20} />, label: 'Vital Signs' },
    { to: '/reports', icon: <FileText size={20} />, label: 'Reports' },
  ];

  return (
    <div 
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } bg-indigo-900 text-white flex flex-col h-full transition-all duration-300 ease-in-out`}
    >
      <div className="flex items-center justify-between p-4 border-b border-indigo-800">
        {!collapsed && (
          <h1 className="text-xl font-bold">MediRemind</h1>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-full hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      
      <nav className="flex-1 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `
                  flex items-center px-4 py-3 text-sm
                  ${isActive ? 'bg-indigo-800 text-white' : 'text-indigo-100 hover:bg-indigo-800'}
                  ${collapsed ? 'justify-center' : ''}
                  transition-colors duration-200
                `}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="ml-3">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-indigo-800">
        <button className={`flex items-center text-sm text-indigo-100 hover:text-white ${collapsed ? 'justify-center' : ''}`}>
          <LogOut size={20} />
          {!collapsed && <span className="ml-3">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;