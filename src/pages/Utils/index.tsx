import {
  Container,
  Box,
  Button,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import Divider from '@mui/material/Divider';
import { TokenSearch } from 'src/pages/TurnkeyWallets/TokenSearch';
import { useEffect, useState, type ReactNode } from 'react';
import axios from 'axios';
import LoadingOverlay from 'react-loading-overlay-ts';
import { toast } from 'react-toastify';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSelector } from 'react-redux';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import CardContent from '@mui/material/CardContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import AppBar from '@mui/material/AppBar';
import { useTheme } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { JsonCodePreview } from '../Transaction/json_preview';
import { rustDebugToJsonString, findTxByType } from '../Transaction';
import { ADMIN_ADDRESS, ADMIN_FLAG } from 'src/config';
import {
  getSignature,
  getSignedMessageByWallet,
  SignatureExpiredError,
  handleSessionExpired,
} from 'src/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RootState } from 'src/store';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;
const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

function utilsPageTabProps(index: number) {
  return {
    id: `utils-page-tab-${index}`,
    'aria-controls': `utils-page-tabpanel-${index}`,
  };
}

const ACCENT = '#42FFFC';

const CARD_SX = {
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 2,
  p: 2.5,
  bgcolor: 'rgba(255,255,255,0.02)',
};

const TITLE_SX = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1.2,
  textTransform: 'uppercase' as const,
  color: 'text.disabled',
  mb: 2,
};

const INPUT_SX = {
  '& .MuiOutlinedInput-root': {
    fontSize: 13,
    '& fieldset': { borderColor: 'rgba(255,255,255,0.10)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.20)' },
    '&.Mui-focused fieldset': { borderColor: `${ACCENT}80` },
  },
  '& .MuiInputBase-input': {
    color: '#fff',
    '&::placeholder': { color: 'rgba(255,255,255,0.28)', opacity: 1 },
  },
};

const BTN_SX = {
  flexShrink: 0,
  fontSize: 12,
  fontWeight: 600,
  px: 2.5,
  color: ACCENT,
  borderColor: `${ACCENT}4D`,
  whiteSpace: 'nowrap' as const,
  textTransform: 'none' as const,
  '&:hover': { borderColor: `${ACCENT}99`, bgcolor: `${ACCENT}12` },
};

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
      id={`debug-jito-tabpanel-${index}`}
      aria-labelledby={`debug-jito-tab-${index}`}
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
    id: `debug-jito-tab-${index}`,
    'aria-controls': `debug-jito-tabpanel-${index}`,
  };
}

function hasUtilResponse(val: unknown): boolean {
  if (val === undefined || val === null) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') return Object.keys(val as object).length > 0;
  return true;
}

function copyTextForJsonBlock(data: unknown): string {
  if (typeof data === 'string') return data;
  return JSON.stringify(data, null, 2);
}

function CopyJsonResponseButton({
  data,
  onCopy,
  label,
}: {
  data: unknown;
  onCopy: (text: string) => void;
  label?: string;
}) {
  if (!hasUtilResponse(data)) return null;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
      <Button
        variant="outlined"
        size="small"
        color="primary"
        startIcon={<ContentCopyIcon />}
        onClick={() => onCopy(copyTextForJsonBlock(data))}
        aria-label={label || 'Copy response'}
      >
        {label || 'Copy response'}
      </Button>
    </Box>
  );
}

function UtilFieldRow({
  label,
  children,
  copyText,
  onCopy,
}: {
  label: string;
  children: ReactNode;
  copyText?: string | null;
  onCopy: (text: string) => void;
}) {
  const canCopy = copyText != null && String(copyText).length > 0;
  return (
    <>
      <Typography component="p" className="font-bold text-left text-white text-[13px]">
        {label}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
        <Box sx={{ minWidth: 0 }} className="truncate max-w-[200px] font-bold text-right text-white text-[13px]">
          {children}
        </Box>
        {canCopy && (
          <IconButton
            size="small"
            color="primary"
            aria-label={`Copy ${label}`}
            onClick={() => onCopy(String(copyText))}
          >
            <ContentCopyIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Box>
    </>
  );
}

function ToolCard({
  title,
  placeholder,
  value,
  onChange,
  onSubmit,
  response,
  onCopy,
}: {
  title: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  response: unknown;
  onCopy: (text: string) => void;
}) {
  const hasData = hasUtilResponse(response);
  return (
    <Box sx={CARD_SX}>
      <Typography sx={TITLE_SX}>{title}</Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }
          }}
          sx={INPUT_SX}
        />
        <Button variant="outlined" onClick={onSubmit} sx={BTN_SX}>
          Fetch
        </Button>
      </Box>
      {hasData && (
        <Box mt={2}>
          <CopyJsonResponseButton data={response} onCopy={onCopy} />
          <JsonCodePreview jsonString={JSON.stringify(response)} />
        </Box>
      )}
    </Box>
  );
}

