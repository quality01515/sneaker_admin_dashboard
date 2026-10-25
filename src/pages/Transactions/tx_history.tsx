import { useEffect, useRef, useState } from 'react';
import React from 'react';
import axios from 'axios';
import LoadingOverlay from 'react-loading-overlay-ts';
import { toast } from 'react-toastify';
import {
  Box,
  Paper,
  FormControl,
  Select,
  MenuItem,
  InputBase,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  IconButton,
  Divider,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogContent,
  Chip,
} from '@mui/material';
import RadarIcon from '@mui/icons-material/Radar';
import { TokenSearch } from 'src/pages/TurnkeyWallets/TokenSearch';
import { getSignature, SignatureExpiredError, handleSessionExpired } from 'src/utils';
import { useWallet } from '@solana/wallet-adapter-react';
import { ADMIN_ADDRESS } from 'src/config';
import TablePagination from '@mui/material/TablePagination';
import { Transaction } from './types';
import { Overview as UserOverview } from '../User/types';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ErrorIcon from '@mui/icons-material/Error';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SouthIcon from '@mui/icons-material/South';
import NorthIcon from '@mui/icons-material/North';
import HubIcon from '@mui/icons-material/Hub';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Tooltip from '@mui/material/Tooltip';
import { useNavigate } from 'react-router-dom';
import { truncateAddress } from 'src/utils';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;

/** Tx IDs for which the Commit button is disabled on UI (client-side only) */
const COMMIT_DISABLED_TX_IDS = new Set([
  '3AjAZ1EPTudhQdvSmCCfFc5gHr5GN9GsnL281V4VWtmSw5MsKCU72zK3ze1kLJgX92EWDpHgjXiBja7WMsUUSCsp',
  '2dX1HuVJgo4fMDFFg2SXkKA5huChuJkoBQYTtQXkCNdptDCXumASCPzgphzTzgq8LmP5fxES9xoBFx22vmR6FzEJ',
  '3WA4XXWnLTXoN9zFcnmQ17dbnDvaFgDmambE3o2EMm2ipBUjN1iALuGiyS9z72MemDHTcp3CM2c1bHxhaL42Ghkf',
  '3tVBXHXZJ94LboLWBjV58pou6fBq4wmF1tyKmnBGcLB71pnaYSuoaxwZFsoan2TAAwbDAhZxvb9VKrnM5TSYaizb',
]);

function bigNum(n: number) {
  const a = Math.abs(n);
  if (a >= 0.9995e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
  if (a >= 0.9995e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (a >= 0.9995e3) return (n / 1e3).toFixed(2).replace(/\.?0+$/, '') + 'K';
  return n.toFixed(4).replace(/\.?0+$/, '');
}

const StatusIcon = ({ status }: { status: string }) => {
  const s = String(status).toLowerCase();
  if (s === 'completed') return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} titleAccess="Completed" />;
  if (s === 'pending') return <HourglassEmptyIcon sx={{ color: 'warning.main', fontSize: 20 }} titleAccess="Pending" />;
  if (s === 'expired') return <ScheduleIcon sx={{ color: 'text.secondary', fontSize: 20 }} titleAccess="Expired" />;
  if (s === 'failed') return <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} titleAccess="Failed" />;
  return <span>{status}</span>;
};

const ActionTypeIcon = ({ actionType }: { actionType: string }) => {
  const a = String(actionType).toLowerCase();
  if (a.includes('trade')) return <SwapHorizIcon sx={{ fontSize: 20 }} />;
  if (a.includes('deposit')) return <SouthIcon sx={{ fontSize: 20 }} color="success" />;
  if (a.includes('withdraw')) return <NorthIcon sx={{ fontSize: 20 }} color="warning" />;
  return <span>{actionType}</span>;
};

const LOGO_SIZE = 20;

const CalledByIcon = ({ teamName }: { teamName: string }) => {
  const t = String(teamName).toLowerCase();
  if (t.includes('vanish admin dashboard')) return <img src="/admin_logo.png" alt="Admin" width={LOGO_SIZE} height={LOGO_SIZE} style={{ borderRadius: 4, objectFit: 'contain' }} />;
  if (t.includes('swap.vanish.trade')) return <img src="/swap_logo.png" alt="Swap" width={LOGO_SIZE} height={LOGO_SIZE} style={{ borderRadius: 4, objectFit: 'contain' }} />;
  if (t.includes('vanish core')) return <HubIcon sx={{ fontSize: LOGO_SIZE }} />;
  if (t.includes('raptor dev')) return <img src="/raptor_logo.jpg" alt="Raptor" width={LOGO_SIZE} height={LOGO_SIZE} style={{ borderRadius: 4, objectFit: 'contain' }} />;
  if (t.includes('titan dev')) return <img src="/titan_logo.jpg" alt="Titan" width={LOGO_SIZE} height={LOGO_SIZE} style={{ borderRadius: 4, objectFit: 'contain' }} />;
  if (t.includes('titan prod')) return <img src="/titan_logo.jpg" alt="Titan" width={LOGO_SIZE} height={LOGO_SIZE} style={{ borderRadius: 4, objectFit: 'contain' }} />;
  if (t.includes('axiom prod')) return <img src="/axiom_logo.ico" alt="Axiom" width={LOGO_SIZE} height={LOGO_SIZE} style={{ borderRadius: 4, objectFit: 'contain' }} />;
  if (t.includes('wiewpoint dev')) return <VisibilityIcon sx={{ fontSize: LOGO_SIZE }} />;
  if (t.includes('ghost dev')) return <VisibilityOffIcon sx={{ fontSize: LOGO_SIZE }} />;
  return <HubIcon sx={{ fontSize: LOGO_SIZE }} />;
};

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
        {label}
      </Typography>
      <Box sx={{ fontSize: 12, color: 'rgba(255,255,255,0.82)', wordBreak: 'break-all' }}>
        {children}
      </Box>
    </Box>
  );
}

