import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, Users, Settings, User as UserIcon, Menu, X, Moon, Sun } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';

const API_URL = import.meta.env.VITE_API_URL || '';

interface Organization {
  id: number;
  name: string;
  logo?: string;
  timezone: string;
  setup_completed: number;
}

interface LayoutProps {
  organization?: Organization | null;
}

export default function Layout({ organization }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, toggleDarkMode } = useDarkMode();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const organizationName = organization?.name || 'kadr-Verein';
  const organizationLogo = organization?.logo;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to={user?.role === 'admin' ? '/admin' : '/'} className="flex items-center space-x-2">
                {organizationLogo ? (
                  <img
                    src={`${API_URL}${organizationLogo}`}
                    alt={organizationName}
                    className="w-8 h-8 object-contain"
                  />
                ) : (
                  <Users className="w-8 h-8 text-primary-600" />
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">kadr</span>
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">für {organizationName}</span>
                </div>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-1">
                {user?.role !== 'admin' && (
                  <Link
                    to="/teams"
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    <span>Meine Teams</span>
                  </Link>
                )}
              </div>
              <div className="hidden md:flex items-center space-x-3">
                <button
                  onClick={toggleDarkMode}
                  className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={isDark ? 'Light mode' : 'Dark mode'}
                >
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                {user?.profile_picture ? (
                  <img
                    src={`${API_URL}${user.profile_picture}`}
                    alt="Profilbild"
                    className="w-8 h-8 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Hallo, <span className="font-medium">{user?.name}</span>
                  {user?.role === 'admin' && <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full">Admin</span>}
                </span>
              </div>
              <div className="md:hidden flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                {user?.profile_picture ? (
                  <img
                    src={`${API_URL}${user.profile_picture}`}
                    alt="Profilbild"
                    className="w-7 h-7 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
                <span className="font-medium">{user?.name}</span>
              </div>
              <Link
                to="/settings"
                className="hidden md:flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Einstellungen</span>
              </Link>
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Menue"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-3 space-y-2 bg-white dark:bg-gray-800">
              {user?.role !== 'admin' && (
                <Link
                  to="/teams"
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Users className="w-4 h-4" />
                  <span>Meine Teams</span>
                </Link>
              )}
              <button
                onClick={() => {
                  toggleDarkMode();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg w-full"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              <Link
                to="/settings"
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="w-4 h-4" />
                <span>Einstellungen</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
