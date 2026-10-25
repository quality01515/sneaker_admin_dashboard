import { useEffect, useState } from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Tx_History from './tx_history';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';
import { ADMIN_ADDRESS } from 'src/config';
import { toast } from 'react-toastify';
import { Overview } from './types';
import { getSignature, SignatureExpiredError, handleSessionExpired } from 'src/utils';
import { useNavigate } from 'react-router-dom';
import LoadingOverlay from 'react-loading-overlay-ts';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import AppBar from '@mui/material/AppBar';
import { useTheme } from '@mui/material/styles';
import {
  Container, Box, FormControl, Select, MenuItem, Button,
  Typography, InputBase, IconButton, Paper, alpha, useMediaQuery,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { getPlatformLabelItem, platformMenuLabel } from './platformLabels';
import { fetchTeamsList } from '../Teams/teamApi';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;
const DATE_FORMAT = 'yyyy-MM-dd';
type TxPreset = '1h' | '1d' | '1w' | 'all' | 'range';

interface TabPanelProps {
  children?: React.ReactNode;
  dir?: string;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tx-tabpanel-${index}`}
      aria-labelledby={`tx-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: { xs: 1.5, sm: 2 } }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return { id: `tx-tab-${index}`, 'aria-controls': `tx-tabpanel-${index}` };
}

const selectSx = {
  color: 'rgba(255,255,255,0.9)',
  fontSize: 13,
  fontWeight: 500,
  height: 34,
  bgcolor: 'rgba(255,255,255,0.04)',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.12)' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.25)' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)', borderWidth: 1 },
  '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.5)' },
};