function OneTimeWalletRecoverSection({
  setLoading,
  signMessage,
  connected,
}: {
  setLoading: (loading: boolean) => void;
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | undefined;
  connected: boolean;
}) {
  const navigate = useNavigate();
  const [oneTimeWallet, setOneTimeWallet] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [targetAddress, setTargetAddress] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSubmitClick = () => {
    if (!oneTimeWallet.trim() || !tokenAddress.trim() || !targetAddress.trim()) {
      toast.error('All fields are required.', { autoClose: 2000 });
      return;
    }
    if (!connected) {
      toast.error('Please connect your wallet.', { autoClose: 2000 });
      return;
    }
    if (!signMessage) {
      toast.error('Wallet does not support message signing.', { autoClose: 2000 });
      return;
    }
    setConfirmOpen(true);
  };

  const executeWithdraw = async () => {
    setConfirmOpen(false);
    const otw = oneTimeWallet.trim();
    const token = tokenAddress.trim();
    const target = targetAddress.trim();

    setLoading(true);
    try {
      const timestamp = new Date().getTime();
      const message = `write:super_admin/one_time_wallet/withdraw_token:${otw}:${token}:${target}:${timestamp}`;
      const super_admin_signature = await getSignedMessageByWallet(signMessage!, message);

      const response = await axios.post<{ tx_id: string }>(
        `${API_BASE}/super_admin/one_time_wallet/withdraw_token`,
        {
          super_admin_address: localStorage.getItem(ADMIN_ADDRESS),
          timestamp,
          super_admin_signature,
          one_time_wallet: otw,
          token_address: token,
          target_address: target,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      const txId = response.data?.tx_id;
      if (txId) {
        toast.success(`tx_id: ${txId}`, { autoClose: 10000 });
      } else {
        toast.success('Withdraw submitted.', { autoClose: 2000 });
      }
    } catch (err: unknown) {
      if (err instanceof SignatureExpiredError) {
        handleSessionExpired(navigate);
        return;
      }
      const message =
        axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
          ? String((err.response.data as { message?: string }).message ?? err.message)
          : err instanceof Error
            ? err.message
            : 'Withdraw failed';
      toast.error(message, { autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box sx={{ ...CARD_SX, maxWidth: 720 }}>
        <Typography sx={TITLE_SX}>Recover token from one-time wallet</Typography>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
          SuperAdmin write: withdraws the full token balance (or remaining SOL) from a one-time wallet
          to the target address.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="One-time wallet"
            placeholder="One-time wallet address"
            value={oneTimeWallet}
            onChange={(e) => setOneTimeWallet(e.target.value)}
            sx={INPUT_SX}
          />
          <TextField
            fullWidth
            size="small"
            label="Token address"
            placeholder="Token mint address (use SOL mint for native SOL)"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            sx={INPUT_SX}
          />
          <TextField
            fullWidth
            size="small"
            label="Target address"
            placeholder="Destination wallet address"
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmitClick();
              }
            }}
            sx={INPUT_SX}
          />
          <Box>
            <Button variant="outlined" onClick={handleSubmitClick} sx={BTN_SX}>
              Submit
            </Button>
          </Box>
        </Box>
      </Box>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Confirm token recovery</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Warning: This action withdraws funds from a one-time wallet on-chain. Proceed with
            caution — verify all addresses before confirming. This operation cannot be easily undone.
          </DialogContentText>
          <Typography variant="body2" sx={{ wordBreak: 'break-all', mb: 1 }}>
            <strong>One-time wallet:</strong> {oneTimeWallet.trim()}
          </Typography>
          <Typography variant="body2" sx={{ wordBreak: 'break-all', mb: 1 }}>
            <strong>Token:</strong> {tokenAddress.trim()}
          </Typography>
          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
            <strong>Target:</strong> {targetAddress.trim()}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button color="warning" variant="contained" onClick={() => void executeWithdraw()}>
            Confirm withdraw
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

const Commit = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? undefined;
  const { signMessage, connected } = useWallet();
  const theme = useTheme();
  const { is_super_admin } = useSelector((state: RootState) => state.admin);
  const isSuperAdmin = is_super_admin || localStorage.getItem(ADMIN_FLAG) === '1';
  const [utilsTab, setUtilsTab] = useState(0);
  const [tx_id, setTx_id] = useState<string>('');
  const [commitResponse, setCommitResponse] = useState<any>({});
  const [user_address, setUser_address] = useState<string>(localStorage.getItem(ADMIN_ADDRESS) || '');
  const [balancesResponse, setBalancesResponse] = useState<any>({});
  const [pendingActionsResponse, setPendingActionsResponse] = useState<any>({});
  const [recentActionsV1Response, setRecentActionsV1Response] = useState<any>({});
  const [recentActionsV2Response, setRecentActionsV2Response] = useState<any>({});
  const [debugJitoTradeResponse, setDebugJitoTradeResponse] = useState<any>({});
  const [debugTabValue, setDebugTabValue] = useState(0);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard', { autoClose: 1000 });
  };

  const onCommit = async () => {
    setLoading(true);
    try {
      let response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/commit`,
        { tx_id },
        { headers: { 'Content-Type': 'application/json', 'accept': 'application/json', 'x-api-key': ADMIN_DASHBOARD_API_KEY } }
      );
      setCommitResponse(response.data);
      setLoading(false);
      toast.success('Commit Successful', { autoClose: 1500 });
    } catch (err) {
      setLoading(false);
      setCommitResponse({});
      toast.error(err.message, { autoClose: 1500 });
    }
  };

  const getBalances = async () => {
    setLoading(true);
    try {
      const { super_admin_signature, timestamp } = await getSignature(signMessage || undefined, 'read');
      let response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/admin/utils/balances`,
        { admin_address: localStorage.getItem(ADMIN_ADDRESS), timestamp, admin_signature: super_admin_signature, user_address },
        { headers: { 'Content-Type': 'application/json', 'accept': 'application/json', 'x-api-key': ADMIN_DASHBOARD_API_KEY } }
      );
      setBalancesResponse(response.data);
      setLoading(false);
      toast.success('Balances Retrieved', { autoClose: 1500 });
    } catch (err: any) {
      setLoading(false);
      setBalancesResponse({});
      if (err instanceof SignatureExpiredError) { handleSessionExpired(navigate); return; }
      toast.error(err.message, { autoClose: 1500 });
    }
  };

  const getPendingActions = async () => {
    setLoading(true);
    try {
      const { super_admin_signature, timestamp } = await getSignature(signMessage || undefined, 'read');
      let response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/admin/utils/pending_actions`,
        { admin_address: localStorage.getItem(ADMIN_ADDRESS), timestamp, admin_signature: super_admin_signature, user_address },
        { headers: { 'Content-Type': 'application/json', 'accept': 'application/json', 'x-api-key': ADMIN_DASHBOARD_API_KEY } }
      );
      setPendingActionsResponse(response.data);
      setLoading(false);
      toast.success('Pending Actions Retrieved', { autoClose: 1500 });
    } catch (err: any) {
      setLoading(false);
      setPendingActionsResponse({});
      if (err instanceof SignatureExpiredError) { handleSessionExpired(navigate); return; }
      toast.error(err.message, { autoClose: 1500 });
    }
  };

  const getRecentActionsV1 = async () => {
    setLoading(true);
    try {
      const { super_admin_signature, timestamp } = await getSignature(signMessage || undefined, 'read');
      let response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/terminal/account/recent_actions`,
        { admin_address: localStorage.getItem(ADMIN_ADDRESS), timestamp, signature: super_admin_signature, user_address },
        { headers: { 'Content-Type': 'application/json', 'accept': 'application/json', 'x-api-key': ADMIN_DASHBOARD_API_KEY } }
      );
      setRecentActionsV1Response(response.data);
      setLoading(false);
      toast.success('Recent Actions (v1) Retrieved', { autoClose: 1500 });
    } catch (err: any) {
      setLoading(false);
      setRecentActionsV1Response({});
      if (err instanceof SignatureExpiredError) { handleSessionExpired(navigate); return; }
      toast.error(err.message, { autoClose: 1500 });
    }
  };

  const getRecentActionsV2 = async () => {
    setLoading(true);
    try {
      const { super_admin_signature, timestamp } = await getSignature(signMessage || undefined, 'read');
      let response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/terminal/v2/account/recent_actions`,
        { admin_address: localStorage.getItem(ADMIN_ADDRESS), timestamp, signature: super_admin_signature, user_address },
        { headers: { 'Content-Type': 'application/json', 'accept': 'application/json', 'x-api-key': ADMIN_DASHBOARD_API_KEY } }
      );
      setRecentActionsV2Response(response.data);
      setLoading(false);
      toast.success('Recent Actions (v2) Retrieved', { autoClose: 1500 });
    } catch (err: any) {
      setLoading(false);
      setRecentActionsV2Response({});
      if (err instanceof SignatureExpiredError) { handleSessionExpired(navigate); return; }
      toast.error(err.message, { autoClose: 1500 });
    }
  };

  const debugJitoTrade = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/trade/debug?tx_id=` + tx_id,
        { headers: { 'Content-Type': 'application/json', 'accept': 'application/json', 'x-api-key': ADMIN_DASHBOARD_API_KEY } }
      );
      setDebugJitoTradeResponse(response.data);
      setDebugTabValue(0);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setDebugJitoTradeResponse({});
      toast.error(err.message, { autoClose: 1500 });
    }
  };

  useEffect(() => {}, [signMessage]);

  const hasDebugData = Object.keys(debugJitoTradeResponse).length > 0;

  return (
    <main>
      <Container maxWidth="xl">
        <LoadingOverlay
          active={loading}
          spinner
          styles={{ wrapper: (base) => ({ ...base, width: '100%' }) }}
        >
          <Box mt={4}>
            <TokenSearch defaultMint={tokenFromUrl} />
          </Box>

          {isSuperAdmin && (
            <Box mt={3}>
              <AppBar position="static" color="default">
                <Tabs
                  value={utilsTab}
                  onChange={(_, v) => setUtilsTab(v)}
                  indicatorColor="secondary"
                  textColor="inherit"
                  variant="fullWidth"
                >
                  <Tab label="Utilities" {...utilsPageTabProps(0)} />
                  <Tab label="One-Time Wallet Recover" {...utilsPageTabProps(1)} />
                </Tabs>
              </AppBar>
            </Box>
          )}

          {isSuperAdmin && utilsTab === 1 ? (
            <Box mt={4}>
              <OneTimeWalletRecoverSection
                setLoading={setLoading}
                signMessage={signMessage}
                connected={connected}
              />
            </Box>
          ) : (
          <Box mt={4}>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

              {/* Commit Transaction */}
              <ToolCard
                title="Commit Transaction"
                placeholder="Transaction hash"
                value={tx_id}
                onChange={(e) => setTx_id(e.target.value)}
                onSubmit={onCommit}
                response={commitResponse}
                onCopy={handleCopy}
              />

              {/* Get Balances */}
              <ToolCard
                title="Get Balances"
                placeholder="User address"
                value={user_address}
                onChange={(e) => setUser_address(e.target.value)}
                onSubmit={getBalances}
                response={balancesResponse}
                onCopy={handleCopy}
              />

              {/* Get Pending Actions */}
              <ToolCard
                title="Get Pending Actions"
                placeholder="User address"
                value={user_address}
                onChange={(e) => setUser_address(e.target.value)}
                onSubmit={getPendingActions}
                response={pendingActionsResponse}
                onCopy={handleCopy}
              />

              {/* Recent Actions v1 */}
              <ToolCard
                title="Recent Actions · Terminal v1"
                placeholder="User address"
                value={user_address}
                onChange={(e) => setUser_address(e.target.value)}
                onSubmit={getRecentActionsV1}
                response={recentActionsV1Response}
                onCopy={handleCopy}
              />

              {/* Recent Actions v2 */}
              <ToolCard
                title="Recent Actions · Terminal v2"
                placeholder="User address"
                value={user_address}
                onChange={(e) => setUser_address(e.target.value)}
                onSubmit={getRecentActionsV2}
                response={recentActionsV2Response}
                onCopy={handleCopy}
              />

              {/* Debug Jito Trade */}
              <Box sx={CARD_SX}>
                <Typography sx={TITLE_SX}>Debug Jito Trade</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Trade ID"
                    value={tx_id}
                    onChange={(e) => setTx_id(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); debugJitoTrade(); } }}
                    sx={INPUT_SX}
                  />
                  <Button variant="outlined" onClick={debugJitoTrade} sx={BTN_SX}>
                    Fetch
                  </Button>
                </Box>

                {hasDebugData && (
                  <Box mt={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        color="primary"
                        startIcon={<ContentCopyIcon />}
                        onClick={() => handleCopy(JSON.stringify(debugJitoTradeResponse, null, 2))}
                      >
                        Copy full response
                      </Button>
                    </Box>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Box sx={{ borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                        <CardContent sx={{ display: 'flex', justifyContent: 'center', height: '100%' }}>
                          <div className="mt-2 px-5 w-full">
                            <div className="items-center mt-5">
                              <div className="grid grid-cols-2 w-full gap-y-2">
                                <UtilFieldRow
                                  label="Status"
                                  copyText={debugJitoTradeResponse.status != null && String(debugJitoTradeResponse.status).length > 0 ? String(debugJitoTradeResponse.status) : null}
                                  onCopy={handleCopy}
                                >
                                  {debugJitoTradeResponse.status ?? '—'}
                                </UtilFieldRow>
                                <UtilFieldRow label="User Address" copyText={debugJitoTradeResponse.user_address || null} onCopy={handleCopy}>
                                  {debugJitoTradeResponse.user_address ?? '—'}
                                </UtilFieldRow>
                                <UtilFieldRow label="Created At" copyText={debugJitoTradeResponse.created_at || null} onCopy={handleCopy}>
                                  {debugJitoTradeResponse.created_at ?? '—'}
                                </UtilFieldRow>
                                <UtilFieldRow label="Completed At" copyText={debugJitoTradeResponse.completed_at || null} onCopy={handleCopy}>
                                  {debugJitoTradeResponse.completed_at ?? '—'}
                                </UtilFieldRow>
                                <UtilFieldRow label="Called By" copyText={debugJitoTradeResponse.called_by || null} onCopy={handleCopy}>
                                  {debugJitoTradeResponse.called_by ?? '—'}
                                </UtilFieldRow>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Box>

                      <Box sx={{ borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                        <CardContent sx={{ display: 'flex', justifyContent: 'center', height: '100%' }}>
                          <div className="mt-2 px-5 w-full">
                            <div className="items-center mt-5">
                              <div className="grid grid-cols-2 w-full gap-y-2">
                                <UtilFieldRow label="Jito Bundle ID" copyText={debugJitoTradeResponse.jito_bundle_id || null} onCopy={handleCopy}>
                                  {debugJitoTradeResponse.jito_bundle_id ?? '—'}
                                </UtilFieldRow>
                                <UtilFieldRow
                                  label="Vanish Fee Paid"
                                  copyText={debugJitoTradeResponse.vanish_fee_paid != null ? String(debugJitoTradeResponse.vanish_fee_paid) : null}
                                  onCopy={handleCopy}
                                >
                                  {debugJitoTradeResponse.vanish_fee_paid ?? '—'}
                                </UtilFieldRow>
                                <UtilFieldRow
                                  label="SOL Price"
                                  copyText={debugJitoTradeResponse.sol_price != null ? String(debugJitoTradeResponse.sol_price) : null}
                                  onCopy={handleCopy}
                                >
                                  {debugJitoTradeResponse.sol_price ?? '—'}
                                </UtilFieldRow>
                                <UtilFieldRow
                                  label="Fee (bps)"
                                  copyText={debugJitoTradeResponse.fee_bps != null ? String(debugJitoTradeResponse.fee_bps) : null}
                                  onCopy={handleCopy}
                                >
                                  {debugJitoTradeResponse.fee_bps ?? '—'}
                                </UtilFieldRow>
                                <UtilFieldRow
                                  label="Token Price"
                                  copyText={debugJitoTradeResponse.token_price != null ? String(debugJitoTradeResponse.token_price) : null}
                                  onCopy={handleCopy}
                                >
                                  {debugJitoTradeResponse.token_price ?? '—'}
                                </UtilFieldRow>
                                <UtilFieldRow
                                  label="Referral Fee"
                                  copyText={debugJitoTradeResponse.is_referral_fee_enabled ? 'Yes' : 'No'}
                                  onCopy={handleCopy}
                                >
                                  {debugJitoTradeResponse.is_referral_fee_enabled ? 'Yes' : 'No'}
                                </UtilFieldRow>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Box>
                    </div>

                    {(debugJitoTradeResponse.decoded_bundle_txs?.length > 0 || debugJitoTradeResponse.jito_simulation_log) && (
                      <Box sx={{ bgcolor: 'background.paper', width: '100%', mt: 3 }}>
                        <AppBar position="static">
                          <Tabs
                            value={debugTabValue}
                            onChange={(_, v) => setDebugTabValue(v)}
                            indicatorColor="secondary"
                            textColor="inherit"
                            variant="fullWidth"
                          >
                            {debugJitoTradeResponse.decoded_bundle_txs?.length > 0 && <Tab label="Decoded Bundle Txs" {...a11yProps(0)} />}
                            <Tab label="Jito Simulation Log" {...a11yProps(debugJitoTradeResponse.decoded_bundle_txs?.length > 0 ? 1 : 0)} />
                          </Tabs>
                        </AppBar>
                        {debugJitoTradeResponse.decoded_bundle_txs?.length > 0 && (
                          <TabPanel value={debugTabValue} index={0} dir={theme.direction}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                              {(() => {
                                const d = debugJitoTradeResponse.decoded_bundle_txs || [];
                                const loan = findTxByType(d, 'loan');
                                const trade = findTxByType(d, 'trade');
                                const repay = findTxByType(d, 'repay');
                                return (
                                  <>
                                    {loan != null && (
                                      <div>
                                        <p className="font-bold text-center text-[13px] text-white mb-2">[loan] Decoded Transaction</p>
                                        <Divider sx={{ color: 'white', marginBottom: 1 }} />
                                        <CopyJsonResponseButton data={loan} onCopy={handleCopy} label="Copy [loan] response" />
                                        <JsonCodePreview jsonString={rustDebugToJsonString(loan)} />
                                      </div>
                                    )}
                                    {trade != null && (
                                      <div>
                                        <p className="font-bold text-center text-[13px] text-white mb-2">[trade] Decoded Transaction</p>
                                        <Divider sx={{ color: 'white', marginBottom: 1 }} />
                                        <CopyJsonResponseButton data={trade} onCopy={handleCopy} label="Copy [trade] response" />
                                        <JsonCodePreview jsonString={rustDebugToJsonString(trade)} />
                                      </div>
                                    )}
                                    {repay != null && (
                                      <div>
                                        <p className="font-bold text-center text-[13px] text-white mb-2">[repay] Decoded Transaction</p>
                                        <Divider sx={{ color: 'white', marginBottom: 1 }} />
                                        <CopyJsonResponseButton data={repay} onCopy={handleCopy} label="Copy [repay] response" />
                                        <JsonCodePreview jsonString={rustDebugToJsonString(repay)} />
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </TabPanel>
                        )}
                        <TabPanel value={debugTabValue} index={debugJitoTradeResponse.decoded_bundle_txs?.length > 0 ? 1 : 0} dir={theme.direction}>
                          {hasUtilResponse(debugJitoTradeResponse.jito_simulation_log) && (
                            <CopyJsonResponseButton
                              data={debugJitoTradeResponse.jito_simulation_log}
                              onCopy={handleCopy}
                              label="Copy simulation log"
                            />
                          )}
                          <JsonCodePreview jsonString={debugJitoTradeResponse.jito_simulation_log || '{}'} />
                        </TabPanel>
                      </Box>
                    )}

                    {debugJitoTradeResponse.message && (
                      <Box mt={2}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                          <p className="font-bold text-left text-white text-[18px] m-0">Message</p>
                          <Button
                            variant="outlined"
                            size="small"
                            color="primary"
                            startIcon={<ContentCopyIcon />}
                            onClick={() => handleCopy(String(debugJitoTradeResponse.message))}
                          >
                            Copy message
                          </Button>
                        </Box>
                        <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)' }}>
                          <code className="text-white text-sm break-all">{debugJitoTradeResponse.message}</code>
                        </Paper>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>

            </div>
          </Box>
          )}
        </LoadingOverlay>
      </Container>
    </main>
  );
};

export default Commit;
