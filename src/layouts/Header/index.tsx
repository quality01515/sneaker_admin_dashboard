import { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useFocusedMode } from 'src/contexts/FocusedModeContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';

import {
  Box,
  alpha,
  CircularProgress,
  Divider,
  IconButton,
  InputBase,
  Tooltip,
  Typography,
  styled,
  useTheme
} from '@mui/material';
import { MenuTwoTone, CloseTwoTone, OpenInNew, Search as SearchIcon } from '@mui/icons-material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

import { SidebarContext } from 'src/contexts/SidebarContext';
import { RootState } from 'src/store';
import { ADMIN_FLAG, COOKIE_SIGNATURE, COOKIE_TIMESTAMP } from 'src/config';
import { initialAuthState, setToken } from 'src/store/authSlice';
import { setLoginStatus } from 'src/store/userSlice';
import { resetAdminStatus } from 'src/store/adminSlice';
import { useCookie, getCookieValue } from 'src/utils/useCookie';
import { toast } from 'react-toastify';
import { RentTopUp } from 'src/components/RentTopUp';

const TRADING_ACCOUNTS = [
  { id: 1,  address: '7ozoNcVqgptbAUHjLR1vNHgEfKiE5aYufStEHzJhxKeG', name: 'Vanish: Trading Account #1'  },
  { id: 2,  address: 'DM1kVwqbNJYeDgKn2T3UbCHqquSh3PAYHJpRYfTCcbrK', name: 'Vanish: Trading Account #2'  },
  { id: 3,  address: '2bxLnNUgnbf7d4CX4sfdY2YoJkKirNc5FHE6awRwKKYY',  name: 'Vanish: Trading Account #3'  },
  { id: 4,  address: '3PMpWWXCVUrkhHpFWPH1prxBYxQ4SV4rucJchYRSBojH', name: 'Vanish: Trading Account #4'  },
  { id: 5,  address: '8MjKXQgj97NPVNhj9gJrQNP7BibGCGkFMVJ2qZsC58E',  name: 'Vanish: Trading Account #5'  },
  { id: 6,  address: 'Evamno6in8wQGBKUnVbu3FQV5eNwn2ttE5456yDbnodR', name: 'Vanish: Trading Account #6'  },
  { id: 7,  address: '49zHSpdFZaSc92ygkooaMGVeeriLSXX5ujriDWVxTwVS', name: 'Vanish: Trading Account #7'  },
  { id: 8,  address: '37p56C7BLiMyG2jEa7zTNSewj94C34SuFEnxnRZ87kWw', name: 'Vanish: Trading Account #8'  },
  { id: 9,  address: '2QbCx4cTy11nv5FieXJkAKPvSVGdFcZPFdDMTo9vEfqm', name: 'Vanish: Trading Account #9'  },
  { id: 10, address: '7juKfkXpvYHqjhxwK1Se2Mod96hHETHNduC9BMxBdxyt', name: 'Vanish: Trading Account #10' },
];

const VANISH_PROGRAM  = 'https://solscan.io/account/vanshF62ku4jVVdf8DS47SXuJC1rq8qokGSANAomhey';
const RENT_ACCOUNT    = 'https://solscan.io/account/BxEpKHc9MhTNNNL3m9hHufb4sbHqVzZ1wm7Yt8BMeJDD';
const RENT_ADDRESS    = 'BxEpKHc9MhTNNNL3m9hHufb4sbHqVzZ1wm7Yt8BMeJDD';

const HeaderWrapper = styled(Box)(
  ({ theme }) => `
    height: ${theme.header.height};
    color: ${theme.header.textColor};
    padding: ${theme.spacing(0, 1)};
    right: 0;

    @media (min-width: ${theme.breakpoints.values.sm}px) {
      padding: ${theme.spacing(0, 2)};
    }
    z-index: 6;
    background-color: ${theme.header.background};
    border-bottom: 1px solid ${alpha('#FFFFFF', 0.06)};
    position: fixed;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;

    @media (min-width: ${theme.breakpoints.values.lg}px) {
      left: ${theme.sidebar.width};
      width: auto;
    }
`
);