const filterSelectSx = {
  color: 'rgba(255,255,255,0.9)',
  fontSize: 12,
  height: 32,
  bgcolor: 'rgba(255,255,255,0.04)',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.12)' },
  '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.5)' },
};

type TxHistoryProps = {
  status: string;
  platformFilter: string | null;
  setPlatformFilter: React.Dispatch<React.SetStateAction<string | null>>;
  actionTypeFilter: string | null;
  setActionTypeFilter: React.Dispatch<React.SetStateAction<string | null>>;
};

const Tx_History = ({
  status,
  platformFilter,
  setPlatformFilter,
  actionTypeFilter,
  setActionTypeFilter,
}: TxHistoryProps) => {
  const [tradeVolumeFilter, setTradeVolumeFilter] = useState<'sol' | 'usd' | ''>('');
  const [minTradeAmount, setMinTradeAmount] = useState('');
  const [commitStatusFilter, setCommitStatusFilter] = useState('');
  const [tokenAddressFilter, setTokenAddressFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [sweepKey, setSweepKey] = useState(0);
  const fetchParamsRef = useRef({
    page: 0,
    rowsPerPage: 10,
    platformFilter: null as string | null,
    actionTypeFilter: null as string | null,
    tradeVolumeFilter: '' as 'sol' | 'usd' | '',
    minTradeAmount: '',
    commitStatusFilter: '',
    tokenAddressFilter: '',
  });
  const prevTxIdsRef = useRef<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [committingTxId, setCommittingTxId] = useState<string | null>(null);
  const [selectedTxs, setSelectedTxs] = useState<Transaction[]>([]);
  const [closingTxIds, setClosingTxIds] = useState<Set<string>>(new Set());
  const [userPanelClosing, setUserPanelClosing] = useState(false);
  const txAutoCloseTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const txCloseDurations = useRef<Record<string, number>>({});
  const userPanelAutoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userPanelOpenKey, setUserPanelOpenKey] = useState(0);
  const [balancePage, setBalancePage] = useState(0);
  const [scanMint, setScanMint] = useState<string | null>(null);
  const [txDebugData, setTxDebugData] = useState<Record<string, { symbol: string | null; mint: string | null; feePaid: number | null; splitRepay: number | null }>>({});
  const [pendingUserAddress, setPendingUserAddress] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserOverview | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const { signMessage, publicKey } = useWallet();
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [count, setCount] = useState(0);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    selectedTxs.forEach(tx => {
      const id = String(tx.tx_id);
      if (id in txDebugData) return;
      setTxDebugData(prev => ({ ...prev, [id]: { symbol: null, mint: null, feePaid: null, splitRepay: null } }));
      axios.get(`${process.env.REACT_APP_API_BASE_URL}/trade/debug?tx_id=${id}`, {
        headers: { 'Content-Type': 'application/json', accept: 'application/json', 'x-api-key': ADMIN_DASHBOARD_API_KEY },
      }).then(res => {
        const d = res.data;
        const isBuy = Number(tx.token_delta) > 0;
        const sym  = isBuy ? (d.target_token_symbol || d.source_token_symbol) : (d.source_token_symbol || d.target_token_symbol);
        const mint = isBuy ? (d.target_token_address || d.source_token_address) : (d.source_token_address || d.target_token_address);
        setTxDebugData(prev => ({
          ...prev,
          [id]: {
            symbol: sym ? String(sym) : null,
            mint: mint ? String(mint) : null,
            feePaid: d.vanish_fee_paid != null ? Number(d.vanish_fee_paid) : null,
            splitRepay: d.split_repay != null && Number(d.split_repay) !== 0 ? Number(d.split_repay) : null,
          },
        }));
      }).catch(() => {});
    });
  }, [selectedTxs]);

  const openUserPanel = async (e: React.MouseEvent, user_address: string) => {
    e.stopPropagation();
    if (pendingUserAddress === user_address) { closeUserPanel(); return; }
    setSelectedTxs([]);
    setClosingTxIds(new Set());
    setUserPanelClosing(false);
    setPendingUserAddress(user_address);
    setSelectedUser(null);
    setBalancePage(0);
    setUserLoading(true);
    setUserPanelOpenKey(k => k + 1);
    if (userPanelAutoCloseTimer.current) clearTimeout(userPanelAutoCloseTimer.current);
    userPanelAutoCloseTimer.current = setTimeout(() => closeUserPanel(), 10000);
    try {
      const { super_admin_signature, timestamp } = await getSignature(signMessage || undefined, 'read');
      const res = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/user/overview`,
        { admin_address: localStorage.getItem(ADMIN_ADDRESS), timestamp, admin_signature: super_admin_signature, user_address },
        { headers: { 'Content-Type': 'application/json', accept: 'application/json', 'x-api-key': ADMIN_DASHBOARD_API_KEY } }
      );
      setSelectedUser(res.data ?? null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to load user', { autoClose: 2000 });
    }
    setUserLoading(false);
  };

  const OPEN_MS = 280;
  const CLOSE_MS = 140;
  const SLOW_CLOSE_MS = 800;

  const closeUserPanel = (instant = false) => {
    if (userPanelAutoCloseTimer.current) { clearTimeout(userPanelAutoCloseTimer.current); userPanelAutoCloseTimer.current = null; }
    if (instant) { setPendingUserAddress(null); setSelectedUser(null); return; }
    setUserPanelClosing(true);
    setTimeout(() => { setPendingUserAddress(null); setSelectedUser(null); setUserPanelClosing(false); }, CLOSE_MS);
  };

  const closeTxPanel = (id: string, slow = false) => {
    clearTimeout(txAutoCloseTimers.current[id]);
    delete txAutoCloseTimers.current[id];
    const duration = slow ? SLOW_CLOSE_MS : CLOSE_MS;
    txCloseDurations.current[id] = duration;
    setClosingTxIds(prev => new Set([...prev, id]));
    setTimeout(() => {
      setSelectedTxs(prev => prev.filter(t => String(t.tx_id) !== id));
      setClosingTxIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      delete txCloseDurations.current[id];
    }, duration);
  };

  const handlePlatformClick = (teamName: string) => {
    setPage(0);
    setPlatformFilter((prev) => (prev === teamName ? null : teamName));
  };

  const handleActionTypeClick = (actionType: string) => {
    setPage(0);
    setActionTypeFilter((prev) => (prev === actionType ? null : actionType));
  };

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setPage(newPage);
    fetchTxList(newPage + 1, rowsPerPage, platformFilter, actionTypeFilter);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
    fetchTxList(1, parseInt(event.target.value, 10), platformFilter, actionTypeFilter);
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

	const handleCommit = async (txId: string) => {
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
			fetchTxList(page + 1, rowsPerPage, platformFilter, actionTypeFilter);
		} catch (err: any) {
			console.error('Error committing transaction', err);
			toast.error(err?.response?.data?.message || err.message || 'Commit failed', {

				autoClose: 2000
			});
		} finally {
			setCommittingTxId(null);
		}
	};

  const fetchTxList = async (
    page: number,
    rowsPerPage: number,
    calledBy?: string | null,
    actionType?: string | null,
    targetTradeVolumeFilter: 'sol' | 'usd' | '' = tradeVolumeFilter,
    targetMinTradeAmount = minTradeAmount,
    targetCommitStatusFilter = commitStatusFilter,
    targetTokenAddressFilter = tokenAddressFilter,
    silent = false,
  ) => {
    if (!silent) setLoading(true);
    try {
      const {super_admin_signature, timestamp} = await getSignature(signMessage || undefined, 'read');

      const body: Record<string, unknown> = {
        admin_address: localStorage.getItem(ADMIN_ADDRESS),
        timestamp: timestamp,
        admin_signature: super_admin_signature,
        page,
        per_page: rowsPerPage,
        status
      };
      if (calledBy) body.team_name = calledBy;
      if (actionType) body.action_type = actionType;
      if (targetCommitStatusFilter) body.commit_status = targetCommitStatusFilter;
      if (targetTradeVolumeFilter) {
        body.trade_volume_type = targetTradeVolumeFilter;
        const min = parseFloat(targetMinTradeAmount);
        if (!Number.isNaN(min) && min >= 0) body.min_trade_amount = min;
      }
      const trimmedTokenAddress = targetTokenAddressFilter.trim();
      if (trimmedTokenAddress) body.token_address = trimmedTokenAddress;

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/transactions/list`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      const incoming = response.data.txs as Transaction[];
      setTransactions(incoming);
      setCount(response.data.count);
      if (!silent) {
        prevTxIdsRef.current = incoming.map((t) => String(t.tx_id)).join(',');
        setLoading(false);
      } else {
        const newIds = incoming.map((t) => String(t.tx_id)).join(',');
        if (newIds !== prevTxIdsRef.current) {
          prevTxIdsRef.current = newIds;
          setSweepKey(k => k + 1);
        }
      }
    } catch (err: any) {
      if (!silent) {
        setLoading(false);
        setTransactions([]);
        if (err instanceof SignatureExpiredError) { handleSessionExpired(navigate); return; }
        toast.error(err.message, { autoClose: 1500 });
      }
    }
  };

  useEffect(() => {
    setPage(0);
    fetchTxList(1, rowsPerPage, platformFilter, actionTypeFilter);
  }, [signMessage, platformFilter, actionTypeFilter, tradeVolumeFilter, minTradeAmount, commitStatusFilter, tokenAddressFilter]);

  useEffect(() => {
    fetchParamsRef.current = { page, rowsPerPage, platformFilter, actionTypeFilter, tradeVolumeFilter, minTradeAmount, commitStatusFilter, tokenAddressFilter };
  }, [page, rowsPerPage, platformFilter, actionTypeFilter, tradeVolumeFilter, minTradeAmount, commitStatusFilter, tokenAddressFilter]);

  useEffect(() => {
    const id = setInterval(() => {
      const p = fetchParamsRef.current;
      fetchTxList(
        p.page + 1,
        p.rowsPerPage,
        p.platformFilter,
        p.actionTypeFilter,
        p.tradeVolumeFilter,
        p.minTradeAmount,
        p.commitStatusFilter,
        p.tokenAddressFilter,
        true,
      );
    }, 60000);
    return () => clearInterval(id);
  }, [signMessage]);

  return (
    <Paper sx={{ overflow: 'hidden', width: '100%', position: 'relative' }}>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', px: 1.5, py: 1, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <Select value={tradeVolumeFilter} onChange={(e) => setTradeVolumeFilter(e.target.value as 'sol' | 'usd' | '')} displayEmpty sx={filterSelectSx}>
            <MenuItem value="">All trades</MenuItem>
            <MenuItem value="sol">Min SOL</MenuItem>
            <MenuItem value="usd">Min USD</MenuItem>
          </Select>
        </FormControl>
        {tradeVolumeFilter !== '' && (
          <InputBase type="number" placeholder={tradeVolumeFilter === 'sol' ? 'Min SOL' : 'Min USD'} value={minTradeAmount} onChange={(e) => setMinTradeAmount(e.target.value)} sx={{ width: 90, height: 32, px: 1, fontSize: 12, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1 }} />
        )}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select value={commitStatusFilter} onChange={(e) => setCommitStatusFilter(e.target.value)} displayEmpty sx={filterSelectSx}>
            <MenuItem value="">All statuses</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="expired">Expired</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', alignItems: 'center', width: { xs: '100%', sm: 260 }, height: 32, px: 1, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1 }}>
          <InputBase
            placeholder="Token CA"
            value={tokenAddressFilter}
            onChange={(e) => setTokenAddressFilter(e.target.value)}
            sx={{ flex: 1, minWidth: 0, fontSize: 12, color: 'rgba(255,255,255,0.9)', '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.35)', opacity: 1 } }}
          />
          {tokenAddressFilter && (
            <IconButton size="small" onClick={() => setTokenAddressFilter('')} sx={{ p: 0.25, color: 'rgba(255,255,255,0.35)', '&:hover': { color: 'rgba(255,255,255,0.75)' } }}>
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Box>
      </Box>
      <style>{`
        @keyframes panelSlideIn{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
        @keyframes panelSlideOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(14px)}}
        @keyframes tableSweep{0%{left:-60%}100%{left:110%}}
      `}</style>
      <Box sx={{ position: 'relative' }}>
        {sweepKey > 0 && (
          <Box key={sweepKey} aria-hidden sx={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', overflow: 'hidden' }}>
            <Box sx={{
              position: 'absolute', top: 0, bottom: 0, width: '55%',
              background: 'linear-gradient(90deg, transparent, rgba(45,212,209,0.05), transparent)',
              animation: 'tableSweep 0.7s ease-out forwards',
            }} />
          </Box>
        )}
        <TableContainer style={{ maxWidth: '100%' }}>
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
            <Table sx={{ overflowX: 'auto', width: '100%', '& .MuiTableCell-root': { fontSize: 12, py: '7px', px: '10px' }, '& .MuiTableHead-root .MuiTableCell-root': { fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', bgcolor: 'rgba(255,255,255,0.02)' } }}>
              <TableHead style={{ height: '80px', width: '100%' }}>
                <TableRow style={{ width: '100%' }}>
                  <TableCell align="center">No</TableCell>
                  <TableCell align="center">User Address</TableCell>
                  <TableCell align="center">Tx Id</TableCell>
                  <TableCell align="center">Jito Bundle Id</TableCell>
                  <TableCell align="center">Amount (SOL)</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Action Type</TableCell>
                  <TableCell align="center">Called By</TableCell>
                  {status == "completed" &&
                  <>
                    <TableCell align="center">Token Delta</TableCell>
                    <TableCell align="center">Sol Delta</TableCell>
                  </>
                  }
                  {status == "pending" && <TableCell align="center">Action</TableCell>}
                  <TableCell align="center">Created At</TableCell>
                  <TableCell align="center">Completed At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((tx, index) => {
                  const isFailedOrExpired = ['failed', 'expired'].includes(String(tx.status).toLowerCase());
                  const isSelected = selectedTxs.some(t => String(t.tx_id) === String(tx.tx_id));
                  return (
                    <TableRow
                      hover
                      key={`row-${tx.tx_id}`}
                      onClick={() => {
                        closeUserPanel(true);
                        if (isSelected) {
                          closeTxPanel(String(tx.tx_id));
                        } else {
                          const id = String(tx.tx_id);
                          setSelectedTxs(prev => {
                            const evicted = prev.length >= 1 ? prev[0] : null;
                            if (evicted) {
                              clearTimeout(txAutoCloseTimers.current[String(evicted.tx_id)]);
                              delete txAutoCloseTimers.current[String(evicted.tx_id)];
                            }
                            return [tx];
                          });
                          clearTimeout(txAutoCloseTimers.current[id]);
                          txAutoCloseTimers.current[id] = setTimeout(() => closeTxPanel(id, true), 10000);
                        }
                      }}
                      onContextMenu={isMobile ? undefined : (e) => { e.preventDefault(); window.open(`/transaction?tx_id=${String(tx.tx_id)}`, '_blank'); }}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isSelected
                          ? 'rgba(45,212,209,0.07)'
                          : isFailedOrExpired
                          ? 'rgba(211, 47, 47, 0.12)'
                          : 'transparent',
                        outline: isSelected ? '1px solid rgba(45,212,209,0.25)' : 'none',
                        outlineOffset: '-1px',
                      }}
                    >
                      <TableCell align="center">{index + 1 + page * rowsPerPage}</TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 0.5,
                            px: 0.75, py: 0.25, borderRadius: 1, cursor: 'pointer', userSelect: 'none',
                            ...(pendingUserAddress === String(tx.user_address) && {
                              bgcolor: 'rgba(45,212,209,0.1)',
                              outline: '1px solid rgba(45,212,209,0.3)',
                            }),
                          }}
                          onClick={(e) => openUserPanel(e, String(tx.user_address))}
                          onContextMenu={isMobile ? undefined : (e) => { e.preventDefault(); e.stopPropagation(); window.open(`/user?user_address=${tx.user_address}`, '_blank'); }}
                        >
                          <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: pendingUserAddress === String(tx.user_address) ? '#2DD4D1' : 'inherit' }}>
                            {truncateAddress(String(tx.user_address))}
                          </Typography>
                          <ContentCopyIcon sx={{ width: 16, height: 16, color: 'rgba(255,255,255,0.3)', '&:hover': { color: 'rgba(255,255,255,0.7)' } }} onClick={(e) => { e.stopPropagation(); handleCopy(tx.user_address); }} />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <div className="flex" style={{ userSelect: 'none', alignItems: 'center' }}>
                          <p className="truncate w-[200px]">{tx.tx_id}</p>
                          <ContentCopyIcon sx={{ width: 20, height: 20, flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); handleCopy(tx.tx_id); }} />
                          <IconButton size="small" component="a" href={`https://solscan.io/tx/${String(tx.tx_id)}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} sx={{ p: 0.25, color: 'rgba(255,255,255,0.3)', flexShrink: 0, '&:hover': { color: '#2DD4D1' } }}>
                            <OpenInNewIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </div>
                      </TableCell>
                      <TableCell align="center">
                        <div className="flex" style={{ cursor: 'pointer', userSelect: 'none' }} >
                          <p className="truncate w-[220px]">{tx.jito_bundle_id}</p>
                          <ContentCopyIcon sx={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); handleCopy(String(tx.jito_bundle_id)); }} />
                        </div>
                      </TableCell>
                      <TableCell align="center">{(Math.abs(Number(tx.sol_delta)) / Math.pow(10, 9)).toFixed(5)}</TableCell>
                      <TableCell align="center">
                        <Tooltip title={String(tx.status)}>
                          <span className="inline-flex items-center justify-center">
                            <StatusIcon status={String(tx.status)} />
                          </span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip
                          title={`${tx.action_type}${
                            actionTypeFilter === String(tx.action_type) ? ' (filtered)' : ' — Click to filter'
                          }`}
                        >
                          <Box
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActionTypeClick(String(tx.action_type));
                            }}
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              borderRadius: 1,
                              px: 0.5,
                              '&:hover': { bgcolor: 'action.hover' },
                            }}
                          >
                            <ActionTypeIcon actionType={String(tx.action_type)} />
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={`${tx.team_name}${platformFilter === String(tx.team_name) ? ' (filtered)' : ' - Click to filter'}`}>
                          <Box
                            onClick={(e) => { e.stopPropagation(); handlePlatformClick(String(tx.team_name)); }}
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              borderRadius: 1,
                              px: 0.5,
                              '&:hover': { bgcolor: 'action.hover' },
                            }}
                          >
                            <CalledByIcon teamName={String(tx.team_name)} />
                          </Box>
                        </Tooltip>
                      </TableCell>
                      {status == "completed" &&
                      <>
                        <TableCell align="center">{bigNum(Number(tx.token_delta) / Math.pow(10, tx.decimals))}</TableCell>
                        <TableCell align="center">{(Number(tx.sol_delta) / Math.pow(10, 9)).toFixed(2)}</TableCell>
                      </>
                      }
                      {status == "pending" && (
                        <TableCell align="center">
                          <Button
                            variant="contained"
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handleCommit(String(tx.tx_id)); }}
                            disabled={committingTxId === String(tx.tx_id) || COMMIT_DISABLED_TX_IDS.has(String(tx.tx_id))}
                          >
                            {committingTxId === String(tx.tx_id) ? 'Committing...' : 'Commit'}
                          </Button>
                        </TableCell>
                      )}
                      <TableCell align="center">{tx.created_at}</TableCell>
                      <TableCell align="center">{tx.completed_at}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={count}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </LoadingOverlay>
        </TableContainer>
      </Box>

      {pendingUserAddress && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: `${selectedTxs.length * 300}px`,
          width: 300,
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          bgcolor: '#0f0f14',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 2 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.07)', borderRadius: 2 },
          transition: `right ${CLOSE_MS}ms ease`,
          animation: `${userPanelClosing ? `panelSlideOut ${CLOSE_MS}ms` : `panelSlideIn ${OPEN_MS}ms`} cubic-bezier(0.22,1,0.36,1) both`,
          willChange: 'transform, opacity',
          zIndex: 2,
        }}>
          <Box sx={{ position: 'sticky', top: 0, bgcolor: '#0f0f14', zIndex: 1, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>User</Typography>
              <IconButton size="small" onClick={() => closeUserPanel()} sx={{ color: 'rgba(255,255,255,0.35)', p: 0.5, '&:hover': { color: 'rgba(255,255,255,0.7)' } }}>
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
            <Box sx={{ height: 2, bgcolor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <Box key={userPanelOpenKey} sx={{
                height: '100%', bgcolor: 'rgba(45,212,209,0.45)',
                transformOrigin: 'left',
                '@keyframes deplete': { from: { transform: 'scaleX(1)' }, to: { transform: 'scaleX(0)' } },
                animation: 'deplete 10s linear forwards',
              }} />
            </Box>
          </Box>

          <Box sx={{ px: 2, pt: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <DetailRow label="Address">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography component="a" href={`/user?user_address=${pendingUserAddress}`} target="_blank" rel="noopener noreferrer"
                  sx={{ fontSize: 11, fontFamily: 'monospace', color: '#2DD4D1', wordBreak: 'break-all', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                  {pendingUserAddress}
                </Typography>
                <IconButton size="small" onClick={() => handleCopy(pendingUserAddress)} sx={{ p: 0.25, color: 'rgba(255,255,255,0.3)', flexShrink: 0, '&:hover': { color: 'rgba(255,255,255,0.7)' } }}>
                  <ContentCopyIcon sx={{ fontSize: 12 }} />
                </IconButton>
                <IconButton size="small" component="a" href={`https://solscan.io/account/${pendingUserAddress}`} target="_blank" rel="noopener noreferrer" sx={{ p: 0.25, color: 'rgba(255,255,255,0.3)', flexShrink: 0, '&:hover': { color: '#2DD4D1' } }}>
                  <OpenInNewIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Box>
            </DetailRow>
          </Box>

          {userLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 3 }}>
              <Box sx={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.12)', borderTopColor: '#2DD4D1', borderRadius: '50%', animation: 'spin 0.7s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }} />
            </Box>
          ) : selectedUser ? (
            <Box sx={{ px: 2, py: 1, display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1 }}>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

              <Box>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase', mb: 0.75 }}>Volume</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.5 }}>
                  {[
                    { label: '1d', value: selectedUser.volume_1d },
                    { label: '7d', value: selectedUser.volume_7d },
                    { label: 'All', value: selectedUser.volume_total },
                  ].map(({ label, value }) => (
                    <Box key={label} sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1, px: 1, py: 0.75, textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', mb: 0.25 }}>{label}</Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.85)' }}>
                        {(Number(value) / 1e9).toFixed(2)}
                      </Typography>
                      <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>SOL</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

              {selectedUser.balances && selectedUser.balances.length > 0 && (() => {
                const PAGE_SIZE = 3;
                const totalPages = Math.ceil(selectedUser.balances.length / PAGE_SIZE);
                const pageBalances = selectedUser.balances.slice(balancePage * PAGE_SIZE, (balancePage + 1) * PAGE_SIZE);
                return (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                      <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Balances</Typography>
                      {totalPages > 1 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                          <IconButton size="small" disabled={balancePage === 0} onClick={() => setBalancePage(p => p - 1)} sx={{ p: 0.25, color: 'rgba(255,255,255,0.4)', '&:disabled': { opacity: 0.2 }, '&:hover': { color: 'rgba(255,255,255,0.8)' } }}>
                            <Typography sx={{ fontSize: 12, lineHeight: 1 }}>‹</Typography>
                          </IconButton>
                          <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{balancePage + 1}/{totalPages}</Typography>
                          <IconButton size="small" disabled={balancePage >= totalPages - 1} onClick={() => setBalancePage(p => p + 1)} sx={{ p: 0.25, color: 'rgba(255,255,255,0.4)', '&:disabled': { opacity: 0.2 }, '&:hover': { color: 'rgba(255,255,255,0.8)' } }}>
                            <Typography sx={{ fontSize: 12, lineHeight: 1 }}>›</Typography>
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {pageBalances.map((b, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: '3px', bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', flexShrink: 0 }}>{b.symbol || 'SOL'}</Typography>
                            {b.token_address && (
                              <Typography component="a" href={`https://solscan.io/token/${b.token_address}`} target="_blank" rel="noopener noreferrer"
                                sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', '&:hover': { color: '#2DD4D1' } }}>
                                {b.token_address.slice(0, 4)}…{b.token_address.slice(-4)}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, ml: 1 }}>
                            <Typography sx={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', color: 'rgba(255,255,255,0.75)' }}>
                              {(Number(b.balance) / Math.pow(10, Number(b.decimals))).toFixed(4)}
                            </Typography>
                            {b.token_address && (
                              <Box component="button" onClick={() => setScanMint(b.token_address)}
                                sx={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', px: '6px', py: '2px', borderRadius: '4px', border: '1px solid rgba(66,255,252,0.28)', color: 'rgba(66,255,252,0.6)', bgcolor: 'transparent', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s', '&:hover': { bgcolor: 'rgba(66,255,252,0.1)', borderColor: 'rgba(66,255,252,0.55)', color: '#42FFFC' } }}>
                                Scan
                              </Box>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                );
              })()}

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

              <DetailRow label="Total Points"><Typography sx={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#f59e0b' }}>{selectedUser.total_points}</Typography></DetailRow>
              <DetailRow label="Points from Refs"><Typography sx={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.6)' }}>{selectedUser.points_from_ref}</Typography></DetailRow>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

              <DetailRow label="Silent Claimed"><Typography sx={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.6)' }}>{(Number(selectedUser.silent_rewards_claimed) / 1e9).toFixed(4)} SOL</Typography></DetailRow>
              <DetailRow label="Silent Unclaimed">
                <Typography sx={{ fontSize: 12, fontWeight: Number(selectedUser.silent_rewards_unclaimed) > 0 ? 600 : 400, fontVariantNumeric: 'tabular-nums', color: Number(selectedUser.silent_rewards_unclaimed) > 0 ? '#4ade80' : 'rgba(255,255,255,0.6)' }}>
                  {(Number(selectedUser.silent_rewards_unclaimed) / 1e9).toFixed(4)} SOL
                </Typography>
              </DetailRow>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

              <Box sx={{ flex: 1 }} />
              <Button variant="outlined" size="small" component="a"
                href={`/user?user_address=${selectedUser.user_address}`}
                target="_blank" rel="noopener noreferrer"
                endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                sx={{ fontSize: 11, borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: 'rgba(255,255,255,0.35)', color: 'rgba(255,255,255,0.9)' } }}
              >
                Full Profile
              </Button>
            </Box>
          ) : (
            <Box sx={{ px: 2, py: 2 }}>
              <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>User not found</Typography>
            </Box>
          )}
        </Box>
      )}

      {selectedTxs.map((tx, index) => {
        const id = String(tx.tx_id);
        const debug = txDebugData[id];
        const txSymbol = debug?.symbol ?? null;
        const txMint = debug?.mint ?? null;
        const txFeePaid = debug?.feePaid ?? null;
        const txSplitRepay = debug?.splitRepay ?? null;
        const N = selectedTxs.length;
        const rightOffset = (N - 1 - index) * 300;
        return (
          <Box key={id} sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: `${rightOffset}px`,
            width: 300,
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            bgcolor: '#0f0f14',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 2 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.07)', borderRadius: 2 },
            animation: `${closingTxIds.has(id) ? `panelSlideOut ${txCloseDurations.current[id] ?? CLOSE_MS}ms` : `panelSlideIn ${OPEN_MS}ms`} cubic-bezier(0.22,1,0.36,1) both`,
            willChange: 'transform, opacity',
            zIndex: 2,
          }}>
            <Box sx={{ position: 'sticky', top: 0, bgcolor: '#0f0f14', zIndex: 1, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StatusIcon status={String(tx.status)} />
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', textTransform: 'capitalize' }}>
                    {String(tx.status)}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => closeTxPanel(id)} sx={{ color: 'rgba(255,255,255,0.35)', p: 0.5, '&:hover': { color: 'rgba(255,255,255,0.7)' } }}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
              <Box sx={{ height: 2, bgcolor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <Box key={id} sx={{
                  height: '100%', bgcolor: 'rgba(45,212,209,0.45)',
                  transformOrigin: 'left',
                  '@keyframes deplete': { from: { transform: 'scaleX(1)' }, to: { transform: 'scaleX(0)' } },
                  animation: 'deplete 10s linear forwards',
                }} />
              </Box>
            </Box>
            <Box sx={{ px: 2, py: 1, display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1 }}>
              <DetailRow label="Tx ID">
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.75)', wordBreak: 'break-all', lineHeight: 1.5 }}>
                    {id}
                  </Typography>
                  <IconButton size="small" onClick={() => handleCopy(tx.tx_id)} sx={{ p: 0.25, color: 'rgba(255,255,255,0.3)', flexShrink: 0, '&:hover': { color: 'rgba(255,255,255,0.7)' } }}>
                    <ContentCopyIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                  <IconButton size="small" component="a" href={`https://solscan.io/tx/${id}`} target="_blank" rel="noopener noreferrer" sx={{ p: 0.25, color: 'rgba(255,255,255,0.3)', flexShrink: 0, '&:hover': { color: '#2DD4D1' } }}>
                    <OpenInNewIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </Box>
              </DetailRow>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

              <DetailRow label="User Address">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography component="a" href={`/user?user_address=${String(tx.user_address)}`} target="_blank" rel="noopener noreferrer"
                    sx={{ fontSize: 11, fontFamily: 'monospace', color: '#2DD4D1', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                    {truncateAddress(String(tx.user_address))}
                  </Typography>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleCopy(tx.user_address); }} sx={{ p: 0.25, color: 'rgba(255,255,255,0.3)', '&:hover': { color: 'rgba(255,255,255,0.7)' } }}>
                    <ContentCopyIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                  <IconButton size="small" component="a" href={`https://solscan.io/account/${String(tx.user_address)}`} target="_blank" rel="noopener noreferrer" sx={{ p: 0.25, color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#2DD4D1' } }}>
                    <OpenInNewIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </Box>
              </DetailRow>

              <DetailRow label="Action">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <ActionTypeIcon actionType={String(tx.action_type)} />
                  <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{String(tx.action_type)}</Typography>
                </Box>
              </DetailRow>

              <DetailRow label="Platform">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <CalledByIcon teamName={String(tx.team_name)} />
                  <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{String(tx.team_name)}</Typography>
                </Box>
              </DetailRow>

              {tx.token_delta != null && Number(tx.token_delta) !== 0 && (
                <DetailRow label={Number(tx.token_delta) > 0 ? 'Token In' : 'Token Out'}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'nowrap', overflow: 'hidden' }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: Number(tx.token_delta) > 0 ? '#4ade80' : '#f87171', flexShrink: 0 }}>
                      {Number(tx.token_delta) > 0 ? '+' : ''}{bigNum(Number(tx.token_delta) / Math.pow(10, tx.decimals))}
                    </Typography>
                    {(txSymbol || txMint) && (
                      <Box component={txMint ? 'a' : 'span'}
                        {...(txMint ? { href: `https://solscan.io/token/${txMint}`, target: '_blank', rel: 'noopener noreferrer' } : {})}
                        sx={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: '#2DD4D1', textDecoration: 'none', flexShrink: 0, '&:hover': { textDecoration: txMint ? 'underline' : 'none' } }}>
                        {txSymbol || `${txMint!.slice(0, 6)}…${txMint!.slice(-4)}`}
                      </Box>
                    )}
                    {txMint && (
                      <IconButton size="small" onClick={() => handleCopy(txMint)} sx={{ p: 0.2, color: 'rgba(255,255,255,0.25)', flexShrink: 0, '&:hover': { color: 'rgba(255,255,255,0.7)' } }}>
                        <ContentCopyIcon sx={{ fontSize: 10 }} />
                      </IconButton>
                    )}
                    {txMint && (
                      <Box component="button" onClick={() => setScanMint(txMint)}
                        sx={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', px: '6px', py: '2px', borderRadius: '4px', border: '1px solid rgba(66,255,252,0.28)', color: 'rgba(66,255,252,0.6)', bgcolor: 'transparent', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, transition: 'all 0.12s', '&:hover': { bgcolor: 'rgba(66,255,252,0.1)', borderColor: 'rgba(66,255,252,0.55)', color: '#42FFFC' } }}>
                        Scan
                      </Box>
                    )}
                  </Box>
                </DetailRow>
              )}

              {tx.sol_delta != null && Number(tx.sol_delta) !== 0 && (
                <DetailRow label={Number(tx.sol_delta) > 0 ? 'SOL In' : 'SOL Out'}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: Number(tx.sol_delta) > 0 ? '#4ade80' : '#f87171' }}>
                    {Number(tx.sol_delta) > 0 ? '+' : ''}{(Number(tx.sol_delta) / 1e9).toFixed(5)} SOL
                  </Typography>
                </DetailRow>
              )}

              {tx.completed_at && (
                <DetailRow label="Completed">
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{String(tx.completed_at)}</Typography>
                </DetailRow>
              )}

              {(txFeePaid != null || txSplitRepay != null) && (
                <>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
                  {txFeePaid != null && (
                    <DetailRow label="Fee Paid">
                      <Typography sx={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#f87171' }}>
                        {(txFeePaid / 1e9).toFixed(5)} SOL
                      </Typography>
                    </DetailRow>
                  )}
                  {txSplitRepay != null && (
                    <DetailRow label="Split Repay">
                      <Typography sx={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.75)' }}>
                        {txSplitRepay}
                      </Typography>
                    </DetailRow>
                  )}
                </>
              )}

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

              <Box sx={{ flex: 1 }} />
              <Button variant="outlined" size="small" component="a"
                href={`/transaction?tx_id=${id}`} target="_blank" rel="noopener noreferrer"
                endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                sx={{ fontSize: 11, borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: 'rgba(255,255,255,0.35)', color: 'rgba(255,255,255,0.9)' } }}
              >
                Full Details
              </Button>
            </Box>
          </Box>
        );
      })}

      {/* Token Holdings modal — opened from Holdings chip in tx/user panels */}
      <Dialog
        open={!!scanMint}
        onClose={() => setScanMint(null)}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: { bgcolor: 'background.paper', backgroundImage: 'none', borderRadius: isMobile ? 0 : 2, border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', maxHeight: isMobile ? '100vh' : '90vh' },
        }}
      >
        <DialogContent sx={{ p: isMobile ? 0 : 1.5 }}>
          {scanMint && <TokenSearch key={scanMint} defaultMint={scanMint} onClose={() => setScanMint(null)} />}
        </DialogContent>
      </Dialog>
    </Paper>
  );
};

export default Tx_History;
