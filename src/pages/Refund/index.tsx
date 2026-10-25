import { Container, Box, Typography } from '@mui/material';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import SecurityIcon from '@mui/icons-material/Security';
import Refund_List from './refund_list';
import { ScreeningPanel } from 'src/components/EllipticScreening/ScreeningPanel';
import { useEffect, useState } from 'react';
import axios from 'axios';
import LoadingOverlay from 'react-loading-overlay-ts';
import { toast } from 'react-toastify';
import { useWallet } from '@solana/wallet-adapter-react';
import { RefundOverview } from "./types";
import { ADMIN_ADDRESS } from 'src/config';
import { getSignature, SignatureExpiredError, handleSessionExpired } from 'src/utils';
import { useNavigate } from 'react-router-dom';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;

const Refund = () => {
  	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();
	const [refundOverview, setRefundOverview] = useState<RefundOverview>({
		total: 0,
		refunded: 0,
		blocked: 0,
		in_progress: 0,
	});
	const { signMessage, publicKey } = useWallet();
	
	const fetchRefundOverview = async () => {
		setLoading(true);
		try {
			const {super_admin_signature, timestamp} = await getSignature(signMessage || undefined, 'read');

			const response = await axios.post(
			`${process.env.REACT_APP_API_BASE_URL}/super_admin/blocked_deposits/overview`,
			{
				super_admin_address: localStorage.getItem(ADMIN_ADDRESS),
				timestamp: timestamp,
				super_admin_signature: super_admin_signature,
			},
			{
				headers: {
				'Content-Type': 'application/json',
				'accept': 'application/json',
				'x-api-key': ADMIN_DASHBOARD_API_KEY,
				},
			}
			);

			console.log('Refund Overview:', response.data);
			
			setRefundOverview(response.data);
			setLoading(false);
		} catch (err: any) {
			console.error('Error listing refundOverview', err);
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
		fetchRefundOverview();
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
						{/* Page header */}
						<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
								<SecurityIcon sx={{ fontSize: 20, color: '#2DD4D1' }} />
								<Box>
									<Typography sx={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.88)', mb: 0.1 }}>Vanish Integrity Screening</Typography>
									<Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Risk screening · Blocked deposits · Return management</Typography>
								</Box>
							</Box>
						</Box>

						{/* Stat tiles */}
						<Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1.5, mb: 2.5 }}>
							{[
								{ label: 'Total', value: refundOverview.total },
								{ label: 'Refunded', value: refundOverview.refunded },
								{ label: 'In Progress', value: refundOverview.in_progress },
								{ label: 'Blocked', value: refundOverview.blocked },
							].map(({ label, value: val }) => (
								<Box key={label} sx={{ px: 2.5, py: 2, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
									<Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', mb: 0.75 }}>
										{label}
									</Typography>
									<Typography sx={{ fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.88)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
										{val}
									</Typography>
								</Box>
							))}
						</Box>

						{/* Integrity Screening panel */}
						<Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', p: 3, mb: 2.5 }}>
							<ScreeningPanel />
						</Box>

						{/* Blocked deposits list */}
						<Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
							<Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
								<Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Blocked Deposits</Typography>
							</Box>
							<Refund_List fetchRefundOverview={fetchRefundOverview} />
						</Box>
					</Box>
				</LoadingOverlay>
			</Container>
		</main>
	);
};

export default Refund;
