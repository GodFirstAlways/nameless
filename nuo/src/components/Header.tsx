import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, UserCircle2, X } from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { clearAuth, getDashboardPath } from '../lib/auth';

export function Header() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-profile-menu]')) setIsProfileOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const onLogout = () => {
    clearAuth();
    setIsProfileOpen(false);
    navigate('/', { replace: true });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'backdrop-blur-md bg-black/30 border-b border-white/10'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              ∅
            </div>
            <span className="text-xs text-gray-400 uppercase tracking-wider">nameless</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
            >
              Home
            </Link>
            <Link
              to="/products"
              className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
            >
              Products
            </Link>
            <Link
              to="/reseller"
              className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
            >
              Reseller
            </Link>
            <Link
              to="/faq"
              className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
            >
              FAQ
            </Link>
            <Link
              to="/contact"
              className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
            >
              Contact
            </Link>

            {!auth ? (
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-sm font-medium transition-all"
              >
                Login
              </Link>
            ) : (
              <div className="relative" data-profile-menu>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {String(auth.username || 'U').slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                  <UserCircle2 className="w-5 h-5 text-gray-300" />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-black/80 backdrop-blur-xl shadow-xl overflow-hidden">
                    <Link
                      to={getDashboardPath(String(auth.role).toLowerCase())}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-gray-200 hover:bg-white/10"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-300 hover:bg-red-500/10"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>

          <button
            className="md:hidden text-gray-300"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <nav className="md:hidden pb-4 flex flex-col gap-2 border-t border-white/10 pt-4">
            <Link to="/" className="text-gray-300 hover:text-white px-2 py-2">
              Home
            </Link>
            <Link to="/products" className="text-gray-300 hover:text-white px-2 py-2">
              Products
            </Link>
            <Link to="/reseller" className="text-gray-300 hover:text-white px-2 py-2">
              Reseller
            </Link>
            <Link to="/faq" className="text-gray-300 hover:text-white px-2 py-2">
              FAQ
            </Link>
            <Link to="/contact" className="text-gray-300 hover:text-white px-2 py-2">
              Contact
            </Link>

            {!auth ? (
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium inline-block"
              >
                Login
              </Link>
            ) : (
              <div className="flex flex-col gap-2 px-2">
                <Link
                  to={getDashboardPath(String(auth.role).toLowerCase())}
                  className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm font-medium text-left"
                >
                  Logout
                </button>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