const PAGE_LABELS: Record<string, string> = {
  analyze:      'Monitor · Analyze',
  monitor:      'Monitor · Diagnostics',
  reconciliation:'Monitor · Reconciliation',
  events:       'Monitor · Events',
  users:        'Protocol · Users',
  user_points:  'Protocol · User Points',
  transactions: 'Protocol · Transactions',
  transaction:  'Transaction',
  refund:       'Protocol · Screening',
  screening:    'Protocol · Screening',
  silent_fees:  'Platform · Silent Rewards',
  refferal_fees:'Platform · Referral Fees',
  utils:        'Monitor · Utilities',
  teams:        'Core · Teams',
  wallets:      'Core · Accounts',
  admins:       'Core · Members',
  overview:     'Overview',
  user:         'User Detail',
  banks:        'Banks'
};

function truncateAddress(address: string): string {
  return address.slice(0, 4);
}

// ── Health badge ────────────────────────────────────────────────────
function HealthBadge() {
  const theme = useTheme();
  const [status, setStatus]   = useState<'online' | 'offline' | 'checking'>('checking');

  const check = useCallback(async (minMs = 0) => {
    setStatus('checking');
    let next: 'online' | 'offline' = 'online';
    await Promise.all([
      axios.get(`${process.env.REACT_APP_API_BASE_URL}/health`).catch(() => { next = 'offline'; }),
      new Promise<void>((r) => setTimeout(r, minMs)),
    ]);
    setStatus(next);
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(() => check(), 60_000);
    return () => clearInterval(id);
  }, [check]);

  const dotColor =
    status === 'online'   ? theme.palette.success.main :
    status === 'offline'  ? theme.palette.error.main   :
    alpha('#FFFFFF', 0.35);

  const label =
    status === 'online'  ? 'Online' :
    status === 'offline' ? 'Offline' :
    'Checking';

  return (
    <Box
        onClick={() => check(1000)}
        sx={{
          display:         'flex',
          alignItems:      'center',
          gap:             0.75,
          px:              1.25,
          py:              0.5,
          borderRadius:    '5px',
          border:          `1px solid ${alpha('#FFFFFF', 0.07)}`,
          backgroundColor: alpha('#FFFFFF', 0.03),
          cursor:          'pointer',
          userSelect:      'none',
          transition:      'background-color 0.15s',
          '&:hover':       { backgroundColor: alpha('#FFFFFF', 0.06) }
        }}
      >
        {status === 'checking' ? (
          <CircularProgress size={7} thickness={5} sx={{ color: alpha('#FFFFFF', 0.35) }} />
        ) : (
          <Box sx={{ position: 'relative', width: 6, height: 6, flexShrink: 0 }}>
            {status === 'online' && (
              <Box sx={{
                position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: dotColor,
                '@keyframes ping': { '0%': { transform: 'scale(1)', opacity: 0.75 }, '100%': { transform: 'scale(2.4)', opacity: 0 } },
                animation: 'ping 1.4s ease-out infinite',
              }} />
            )}
            <Box sx={{ position: 'relative', width: 6, height: 6, borderRadius: '50%', bgcolor: dotColor }} />
          </Box>
        )}
        <Typography sx={{
          fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em',
          textTransform: 'uppercase', lineHeight: 1,
          color: status === 'online' ? theme.palette.success.main
               : status === 'offline' ? theme.palette.error.main
               : alpha('#FFFFFF', 0.40)
        }}>
          {label}
        </Typography>
      </Box>
  );
}

