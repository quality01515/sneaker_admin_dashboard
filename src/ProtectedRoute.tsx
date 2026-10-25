import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from 'src/store';
import { ADMIN_FLAG } from './config';

/**
 * User is authenticated when:
 * - is_admin is true (from Redux, set after successful login), OR
 * - ADMIN_FLAG is "0" (admin) or "1" (super_admin) in localStorage (persisted after page refresh)
 */
const ProtectedRoute = () => {
  const { is_admin } = useSelector((state: RootState) => state.admin);
  const location = useLocation();

  const adminFlag = localStorage.getItem(ADMIN_FLAG);
  const isAuthenticated = is_admin || adminFlag === '0' || adminFlag === '1';

  if (!isAuthenticated) {
    const redirectUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect_url=${redirectUrl}`} replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
