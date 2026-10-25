import { Grid, Container, Button, Box, Typography } from '@mui/material';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Last10_Table from './last10_table';
import Claimable_Table from './claimable_table';
import Top10_Table from './top10_table';
import { useEffect, useState } from 'react';
import axios from 'axios';
import LoadingOverlay from 'react-loading-overlay-ts';
import { toast } from 'react-toastify';
import { getSignature, SignatureExpiredError, handleSessionExpired } from 'src/utils';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import RefferalUser from "./types";
import { ADMIN_ADDRESS } from 'src/config';
import { FormattedNumber } from 'src/components/FormattedNumber'; 
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import AppBar from '@mui/material/AppBar';
import { useTheme } from '@mui/material/styles';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;

export interface RefferalFee {
  total: string;
  claimed: string;
  pending: string;
  unclaimed: string;
  snapshot_at: string;
  next_payout_at: string;
  claimable_users: {};
  last_10_claims: [];
  top_10_users: RefferalUser[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  dir?: string;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <div>{children}</div>
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `full-width-tab-${index}`,
    'aria-controls': `full-width-tabpanel-${index}`,
  };
}

const SilentFees = () => {
  	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();
	const [refferalFee, setRefferalFees] = useState<RefferalFee>({
		total: "",
		claimed: "",
		pending: "",
		unclaimed: "",
		snapshot_at: "",
		next_payout_at: "",
		claimable_users: {},
		last_10_claims: [],
		top_10_users: [],
	});
	const { signMessage, publicKey } = useWallet();
	const [value, setValue] = useState(0);
	const theme = useTheme();

	const handleChange = (event: React.SyntheticEvent, newValue: number) => {
		setValue(newValue);
	};
	
	const fetchRefferalFees = async () => {
		setLoading(true);
		try {
			const {super_admin_signature, timestamp} = await getSignature(signMessage, 'read');

			const response = await axios.post(
			`${process.env.REACT_APP_API_BASE_URL}/admin/silent_rewards/stats`,
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

			console.log('Referral Fees:', response.data);
			
			setRefferalFees(response.data);
			setLoading(false);
		} catch (err: any) {
			console.error('Error listing refferalFee', err);
			setLoading(false);
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
		fetchRefferalFees();
	}, [signMessage]);

	return (
		<main>
			<Container maxWidth="xl">
				<LoadingOverlay
					active={loading}
					spinner
					styles={{
					wrapper: (base) => ({
						...base,
						width: '100%'
					})
					}}
				>
					<Box sx={{ pt: 1 }}>
						{/* Page header row */}
						<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
							<Box>
								<Typography sx={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.88)', mb: 0.25 }}>Silent Rewards</Typography>
								<Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>Silent reward distribution overview</Typography>
							</Box>
						</Box>

						{/* Stat tiles */}
						<Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1.5, mb: 2 }}>
							{[
								{ label: 'Total', value: <FormattedNumber value={Number(refferalFee.total) / Math.pow(10, 9)} /> },
								{ label: 'Claimed', value: <FormattedNumber value={Number(refferalFee.claimed) / Math.pow(10, 9)} /> },
								{ label: 'Pending', value: <FormattedNumber value={Number(refferalFee.pending) / Math.pow(10, 9)} /> },
								{ label: 'Unclaimed', value: <FormattedNumber value={Number(refferalFee.unclaimed) / Math.pow(10, 9)} /> },
								{ label: 'Snapshot At', value: refferalFee.snapshot_at || '—' },
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
						</Box>

						{/* Tabs panel */}
						<Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
							<AppBar position="static" sx={{ bgcolor: 'rgba(255,255,255,0.03)', boxShadow: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
								<Tabs
									value={value}
									onChange={handleChange}
									indicatorColor="primary"
									textColor="inherit"
									variant="fullWidth"
									aria-label="silent rewards tabs"
								>
									<Tab label="Claimable" {...a11yProps(0)} />
									<Tab label="Last 10 Claims" {...a11yProps(1)} />
									<Tab label="Top 10 Users" {...a11yProps(2)} />
								</Tabs>
							</AppBar>
							<TabPanel value={value} index={0} dir={theme.direction}>
								<Claimable_Table payouts={refferalFee.claimable_users} />
							</TabPanel>
							<TabPanel value={value} index={1} dir={theme.direction}>
								<Last10_Table users={refferalFee.last_10_claims} />
							</TabPanel>
							<TabPanel value={value} index={2} dir={theme.direction}>
								<Top10_Table users={refferalFee.top_10_users} />
							</TabPanel>
						</Box>
					</Box>
				</LoadingOverlay>
			</Container>
		</main>
	);
};

export default SilentFees;
