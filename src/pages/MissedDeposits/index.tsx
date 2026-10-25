import React, { useCallback, useEffect, useState } from 'react';

import axios from 'axios';
import LoadingOverlay from 'react-loading-overlay-ts';
import { toast } from 'react-toastify';
import {
  Box,
  Button,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import TablePagination from '@mui/material/TablePagination';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { ADMIN_ADDRESS } from 'src/config';
import {
  getSignature,
  SignatureExpiredError,
  handleSessionExpired,
  truncateAddress,
} from 'src/utils';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;
const DATE_FORMAT = 'yyyy-MM-dd';

type MissedDeposit = {
  id: number;
  tx_id: string;
  bank_pda: string;
  committed: boolean;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type MissedDepositsResponse = {
  data: MissedDeposit[];
  page: number;
  per_page: number;
  has_more: boolean;
};

const emptyMissedDeposits: MissedDepositsResponse = { data: [], page: 0, per_page: 0, has_more: false };

function formatTs(raw: string): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

function CommittedBadge({ committed }: { committed: boolean }) {
  const map = committed
    ? { color: '#22c55e', bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.25)', icon: <CheckCircleOutlineIcon sx={{ fontSize: 12 }} />, label: 'Success' }
    : { color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.25)', icon: <ErrorOutlineIcon sx={{ fontSize: 12 }} />, label: 'Failed' };
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 1, py: 0.3, borderRadius: '5px', border: `1px solid ${map.border}`,
      bgcolor: map.bg, color: map.color, fontSize: 11, fontWeight: 600,
      letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {map.icon}
      {map.label}
    </Box>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Box sx={{ flex: 1, minWidth: 100, px: 2, py: 1.25, borderRadius: 1.5,
      bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
        textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {value}
      </Typography>
    </Box>
  );
}

const headSx = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
  color: 'rgba(255,255,255,0.35)', bgcolor: 'rgba(255,255,255,0.02)',
  px: '12px', py: '8px', borderColor: 'rgba(255,255,255,0.06)', whiteSpace: 'nowrap' as const,
};
const cellSx = {
  fontSize: 12, px: '12px', py: '8px', borderColor: 'rgba(255,255,255,0.06)',
  verticalAlign: 'middle' as const,
};

const datePickerSx = {
  width: 150,
  '& .MuiOutlinedInput-root': {
    height: 36,
    bgcolor: 'rgba(255,255,255,0.04)',
    fontSize: 13,
    '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
    '&:hover fieldset': { borderColor: 'rgba(45,212,209,0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#2DD4D1', borderWidth: 1 },
  },
  '& .MuiInputBase-input': { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  '& .MuiInputLabel-root.Mui-focused': { color: '#2DD4D1' },
};

const MissedDeposits = () => {
  const navigate = useNavigate();
  const { signMessage } = useWallet();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MissedDepositsResponse>(emptyMissedDeposits);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [endAt, setEndAt] = useState<Date | null>(null);

  const fetchMissedDeposits = useCallback(
    async (pageArg: number, perPage: number, startAtArg: Date | null, endAtArg: Date | null) => {
      setLoading(true);
      try {
        const { super_admin_signature, timestamp } = await getSignature(signMessage || undefined, 'read');
        const response = await axios.post<MissedDepositsResponse>(
          `${process.env.REACT_APP_API_BASE_URL}/admin/missed_deposits`,
          {
            admin_address: localStorage.getItem(ADMIN_ADDRESS),
            timestamp,
            admin_signature: super_admin_signature,
            page: pageArg,
            per_page: perPage,
            start_at: startAtArg
              ? new Date(startAtArg.getFullYear(), startAtArg.getMonth(), startAtArg.getDate(), 0, 0, 0, 0).toISOString()
              : null,
            end_at: endAtArg
              ? new Date(endAtArg.getFullYear(), endAtArg.getMonth(), endAtArg.getDate(), 23, 59, 59, 999).toISOString()
              : null,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              accept: 'application/json',
              'x-api-key': ADMIN_DASHBOARD_API_KEY,
            },
          }
        );
        setData(response.data);
      } catch (err: unknown) {
        setData(emptyMissedDeposits);
        if (err instanceof SignatureExpiredError) { handleSessionExpired(navigate); return; }
        const message =
          axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
            ? String((err.response.data as { message?: string }).message ?? (err as Error).message)
            : err instanceof Error ? err.message : 'Failed to load missed deposits';
        toast.error(message, { autoClose: 2000 });
      } finally {
        setLoading(false);
      }
    },
    [navigate, signMessage]
  );

  useEffect(() => {
    fetchMissedDeposits(page, rowsPerPage, startAt, endAt);
  }, [fetchMissedDeposits, page, rowsPerPage, startAt, endAt]);

  const rows = data.data;
  const committedCount = rows.filter((r) => r.committed).length;
  const failedCount = rows.filter((r) => !r.committed).length;

  const handleTxIdClick = (e: React.MouseEvent, tx_id: string) => {
    e.stopPropagation();
    navigate(`/transaction?tx_id=${tx_id}`);
  };

  return (
    <main>
      <Container maxWidth="xl">
        <Box mt={2} mb={2}>
          <Typography variant="h4" component="h1" sx={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.88)', mb: 0.5 }}>
            Missed Deposits
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.38)', fontSize: 12 }}>
            Deposits that were missed and later recovered, with their commit status.
          </Typography>
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
          <StatCard label="Committed · page" value={committedCount} color="#22c55e" />
          <StatCard label="Failed · page" value={failedCount} color="#f87171" />
        </Box>

        {/* Filter */}
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
            <DatePicker
              label="Start"
              value={startAt}
              onChange={(date) => { setPage(0); setStartAt(date); }}
              maxDate={endAt ?? undefined}
              format={DATE_FORMAT}
              slotProps={{ textField: { size: 'small', InputLabelProps: { shrink: true }, sx: datePickerSx } }}
            />
            <DatePicker
              label="End"
              value={endAt}
              onChange={(date) => { setPage(0); setEndAt(date); }}
              minDate={startAt ?? undefined}
              maxDate={new Date()}
              format={DATE_FORMAT}
              slotProps={{ textField: { size: 'small', InputLabelProps: { shrink: true }, sx: datePickerSx } }}
            />
            {(startAt || endAt) && (
              <Button variant="text" size="small"
                sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}
                onClick={() => { setPage(0); setStartAt(null); setEndAt(null); }}>
                Clear
              </Button>
            )}
          </Box>
        </Paper>

        {/* Table */}
        <Paper sx={{ bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <TableContainer>
            <LoadingOverlay active={loading} spinner styles={{ wrapper: (base) => ({ ...base, width: '100%' }) }}>
              <Table sx={{ width: '100%' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>Tx Id</TableCell>
                    <TableCell sx={headSx}>Bank PDA</TableCell>
                    <TableCell align="center" sx={headSx}>Committed</TableCell>
                    <TableCell sx={{ ...headSx, borderLeft: '1px solid rgba(255,255,255,0.08)', pl: '20px' }}>Error</TableCell>
                    <TableCell sx={headSx}>Created</TableCell>
                    <TableCell sx={headSx}>Updated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ ...cellSx, py: 5, color: 'rgba(255,255,255,0.25)' }}>
                        No missed deposits found
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ ...cellSx, fontFamily: 'monospace' }}>
                        <Tooltip arrow title={row.tx_id}>
                          <Box
                            component="button"
                            type="button"
                            onClick={(e) => handleTxIdClick(e, row.tx_id)}
                            sx={{ background: 'none', border: 'none', p: 0, m: 0, cursor: 'pointer', color: '#2DD4D1', font: 'inherit', fontSize: 12, fontFamily: 'monospace', textAlign: 'left', textDecoration: 'underline', textUnderlineOffset: 3, '&:hover': { color: 'rgba(45,212,209,0.7)' } }}
                          >
                            {truncateAddress(row.tx_id, 6, 6)}
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ ...cellSx, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', fontSize: 11, whiteSpace: 'nowrap' }}>
                        <Tooltip arrow title={row.bank_pda}>
                          <span>{truncateAddress(row.bank_pda, 6, 6)}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center" sx={cellSx}>
                        <CommittedBadge committed={row.committed} />
                      </TableCell>
                      <TableCell sx={{ ...cellSx, borderLeft: '1px solid rgba(255,255,255,0.08)', pl: '20px', color: row.error_message ? '#f87171' : 'rgba(255,255,255,0.25)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.error_message ? (
                          <Tooltip arrow title={row.error_message}>
                            <span style={{ cursor: 'default' }}>{row.error_message.length > 40 ? row.error_message.slice(0, 40) + '…' : row.error_message}</span>
                          </Tooltip>
                        ) : '—'}
                      </TableCell>
                      <TableCell sx={{ ...cellSx, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11 }}>
                        {formatTs(row.created_at)}
                      </TableCell>
                      <TableCell sx={{ ...cellSx, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11 }}>
                        {formatTs(row.updated_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                page={page}
                count={page * rowsPerPage + rows.length}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[10, 25, 50, 100]}
                nextIconButtonProps={{ disabled: !data.has_more }}
                backIconButtonProps={{ disabled: page === 0 }}
                sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: 12 } }}
              />
            </LoadingOverlay>
          </TableContainer>
        </Paper>
      </Container>
    </main>
  );
};

export default MissedDeposits;
