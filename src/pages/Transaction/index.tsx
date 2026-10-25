import { Container, Button, Box, Typography, IconButton, Tooltip } from '@mui/material';
import { ScreeningDrawer } from 'src/components/EllipticScreening/ScreeningDrawer';
import { useEffect, useMemo } from 'react';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useLocation } from 'react-router-dom';
import LoadingOverlay from 'react-loading-overlay-ts';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { JsonCodePreview } from "./json_preview";
import AppBar from '@mui/material/AppBar';
import { useTheme } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PersonIcon from '@mui/icons-material/Person';
import BoltIcon from '@mui/icons-material/Bolt';
import { TxInfoExpired } from '../Transaction/types';
import { useNavigate } from 'react-router-dom';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;


interface TabPanelProps {
  children?: React.ReactNode;
  dir?: string;
  index: number;
  value: number;
}

function stripLogHeader(s) {
  return s.replace(/^\s*===.*?===\s*\n?/m, "").trim();
}

/** Find tx from decoded_bundle_txs by type marker in content */
export function findTxByType(decoded_bundle_txs: readonly (string | String)[], type: 'loan' | 'trade' | 'repay'): string | undefined {
  const marker = `\n=== [${type}]`;
  const found = decoded_bundle_txs.find((tx) => {
    const s = typeof tx === 'string' ? tx : String(tx);
    return s.includes(marker);
  });
  return found != null ? String(found) : undefined;
}

export function rustDebugToJsonString(input) {
    let s = stripLogHeader(input);

    // Remove the outer type wrapper
    s = s.replace(/^\s*VersionedTransaction\s*\{/, "{");

    // Turn `V0(Message { ... })` into `{ ... }`
    s = s.replace(/\bV0\s*\(\s*Message\s*\{/g, "{");
    s = s.replace(/\}\s*\)\s*$/g, "}"); // last "})" -> "}"

    // Turn any `TypeName {` into `{`
    s = s.replace(/\b[A-Za-z_]\w*\s*\{/g, "{");

    // Quote keys: header: -> "header":
    s = s.replace(/([,{]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":');

    // Quote LONG tokens (Solana base58-ish) as array elements:
    // Matches: [ ABC... , DEF... ] and keeps commas/brackets intact
    s = s.replace(/(\[|,)\s*([A-Za-z0-9]{20,})\s*(?=,|\])/g, '$1 "$2"');

    // Quote LONG tokens as values after colon:
    // Matches: recent_blockhash: ABC...,
    s = s.replace(/:\s*([A-Za-z0-9]{20,})\s*(?=,|\}|\])/g, ': "$1"');

    // Remove trailing commas before } or ]
    s = s.replace(/,(\s*[}\]])/g, "$1");
    s = s.replace(/\)\s*}(\s*)$/, "} $1")

  return s;
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

/** Format bps value with % in brackets, e.g. 50 -> "50(0.5%)" */
function formatBps(bps: number): string {
  const n = Number(bps);
  if (Number.isNaN(n)) return String(bps);
  const pct = (n / 100).toFixed(2).replace(/\.?0+$/, '');
  return `${n}(${pct}%)`;
}

/** Format sol amount from balance changes (10^9 lamports) */
function formatSolAmount(amount: number | string | null | undefined): string {
  if (amount == null || amount === '') return '—';
  const n = Number(amount);
  if (Number.isNaN(n)) return '—';
  return (Math.abs(n) / 1e9).toFixed(5) + ' SOL';
}

/** Format a token delta: SOL/WSOL → 9 decimals, everything else → tokenDecimals */
function formatTokenDelta(amount: Number | number | null | undefined, symbol: string, tokenDecimals: number): string {
  if (amount == null) return '—';
  const n = Number(amount);
  if (Number.isNaN(n) || n === 0) return '—';
  const sym = String(symbol).toUpperCase();
  const dec = (sym === 'SOL' || sym === 'WSOL') ? 9 : tokenDecimals;
  return (Math.abs(n) / 10 ** dec).toFixed(6) + ' ' + String(symbol);
}