const Transactions = () => {
  const navigate = useNavigate();
  const { signMessage } = useWallet();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview>({
    trade_total: 0,
    trade_completed_at: 0,
    trade_pending: 0,
    trade_expired: 0,
    trade_failed: 0,
    deposit_completed_at: 0,
    withdraw_completed_at: 0,
    trade_total_48h: 0,
    trade_completed_at_48h: 0,
    trade_pending_48h: 0,
    trade_expired_48h: 0,
    trade_failed_48h: 0,
    deposit_withdraw_total_48h: 0,
    deposit_withdraw_completed_at_48h: 0,
    deposit_withdraw_pending_48h: 0,
    deposit_withdraw_expired_48h: 0,
    deposit_withdraw_failed_48h: 0,
  });
  const [tabValue, setTabValue] = useState(0);
  const [preset, setPreset] = useState<TxPreset>('1h');
  const [startAt, setStartAt] = useState<Date | null>(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d;
  });
  const [endAt, setEndAt] = useState<Date | null>(() => new Date());
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [teamOptions, setTeamOptions] = useState<string[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [actionTypeFilter, setActionTypeFilter] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const tradeTotal = overview.trade_completed_at + overview.trade_pending + overview.trade_expired + overview.trade_failed;
  const fmtPct = (n: number, total: number) =>
    total > 0 ? `${n} (${((n / total) * 100).toFixed(1)}%)` : String(n);

  const fetchTxOverview = async () => {
    setLoading(true);
    try {
      const { super_admin_signature, timestamp } = await getSignature(signMessage || undefined, 'read');
      const base = {
        admin_address: localStorage.getItem(ADMIN_ADDRESS),
        timestamp,
        admin_signature: super_admin_signature,
      };
      const payload = preset === 'range'
        ? {
            ...base,
            start_at: startAt ? new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate(), 0, 0, 0, 0).toISOString() : new Date().toISOString(),
            end_at:   endAt   ? new Date(endAt.getFullYear(),   endAt.getMonth(),   endAt.getDate(),   23,59,59,999).toISOString() : new Date().toISOString(),
          }
        : { ...base, preset };

      const txRes = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/transactions/overview`,
        platformFilter ? { ...payload, team_name: platformFilter } : payload,
        { headers: { 'Content-Type': 'application/json', accept: 'application/json', 'x-api-key': ADMIN_DASHBOARD_API_KEY } }
      );
      setOverview(txRes.data);
      if (teamOptions.length === 0 && !teamsLoading) {
        fetchTeamOptions();
      }
    } catch (err: any) {
      if (err instanceof SignatureExpiredError) { handleSessionExpired(navigate); return; }
      toast.error(err.message, { autoClose: 1500 });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamOptions = async () => {
    setTeamsLoading(true);
    try {
      const teams = await fetchTeamsList(signMessage || undefined);
      const names = Array.from(new Set(teams.map((team) => team.name).filter(Boolean)));
      setTeamOptions(names);
    } catch (err: any) {
      if (err instanceof SignatureExpiredError) { handleSessionExpired(navigate); return; }
      toast.error(err?.message || 'Failed to load teams', { autoClose: 1500 });
    } finally {
      setTeamsLoading(false);
    }
  };

  useEffect(() => {
    if (preset === 'range' && (!startAt || !endAt)) return;
    fetchTxOverview();
  }, [signMessage, preset, startAt, endAt, platformFilter]);

  const goToUser = () => {
    const v = userSearch.trim();
    if (v) navigate(`/user?user_address=${v}`);
  };
  const goToTx = () => {
    const v = txSearch.trim();
    if (v) navigate(`/transaction?tx_id=${v}`);
  };

  const displayedTeamOptions = platformFilter && !teamOptions.includes(platformFilter)
    ? [platformFilter, ...teamOptions]
    : teamOptions;

  const statTiles: { label: string; value: string | number; sub?: string; hideMobile?: boolean }[] = [
    { label: 'Total Trades',  value: tradeTotal },
    { label: 'Completed',     value: overview.trade_completed_at, sub: tradeTotal > 0 ? `${((overview.trade_completed_at / tradeTotal) * 100).toFixed(1)}%` : undefined },
    { label: 'Pending',       value: overview.trade_pending },
    { label: 'Failed',        value: overview.trade_failed,   sub: tradeTotal > 0 ? `${((overview.trade_failed   / tradeTotal) * 100).toFixed(1)}%` : undefined, hideMobile: true },
    { label: 'Expired',       value: overview.trade_expired,  sub: tradeTotal > 0 ? `${((overview.trade_expired  / tradeTotal) * 100).toFixed(1)}%` : undefined },
    { label: 'Deposits',      value: overview.deposit_completed_at },
    { label: 'Withdrawals',   value: overview.withdraw_completed_at },
  ];

  return (
    <main>
      <Container maxWidth="xl">
        <LoadingOverlay
          active={loading}
          spinner
          styles={{ wrapper: (base) => ({ ...base, width: '100%' }) }}
        >
          <Box sx={{ pt: 1 }}>

            {/* Header + filters */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.88)', mb: 0.25 }}>Transactions</Typography>
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>Activity across all platforms</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select value={preset} onChange={(e) => setPreset(e.target.value as TxPreset)} sx={selectSx}>
                    <MenuItem value="1h">1 Hour</MenuItem>
                    <MenuItem value="1d">1 Day</MenuItem>
                    <MenuItem value="1w">1 Week</MenuItem>
                    <MenuItem value="all">All Time</MenuItem>
                    <MenuItem value="range">Date Range</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <Select
                    value={platformFilter ?? ''}
                    onChange={(e) => setPlatformFilter(e.target.value === '' ? null : e.target.value)}
                    displayEmpty
                    renderValue={(v) => v === '' ? 'All teams' : platformMenuLabel(String(v))}
                    sx={selectSx}
                  >
                    <MenuItem value="">All teams</MenuItem>
                    {teamsLoading && (
                      <MenuItem disabled value="">
                        <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Loading teams...</Typography>
                      </MenuItem>
                    )}
                    {!teamsLoading && displayedTeamOptions.length === 0 && (
                      <MenuItem disabled value="">
                        <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>No teams found</Typography>
                      </MenuItem>
                    )}
                    {displayedTeamOptions.map((teamName) => {
                      const item = getPlatformLabelItem(teamName);
                      return (
                        <MenuItem key={teamName} value={teamName}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            {item && ("logo" in item
                              ? <img src={item.logo} alt="" width={16} height={16} style={{ borderRadius: 3, objectFit: "contain" }} />
                              : <item.icon sx={{ fontSize: 16 }} />)}
                            <span>{platformMenuLabel(teamName)}</span>
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
                {(platformFilter || actionTypeFilter) && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setPlatformFilter(null);
                      setActionTypeFilter(null);
                    }}
                    sx={{ height: 34, fontSize: 12, borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', '&:hover': { borderColor: 'rgba(255,255,255,0.4)' } }}
                  >
                    Clear
                  </Button>
                )}
                {preset === 'range' && (
                  <>
                    <DatePicker
                      label="Start" value={startAt} onChange={setStartAt} maxDate={endAt ?? undefined} format={DATE_FORMAT}
                      slotProps={{ textField: { size: 'small', sx: { width: 150, '& .MuiOutlinedInput-root': { height: 34, bgcolor: 'rgba(255,255,255,0.04)', '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' } }, '& .MuiInputBase-input': { color: 'rgba(255,255,255,0.9)', fontSize: 13 }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)', fontSize: 13 } } } }}
                    />
                    <DatePicker
                      label="End" value={endAt} onChange={setEndAt} minDate={startAt ?? undefined} maxDate={new Date()} format={DATE_FORMAT}
                      slotProps={{ textField: { size: 'small', sx: { width: 150, '& .MuiOutlinedInput-root': { height: 34, bgcolor: 'rgba(255,255,255,0.04)', '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' } }, '& .MuiInputBase-input': { color: 'rgba(255,255,255,0.9)', fontSize: 13 }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)', fontSize: 13 } } } }}
                    />
                  </>
                )}
              </Box>
            </Box>

            {/* Stat tiles */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 1.5, mb: 2 }}>
              {statTiles.filter(t => !isMobile || !t.hideMobile).map(({ label, value, sub }) => (
                <Box key={label} sx={{ px: 2.5, py: 2, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', mb: 0.75 }}>
                    {label}
                  </Typography>
                  <Typography sx={{ fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.88)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                    {value}
                  </Typography>
                  {sub && (
                    <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', fontVariantNumeric: 'tabular-nums', mt: 0.5, lineHeight: 1 }}>
                      {sub}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>

            {/* Search row */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <Paper elevation={0} sx={{ display: 'flex', alignItems: 'center', flex: '1 1 220px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 1.5, overflow: 'hidden', '&:focus-within': { borderColor: 'rgba(255,255,255,0.2)' }, transition: 'border-color 0.15s' }}>
                <PersonIcon sx={{ fontSize: 15, color: 'rgba(255,255,255,0.3)', ml: 1.5, flexShrink: 0 }} />
                <InputBase sx={{ ml: 1, flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.85)', '& .MuiInputBase-input': { py: 1, '&::placeholder': { color: 'rgba(255,255,255,0.28)', opacity: 1 } } }} placeholder="User address" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') goToUser(); }} />
                <IconButton onClick={goToUser} disabled={!userSearch.trim()} sx={{ p: 0.75, color: userSearch.trim() ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)', borderRadius: 0, '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}><SearchIcon sx={{ fontSize: 16 }} /></IconButton>
              </Paper>
              <Paper elevation={0} sx={{ display: 'flex', alignItems: 'center', flex: '1 1 220px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 1.5, overflow: 'hidden', '&:focus-within': { borderColor: 'rgba(255,255,255,0.2)' }, transition: 'border-color 0.15s' }}>
                <ReceiptLongIcon sx={{ fontSize: 15, color: 'rgba(255,255,255,0.3)', ml: 1.5, flexShrink: 0 }} />
                <InputBase sx={{ ml: 1, flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.85)', '& .MuiInputBase-input': { py: 1, '&::placeholder': { color: 'rgba(255,255,255,0.28)', opacity: 1 } } }} placeholder="Transaction ID" value={txSearch} onChange={(e) => setTxSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') goToTx(); }} />
                <IconButton onClick={goToTx} disabled={!txSearch.trim()} sx={{ p: 0.75, color: txSearch.trim() ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)', borderRadius: 0, '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}><SearchIcon sx={{ fontSize: 16 }} /></IconButton>
              </Paper>
            </Box>

            {/* Tx history tabs */}
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <AppBar position="static" sx={{ bgcolor: 'rgba(255,255,255,0.03)', boxShadow: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <Tabs
                  value={tabValue}
                  onChange={(_, v) => setTabValue(v)}
                  indicatorColor="primary"
                  textColor="inherit"
                  variant="fullWidth"
                >
                  <Tab label="Completed / Failed / Expired" {...a11yProps(0)} sx={{ fontSize: 12, textTransform: 'none', fontWeight: 500 }} />
                  <Tab label="Pending" {...a11yProps(1)} sx={{ fontSize: 12, textTransform: 'none', fontWeight: 500 }} />
                </Tabs>
              </AppBar>
              <TabPanel value={tabValue} index={0} dir={theme.direction}>
                <Tx_History
                  status="completed&failed&expired"
                  platformFilter={platformFilter}
                  setPlatformFilter={setPlatformFilter}
                  actionTypeFilter={actionTypeFilter}
                  setActionTypeFilter={setActionTypeFilter}
                />
              </TabPanel>
              <TabPanel value={tabValue} index={1} dir={theme.direction}>
                <Tx_History
                  status="pending"
                  platformFilter={platformFilter}
                  setPlatformFilter={setPlatformFilter}
                  actionTypeFilter={actionTypeFilter}
                  setActionTypeFilter={setActionTypeFilter}
                />
              </TabPanel>
            </Box>

          </Box>
        </LoadingOverlay>
      </Container>
    </main>
  );
};

export default Transactions;
