import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box, Paper, Typography, TextField, Button,
  InputAdornment, IconButton, Tooltip, useTheme, useMediaQuery,
  Dialog, DialogTitle, DialogContent,
} from '@mui/material';
import RadarIcon from '@mui/icons-material/Radar';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { toast } from 'react-toastify';

const ACCENT  = '#42FFFC';
const GREEN   = '#4ade80';
const ORANGE  = '#fb923c';
const RED     = '#f87171';
const PURPLE  = '#c4b5fd';
const BLUE    = '#93c5fd';
const YELLOW  = '#fbbf24';

const DIST_COLORS = [ACCENT, GREEN, YELLOW, ORANGE, PURPLE, BLUE, RED, '#f0abfc', '#67e8f9', '#a3e635'];

const API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;
const apiHeaders = () => ({ 'x-api-key': API_KEY ?? '' });

interface TokenMeta {
  symbol: string | null;
  name: string | null;
  logoURI?: string;
  priceUsd?: number | null;
  totalSupply?: number | null;
}

interface AccountResult {
  id: number;
  name: string;
  address: string;
  tokenAcctPubkey: string | null;
  balance: number | null;
  error: boolean;
}

type Classification = 'deposit' | 'trade' | 'unknown' | 'loading';

interface TxEntry {
  signature:       string | null;
  timestamp:       number | null;
  type:            string | null;
  source:          string | null;
  amount:          number;
  direction:       'in' | 'out';
  fromUserAccount: string | null;
  toUserAccount:   string | null;
  accountName:     string;
}

interface SourceResult {
  classification:  Classification;
  txSignature:     string | null;
  source:          string | null;
  type:            string | null;
  fromUserAccount: string | null;
  recentTxs?:      Omit<TxEntry, 'accountName'>[];
}

const PULSE = { '@keyframes pulse': { '0%,100%': { opacity: 0.45 }, '50%': { opacity: 0.9 } } } as const;

function Skel({ h = 36, d = 0, mb = 0.5 }: { h?: number; d?: number; mb?: number }) {
  return <Box sx={{ height: h, borderRadius: 1, mb, bgcolor: 'rgba(255,255,255,0.04)', ...PULSE, animation: `pulse 1.5s ${d}s ease-in-out infinite` }} />;
}

function getShield(maxPct: number | null, holdN: number, txCount: number) {
  if (holdN === 0) return { score: 0, label: '—', color: 'rgba(255,255,255,0.2)' };

  const concPts = maxPct === null ? 1
    : maxPct <= 0.1  ? 4
    : maxPct <= 1    ? 3
    : maxPct <= 5    ? 2
    : maxPct <= 15   ? 1
    : 0;

  const distPts = holdN >= 5 ? 2 : holdN >= 3 ? 1 : 0;
  const actPts  = txCount >= 10 ? 2 : txCount >= 5 ? 1 : 0;
  const penalty = holdN === 1 && (maxPct === null || maxPct > 1) ? 1 : 0;

  const score = Math.max(1, Math.min(5, concPts + distPts + actPts - penalty)) as 1|2|3|4|5;
  const LEVELS: Record<number, { label: string; color: string }> = {
    5: { label: 'Shielded', color: GREEN   },
    4: { label: 'Guarded',  color: '#86efac' },
    3: { label: 'Moderate', color: YELLOW  },
    2: { label: 'Exposed',  color: ORANGE  },
    1: { label: 'Low',      color: RED     },
  };
  return { score, ...LEVELS[score] };
}

function big(n: number) {
  const fmt = (v: number) => {
    if (v >= 100) return Math.round(v).toString();
    if (v >= 10)  return v.toFixed(1).replace(/\.0$/, '');
    return v.toFixed(2).replace(/\.?0+$/, '');
  };
  if (n >= 0.9995e12) return fmt(n / 1e12) + 'T';
  if (n >= 0.9995e9)  return fmt(n / 1e9)  + 'B';
  if (n >= 0.9995e6)  return fmt(n / 1e6)  + 'M';
  if (n >= 0.9995e3)  return fmt(n / 1e3)  + 'K';
  return n < 0.01 ? n.toExponential(1) : n.toFixed(2).replace(/\.?0+$/, '');
}

function usd(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}
function pct(n: number, digits = 4) {
  return n < 0.001 ? '<0.001%' : `${n.toLocaleString(undefined, { maximumFractionDigits: digits })}%`;
}