// ── Accounts dropdown (hover, no portal = no flash) ─────────────────
function AccountsDropdown() {
  const { is_super_admin } = useSelector((state: RootState) => state.admin);
  const isSuperAdmin = is_super_admin || localStorage.getItem(ADMIN_FLAG) === '1';
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  if (!isSuperAdmin) return null;

  return (
    <Box
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{ position: 'relative', display: 'inline-flex' }}
    >
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5,
        borderRadius: '5px', border: `1px solid ${alpha('#FFFFFF', open ? 0.12 : 0.07)}`,
        backgroundColor: open ? alpha('#FFFFFF', 0.05) : alpha('#FFFFFF', 0.03),
        cursor: 'default', userSelect: 'none', transition: 'all 0.15s',
      }}>
        <AccountBalanceWalletIcon sx={{ fontSize: '13px', color: alpha('#FFFFFF', 0.45) }} />
        <Typography sx={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em',
          textTransform: 'uppercase', color: alpha('#FFFFFF', 0.50), lineHeight: 1 }}>
          Trading Accounts
        </Typography>
      </Box>

      {open && (
        <Box
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          sx={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 1400,
            width: 310, backgroundColor: '#1A1A1F',
            border: `1px solid ${alpha('#FFFFFF', 0.08)}`, borderRadius: '8px',
            boxShadow: `0 12px 40px ${alpha('#000', 0.6)}`, overflow: 'hidden',
          }}>
          {TRADING_ACCOUNTS.map((acc) => (
            <Box
              key={acc.id}
              component="a"
              href={`https://solscan.io/account/${acc.address}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                px: 1.5, py: 0.875, textDecoration: 'none',
                borderBottom: `1px solid ${alpha('#FFFFFF', 0.05)}`,
                '&:last-child': { borderBottom: 'none' },
                transition: 'background-color 0.1s',
                '&:hover': { backgroundColor: alpha('#FFFFFF', 0.04) },
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: alpha('#FFFFFF', 0.85), mb: 0.25, lineHeight: 1.3 }}>
                  {acc.name}
                </Typography>
                <Typography sx={{ fontSize: '11px', color: alpha('#FFFFFF', 0.38), fontFamily: '"JetBrains Mono","Fira Code",monospace', lineHeight: 1 }}>
                  {truncateAddress(acc.address)}
                </Typography>
              </Box>
              <OpenInNew sx={{ fontSize: '12px', color: alpha('#FFFFFF', 0.25), flexShrink: 0 }} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ── Global search ────────────────────────────────────────────────────
function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const theme = useTheme();

  const go = () => {
    const v = query.trim();
    if (!v) return;
    if (v.length > 60) {
      navigate(`/transaction?tx_id=${v}`);
    } else {
      navigate(`/user?user_address=${v}`);
    }
    setQuery('');
    setExpanded(false);
  };

  const handleExpand = () => {
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <>
      {/* xs: icon-only toggle */}
      <Box sx={{ display: { xs: 'flex', sm: 'none' } }}>
        {expanded ? (
          <Box sx={{
            display: 'flex', alignItems: 'center',
            bgcolor: alpha('#FFFFFF', 0.03),
            border: `1px solid ${alpha('#FFFFFF', 0.14)}`,
            borderRadius: '6px', overflow: 'hidden',
            width: 180, height: 30,
          }}>
            <SearchIcon sx={{ fontSize: 14, color: alpha('#FFFFFF', 0.30), ml: 1, flexShrink: 0 }} />
            <InputBase
              inputRef={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') go();
                if (e.key === 'Escape') { setExpanded(false); setQuery(''); }
              }}
              onBlur={() => { if (!query) setExpanded(false); }}
              placeholder="Search…"
              sx={{
                flex: 1, ml: 0.75, fontSize: 12,
                color: alpha('#FFFFFF', 0.75),
                '& .MuiInputBase-input': { p: 0, '&::placeholder': { color: alpha('#FFFFFF', 0.28), opacity: 1 } },
              }}
            />
          </Box>
        ) : (
          <IconButton size="small" onClick={handleExpand} sx={{ color: alpha('#FFFFFF', 0.45), p: 0.75 }}>
            <SearchIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Box>

      {/* sm+: always-visible search bar */}
      <Box sx={{
        display: { xs: 'none', sm: 'flex' }, alignItems: 'center',
        bgcolor: alpha('#FFFFFF', 0.03),
        border: `1px solid ${alpha('#FFFFFF', 0.07)}`,
        borderRadius: '6px', overflow: 'hidden',
        width: { sm: 200, md: 280 }, height: 30,
        transition: 'border-color 0.15s',
        '&:focus-within': { borderColor: alpha('#FFFFFF', 0.18) },
      }}>
        <SearchIcon sx={{ fontSize: 14, color: alpha('#FFFFFF', 0.30), ml: 1, flexShrink: 0 }} />
        <InputBase
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') go(); }}
          placeholder="Search…"
          sx={{
            flex: 1, ml: 0.75, fontSize: 12,
            color: alpha('#FFFFFF', 0.75),
            '& .MuiInputBase-input': { p: 0, '&::placeholder': { color: alpha('#FFFFFF', 0.28), opacity: 1 } },
          }}
        />
      </Box>
    </>
  );
}

// ── Header ────────────────────────────────────────────────────────────
let _rentBalanceFetched = false;

function useRentBalance() {
  const [sol, setSol] = useState<number | null>(null);
  const alerted = useRef(false);
  const { publicKey } = useWallet();

  // Reset alert gate on wallet change so re-login triggers a fresh check
  useEffect(() => {
    alerted.current = false;
  }, [publicKey?.toBase58()]);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await axios.get(`/api/balance?address=${RENT_ADDRESS}`);
      const balance: number = res.data?.sol ?? null;
      setSol(balance);

      const isAuthed = !!getCookieValue(COOKIE_SIGNATURE);
      if (isAuthed && !alerted.current && balance != null) {
        alerted.current = true;
        if (balance < 0.2) {
          toast.error(`[RENT] CRITICAL :: ${balance.toFixed(3)} SOL — tx execution at risk. Fund immediately.`, { autoClose: false });
        } else if (balance < 0.75) {
          toast.warn(`[RENT] LOW :: ${balance.toFixed(3)} SOL — top up required before disruption.`, { autoClose: 10000 });
        }
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (_rentBalanceFetched) return;
    _rentBalanceFetched = true;
    fetchBalance();
  }, [fetchBalance]);

  return { sol, fetchBalance };
}

function Header() {
  const { sidebarToggle, toggleSidebar } = useContext(SidebarContext);
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { publicKey, disconnect } = useWallet();
  const { deleteCookie } = useCookie();
  const { focused, toggleFocused } = useFocusedMode();
  const { sol: rentSol, fetchBalance: refreshRent } = useRentBalance();
  const [rentRefreshing, setRentRefreshing] = useState(false);

  const handleRentRefresh = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (rentRefreshing) return;
    setRentRefreshing(true);
    refreshRent();
    setTimeout(() => setRentRefreshing(false), 1200);
  };

  const handleSignOut = async () => {
    try { await disconnect(); } catch { /* ignore */ }
    dispatch(resetAdminStatus());
    dispatch(setLoginStatus(''));
    dispatch(setToken(initialAuthState.token));
    deleteCookie(COOKIE_SIGNATURE);
    deleteCookie(COOKIE_TIMESTAMP);
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  const segment   = location.pathname.split('/').filter(Boolean)[0] ?? '';
  const pageLabel = PAGE_LABELS[segment] ?? '';

  return (
    <HeaderWrapper>
      {/* Left: toggle + search */}
      <Box display="flex" alignItems="center" gap={{ xs: 0.75, sm: 1.5 }}>
        <Box sx={{ display: { lg: 'none', xs: 'flex' } }}>
          <Tooltip arrow title="Toggle Menu">
            <IconButton size="small" color="primary" onClick={toggleSidebar}>
              {sidebarToggle ? <CloseTwoTone fontSize="small" /> : <MenuTwoTone fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
        {!focused && <GlobalSearch />}
        <HealthBadge />
        <Box
          sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', borderRadius: '5px', overflow: 'hidden',
            border: `1px solid ${rentSol != null && rentSol < 0.2 ? 'rgba(240,78,106,0.35)' : rentSol != null && rentSol < 0.75 ? 'rgba(245,165,36,0.35)' : alpha('#FFFFFF', 0.07)}`,
            backgroundColor: rentSol != null && rentSol < 0.2 ? 'rgba(240,78,106,0.06)' : rentSol != null && rentSol < 0.75 ? 'rgba(245,165,36,0.06)' : alpha('#FFFFFF', 0.03),
          }}
        >
          {/* "Rent" label + icon — hyperlink */}
          <Box component="a" href={RENT_ACCOUNT} target="_blank" rel="noopener noreferrer"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.4, pl: 1.25, pr: 0.75, py: 0.5,
              textDecoration: 'none', transition: 'background-color 0.15s',
              '&:hover': { backgroundColor: alpha('#FFFFFF', 0.05) } }}>
            <Typography sx={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em',
              textTransform: 'uppercase', color: alpha('#FFFFFF', 0.50), lineHeight: 1 }}>
              Rent
            </Typography>
            <OpenInNew sx={{ fontSize: '10px', color: alpha('#FFFFFF', 0.25) }} />
          </Box>
          {/* Divider */}
          <Box sx={{ width: '1px', alignSelf: 'stretch', bgcolor: rentSol != null && rentSol < 0.2 ? 'rgba(240,78,106,0.25)' : rentSol != null && rentSol < 0.75 ? 'rgba(245,165,36,0.25)' : alpha('#FFFFFF', 0.07) }} />
          {/* Balance — click to refresh */}
          <Box onClick={handleRentRefresh}
            sx={{ display: 'flex', alignItems: 'center', px: 1, py: 0.5, cursor: 'pointer',
              minWidth: 62, justifyContent: 'center',
              transition: 'background-color 0.15s',
              '&:hover': { backgroundColor: alpha('#FFFFFF', 0.05) } }}>
            {rentRefreshing ? (
              <CircularProgress size={8} thickness={5} sx={{ color: alpha('#FFFFFF', 0.35) }} />
            ) : rentSol != null ? (
              <Typography sx={{ fontSize: '11px', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                color: rentSol < 0.2 ? '#F04E6A' : rentSol < 0.75 ? '#F5A524' : alpha('#FFFFFF', 0.75) }}>
                {rentSol.toFixed(2)} SOL
              </Typography>
            ) : (
              <CircularProgress size={8} thickness={5} sx={{ color: alpha('#FFFFFF', 0.25) }} />
            )}
          </Box>
        </Box>
        {rentSol != null && rentSol < 0.75 && (
          <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
            <RentTopUp rentSol={rentSol} onSuccess={refreshRent} />
          </Box>
        )}
        {pageLabel && (
          <>
            <Divider orientation="vertical" flexItem sx={{ height: 16, alignSelf: 'center', display: { xs: 'none', md: 'block' } }} />
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '12px', color: alpha('#FFFFFF', 0.40),
              letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden',
              textOverflow: 'ellipsis', display: { xs: 'none', md: 'block' }, maxWidth: { md: 200, lg: 'none' } }}>
              {pageLabel}
            </Typography>
          </>
        )}
      </Box>

      {/* Spacer */}
      <Box sx={{ flex: 1 }} />

      {/* Right */}
      <Box display="flex" alignItems="center" gap={{ xs: 0.75, sm: 1.5 }}>

        {/* Quick links.hidden on mobile */}
        <Box component="a" href={VANISH_PROGRAM} target="_blank" rel="noopener noreferrer"
          sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.6, px: 1.25, py: 0.5, borderRadius: '5px',
            border: `1px solid ${alpha('#FFFFFF', 0.07)}`, backgroundColor: alpha('#FFFFFF', 0.03),
            textDecoration: 'none', transition: 'background-color 0.15s',
            '&:hover': { backgroundColor: alpha('#FFFFFF', 0.06) } }}>
          <Typography sx={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em',
            textTransform: 'uppercase', color: alpha('#FFFFFF', 0.50), lineHeight: 1 }}>
            Program
          </Typography>
          <OpenInNew sx={{ fontSize: '10px', color: alpha('#FFFFFF', 0.30) }} />
        </Box>

        {/* Accounts dropdown.hidden on mobile */}
        <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
          <AccountsDropdown />
        </Box>

        {publicKey && (
          <>
            <Divider orientation="vertical" flexItem sx={{ height: 16, alignSelf: 'center' }} />
            <Box
              onClick={() => { toggleFocused(); if (!focused) navigate('/screening'); }}
              title={focused ? 'Click to restore full sidebar' : 'Click to focus view'}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5,
                borderRadius: '5px',
                border: `1px solid ${focused ? alpha(theme.palette.primary.main, 0.35) : alpha('#FFFFFF', 0.07)}`,
                backgroundColor: focused ? alpha(theme.palette.primary.main, 0.08) : alpha('#FFFFFF', 0.03),
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                minWidth: 0,
                justifyContent: 'center',
                '&:hover': {
                  backgroundColor: focused ? alpha(theme.palette.primary.main, 0.13) : alpha('#FFFFFF', 0.06),
                },
              }}
            >
              <Box sx={{
                width: 6, height: 6, borderRadius: '50%',
                bgcolor: focused ? theme.palette.primary.main : theme.palette.primary.main,
                flexShrink: 0,
                boxShadow: focused ? `0 0 8px ${alpha(theme.palette.primary.main, 0.8)}` : `0 0 6px ${alpha(theme.palette.primary.main, 0.4)}`,
              }} />
              <Typography sx={{
                fontSize: '11px', fontWeight: 500,
                color: focused ? alpha('#FFFFFF', 0.75) : alpha('#FFFFFF', 0.50),
                letterSpacing: '0.02em', textTransform: 'none',
                fontFamily: '"JetBrains Mono","Fira Code",monospace',
              }}>
                {truncateAddress(publicKey.toBase58())}
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </HeaderWrapper>
  );
}

export default Header;
