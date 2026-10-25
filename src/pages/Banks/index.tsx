import { Container, Box, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';
import { ADMIN_ADDRESS } from 'src/config';
import { toast } from 'react-toastify';
import { Overview } from './types';
import { getSignature, SignatureExpiredError, handleSessionExpired } from 'src/utils';
import { useNavigate } from 'react-router-dom';
import LoadingOverlay from 'react-loading-overlay-ts';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;

const Banks = () => {
	const navigate = useNavigate();
	const { signMessage, publicKey } = useWallet();
	const [loading, setLoading] = useState(true);
	const [ overview, setOverview ] = useState<Overview>({
		total_sol_held: "0",
		total_usd_value: "0",
		number_of_sql_tokens: "0",
	});
	
	const fetchBankOverview = async () => {
		setLoading(true);
		try {
			const {super_admin_signature, timestamp} = await getSignature(signMessage || undefined, 'read');

			const response = await axios.post(
			`${process.env.REACT_APP_API_BASE_URL}/admin/banks/overview`,
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
			
			setOverview({
				total_sol_held: Number(response.data.total_sol_held).toFixed(2),
				total_usd_value: Number(response.data.total_usd_value).toFixed(2),
				number_of_sql_tokens: response.data.number_of_sql_tokens,
			});
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
		fetchBankOverview();
	}, [signMessage]);

  return (
    <main>
      <Container maxWidth="xl">
        <Box mt={4}>
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
	        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1.5 }}>
              {[
                { label: 'Total SOL Held', value: (Number(overview.total_sol_held) / Math.pow(10, 9)).toFixed(2) },
                { label: 'Total USD Value', value: `$${overview.total_usd_value}` },
                { label: 'SPL Tokens', value: overview.number_of_sql_tokens },
              ].map(({ label, value: val }) => (
                <Box key={label} sx={{ px: 2, py: 1.5, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', mb: 0.5 }}>
                    {label}
                  </Typography>
                  <Typography sx={{ fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.88)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                    {val}
                  </Typography>
                </Box>
              ))}
            </Box>
		  </LoadingOverlay>
        </Box>
		{/* <Divider sx={{ marginBottom: 3 }} /> */}
		{/* <Banks_Table /> */}
      </Container>
    </main>
  );
};

export default Banks;
