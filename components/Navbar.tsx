'use client';

import { useAuth } from '../context/AuthContext';
import { FiLogOut, FiUser, FiMapPin } from 'react-icons/fi';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-black/20 backdrop-blur-lg text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <FiMapPin className="h-8 w-8 text-purple-400" />
            <h1 className="text-xl font-bold tracking-wider">
              Location Tracker
            </h1>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 bg-black/30 px-3 py-2 rounded-full">
              <FiUser className={`h-5 w-5 ${user?.role === 'admin' ? 'text-purple-400' : 'text-green-400'}`} />
              <span className="text-sm font-medium">
                {user?.username}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${user?.role === 'admin' ? 'bg-purple-500/50 text-purple-100' : 'bg-green-500/50 text-green-100'}`}>
                {user?.role === 'admin' ? 'Admin' : 'User'}
              </span>
            </div>
            
            <button
              onClick={logout}
              className="flex items-center space-x-2 text-sm font-medium text-white/80 hover:text-white transition-colors duration-200"
            >
              <FiLogOut className="h-5 w-5" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
