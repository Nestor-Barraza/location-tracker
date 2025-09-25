'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiUsers, FiMap, FiList } from 'react-icons/fi';

export default function AdminDashboardSimple() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-white">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-black/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FiUsers className="mr-3 text-purple-400"/>
              Panel de Admin Funcionando
            </h2>
            
            <div className="space-y-3">
              <div className="p-3 bg-black/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">¡Bienvenido {user?.username}!</h3>
                  <div className="w-2.5 h-2.5 bg-green-400 rounded-full"></div>
                </div>
                <p className="text-sm text-white/70">
                  Login exitoso como administrador
                </p>
                <p className="text-xs text-white/50">
                  El socket se habilitará próximamente
                </p>
              </div>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FiList className="mr-3 text-purple-400"/>
              Estado del Sistema
            </h3>
            <div className="space-y-3 text-sm">
              <p><strong>Login:</strong> <span className="text-green-400">Funcionando ✓</span></p>
              <p><strong>Admin Dashboard:</strong> <span className="text-green-400">Funcionando ✓</span></p>
              <p><strong>Socket.IO:</strong> <span className="text-yellow-400">En pruebas</span></p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-black/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 p-6 min-h-[400px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold flex items-center">
                <FiMap className="mr-3 text-purple-400"/>
                Mapa de Ubicaciones
              </h3>
            </div>
            <div className="h-full min-h-[300px] rounded-lg overflow-hidden bg-black/10 flex items-center justify-center">
              <div className="text-center">
                <FiMap className="mx-auto text-6xl text-white/30 mb-4" />
                <p className="text-white/60 text-lg">Mapa se cargará cuando el socket esté activo</p>
                <p className="text-white/40 text-sm mt-2">Sistema base funcionando correctamente</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}