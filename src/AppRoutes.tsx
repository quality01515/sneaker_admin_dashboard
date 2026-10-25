import { Route, Routes, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import ProtectedRoute from './ProtectedRoute';
import Layout from './layouts';
import SuperAdmin from './pages/SuperAdmin';
import Users from './pages/Users';
import RefferalFees from './pages/RefferalFees';
import SilentFees from './pages/SilentFees';
import User from './pages/User';
import Transaction from './pages/Transaction';
import Transactions from './pages/Transactions';
import Banks from './pages/Banks';
import Analyze from './pages/Analyze';
import Refund from './pages/Refund';
import Teams from './pages/Teams';
import TurnkeyWallets from './pages/TurnkeyWallets';
import Utils from './pages/Utils';
import UserPoints from './pages/UserPoints';
import Events from './pages/Events';
import MissedDeposits from './pages/MissedDeposits';
import Monitor from './pages/Monitor';
import Reconciliation from './pages/Reconciliation';

const AppRoutes = () => {

  return (
    <Routes>
		<Route path="login" element={<Login />} />
		<Route element={<ProtectedRoute />}>
			<Route path="" element={<Layout />}>
				<Route index element={<Navigate to="/analyze" replace />} />
				<Route path="admins" element={<SuperAdmin />} />
				<Route path="teams" element={<Teams />} />
				<Route path="wallets" element={<TurnkeyWallets />} />
				<Route path="users" element={<Users />} />
				<Route path="user_points" element={<UserPoints />} />
				<Route path="events" element={<Events />} />
					<Route path="missed_deposits" element={<MissedDeposits />} />
				<Route path="monitor" element={<Monitor />} />
				<Route path="reconciliation" element={<Reconciliation />} />
				<Route path="overview" element={<Navigate to="/analyze" replace />} />
				<Route path="refferal_fees" element={<RefferalFees />} />
				<Route path="silent_fees" element={<SilentFees />} />
				<Route path="user" element={<User />} />
				<Route path="transaction" element={<Transaction />} />
				<Route path="transactions" element={<Transactions />} />
				<Route path="banks" element={<Banks />} />
				<Route path="analyze" element={<Analyze />} />
				<Route path="screening" element={<Refund />} />
				<Route path="refund" element={<Navigate to="/screening" replace />} />
				<Route path="utils" element={<Utils />} />
			</Route>
		</Route>
    </Routes>
  );
};

export default AppRoutes;
