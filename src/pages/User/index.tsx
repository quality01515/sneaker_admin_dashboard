import { Container, Button, Box, Typography, IconButton, Tooltip } from '@mui/material';
import { useEffect } from 'react';
import Divider from '@mui/material/Divider';
import Balances from './balances';
import { ScreeningDrawer } from 'src/components/EllipticScreening/ScreeningDrawer';
import Tx_History from './tx_history';
import Balance_Changes from './balance_changes';
import UpgradeIcon from '@mui/icons-material/Upgrade';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';
import { getSignedMessageByWallet } from 'src/utils';
import { ADMIN_ADDRESS } from 'src/config';
import { toast } from 'react-toastify';
import { useLocation } from 'react-router-dom';
import { Overview } from './types';
import { getSignature, SignatureExpiredError, handleSessionExpired } from 'src/utils';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LoadingOverlay from 'react-loading-overlay-ts';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import AppBar from '@mui/material/AppBar';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;

interface PendingAction {
	tx_id: string;
	action_type: string;
	status: string;
	created_at: string;
	frozen_balance_changes?: unknown[];
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
		<Box sx={{ p: 0 }}>
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

const User = () => {
	const [loading, setLoading] = useState(true);
	const [referral, setReferral] = useState({ kol_multiplier: 0, referral_base_cut: 0, referrer_address: '' });
	const { signMessage, publicKey, connected } = useWallet();
	const [open, setOpen] = useState(false);
	const [isRefferalUpdated, setIsRefferalUpdated] = useState(false);
	const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
	const [hasFetchedPendingActions, setHasFetchedPendingActions] = useState(false);
	const [committingTxId, setCommittingTxId] = useState<string | null>(null);
  	const location = useLocation();
	const navigate = useNavigate();
	const [ overview, setOverview ] = useState<Overview>({
		user_address: "",
		joined_at: "",
		base_referral_cut: 0,
		point_multiplier: 0,
		referred_by: "",
		silent_rewards_claimed: 0,
		silent_rewards_unclaimed: 0,
		total_points: 0,
		points_from_ref: 0,
		current_fee_received: 0,
		referral_fee_received: 0,
		referral_fee_next_payout: 0,
		direct_referral_volume: 0,
		indirect_referral_volume: 0,
		direct_referral_count: 0,
		indirect_referral_count: 0,
		balances: [],
		volume_1d: "",
		volume_7d: "",
		volume_total: "",
	});

	const [value, setValue] = useState(0);
  	const theme = useTheme();

	const handleChange = (event: React.SyntheticEvent, newValue: number) => {
		setValue(newValue);
	};

	const getQueryParam = (name) => {
		const urlParams = new URLSearchParams(location.search);
		return urlParams.get(name);
	};

  	const user_address = getQueryParam('user_address');

	const fetchUserOverview = async () => {
		setLoading(true);
		if (!user_address) {
			setLoading(false);
			return;
		}

		try {
			const {super_admin_signature, timestamp} = await getSignature(signMessage || undefined, 'read');

			const response = await axios.post(
			`${process.env.REACT_APP_API_BASE_URL}/admin/user/overview`,
			{
				admin_address: localStorage.getItem(ADMIN_ADDRESS),
				timestamp: timestamp,
				admin_signature: super_admin_signature,
				user_address
			},
			{
				headers: {
				'Content-Type': 'application/json',
				'accept': 'application/json',
				'x-api-key': ADMIN_DASHBOARD_API_KEY,
				},
			}
			);

			console.log('User_Overview:', response.data);

			setOverview(response.data);
			setLoading(false);
		} catch (err: any) {
			console.error('Error User Overview', err);
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

	const fetchPendingActions = async () => {
		if (!user_address) {
			toast.error('User address is missing.', {
				autoClose: 1500
			});
			return;
		}

		setLoading(true);
		try {
			const { super_admin_signature, timestamp } = await getSignature(signMessage || undefined, 'read');

			const response = await axios.post(
				`${process.env.REACT_APP_API_BASE_URL}/admin/utils/pending_actions`,
				{
					admin_address: localStorage.getItem(ADMIN_ADDRESS),
					timestamp,
					admin_signature: super_admin_signature,
					user_address
				},
				{
					headers: {
						'Content-Type': 'application/json',
						'accept': 'application/json',
						'x-api-key': ADMIN_DASHBOARD_API_KEY,
					},
				}
			);

			setPendingActions(Array.isArray(response.data) ? response.data : []);
			setHasFetchedPendingActions(true);
			toast.success('Pending actions retrieved', {
				autoClose: 1500
			});
		} catch (err: any) {
			console.error('Error fetching pending actions', err);
			setPendingActions([]);
			setHasFetchedPendingActions(true);
			if (err instanceof SignatureExpiredError) {
				handleSessionExpired(navigate);
				return;
			}
			toast.error(err?.response?.data?.message || err.message || 'Failed to fetch pending actions', {
				autoClose: 2000
			});
		} finally {
			setLoading(false);
		}
	};

	const commitPendingAction = async (txId: string) => {
		setCommittingTxId(txId);
		try {
			await axios.post(
				`${process.env.REACT_APP_API_BASE_URL}/commit`,
				{ tx_id: txId },
				{
					headers: {
						'Content-Type': 'application/json',
						'accept': 'application/json',
						'x-api-key': ADMIN_DASHBOARD_API_KEY,
					},
				}
			);

			toast.success('Commit successful', {
				autoClose: 1500
			});
			await fetchPendingActions();
		} catch (err: any) {
			console.error('Error committing pending action', err);
			toast.error(err?.response?.data?.message || err.message || 'Commit failed', {
				autoClose: 2000
			});
		} finally {
			setCommittingTxId(null);
		}
	};

	useEffect(() => {
		fetchUserOverview();
	}, [signMessage, user_address]);

	if (!user_address) {
		return (
			<main>
				<Container maxWidth="xl">
					<Box sx={{ pt: 3 }}>
						<Box
							sx={{
								border: "1px solid rgba(255,255,255,0.08)",
								borderRadius: 2,
								bgcolor: "rgba(255,255,255,0.02)",
								px: 3,
								py: 3,
								maxWidth: 560,
							}}
						>
							<Typography sx={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.88)", mb: 1 }}>
								User address is required
							</Typography>
							<Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.55)", mb: 2 }}>
								Open a user from the Users table or include a user_address query parameter.
							</Typography>
							<Button variant="contained" size="small" onClick={() => navigate("/users")} sx={{ textTransform: "none" }}>
								Back to Users
							</Button>
						</Box>
					</Box>
				</Container>
			</main>
		);
	}

	const submitAddUser = () => {
		if (!connected || !signMessage) {
			toast.error('Please connect your wallet to update referral information.', {

				autoClose: 2000
			});
			return;
		}
		setIsRefferalUpdated(false);
		setOpen(true);
	};

	const submitUpateRefferal = () => {
		if (!connected || !signMessage) {
			toast.error('Please connect your wallet to update referral information.', {

				autoClose: 2000
			});
			return;
		}
		setIsRefferalUpdated(true);
		setOpen(true);
	};

	const closeUpdateModal = () => {
		setOpen(false);
	};

	const handleInputChange = (event) => {
		const { name, value } = event.target;
		setReferral((prevState) => ({
		...prevState,
		[name]: value,
		}));
	};

	const handleUserAddressClick = (user_address: string) => {
		navigate(`/user?user_address=${user_address}`);
	};

	const handleCopy = async (text) => {
		try {
		await navigator.clipboard.writeText(text);
		toast.success('Copied to clipboard', {

			autoClose: 1500
		});
		} catch (err) {
		console.error("Failed to copy:", err);
		}
	};

	const updateRefferal = async () => {
	  setLoading(true);
	  try {
		// Check if wallet is connected and signMessage is available
		if (!connected || !publicKey) {
			toast.error('Please connect your wallet again.', {

				autoClose: 2000
			});
			setLoading(false);
			closeUpdateModal();
			return;
		}

		if (!signMessage) {
			toast.error('Wallet does not support message signing. Please reconnect your wallet.', {

				autoClose: 2000
			});
			setLoading(false);
			closeUpdateModal();
			return;
		}

		const timestamp = new Date().getTime();
		const message = `write:admin/user/referral_info/update:${user_address}:${referral.kol_multiplier}:${referral.referral_base_cut}:${timestamp}`;
		let admin_signature = await getSignedMessageByWallet( signMessage, message);

		const response = await axios.post(
		  `${process.env.REACT_APP_API_BASE_URL}/admin/user/referral_info/update`,
		  {
			admin_address: localStorage.getItem(ADMIN_ADDRESS),
			timestamp: timestamp,
			admin_signature: admin_signature,
			user_address: user_address,
			kol_multiplier: Number(referral.kol_multiplier),
			referral_base_cut: Number(referral.referral_base_cut)
		  },
		  {
			headers: {
			  'Content-Type': 'application/json',
			  'accept': 'application/json',
			  'x-api-key': ADMIN_DASHBOARD_API_KEY,
			},
		  }
		);
		if (response.status == 200 || response.status == 204|| response.status == 201) {
		  toast.success("Updated Successfully !", {

			autoClose: 1500
		  });
		  setReferral({
			kol_multiplier: 0,
			referral_base_cut: 0,
			referrer_address: ''
		  });
		  fetchUserOverview();
		}else{
		  toast.error(response.data.message, {

			autoClose: 1500
		  });
		}
		setLoading(false);
		closeUpdateModal();
	  } catch (err) {
		console.error('Error updating referrer', err);
		setLoading(false);
		closeUpdateModal();
		toast.error(err.message, {

		  autoClose: 1500
		});
	  }
	};

	const updateReferrer = async () => {
		setLoading(true);
		try {
			// Check if wallet is connected and signMessage is available
			if (!connected || !publicKey) {
				toast.error('Please connect your wallet again.', {

					autoClose: 2000
				});
				setLoading(false);
				closeUpdateModal();
				return;
			}

			if (!signMessage) {
				toast.error('Wallet does not support message signing. Please reconnect your wallet.', {

					autoClose: 2000
				});
				setLoading(false);
				closeUpdateModal();
				return;
			}

			const timestamp = new Date().getTime();
			const message = `write:admin/referrer/update:${user_address}:${referral.referrer_address}:${timestamp}`;
			let admin_signature = await getSignedMessageByWallet( signMessage, message);

			const response = await axios.post(
				`${process.env.REACT_APP_API_BASE_URL}/admin/user/referrer/update`,
				{
					admin_address: localStorage.getItem(ADMIN_ADDRESS),
					timestamp: timestamp,
					admin_signature: admin_signature,
					user_address: user_address,
					referrer_address: referral.referrer_address
				},
				{
					headers: {
					'Content-Type': 'application/json',
					'accept': 'application/json',
					'x-api-key': ADMIN_DASHBOARD_API_KEY,
					},
				}
			);

			if (response.status == 200 || response.status == 204|| response.status == 201) {
				toast.success("Updated Successfully !", {

					autoClose: 1500
				});
				setReferral({
					kol_multiplier: 0,
					referral_base_cut: 0,
					referrer_address: ''
				});
				fetchUserOverview();
			}else{
				toast.error(response.data.message, {

					autoClose: 1500
				});
			}
			setLoading(false);
			closeUpdateModal();

		} catch (err) {
			console.error('Error updating referrer', err);
			setLoading(false);
			closeUpdateModal();
			toast.error(err.message, {

				autoClose: 1500
			});
		}
	};

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isRefferalUpdated) {
			updateReferrer();
		} else {
			updateRefferal();
		}
	};

