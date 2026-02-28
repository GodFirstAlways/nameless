import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    // Use the modern React admin dashboards.
    navigate('/dashboard/admin/store', { replace: true });
  }, [navigate]);

  return null;
}