function SourceCell({ src }: { src?: SourceResult }) {
  if (!src || src.classification === 'loading') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
        <Box sx={{ width: 52, height: 16, borderRadius: '4px', bgcolor: 'rgba(255,255,255,0.05)', ...PULSE, animation: 'pulse 1.4s ease-in-out infinite' }} />
        <Box sx={{ width: 36, height: 10, borderRadius: '3px', bgcolor: 'rgba(255,255,255,0.04)', ...PULSE, animation: 'pulse 1.4s 0.15s ease-in-out infinite' }} />
      </Box>
    );
  }

  const isDeposit = src.classification === 'deposit';
  const isTrade   = src.classification === 'trade';
  if (!isDeposit && !isTrade) {
    return <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>—</Typography>;
  }

  const color = isDeposit ? GREEN : ACCENT;
  const label = isDeposit ? 'Deposit' : 'Trade';
  const from  = src.fromUserAccount;

  return (
    <Box>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35, px: 0.75, py: 0.25, borderRadius: '4px', bgcolor: `${color}12`, border: `1px solid ${color}30` }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color, opacity: 0.7, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</Typography>
      </Box>
      {isDeposit && from && (
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.2, mt: 0.25 }}>
          <Typography sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)' }}>
            from {from.slice(0, 6)}…{from.slice(-4)}
          </Typography>
          <IconButton size="small" component="a" href={`https://solscan.io/account/${from}`} target="_blank" rel="noopener noreferrer" sx={{ p: 0 }}>
            <OpenInNewIcon sx={{ fontSize: 8, color: 'rgba(255,255,255,0.15)' }} />
          </IconButton>
        </Box>
      )}
      {isDeposit && src.txSignature && (
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.2, mt: 0.2 }}>
          <Typography
            component="a"
            href={`https://solscan.io/tx/${src.txSignature}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ fontSize: 9, fontFamily: 'monospace', color: ACCENT, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            {src.txSignature.slice(0, 8)}…{src.txSignature.slice(-4)}
          </Typography>
          <OpenInNewIcon sx={{ fontSize: 8, color: 'rgba(255,255,255,0.2)' }} />
        </Box>
      )}
    </Box>
  );
}

export const TokenSearch = ({ defaultMint, onClose }: { defaultMint?: string; onClose?: () => void } = {}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [mintInput, setMintInput] = useState(defaultMint ?? '');
  const [searching, setSearching] = useState(false);
  const [meta, setMeta]           = useState<TokenMeta | null>(null);
  const [results, setResults]     = useState<AccountResult[] | null>(null);
  const [lastMint, setLastMint]   = useState('');
  const [sources, setSources]     = useState<Record<string, SourceResult>>({});
  const [txFeed, setTxFeed]       = useState<TxEntry[]>([]);
  const [txPopup, setTxPopup]     = useState<{ name: string; txs: Omit<TxEntry, 'accountName'>[] } | null>(null);
  const didAutoSearch              = useRef(false);

  const reset = useCallback(() => {
    setResults(null); setMeta(null); setLastMint(''); setMintInput(''); setSources({}); setTxFeed([]);
  }, []);

  const handleSearch = useCallback(async (overrideMint?: string) => {
    const mint = (overrideMint !== undefined ? overrideMint : mintInput).trim();
    if (!mint || searching) return;
    if (mint.length < 32 || mint.length > 44) { toast.error('Invalid token address', { autoClose: 2000 }); return; }
    setMintInput(mint);
    setSearching(true); setMeta(null); setResults(null); setLastMint(mint); setSources({}); setTxFeed([]);

    const [mRes, bRes] = await Promise.allSettled([
      fetch(`/api/jup-token?mint=${mint}`, { headers: apiHeaders() }).then(r => r.json()),
      fetch(`/api/token-balances?mint=${mint}`, { headers: apiHeaders() }).then(r => r.json()),
    ]);

    setMeta(mRes.status === 'fulfilled'
      ? { symbol: mRes.value.symbol, name: mRes.value.name, logoURI: mRes.value.logoURI, priceUsd: mRes.value.priceUsd, totalSupply: mRes.value.totalSupply ?? null }
      : { symbol: null, name: null, priceUsd: null, totalSupply: null });

    if (bRes.status === 'fulfilled' && Array.isArray(bRes.value.accounts)) setResults(bRes.value.accounts);
    else { toast.error('Failed to fetch balances', { autoClose: 2500 }); setResults([]); }
    setSearching(false);
  }, [mintInput, searching]);

  useEffect(() => {
    if (!results || !lastMint) return;
    // Include past holders (0 balance but token account still exists) so we can show their tx history
    const holding = results.filter(r => !r.error && r.tokenAcctPubkey);
    if (!holding.length) return;
    const init: Record<string, SourceResult> = {};
    holding.forEach(r => { init[r.address] = { classification: 'loading', txSignature: null, source: null, type: null, fromUserAccount: null }; });
    setSources(init);
    fetch('/api/token-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...apiHeaders() },
      body: JSON.stringify({ accounts: holding.map(r => ({ name: r.name, address: r.address, tokenAcctPubkey: r.tokenAcctPubkey })), mint: lastMint }),
    }).then(r => r.json()).then(data => {
      if (!Array.isArray(data.results)) return;
      const map: Record<string, SourceResult> = {};
      const allTxs: TxEntry[] = [];
      data.results.forEach((r: any) => {
        map[r.address] = { classification: r.classification, txSignature: r.txSignature, source: r.source, type: r.type, fromUserAccount: r.fromUserAccount ?? null, recentTxs: r.recentTxs ?? [] };
        (r.recentTxs ?? []).forEach((tx: any) => allTxs.push({ ...tx, accountName: r.name }));
      });
      setSources(map);
      setTxFeed(allTxs.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)));
    }).catch(() => {});
  }, [results, lastMint]);

  useEffect(() => {
    if (defaultMint && !didAutoSearch.current) {
      didAutoSearch.current = true;
      handleSearch(defaultMint);
    }
  }, []); // intentionally empty — run once on mount only

  const active       = results?.filter(r => !r.error && (r.balance ?? 0) > 0) ?? null;
  const pastHolders  = results?.filter(r => !r.error && (r.balance ?? 0) === 0 && r.tokenAcctPubkey) ?? null;
  const errCount     = results?.filter(r => r.error).length ?? 0;
  const holdN        = active?.length ?? 0;
  const total        = active?.reduce((s, r) => s + (r.balance ?? 0), 0) ?? 0;
  const avg          = holdN > 0 ? total / holdN : 0;
  const price        = meta?.priceUsd ?? null;
  const supply       = meta?.totalSupply ?? null;
  const totalUsd_    = price != null && total > 0 ? total * price : null;
  const avgUsd_      = price != null && holdN > 0 ? avg * price : null;

  const maxSupplyPct = supply != null && supply > 0 && holdN > 0
    ? Math.max(...active!.map(r => ((r.balance ?? 0) / supply) * 100))
    : null;
  const totalHeldPct = supply != null && supply > 0 && total > 0
    ? (total / supply) * 100
    : null;
  const highN        = supply != null && active
    ? active.filter(r => ((r.balance ?? 0) / (supply || 1)) * 100 > 5).length
    : 0;

  const rating      = getShield(maxSupplyPct, holdN, txFeed.length);
  const sym         = meta?.symbol ?? null;
  const showResults = !searching && results !== null;
  const compact     = holdN >= 5;

  const chips = holdN > 0 ? [
    { label: 'Total',        value: big(total),                                              sub: sym ?? 'tokens', color: GREEN  },
    ...(totalUsd_ != null ? [{ label: 'USD Value',    value: usd(totalUsd_),                sub: 'estimated',     color: PURPLE }] : []),
    { label: 'Accounts',     value: `${holdN} / 10`,                                        sub: 'holding',       color: ACCENT },
    { label: 'Avg / Wallet', value: avgUsd_ != null ? usd(avgUsd_) : big(avg),              sub: sym ?? 'tokens', color: BLUE   },
    ...(totalHeldPct != null ? [{ label: '% of Supply', value: pct(totalHeldPct),           sub: 'total exposure', color: YELLOW }] : []),
  ] : [];

  return (
    <Paper elevation={0} sx={{ overflow: 'hidden', borderRadius: 2, border: '1px solid rgba(255,255,255,0.07)', bgcolor: 'background.paper' }}>
      <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <RadarIcon sx={{ fontSize: 12, color: 'text.disabled', flexShrink: 0 }} />
        <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em', flex: 1 }}>Token Holdings</Typography>
        {lastMint && (
          <Tooltip title="Copy shareable link">
            <IconButton size="small" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/utils?token=${lastMint}`); toast.success('Link copied', { autoClose: 1000 }); }}
              sx={{ color: 'text.disabled', p: 0.3, '&:hover': { color: ACCENT } }}>
              <LinkIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>
        )}
        {(results !== null || onClose) && (
          <Tooltip title="Close">
            <IconButton size="small" onClick={() => { reset(); onClose?.(); }} sx={{ color: 'text.disabled', p: 0.3, '&:hover': { color: 'text.secondary' } }}>
              <CloseIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Box sx={{ p: 1.5 }}>
        {!defaultMint && <Box sx={{ display: 'flex', gap: 0.75, mb: (results !== null || searching) ? 1.5 : 0 }}>
          <TextField size="small" fullWidth placeholder="Paste token mint address…" value={mintInput} disabled={searching}
            onChange={e => setMintInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            InputProps={{
              sx: { fontFamily: 'monospace', fontSize: 12, borderRadius: '7px', '& fieldset': { borderColor: 'rgba(255,255,255,0.10)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.18)' }, '&.Mui-focused fieldset': { borderColor: 'rgba(255,255,255,0.28)' } },
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 15, color: 'text.disabled' }} /></InputAdornment>,
            }}
          />
          <Button variant="outlined" onClick={() => handleSearch()} disabled={searching || !mintInput.trim()}
            sx={{ px: 2.5, borderRadius: '7px', flexShrink: 0, fontSize: 11, fontWeight: 700, textTransform: 'none', color: ACCENT, borderColor: `${ACCENT}4D`, '&:hover': { borderColor: `${ACCENT}99`, bgcolor: `${ACCENT}12` }, '&.Mui-disabled': { opacity: 0.35, color: ACCENT, borderColor: `${ACCENT}30` } }}
          >
            {searching ? 'Scanning…' : 'Scan →'}
          </Button>
        </Box>}
        {searching && (
          <Box>
            <Skel h={72} d={0} />
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              {[0, 0.08, 0.16, 0.24].map((d, i) => <Skel key={i} h={54} d={d} mb={0} />)}
            </Box>
            {[0, 0.08, 0.16].map((d, i) => <Skel key={i} h={36} d={d} />)}
          </Box>
        )}
        {showResults && meta && (
          <Box sx={{
            mb: active && active.length > 0 ? 1 : 0,
            borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden',
            '@keyframes fi': { from: { opacity: 0, transform: 'translateY(-3px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
            animation: 'fi 0.2s cubic-bezier(0.22,1,0.36,1) both',
          }}>
            {/* Token identity + risk row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.06)', bgcolor: 'rgba(255,255,255,0.012)' }}>
              {meta.logoURI ? (
                <Box sx={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(255,255,255,0.1)' }}>
                  <Box component="img" src={meta.logoURI} alt={sym ?? ''}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.65, filter: 'brightness(0.85) saturate(0.75)' }}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.parentElement!.style.display = 'none'; }} />
                </Box>
              ) : (
                <Box sx={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {sym ? <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.disabled' }}>{sym.slice(0, 3).toUpperCase()}</Typography>
                       : <HelpOutlineIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
                </Box>
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap', mb: 0.4 }}>
                  {sym ? <Typography sx={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>{sym}</Typography>
                       : <Typography sx={{ fontSize: 13, color: 'text.disabled', fontStyle: 'italic' }}>Unverified token</Typography>}
                  {meta.name && <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1 }}>{meta.name}</Typography>}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                  {price != null && (
                    <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, lineHeight: 1 }}>
                      ${price < 0.01 ? price.toExponential(2) : price.toLocaleString(undefined, { maximumFractionDigits: 5 })}
                    </Typography>
                  )}
                  {supply != null && <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1 }}>supply {big(supply)}</Typography>}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    <Tooltip title={lastMint}>
                      <Typography sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.18)' }}>{lastMint.slice(0, 6)}…{lastMint.slice(-4)}</Typography>
                    </Tooltip>
                    <IconButton size="small" sx={{ p: 0.15 }} onClick={() => { navigator.clipboard.writeText(lastMint); toast.success('Copied', { autoClose: 800 }); }}>
                      <ContentCopyIcon sx={{ fontSize: 9, color: 'rgba(255,255,255,0.12)' }} />
                    </IconButton>
                    <IconButton size="small" component="a" href={`https://solscan.io/token/${lastMint}`} target="_blank" rel="noopener noreferrer" sx={{ p: 0.15 }}>
                      <OpenInNewIcon sx={{ fontSize: 9, color: 'rgba(255,255,255,0.12)' }} />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
              {holdN > 0 ? (
                <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                  <Typography sx={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', mb: 0.25 }}>Shield Score</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.4, justifyContent: 'flex-end' }}>
                    <Typography sx={{ fontSize: 36, fontWeight: 900, lineHeight: 1, color: rating.color, fontVariantNumeric: 'tabular-nums', opacity: 0.75 }}>{rating.score > 0 ? rating.score : '—'}</Typography>
                    {rating.score > 0 && <Typography sx={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.2)', lineHeight: 1 }}>/5</Typography>}
                  </Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: rating.color, opacity: 0.7, mt: 0.25 }}>{rating.label}</Typography>
                </Box>
              ) : (
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'right', lineHeight: 1.4, flexShrink: 0 }}>No holdings</Typography>
              )}
            </Box>

            {/* Compact stats strip */}
            {chips.length > 0 && (
              <Box sx={{
                display: { xs: 'grid', sm: 'flex' },
                gridTemplateColumns: { xs: '1fr 1fr', sm: undefined },
                alignItems: { sm: 'center' },
                px: 1.5, py: { xs: 1, sm: 0.75 },
                gap: { xs: 0, sm: 0 },
                borderBottom: (maxSupplyPct != null || holdN > 1) ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                {chips.map((c, i) => (
                  <Box key={c.label} sx={{ display: 'flex', alignItems: 'center', gap: 0, flex: 1, py: { xs: 0.5, sm: 0 }, borderBottom: { xs: i < chips.length - 2 ? '1px solid rgba(255,255,255,0.04)' : 'none', sm: 'none' } }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 9, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', lineHeight: 1, mb: 0.25 }}>{c.label}</Typography>
                      <Typography sx={{ fontSize: { xs: 13, sm: 15 }, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.55)' }}>{c.value}</Typography>
                      <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', mt: 0.2, lineHeight: 1 }}>{c.sub}</Typography>
                    </Box>
                    {i < chips.length - 1 && <Box sx={{ display: { xs: 'none', sm: 'block' }, width: '1px', bgcolor: 'rgba(255,255,255,0.06)', height: 28, flexShrink: 0, mx: 1 }} />}
                  </Box>
                ))}
              </Box>
            )}

            {/* Exposure bar + distribution */}
            {(maxSupplyPct != null || (active && holdN > 1)) && (
              <Box sx={{ px: { xs: 1, sm: 1.5 }, py: 0.85 }}>
                {maxSupplyPct != null && supply != null && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: holdN > 1 ? 0.75 : 0 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Max exposure</Typography>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.38)' }}>{pct(maxSupplyPct)}</Typography>
                      </Box>
                      <Box sx={{ position: 'relative', height: 2, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.06)' }}>
                        {(() => { const scale = Math.max(maxSupplyPct, 10); const fw = Math.min((maxSupplyPct / scale) * 100, 100); return <Box sx={{ position: 'absolute', inset: 0, width: `${fw}%`, bgcolor: 'rgba(255,255,255,0.3)', borderRadius: 1, '@keyframes bg': { from: { width: '0%' }, to: { width: `${fw}%` } }, animation: 'bg 0.6s 0.1s cubic-bezier(0.22,1,0.36,1) both' }} />; })()}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                      {totalHeldPct != null && <Box><Typography sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.25)' }}>Total</Typography><Typography sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums' }}>{pct(totalHeldPct)}</Typography></Box>}
                      <Box><Typography sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.25)' }}>&gt;5%</Typography><Typography sx={{ fontSize: 12, fontWeight: 600, color: highN > 0 ? 'rgba(255,255,255,0.45)' : 'text.secondary' }}>{highN}w</Typography></Box>
                    </Box>
                  </Box>
                )}
                {active && holdN > 1 && (
                  <Box>
                    <Box sx={{ display: 'flex', height: 8, borderRadius: '3px', overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.03)', gap: '1px', mb: 0.5 }}>
                      {active.map((r, i) => {
                        const share = total > 0 ? ((r.balance ?? 0) / total) * 100 : 0;
                        return (
                          <Tooltip key={r.address} title={`Trading Account #${r.name.replace('Account #', '')}: ${share.toFixed(1)}% — ${big(r.balance!)} ${sym ?? ''}`} placement="top">
                            <Box sx={{ width: `${share}%`, bgcolor: DIST_COLORS[i % DIST_COLORS.length], opacity: 0.45, '&:hover': { opacity: 0.7 }, transition: 'opacity 0.1s', cursor: 'default', minWidth: share > 0 ? 2 : 0, '@keyframes dw': { from: { width: '0%' }, to: { width: `${share}%` } }, animation: `dw 0.5s ${0.06 + i * 0.03}s cubic-bezier(0.22,1,0.36,1) both` }} />
                          </Tooltip>
                        );
                      })}
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px' }}>
                      {active.map((r, i) => {
                        const share = total > 0 ? ((r.balance ?? 0) / total) * 100 : 0;
                        const col = DIST_COLORS[i % DIST_COLORS.length];
                        const num = r.name.replace('Account #', '');
                        return (
                          <Box key={r.address} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                            <Box sx={{ width: 5, height: 5, borderRadius: '1px', bgcolor: col, opacity: 0.45, flexShrink: 0 }} />
                            <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>
                              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Trading Account </Box>
                              #{num}: <Box component="span" sx={{ color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{share.toFixed(1)}%</Box>
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}

        {showResults && active && active.length > 0 && (
          <Box sx={{
            display: 'flex', flexDirection: 'column', gap: compact ? '4px' : '6px',
            '@keyframes fi2': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
            animation: 'fi2 0.2s 0.05s cubic-bezier(0.22,1,0.36,1) both',
          }}>
            {active.map((r, idx) => {
              const sharePct = total > 0 && r.balance != null ? (r.balance / total) * 100 : 0;
              const usdVal   = price != null && r.balance != null ? r.balance * price : null;
              const supPct   = supply != null && supply > 0 && r.balance != null ? (r.balance / supply) * 100 : null;
              const isHigh   = supPct != null && supPct > 5;
              const isMed    = supPct != null && !isHigh && supPct > 2;
              const src      = sources[r.address];
              const solLink  = r.tokenAcctPubkey ? `https://solscan.io/account/${r.tokenAcctPubkey}` : `https://solscan.io/account/${r.address}`;
              const col      = DIST_COLORS[idx % DIST_COLORS.length];
              const acctNum  = r.name.replace('Account #', '');

              return (
                <Box key={r.address} sx={{
                  borderRadius: '7px',
                  border: '1px solid rgba(255,255,255,0.07)',
                  overflow: 'hidden',
                  bgcolor: 'rgba(255,255,255,0.015)',
                  '@keyframes ri': { from: { opacity: 0, transform: 'translateY(3px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
                  animation: `ri 0.18s ${0.06 + idx * 0.05}s both`,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.028)', borderColor: `${col}25` },
                  transition: 'background 0.15s, border-color 0.15s',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
                    {/* Subtle left accent matching chart color */}
                    <Box sx={{ width: 3, bgcolor: col, opacity: 0.28, flexShrink: 0 }} />

                    <Box sx={{ flex: 1, px: 1.25, py: 0.6, display: 'flex', alignItems: 'center', gap: 1 }}>
                      {/* Account identity */}
                      <Box sx={{ minWidth: 110 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 5, height: 5, borderRadius: '2px', bgcolor: col, opacity: 0.55, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.72)', lineHeight: 1, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                            Trading Account #{acctNum}
                          </Typography>
                        </Box>
                        <Typography component="a" href={solLink} target="_blank" rel="noopener noreferrer"
                          sx={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.18)', textDecoration: 'none', '&:hover': { color: ACCENT }, display: 'block', mt: 0.25, pl: '9px' }}>
                          {r.address.slice(0, 6)}…{r.address.slice(-4)}
                        </Typography>
                      </Box>

                      {/* Source */}
                      <Box sx={{ flex: 1 }}>
                        <SourceCell src={src} />
                      </Box>

                      {/* Balance */}
                      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.62)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-0.02em' }}>
                          {big(r.balance!)}
                        </Typography>
                        {usdVal != null && <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontVariantNumeric: 'tabular-nums', mt: 0.2 }}>{usd(usdVal)}</Typography>}
                      </Box>
                    </Box>

                    {/* Share panel */}
                    <Box sx={{
                      width: 48, flexShrink: 0,
                      bgcolor: 'rgba(0,0,0,0.18)',
                      borderLeft: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', px: 0.5,
                    }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.38)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                        {sharePct.toFixed(0)}%
                      </Typography>
                    </Box>

                    {/* Tx history button */}
                    {(() => {
                      const acctTxs = sources[r.address]?.recentTxs ?? [];
                      if (!acctTxs.length) return null;
                      return (
                        <Box sx={{ width: 28, flexShrink: 0, bgcolor: 'rgba(0,0,0,0.12)', borderLeft: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Tooltip title={`${acctTxs.length} transactions`}>
                            <IconButton size="small" onClick={() => setTxPopup({ name: `Trading Account #${acctNum}`, txs: acctTxs })}
                              sx={{ p: 0.4, color: 'rgba(255,255,255,0.2)', '&:hover': { color: ACCENT } }}>
                              <ReceiptLongIcon sx={{ fontSize: 12 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      );
                    })()}
                  </Box>

                  {/* Bottom share bar */}
                  <Box sx={{ height: 1, bgcolor: 'rgba(255,255,255,0.03)' }}>
                    <Box sx={{ height: '100%', width: `${sharePct}%`, bgcolor: col, opacity: 0.35, '@keyframes bg2': { from: { width: '0%' }, to: { width: `${sharePct}%` } }, animation: `bg2 0.5s ${0.1 + idx * 0.05}s cubic-bezier(0.22,1,0.36,1) both` }} />
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {txFeed.length > 0 && (() => {
          const inbound  = txFeed.filter(t => t.direction === 'in');
          const outbound = txFeed.filter(t => t.direction === 'out');
          const deposits = inbound.filter(t => t.type !== 'SWAP' && t.type).length;
          const trades   = inbound.filter(t => t.type === 'SWAP').length;
          const sells    = outbound.length;
          const counts = [
            { label: 'Deposit',       n: deposits, color: GREEN  },
            { label: 'Trade',         n: trades,   color: ACCENT },
            { label: 'Withdraw/Sell', n: sells,    color: YELLOW },
          ].filter(c => c.n > 0);
          return (
            <Box sx={{
              mt: 1, borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden',
              '@keyframes fi4': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
              animation: 'fi4 0.25s 0.1s cubic-bezier(0.22,1,0.36,1) both',
            }}>
              <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', mr: 0.5 }}>Activity</Typography>
                {counts.map((c, i) => (
                  <Box key={c.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {i > 0 && <Box sx={{ width: '1px', height: 12, bgcolor: 'rgba(255,255,255,0.07)' }} />}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, px: 0.75, py: 0.25, borderRadius: '4px', bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
                      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.3)' }} />
                      <Typography sx={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.45)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{c.n}</Typography>
                      <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}{c.n !== 1 ? 's' : ''}</Typography>
                    </Box>
                  </Box>
                ))}
                <Box sx={{ flex: 1 }} />
                <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>{txFeed.length} txs scanned</Typography>
              </Box>
            </Box>
          );
        })()}

        {/* Past holders — accounts that had this token but now hold 0 */}
        {showResults && active && active.length === 0 && pastHolders && pastHolders.length > 0 && (
          <Box sx={{
            mt: 0.5, display: 'flex', flexDirection: 'column', gap: '4px',
            '@keyframes fi5': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
            animation: 'fi5 0.2s 0.05s cubic-bezier(0.22,1,0.36,1) both',
          }}>
            <Typography sx={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', px: 0.5, mb: 0.25 }}>
              Past Holdings — no longer held
            </Typography>
            {pastHolders.map((r, idx) => {
              const src      = sources[r.address];
              const acctNum  = r.name.replace('Account #', '');
              const col      = DIST_COLORS[idx % DIST_COLORS.length];
              const solLink  = `https://solscan.io/account/${r.tokenAcctPubkey ?? r.address}`;
              const acctTxs  = src?.recentTxs ?? [];
              const lastOut  = acctTxs.find(t => t.direction === 'out');
              const lastOutAmt = lastOut ? big(lastOut.amount) : null;

              return (
                <Box key={r.address} sx={{
                  borderRadius: '7px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden',
                  bgcolor: 'rgba(255,255,255,0.008)', opacity: 0.75,
                  '@keyframes rip': { from: { opacity: 0 }, to: { opacity: 0.75 } },
                  animation: `rip 0.18s ${0.04 + idx * 0.04}s both`,
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
                    <Box sx={{ width: 3, bgcolor: col, opacity: 0.18, flexShrink: 0 }} />
                    <Box sx={{ flex: 1, px: 1.25, py: 0.6, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ minWidth: 110 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 5, height: 5, borderRadius: '2px', bgcolor: col, opacity: 0.3, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', lineHeight: 1, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                            Trading Account #{acctNum}
                          </Typography>
                        </Box>
                        <Typography component="a" href={solLink} target="_blank" rel="noopener noreferrer"
                          sx={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.15)', textDecoration: 'none', '&:hover': { color: ACCENT }, display: 'block', mt: 0.25, pl: '9px' }}>
                          {r.address.slice(0, 6)}…{r.address.slice(-4)}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        {src && src.classification !== 'loading' && src.classification !== 'unknown' ? (
                          <SourceCell src={src} />
                        ) : src?.classification === 'loading' ? (
                          <Box sx={{ width: 40, height: 14, borderRadius: '3px', bgcolor: 'rgba(255,255,255,0.04)', ...PULSE, animation: 'pulse 1.4s ease-in-out infinite' }} />
                        ) : null}
                      </Box>
                      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 0.75, py: 0.2, borderRadius: '4px', bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Exited</Typography>
                        </Box>
                        {lastOutAmt && (
                          <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', mt: 0.3, fontVariantNumeric: 'tabular-nums' }}>
                            −{lastOutAmt} {sym ?? ''}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    {acctTxs.length > 0 && (
                      <Box sx={{ width: 28, flexShrink: 0, bgcolor: 'rgba(0,0,0,0.1)', borderLeft: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Tooltip title={`${acctTxs.length} transactions`}>
                          <IconButton size="small" onClick={() => setTxPopup({ name: `Trading Account #${acctNum}`, txs: acctTxs })}
                            sx={{ p: 0.4, color: 'rgba(255,255,255,0.18)', '&:hover': { color: ACCENT } }}>
                            <ReceiptLongIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {showResults && active && active.length === 0 && (!pastHolders || pastHolders.length === 0) && (
          <Box sx={{ textAlign: 'center', py: 2, '@keyframes fi3': { from: { opacity: 0 }, to: { opacity: 1 } }, animation: 'fi3 0.2s both' }}>
            <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>No Vanish accounts hold this token</Typography>
            {errCount > 0 && <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.5 }}>({errCount} account{errCount > 1 ? 's' : ''} failed to query)</Typography>}
          </Box>
        )}
      </Box>

      {/* Per-account transaction history popup */}
      <Dialog
        open={!!txPopup}
        onClose={() => setTxPopup(null)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{ sx: { bgcolor: 'background.paper', backgroundImage: 'none', borderRadius: isMobile ? 0 : 2, border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <ReceiptLongIcon sx={{ fontSize: 14, color: ACCENT }} />
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{txPopup?.name}</Typography>
            <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>· recent transactions</Typography>
          </Box>
          <IconButton size="small" onClick={() => setTxPopup(null)} sx={{ color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 0 }}>
          {txPopup && (
            <Box>
              {txPopup.txs.length === 0 ? (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>No transactions found</Typography>
                </Box>
              ) : (
                txPopup.txs.map((tx, i) => {
                  const isIn    = tx.direction === 'in';
                  const isSwap  = tx.type === 'SWAP';
                  const typeCol = isSwap ? ACCENT : isIn ? GREEN : YELLOW;
                  const ts      = tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleString() : '—';
                  return (
                    <Box key={tx.signature ?? i} sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1,
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.025)' },
                    }}>
                      {/* Direction chip */}
                      <Box sx={{ px: 0.75, py: 0.2, borderRadius: '4px', bgcolor: `${typeCol}15`, border: `1px solid ${typeCol}35`, flexShrink: 0 }}>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: typeCol, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {isSwap ? 'Swap' : isIn ? 'In' : 'Out'}
                        </Typography>
                      </Box>
                      {/* Amount */}
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.55)', fontVariantNumeric: 'tabular-nums', minWidth: 80 }}>
                        {isIn ? '+' : '−'}{big(tx.amount)} {sym ?? ''}
                      </Typography>
                      {/* Timestamp */}
                      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flex: 1 }}>{ts}</Typography>
                      {/* Links */}
                      {tx.signature && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                          <Typography sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)' }}>
                            {tx.signature.slice(0, 8)}…
                          </Typography>
                          <Tooltip title="View in dashboard">
                            <IconButton size="small" component="a" href={`/transaction?tx_id=${tx.signature}`} target="_blank" rel="noopener noreferrer"
                              sx={{ p: 0.4, color: 'rgba(255,255,255,0.25)', '&:hover': { color: ACCENT } }}>
                              <OpenInNewIcon sx={{ fontSize: 12 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View on Solscan">
                            <IconButton size="small" component="a" href={`https://solscan.io/tx/${tx.signature}`} target="_blank" rel="noopener noreferrer"
                              sx={{ p: 0.4, color: 'rgba(255,255,255,0.25)', '&:hover': { color: '#9945FF' } }}>
                              <OpenInNewIcon sx={{ fontSize: 12 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </Box>
                  );
                })
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Paper>
  );
};
