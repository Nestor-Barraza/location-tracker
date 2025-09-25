'use client';

import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/LoginForm';
import Navbar from '../components/Navbar';
import UserDashboard from '../components/UserDashboard';
import AdminDashboardSSE from '../components/AdminDashboardSSE';

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              {user?.role === 'admin' ? 'Panel de Administración' : 'Mi Ubicación'}
            </h1>
            <p className="text-sm text-gray-600">
              {user?.role === 'admin' 
                ? 'Monitorea todas las ubicaciones en tiempo real' 
                : 'Comparte tu ubicación y ve tu historial'}
            </p>
          </div>
          {user?.role === 'admin' ? <AdminDashboardSSE /> : <UserDashboard />}
        </div>
      </main>
    </div>
  );
}