function formatUsdPrice(price: Number | number | null | undefined): string {
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`;
}


/** Format Unix timestamp (ms or seconds) to UTC ISO string, or fallback if invalid */
function formatTimestamp(ts: string | undefined): string {
  try {
    const n = Number(ts);
    if (ts == null || ts === '' || !Number.isFinite(n)) return '-';
    const ms = n < 1e12 ? n * 1000 : n;
    const d = new Date(ms);
    if (!Number.isFinite(d.getTime())) return '-';
    return d.toISOString();
  } catch {
    return '-';
  }
}

const Transaction = () => {
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const [ info_expired, setInfoExpired ] = useState<TxInfoExpired>({
        tx_id: "",
        sol_delta: 0,
        decoded_bundle_txs: [],
        jito_simulation_log: "",
        user_address: "",
        created_at: "",
        completed_at: "",
        message: "",
        vanish_fee_paid: 0,
        sol_price: 0,
        fee_bps: 0,
        silent_reward_token_bps: 0,
        silent_reward_sol_bps: 0,
        is_referral_fee_enabled: false,
        token_price: 0,
        called_by: "",
        status: "",
        jito_bundle_id: "",
        one_time_wallet: "",
        source_token_address: "",
        source_token_symbol: "",
        target_token_address: "",
        target_token_symbol: "",
        source_token_price: 0,
        target_token_price: 0,
        source_token_delta: 0,
        target_token_delta: 0,
        split_repay: 0,
        source_token_decimals: 6,
        target_token_decimals: 6,
    });

    const [value, setValue] = useState(0);
    const theme = useTheme();

    const navigate = useNavigate();

    const handleUserAddressClick = (userAddress) => {
        navigate(`/user?user_address=${userAddress}`);
    };

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
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

    const getQueryParam = (name) => {
        const urlParams = new URLSearchParams(location.search);
        return urlParams.get(name);
    };

    const tx_id = getQueryParam('tx_id');

    const fetchTxInfoExpired = async (tx_id) => {
        setLoading(true)
        try {
            const response = await axios.get(
            `${process.env.REACT_APP_API_BASE_URL}/trade/debug?tx_id=` + tx_id,
            {
                headers: {
                'Content-Type': 'application/json',
                'accept': 'application/json',
                'x-api-key': ADMIN_DASHBOARD_API_KEY,
                },
            }
            );

            console.log('Tx_Expired_Overview:', response.data);

            setInfoExpired(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetch tx', err);
            toast.error(err.message, {

                autoClose: 1500
            });
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!tx_id) return;
        fetchTxInfoExpired(tx_id);
    }, [tx_id]);

    const displayTxId = String(info_expired.tx_id || tx_id || '');
    const isResolvedBundleTx = Boolean(tx_id && displayTxId && tx_id !== displayTxId);

    const { loanTx, tradeTx, repayTx } = useMemo(() => {
        const txs = info_expired.decoded_bundle_txs ?? [];
        return {
            loanTx: findTxByType(txs, 'loan'),
            tradeTx: findTxByType(txs, 'trade'),
            repayTx: findTxByType(txs, 'repay'),
        };
    }, [info_expired.decoded_bundle_txs]);

    const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
        <Box sx={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 1, py: 0.75, px: 2, borderBottom: '1px solid rgba(255,255,255,0.05)', '&:last-child': { borderBottom: 'none' } }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', alignSelf: 'center' }}>{label}</Typography>
            <Box sx={{ textAlign: 'right', minWidth: 0 }}>{children}</Box>
        </Box>
    );

    const actionType = info_expired.message.split(":")[0];

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
            <Container maxWidth="xl">
                <Box sx={{ pt: 1 }}>
                    {/* Page header row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.88)', mb: 0.25 }}>
                                Transaction Details
                            </Typography>
                            {displayTxId && (
                                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                    {displayTxId}
                                </Typography>
                            )}
                            {isResolvedBundleTx && (
                                <Typography sx={{ fontSize: 11, color: 'rgba(45,212,209,0.72)', fontFamily: 'monospace', wordBreak: 'break-all', mt: 0.25 }}>
                                    Matched bundle tx: {tx_id}
                                </Typography>
                            )}
                        </Box>
                        {/* Action buttons */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            {displayTxId && (
                                <Tooltip title="View TX on Solscan" arrow>
                                    <IconButton size="small" component="a" href={`https://solscan.io/tx/${displayTxId}`} target="_blank" rel="noopener noreferrer" sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, p: 0.75, color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#2DD4D1', borderColor: '#2DD4D1', bgcolor: 'rgba(45,212,209,0.06)' } }}>
                                        <ReceiptLongIcon sx={{ fontSize: 15 }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {info_expired.user_address && (
                                <Tooltip title="User on Solscan" arrow>
                                    <IconButton size="small" component="a" href={`https://solscan.io/account/${String(info_expired.user_address)}`} target="_blank" rel="noopener noreferrer" sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, p: 0.75, color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#2DD4D1', borderColor: '#2DD4D1', bgcolor: 'rgba(45,212,209,0.06)' } }}>
                                        <PersonIcon sx={{ fontSize: 15 }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {info_expired.jito_bundle_id && (
                                <Tooltip title="View on Jito Explorer" arrow>
                                    <IconButton size="small" component="a" href={`https://explorer.jito.wtf/events/${String(info_expired.jito_bundle_id)}`} target="_blank" rel="noopener noreferrer" sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, p: 0.75, color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#2DD4D1', borderColor: '#2DD4D1', bgcolor: 'rgba(45,212,209,0.06)' } }}>
                                        <BoltIcon sx={{ fontSize: 15 }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {info_expired.user_address && (
                                <ScreeningDrawer
                                    walletAddress={String(info_expired.user_address)}
                                    label="Screen"
                                />
                            )}
                        </Box>
                    </Box>

                    {/* Info grid — key stats as tiles, then detail rows */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 1.5, mb: 2 }}>
                        {[
                            { label: 'Status',     value: String(info_expired.status) || '—' },
                            { label: 'Type',        value: actionType || '—' },
                            { label: 'SOL Price',   value: `$${info_expired.sol_price}` },
                            { label: 'Fee',         value: formatBps(Number(info_expired.fee_bps)) },
                            { label: 'Fee Paid',    value: `${(Number(info_expired.vanish_fee_paid) / 1e9).toFixed(4)} SOL` },
                            { label: 'Called By',   value: String(info_expired.called_by) || '—' },
                        ].map(({ label, value: v }) => (
                            <Box key={label} sx={{ px: 2, py: 1.5, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', mb: 0.5 }}>{label}</Typography>
                                <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.88)', wordBreak: 'break-all' }}>{v}</Typography>
                            </Box>
                        ))}
                    </Box>

                    {/* Detail rows — 2 columns */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
                        {/* Left column */}
                        <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                            <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', px: 2, pt: 1.5, pb: 1 }}>Transaction</Typography>
                            <InfoRow label="User Address">
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                    <Typography onClick={() => handleUserAddressClick(info_expired.user_address)} sx={{ fontSize: 12, color: '#2DD4D1', fontFamily: 'monospace', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: { xs: 130, md: 200 }, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                                        {String(info_expired.user_address) || '—'}
                                    </Typography>
                                    <IconButton size="small" onClick={() => handleCopy(info_expired.user_address)} sx={{ color: 'rgba(255,255,255,0.3)', p: 0.25, '&:hover': { color: 'rgba(255,255,255,0.7)' } }}><ContentCopyIcon sx={{ fontSize: 12 }} /></IconButton>
                                </Box>
                            </InfoRow>
                            <InfoRow label="Created At"><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums' }}>{String(info_expired.created_at) || '—'}</Typography></InfoRow>
                            <InfoRow label="One Time Wallet">
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                    {info_expired.one_time_wallet ? (
                                        <>
                                            <Typography component="a" href={`https://solscan.io/account/${String(info_expired.one_time_wallet)}`} target="_blank" rel="noopener noreferrer" sx={{ fontSize: 12, color: '#2DD4D1', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: { xs: 130, md: 200 }, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }} title={String(info_expired.one_time_wallet)}>
                                                {String(info_expired.one_time_wallet)}
                                            </Typography>
                                            <IconButton size="small" component="a" href={`https://solscan.io/account/${String(info_expired.one_time_wallet)}`} target="_blank" rel="noopener noreferrer" sx={{ color: 'rgba(255,255,255,0.25)', p: 0.25, '&:hover': { color: '#2DD4D1' } }}><OpenInNewIcon sx={{ fontSize: 11 }} /></IconButton>
                                            <IconButton size="small" onClick={() => handleCopy(info_expired.one_time_wallet)} sx={{ color: 'rgba(255,255,255,0.25)', p: 0.25, '&:hover': { color: 'rgba(255,255,255,0.6)' } }}><ContentCopyIcon sx={{ fontSize: 11 }} /></IconButton>
                                        </>
                                    ) : (
                                        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>—</Typography>
                                    )}
                                </Box>
                            </InfoRow>
                            <InfoRow label="Completed At"><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums' }}>{String(info_expired.completed_at) || '—'}</Typography></InfoRow>

                            {(actionType === 'trade' || actionType === 'withdraw' || actionType === 'deposit') ? (<>
                                <InfoRow label="Source Token">
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                        {info_expired.source_token_symbol && info_expired.source_token_address ? (
                                            <>
                                                <Typography component="a" href={`https://solscan.io/token/${String(info_expired.source_token_address)}`} target="_blank" rel="noopener noreferrer" sx={{ fontSize: 12, color: '#2DD4D1', cursor: 'pointer', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }} title={String(info_expired.source_token_address)}>
                                                    {String(info_expired.source_token_symbol)}
                                                </Typography>
                                                <IconButton size="small" component="a" href={`https://solscan.io/token/${String(info_expired.source_token_address)}`} target="_blank" rel="noopener noreferrer" sx={{ color: 'rgba(255,255,255,0.25)', p: 0.25, '&:hover': { color: '#2DD4D1' } }}><OpenInNewIcon sx={{ fontSize: 11 }} /></IconButton>
                                                <IconButton size="small" onClick={() => handleCopy(info_expired.source_token_address)} sx={{ color: 'rgba(255,255,255,0.25)', p: 0.25, '&:hover': { color: 'rgba(255,255,255,0.6)' } }}><ContentCopyIcon sx={{ fontSize: 11 }} /></IconButton>
                                            </>
                                        ) : (
                                            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>SOL</Typography>
                                        )}
                                    </Box>
                                </InfoRow>
                                <InfoRow label="Source Token Delta"><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{formatTokenDelta(info_expired.source_token_delta, String(info_expired.source_token_symbol), Number(info_expired.source_token_decimals))}</Typography></InfoRow>
                                <InfoRow label="Source Token Price"><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{formatUsdPrice(info_expired.source_token_price)}</Typography></InfoRow>
                                {actionType === 'trade' && (
                                    <>
                                    <InfoRow label="Target Token">
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                            {info_expired.target_token_symbol && info_expired.target_token_address ? (
                                                <>
                                                    <Typography component="a" href={`https://solscan.io/token/${String(info_expired.target_token_address)}`} target="_blank" rel="noopener noreferrer" sx={{ fontSize: 12, color: '#2DD4D1', cursor: 'pointer', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }} title={String(info_expired.target_token_address)}>
                                                        {String(info_expired.target_token_symbol)}
                                                    </Typography>
                                                    <IconButton size="small" component="a" href={`https://solscan.io/token/${String(info_expired.target_token_address)}`} target="_blank" rel="noopener noreferrer" sx={{ color: 'rgba(255,255,255,0.25)', p: 0.25, '&:hover': { color: '#2DD4D1' } }}><OpenInNewIcon sx={{ fontSize: 11 }} /></IconButton>
                                                    <IconButton size="small" onClick={() => handleCopy(info_expired.target_token_address)} sx={{ color: 'rgba(255,255,255,0.25)', p: 0.25, '&:hover': { color: 'rgba(255,255,255,0.6)' } }}><ContentCopyIcon sx={{ fontSize: 11 }} /></IconButton>
                                                </>
                                            ) : (
                                                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>SOL</Typography>
                                            )}
                                        </Box>
                                    </InfoRow>
                                    <InfoRow label="Target Token Delta"><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{formatTokenDelta(info_expired.target_token_delta, String(info_expired.target_token_symbol), Number(info_expired.target_token_decimals))}</Typography></InfoRow>
                                    <InfoRow label="Target Token Price"><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{formatUsdPrice(info_expired.target_token_price)}</Typography></InfoRow>
                                    </>
                                )}
                                <InfoRow label="SOL Delta"><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{formatSolAmount(info_expired.sol_delta)}</Typography></InfoRow>
                                {actionType === 'trade' && (
                                    <>
                                        <InfoRow label="Loan Additional SOL"><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{formatSolAmount(info_expired.message.split(":")[4])}</Typography></InfoRow>
                                        <InfoRow label="Jito Tip"><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{formatSolAmount(info_expired.message.split(":")[6])}</Typography></InfoRow>
                                        <InfoRow label="Split Repay"><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{info_expired.split_repay || 0}</Typography></InfoRow>
                                    </>
                                )}
                                {actionType === 'withdraw' && (
                                    <InfoRow label="Loan Additional SOL"><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{formatSolAmount(info_expired.message.split(":")[3])}</Typography></InfoRow>
                                )}
                            </>) : (<>
                                <InfoRow label="Token Address">
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                        <Typography component="a" href={`https://solscan.io/token/${info_expired.message.split(":")[1]}`} target="_blank" rel="noopener noreferrer" sx={{ fontSize: 12, color: '#2DD4D1', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: { xs: 130, md: 200 }, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>{info_expired.message.split(":")[1] || '—'}</Typography>
                                        <IconButton size="small" component="a" href={`https://solscan.io/token/${info_expired.message.split(":")[1]}`} target="_blank" rel="noopener noreferrer" sx={{ color: 'rgba(255,255,255,0.25)', p: 0.25, '&:hover': { color: '#2DD4D1' } }}><OpenInNewIcon sx={{ fontSize: 11 }} /></IconButton>
                                        <IconButton size="small" onClick={() => handleCopy(info_expired.message.split(":")[1])} sx={{ color: 'rgba(255,255,255,0.25)', p: 0.25 }}><ContentCopyIcon sx={{ fontSize: 11 }} /></IconButton>
                                    </Box>
                                </InfoRow>
                                <InfoRow label="SOL Delta"><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{formatSolAmount(info_expired.sol_delta)}</Typography></InfoRow>
                            </>)}
                        </Box>

                        {/* Right column */}
                        <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                            <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', px: 2, pt: 1.5, pb: 1 }}>Protocol</Typography>
                            <InfoRow label="Silent Reward Token"><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{formatBps(Number(info_expired.silent_reward_token_bps))}</Typography></InfoRow>
                            <InfoRow label="Silent Reward SOL"><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{formatBps(Number(info_expired.silent_reward_sol_bps))}</Typography></InfoRow>
                            <InfoRow label="Referral Fee"><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{info_expired.is_referral_fee_enabled ? 'Yes' : 'No'}</Typography></InfoRow>
                            <InfoRow label="Token Price"><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{Number(info_expired.token_price) > 0 ? `$${Number(info_expired.token_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}` : '—'}</Typography></InfoRow>
                            <InfoRow label="Jito Bundle ID">
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                    {info_expired.jito_bundle_id ? (
                                        <Typography component="a" href={`https://explorer.jito.wtf/events/${String(info_expired.jito_bundle_id)}`} target="_blank" rel="noopener noreferrer" sx={{ fontSize: 12, color: '#2DD4D1', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: { xs: 130, md: 200 }, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                                            {String(info_expired.jito_bundle_id)}
                                        </Typography>
                                    ) : <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>—</Typography>}
                                    {info_expired.jito_bundle_id && <IconButton size="small" onClick={() => handleCopy(info_expired.jito_bundle_id)} sx={{ color: 'rgba(255,255,255,0.25)', p: 0.25 }}><ContentCopyIcon sx={{ fontSize: 11 }} /></IconButton>}
                                </Box>
                            </InfoRow>
                        </Box>
                    </Box>

                    {/* Tabs: Decoded Bundle Txs + Jito Simulation Log */}
                    <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <AppBar position="static" sx={{ bgcolor: 'rgba(255,255,255,0.03)', boxShadow: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <Tabs
                                value={value}
                                onChange={handleChange}
                                indicatorColor="secondary"
                                textColor="inherit"
                                variant="fullWidth"
                                aria-label="transaction detail tabs"
                            >
                                {info_expired.decoded_bundle_txs.length !== 0 && <Tab label="Decoded Bundle Txs" {...a11yProps(0)} />}
                                <Tab label="Jito Simulation Log" {...a11yProps(1)} />
                            </Tabs>
                        </AppBar>
                        <TabPanel value={value} index={0} dir={theme.direction}>
                            {info_expired.decoded_bundle_txs.length !== 0 && (
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                                    <Box>
                                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', mb: 1, textAlign: 'center' }}>[loan] Decoded Transaction</Typography>
                                        <Divider sx={{ mb: 1, borderColor: 'rgba(255,255,255,0.08)' }} />
                                        {loanTx != null && <JsonCodePreview jsonString={rustDebugToJsonString(loanTx)} />}
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', mb: 1, textAlign: 'center' }}>[trade] Decoded Transaction</Typography>
                                        <Divider sx={{ mb: 1, borderColor: 'rgba(255,255,255,0.08)' }} />
                                        {tradeTx != null && <JsonCodePreview jsonString={rustDebugToJsonString(tradeTx)} />}
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', mb: 1, textAlign: 'center' }}>[repay] Decoded Transaction</Typography>
                                        <Divider sx={{ mb: 1, borderColor: 'rgba(255,255,255,0.08)' }} />
                                        {repayTx != null && <JsonCodePreview jsonString={rustDebugToJsonString(repayTx)} />}
                                    </Box>
                                </Box>
                            )}
                        </TabPanel>
                        <TabPanel value={value} index={1} dir={theme.direction}>
                            <Box>
                                <JsonCodePreview jsonString={info_expired.jito_simulation_log} />
                            </Box>
                        </TabPanel>
                    </Box>
                </Box>
            </Container>
        </LoadingOverlay>
    </main>
  );
};

export default Transaction;
