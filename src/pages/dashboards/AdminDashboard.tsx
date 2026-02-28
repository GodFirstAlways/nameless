import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, getDashboardPath } from '../../lib/auth';

export function AdminDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      navigate('/login', { replace: true });
      return;
    }
    const role = String(auth.role).toLowerCase();
    if (role !== 'owner' && role !== 'co_owner') {
      navigate(getDashboardPath(role), { replace: true });
      return;
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <p className="text-gray-400 mb-10">
          Choose what you want to manage.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/dashboard/admin/store"
            className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all p-6"
          >
            <div className="text-lg font-semibold text-white mb-1">Store Management</div>
            <div className="text-sm text-gray-400">
              Upload product media, set pricing, and control public store content.
            </div>
            <div className="mt-4 text-cyan-400 text-sm font-semibold group-hover:text-cyan-300">
              Open Store →
            </div>
          </Link>

          <Link
            to="/admin/users"
            className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all p-6"
          >
            <div className="text-lg font-semibold text-white mb-1">User Management</div>
            <div className="text-sm text-gray-400">
              View users, roles, reseller trees, and balances.
            </div>
            <div className="mt-4 text-cyan-400 text-sm font-semibold group-hover:text-cyan-300">
              Open Users →
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