	const StatTile = ({ label, value: val }: { label: string; value: React.ReactNode }) => (
		<Box sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 1.5, px: 2, py: 1.75 }}>
			<Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', mb: 0.75 }}>
				{label}
			</Typography>
			<Typography sx={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.88)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
				{val}
			</Typography>
		</Box>
	);

	const pendingActionCount = pendingActions.length;

	return (
		<main>
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
				{/* Dialog — kept exactly as-is */}
				<Dialog open={open} onClose={closeUpdateModal} fullWidth maxWidth="sm">
				<DialogTitle sx={{ fontSize: 20 }}>{isRefferalUpdated? "Update Referrer" : "Update Refferal Info"}</DialogTitle>
				<Divider sx={{ color: 'white' }} />
				<DialogContent>
					<form onSubmit={handleSubmit} id="subscription-form">
						<TextField
							autoFocus
							required
							margin="dense"
							id={isRefferalUpdated ? "referrer_address" : "kol_multiplier"}
							name={isRefferalUpdated ? "referrer_address" : "kol_multiplier"}
							label={isRefferalUpdated ? "Referrer Address" : "KOL Multiplier"}
							onChange={handleInputChange}
							value={isRefferalUpdated ? referral.referrer_address : referral.kol_multiplier}
							type="text"
							fullWidth
							variant="standard"
						/>
						{!isRefferalUpdated &&
							<TextField
								autoFocus
								required
								margin="dense"
								id="referral_base_cut"
								name="referral_base_cut"
								label="Referral Base Cut"
								onChange={handleInputChange}
								value={referral.referral_base_cut}
								type="text"
								fullWidth
								variant="standard"
							/>
						}
					</form>
				</DialogContent>
				<DialogActions>
					<Button onClick={closeUpdateModal}>Cancel</Button>
					<Button type="submit" form="subscription-form">
						Update
					</Button>
				</DialogActions>
				</Dialog>

				<Container maxWidth="xl">
					<Box sx={{ pt: 1 }}>
						{/* Page header row */}
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
							<Box sx={{ flex: 1 }}>
								<Typography sx={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.88)', mb: 0.25 }}>
									User Detail
								</Typography>
								{user_address && (
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
										<Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
											{user_address}
										</Typography>
										<IconButton size="small" onClick={() => handleCopy(user_address)} sx={{ color: 'rgba(255,255,255,0.25)', p: 0.25, '&:hover': { color: 'rgba(255,255,255,0.6)' } }}>
											<ContentCopyIcon sx={{ fontSize: 12 }} />
										</IconButton>
									</Box>
								)}
							</Box>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
								<Button
									variant="outlined"
									size="small"
									onClick={fetchPendingActions}
									disabled={!user_address || loading}
									sx={{
										fontSize: 12,
										fontWeight: 600,
										textTransform: 'none',
										borderColor: 'rgba(45,212,209,0.35)',
										color: '#2DD4D1',
										whiteSpace: 'nowrap',
										'&:hover': { borderColor: '#2DD4D1', bgcolor: 'rgba(45,212,209,0.06)' }
									}}
								>
									Get Pending Actions
								</Button>
								{user_address && (
									<Tooltip title="View on Solscan" arrow>
										<IconButton size="small" component="a" href={`https://solscan.io/account/${user_address}`} target="_blank" rel="noopener noreferrer" sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, p: 0.75, color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#2DD4D1', borderColor: '#2DD4D1', bgcolor: 'rgba(45,212,209,0.06)' } }}>
											<OpenInNewIcon sx={{ fontSize: 15 }} />
										</IconButton>
									</Tooltip>
								)}
								<Tooltip title="Update Info" arrow>
									<IconButton size="small" onClick={submitAddUser} sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, p: 0.75, color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#2DD4D1', borderColor: '#2DD4D1', bgcolor: 'rgba(45,212,209,0.06)' } }}>
										<UpgradeIcon sx={{ fontSize: 15 }} />
									</IconButton>
								</Tooltip>
								<Tooltip title="Update Referrer" arrow>
									<IconButton size="small" onClick={submitUpateRefferal} sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, p: 0.75, color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#2DD4D1', borderColor: '#2DD4D1', bgcolor: 'rgba(45,212,209,0.06)' } }}>
										<SupervisorAccountIcon sx={{ fontSize: 15 }} />
									</IconButton>
								</Tooltip>
								{user_address && (
									<ScreeningDrawer walletAddress={user_address} label="Screen" syncUrl />
								)}
							</Box>
						</Box>

						{hasFetchedPendingActions && (
							<Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', mb: 2 }}>
								<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 2, pt: 1.5, pb: 1 }}>
									<Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>
										Pending Actions
									</Typography>
									<Typography sx={{ fontSize: 11, color: pendingActionCount > 0 ? '#2DD4D1' : 'rgba(255,255,255,0.38)', fontVariantNumeric: 'tabular-nums' }}>
										{pendingActionCount}
									</Typography>
								</Box>

								{pendingActionCount > 0 ? (
									<Box>
										{pendingActions.map((action, i) => (
											<Box
												key={`${action.tx_id}-${i}`}
												sx={{
													display: 'grid',
													gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.8fr) minmax(110px, 0.8fr) minmax(90px, 0.6fr) minmax(140px, 0.9fr) auto' },
													gap: 1,
													alignItems: 'center',
													py: 1,
													px: 2,
													borderTop: '1px solid rgba(255,255,255,0.05)'
												}}
											>
												<Box sx={{ minWidth: 0 }}>
													<Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', mb: 0.25 }}>Tx ID</Typography>
													<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
														<Typography sx={{ fontSize: 12, color: '#2DD4D1', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
															{action.tx_id}
														</Typography>
														<IconButton size="small" onClick={() => handleCopy(action.tx_id)} sx={{ color: 'rgba(255,255,255,0.25)', p: 0.25, flexShrink: 0, '&:hover': { color: 'rgba(255,255,255,0.7)' } }}>
															<ContentCopyIcon sx={{ fontSize: 11 }} />
														</IconButton>
														<IconButton size="small" component="a" href={`https://solscan.io/tx/${action.tx_id}`} target="_blank" rel="noopener noreferrer" sx={{ color: 'rgba(255,255,255,0.25)', p: 0.25, flexShrink: 0, '&:hover': { color: '#2DD4D1' } }}>
															<OpenInNewIcon sx={{ fontSize: 11 }} />
														</IconButton>
													</Box>
												</Box>
												<Box>
													<Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', mb: 0.25 }}>Action</Typography>
													<Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.78)' }}>{action.action_type || '—'}</Typography>
												</Box>
												<Box>
													<Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', mb: 0.25 }}>Status</Typography>
													<Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.78)' }}>{action.status || 'pending'}</Typography>
												</Box>
												<Box>
													<Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', mb: 0.25 }}>Created</Typography>
													<Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{action.created_at || '—'}</Typography>
												</Box>
												<Button
													variant="contained"
													size="small"
													onClick={() => commitPendingAction(action.tx_id)}
													disabled={!action.tx_id || committingTxId === action.tx_id}
													sx={{ fontSize: 12, textTransform: 'none', whiteSpace: 'nowrap' }}
												>
													{committingTxId === action.tx_id ? 'Committing...' : 'Commit'}
												</Button>
											</Box>
										))}
									</Box>
								) : (
									<Box sx={{ px: 2, py: 1.5, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
										<Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>No pending actions found.</Typography>
									</Box>
								)}
							</Box>
						)}

						{/* Key stat tiles */}
						<Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 1.5, mb: 2 }}>
							{[
								{ label: 'Joined At',      value: overview.joined_at || '—' },
								{ label: 'Vol Total (SOL)', value: (Number(overview.volume_total) / 1e9).toFixed(4) },
								{ label: 'Vol 1d (SOL)',    value: (Number(overview.volume_1d) / 1e9).toFixed(4) },
								{ label: 'Vol 7d (SOL)',    value: (Number(overview.volume_7d) / 1e9).toFixed(4) },
								{ label: 'Total Points',    value: overview.total_points },
								{ label: 'Direct Refs',     value: overview.direct_referral_count },
							].map(({ label, value: v }) => (
								<Box key={label} sx={{ px: 2, py: 1.5, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
									<Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', mb: 0.5 }}>{label}</Typography>
									<Typography sx={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.88)', fontVariantNumeric: 'tabular-nums', wordBreak: 'break-all' }}>{v}</Typography>
								</Box>
							))}
						</Box>

						{/* 2-column detail cards */}
						<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
							{/* Left — Account */}
							<Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
								<Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', px: 2, pt: 1.5, pb: 1 }}>Account</Typography>

								{/* User address */}
								<Box sx={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 1, py: 0.75, px: 2, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
									<Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', alignSelf: 'center' }}>User Address</Typography>
									<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, minWidth: 0 }}>
										<Typography sx={{ fontSize: 12, color: '#2DD4D1', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
											{overview.user_address || '—'}
										</Typography>
										<IconButton size="small" component="a" href={`https://solscan.io/account/${overview.user_address}`} target="_blank" rel="noopener noreferrer" sx={{ color: 'rgba(255,255,255,0.25)', p: 0.25, flexShrink: 0, '&:hover': { color: '#2DD4D1' } }}><OpenInNewIcon sx={{ fontSize: 11 }} /></IconButton>
										<IconButton size="small" onClick={() => handleCopy(overview.user_address)} sx={{ color: 'rgba(255,255,255,0.25)', p: 0.25, flexShrink: 0, '&:hover': { color: 'rgba(255,255,255,0.7)' } }}><ContentCopyIcon sx={{ fontSize: 11 }} /></IconButton>
									</Box>
								</Box>

								{/* Referred By */}
								<Box sx={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 1, py: 0.75, px: 2, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
									<Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', alignSelf: 'center' }}>Referred By</Typography>
									<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, minWidth: 0 }}>
										{overview.referred_by ? (
											<>
												<Typography onClick={() => handleUserAddressClick(overview.referred_by)} sx={{ fontSize: 12, color: '#2DD4D1', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
													{overview.referred_by}
												</Typography>
												<IconButton size="small" component="a" href={`https://solscan.io/account/${overview.referred_by}`} target="_blank" rel="noopener noreferrer" sx={{ color: 'rgba(255,255,255,0.25)', p: 0.25, flexShrink: 0, '&:hover': { color: '#2DD4D1' } }}><OpenInNewIcon sx={{ fontSize: 11 }} /></IconButton>
												<IconButton size="small" onClick={() => handleCopy(overview.referred_by)} sx={{ color: 'rgba(255,255,255,0.25)', p: 0.25, flexShrink: 0, '&:hover': { color: 'rgba(255,255,255,0.7)' } }}><ContentCopyIcon sx={{ fontSize: 11 }} /></IconButton>
											</>
										) : <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>—</Typography>}
									</Box>
								</Box>

								{[
									{ label: 'Joined At',        value: overview.joined_at || '—' },
									{ label: 'Base Ref Cut',     value: overview.base_referral_cut ?? '—' },
									{ label: 'Point Multiplier', value: overview.point_multiplier ?? '—' },
									{ label: 'Direct Refs',      value: overview.direct_referral_count },
									{ label: 'Indirect Refs',    value: overview.indirect_referral_count },
								].map(({ label, value: v }, i, arr) => (
									<Box key={label} sx={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 1, py: 0.75, px: 2, borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
										<Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', alignSelf: 'center' }}>{label}</Typography>
										<Box sx={{ textAlign: 'right' }}><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums' }}>{String(v)}</Typography></Box>
									</Box>
								))}
							</Box>

							{/* Right — Rewards & Referral */}
							<Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
								<Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', px: 2, pt: 1.5, pb: 1 }}>Rewards & Referral</Typography>
								{[
									{ label: 'Total Points',           value: overview.total_points },
									{ label: 'Points from Ref',        value: overview.points_from_ref },
									{ label: 'Silent Claimed (SOL)',   value: (Number(overview.silent_rewards_claimed) / 1e9).toFixed(4) + ' SOL' },
									{ label: 'Silent Unclaimed (SOL)', value: (Number(overview.silent_rewards_unclaimed) / 1e9).toFixed(4) + ' SOL' },
									{ label: 'Ref Fee Received',       value: overview.referral_fee_received },
									{ label: 'Ref Fee Next Payout',    value: overview.referral_fee_next_payout },
									{ label: 'Direct Ref Vol (SOL)',   value: (Number(overview.direct_referral_volume) / 1e9).toFixed(4) + ' SOL' },
									{ label: 'Indirect Ref Vol (SOL)', value: (Number(overview.indirect_referral_volume) / 1e9).toFixed(4) + ' SOL' },
									{ label: 'Vol Total (SOL)',        value: (Number(overview.volume_total) / 1e9).toFixed(4) + ' SOL' },
									{ label: 'Vol 1d (SOL)',           value: (Number(overview.volume_1d) / 1e9).toFixed(4) + ' SOL' },
									{ label: 'Vol 7d (SOL)',           value: (Number(overview.volume_7d) / 1e9).toFixed(4) + ' SOL' },
								].map(({ label, value: v }, i, arr) => (
									<Box key={label} sx={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 1, py: 0.75, px: 2, borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
										<Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', alignSelf: 'center' }}>{label}</Typography>
										<Box sx={{ textAlign: 'right' }}><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums' }}>{String(v)}</Typography></Box>
									</Box>
								))}
							</Box>
						</Box>

						{/* Tabs: Balances / Tx History / Balance Changes */}
						<Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
							<AppBar position="static" sx={{ bgcolor: 'rgba(255,255,255,0.03)', boxShadow: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
								<Tabs
									value={value}
									onChange={handleChange}
									indicatorColor="secondary"
									textColor="inherit"
									variant="fullWidth"
									aria-label="user detail tabs"
								>
									<Tab label="Balances" {...a11yProps(0)} />
									<Tab label="Tx History" {...a11yProps(1)} />
									<Tab label="Balance Changes" {...a11yProps(2)} />
								</Tabs>
							</AppBar>
							<TabPanel value={value} index={0} dir={theme.direction}>
								<Balances data={overview.balances} />
							</TabPanel>
							<TabPanel value={value} index={1} dir={theme.direction}>
								<Tx_History user_address={user_address} />
							</TabPanel>
							<TabPanel value={value} index={2} dir={theme.direction}>
								<Balance_Changes user_address={user_address} />
							</TabPanel>
						</Box>
					</Box>
				</Container>
			</LoadingOverlay>
		</main>
	);
};

export default User;
