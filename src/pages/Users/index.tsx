import { Grid, Container, Button, Box, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';
import { getSignedMessageByWallet } from 'src/utils';
import { ADMIN_ADDRESS, ADMIN_FLAG } from 'src/config';
import { toast } from 'react-toastify';
import { Overview, PortfolioHolders } from './types';
import { getSignature, SignatureExpiredError, handleSessionExpired } from 'src/utils';
import { useNavigate } from 'react-router-dom';
import LoadingOverlay from 'react-loading-overlay-ts';
import Users_Table from './manage_users';
import { useSelector } from 'react-redux';
import { RootState } from 'src/store/index';
import { formatDistanceToNow, parseISO } from 'date-fns';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;

const Users = () => {
	const navigate = useNavigate();
	const { signMessage, publicKey } = useWallet();
	const { is_super_admin } = useSelector((state: RootState) => state.admin);
	const [loading, setLoading] = useState(true);
	const [ overview, setOverview ] = useState<Overview>({
		total_users: 0,
		new_users_24h: 0,
		new_users_7d: 0,
		new_users_30d: 0,
		active_users_24h: 0,
		active_users_7d: 0,
		active_users_30d: 0,
		falloff_users_7d: 0,
		falloff_users_30d: 0,
	});
	const [portfolioHolders, setPortfolioHolders] = useState<PortfolioHolders | null>(null);
	const [minUsd, setMinUsd] = useState('10');
	const [overviewDone, setOverviewDone] = useState(false);
	const [, setNow] = useState(Date.now());
	const portfolioRequestId = useRef(0);
	const portfolioPollTimer = useRef<ReturnType<typeof setTimeout>>();
	const minUsdValue = Number(minUsd);
	const minUsdValid = minUsd.trim() !== '' && Number.isFinite(minUsdValue) && minUsdValue >= 0;
	
	const fetchUsersOverview = async () => {
		setLoading(true);
		try {
			const {super_admin_signature, timestamp} = await getSignature(signMessage || undefined, 'read');

			const response = await axios.post(
			`${process.env.REACT_APP_API_BASE_URL}/admin/users/overview`,
			{
				admin_address: localStorage.getItem(ADMIN_ADDRESS),
				timestamp: timestamp,
				admin_signature: super_admin_signature,
			},
			{
				headers: {
				'Content-Type': 'application/json',
				'accept': 'application/json',
				'x-api-key': ADMIN_DASHBOARD_API_KEY,
				},
			}
			);

			console.log('Users_Overview:', response.data);
			
			setOverview(response.data);
			setLoading(false);
			return true;
		} catch (err: any) {
			console.error('Error Users Overview', err);
			setLoading(false);
			if (err instanceof SignatureExpiredError) {
				handleSessionExpired(navigate);
				return false;
			}
			toast.error(err.message, {

			autoClose: 1500
			});
			return true;
		}
	};

	const fetchPortfolioHolders = async (min_usd: number, requestId: number) => {
		try {
			const {super_admin_signature, timestamp} = await getSignature(signMessage || undefined, 'read');

			const response = await axios.post<PortfolioHolders>(
			`${process.env.REACT_APP_API_BASE_URL}/admin/users/portfolio_holders`,
			{
				admin_address: localStorage.getItem(ADMIN_ADDRESS),
				timestamp: timestamp,
				admin_signature: super_admin_signature,
				min_usd,
			},
			{
				headers: {
				'Content-Type': 'application/json',
				'accept': 'application/json',
				'x-api-key': ADMIN_DASHBOARD_API_KEY,
				},
			}
			);

			// Ignore responses for a threshold that is no longer current
			if (requestId !== portfolioRequestId.current) return;
			setPortfolioHolders(response.data);
			if (!response.data.ready) {
				// Backend is still computing; poll until ready
				portfolioPollTimer.current = setTimeout(() => fetchPortfolioHolders(min_usd, requestId), 3000);
			}
		} catch (err: any) {
			console.error('Error Portfolio Holders', err);
			if (requestId !== portfolioRequestId.current) return;
			if (err instanceof SignatureExpiredError) {
				handleSessionExpired(navigate);
				return;
			}
			toast.error(err.message, {
			autoClose: 1500
			});
		}
	};
	
	useEffect(() => {
		// Portfolio holders waits for the overview so a fresh 'read' signature is prompted once and reused from the cookie
		setOverviewDone(false);
		(async () => {
			if (await fetchUsersOverview()) {
				setOverviewDone(true);
			}
		})();
	}, [signMessage]);

	useEffect(() => {
		if (!overviewDone) return;
		setPortfolioHolders(null);
		if (!minUsdValid) return;
		const requestId = ++portfolioRequestId.current;
		const timer = setTimeout(() => fetchPortfolioHolders(minUsdValue, requestId), 300);
		return () => {
			// Invalidate in-flight requests and stop any polling for the old threshold
			portfolioRequestId.current++;
			clearTimeout(timer);
			clearTimeout(portfolioPollTimer.current);
		};
	}, [minUsd, overviewDone]);

	// Re-render periodically so the "as of" relative time stays current
	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), 30000);
		return () => clearInterval(interval);
	}, []);

  return (
    <main>
      <Container maxWidth="xl">
        <LoadingOverlay
          active={loading}
          spinner
          styles={{
            wrapper: (base) => ({ ...base, width: '100%' }),
          }}
        >
          <Box sx={{ pt: 1 }}>
            {/* Page header row */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.88)', mb: 0.25 }}>Users</Typography>
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>User activity and growth overview</Typography>
              </Box>
              {(is_super_admin || localStorage.getItem(ADMIN_FLAG) == "1") && (
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ fontSize: 13, fontWeight: 'bold' }}
                  onClick={() => navigate('/user_points')}
                >
                  User Points
                </Button>
              )}
            </Box>

            {/* Stat tiles */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 1.5, mb: 2 }}>
              {[
                { label: 'Total Users', value: overview.total_users },
                { label: 'New (24h)', value: overview.new_users_24h },
                { label: 'New (7d)', value: overview.new_users_7d },
                { label: 'New (30d)', value: overview.new_users_30d },
                { label: 'Active (24h)', value: overview.active_users_24h },
                { label: 'Active (7d)', value: overview.active_users_7d },
                { label: 'Active (30d)', value: overview.active_users_30d },
                { label: 'Falloff (7d)', value: overview.falloff_users_7d },
                { label: 'Falloff (30d)', value: overview.falloff_users_30d },
              ].map(({ label, value: val }) => (
                <Box key={label} sx={{ px: 2, py: 1.5, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', mb: 0.5 }}>
                    {label}
                  </Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.88)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                    {val}
                  </Typography>
                </Box>
              ))}
              <Box sx={{ gridColumn: 'span 2', px: 2, py: 1.5, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                <Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', mb: 0.5 }}>
                    Users with portfolio &gt; ${minUsdValid ? minUsdValue : 'X'}
                  </Typography>
                  {portfolioHolders && !portfolioHolders.ready ? (
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', lineHeight: 1.2 }}>
                      Calculating…
                    </Typography>
                  ) : (
                    <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.88)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                      {portfolioHolders?.total_users ?? '—'}
                    </Typography>
                  )}
                  {portfolioHolders?.ready && portfolioHolders.computed_at && (
                    <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', mt: 0.25 }}>
                      as of {formatDistanceToNow(parseISO(portfolioHolders.computed_at), { addSuffix: true })}
                    </Typography>
                  )}
                </Box>
                <TextField
                  type="number"
                  size="small"
                  label="Min USD"
                  value={minUsd}
                  onChange={(e) => setMinUsd(e.target.value)}
                  error={!minUsdValid}
                  inputProps={{ min: 0 }}
                  sx={{ width: 100 }}
                />
              </Box>
            </Box>

            {/* Users table */}
            <Users_Table />
          </Box>
        </LoadingOverlay>
      </Container>
    </main>
  );
};

export default Users;
