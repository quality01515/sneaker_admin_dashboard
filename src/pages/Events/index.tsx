import React, { useCallback, useEffect, useState } from 'react';

import axios from 'axios';
import LoadingOverlay from 'react-loading-overlay-ts';
import { toast } from 'react-toastify';
import {
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import TablePagination from '@mui/material/TablePagination';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { ADMIN_ADDRESS } from 'src/config';
import {
  getSignature,
  SignatureExpiredError,
  handleSessionExpired,
} from 'src/utils';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;

type EventItem = {
  id: number;
  job_name: string;
  started_at: string;
  finished_at: string;
  status: string;
  skipped?: boolean | null;
  error_message: string | null;
  details: unknown;
};

type EventsResponse = {
  data: EventItem[];
  page: number;
  per_page: number;
  has_more: boolean;
};

const emptyEvents: EventsResponse = { data: [], page: 0, per_page: 0, has_more: false };

function prettyJobName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTs(raw: string): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

function formatDuration(start: string, end: string): string {
  if (!start || !end) return '—';
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e) || e < s) return '—';
  const ms = e - s;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const sec = Math.round((ms % 60_000) / 1000);
  return `${m}m ${sec}s`;
}

function normaliseStatus(s: string): 'success' | 'error' | 'running' | 'skipped' | 'other' {
  const l = s?.toLowerCase() ?? '';
  if (l === 'success' || l === 'completed' || l === 'done') return 'success';
  if (l === 'error' || l === 'failed' || l === 'failure') return 'error';
  if (l === 'running' || l === 'in_progress' || l === 'pending') return 'running';
  if (l === 'skipped' || l === 'skip') return 'skipped';
  return 'other';
}

function StatusChip({ status }: { status: string }) {
  const kind = normaliseStatus(status);
  const map = {
    success: { color: '#22c55e', bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.25)', icon: <CheckCircleOutlineIcon sx={{ fontSize: 12 }} /> },
    error:   { color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.25)', icon: <ErrorOutlineIcon sx={{ fontSize: 12 }} /> },
    running: { color: '#fbbf24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.25)', icon: <HourglassEmptyIcon sx={{ fontSize: 12 }} /> },
    skipped: { color: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.12)', icon: <SkipNextIcon sx={{ fontSize: 12 }} /> },
    other:   { color: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.12)', icon: null },
  }[kind];
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 1, py: 0.3, borderRadius: '5px', border: `1px solid ${map.border}`,
      bgcolor: map.bg, color: map.color, fontSize: 11, fontWeight: 600,
      letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {map.icon}
      {status || '—'}
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

const Events = () => {
  const navigate = useNavigate();
  const { signMessage } = useWallet();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EventsResponse>(emptyEvents);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [jobName, setJobName] = useState('');
  const [jobNameFilter, setJobNameFilter] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchEvents = useCallback(
    async (pageArg: number, perPage: number, jobNameArg: string) => {
      setLoading(true);
      try {
        const { super_admin_signature, timestamp } = await getSignature(signMessage || undefined, 'read');
        const response = await axios.post<EventsResponse>(
          `${process.env.REACT_APP_API_BASE_URL}/super_admin/events`,
          {
            super_admin_address: localStorage.getItem(ADMIN_ADDRESS),
            timestamp,
            super_admin_signature,
            page: pageArg,
            per_page: perPage,
            job_name: jobNameArg.trim() === '' ? null : jobNameArg.trim(),
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
        setData(emptyEvents);
        if (err instanceof SignatureExpiredError) { handleSessionExpired(navigate); return; }
        const message =
          axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
            ? String((err.response.data as { message?: string }).message ?? (err as Error).message)
            : err instanceof Error ? err.message : 'Failed to load events';
        toast.error(message, { autoClose: 2000 });
      } finally {
        setLoading(false);
      }
    },
    [navigate, signMessage]
  );

  useEffect(() => {
    fetchEvents(page, rowsPerPage, jobNameFilter);
  }, [fetchEvents, page, rowsPerPage, jobNameFilter]);

  const rows = data.data;
  const effectiveStatus = (r: EventItem) =>
    r.skipped === true ? 'skipped' : normaliseStatus(r.status);
  const successCount = rows.filter((r) => effectiveStatus(r) === 'success').length;
  const errorCount   = rows.filter((r) => effectiveStatus(r) === 'error').length;
  const runningCount = rows.filter((r) => effectiveStatus(r) === 'running').length;
  const skippedCount = rows.filter((r) => effectiveStatus(r) === 'skipped').length;

  const truncateDetails = (details: unknown): string => {
    if (details == null) return '—';
    try {
      const s = typeof details === 'string' ? details : JSON.stringify(details);
      return s.length > 80 ? s.slice(0, 80) + '…' : s;
    } catch { return String(details); }
  };

  const fullDetails = (details: unknown): string => {
    if (details == null) return '—';
    try { return typeof details === 'string' ? details : JSON.stringify(details, null, 2); }
    catch { return String(details); }
  };

  return (
    <main>
      <Container maxWidth="xl">
        <Box mt={2} mb={2}>
          <Typography variant="h4" component="h1" sx={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.88)', mb: 0.5 }}>
            Cron Events
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.38)', fontSize: 12 }}>
            Paginated cron job run history with optional job name filtering.
          </Typography>
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
          <StatCard label="Successful · page" value={successCount} color="#22c55e" />
          <StatCard label="Failed · page"     value={errorCount}   color="#f87171" />
          <StatCard label="Running · page"    value={runningCount} color="#fbbf24" />
          <StatCard label="Skipped · page"    value={skippedCount} color="rgba(255,255,255,0.45)" />
        </Box>

        {/* Filter */}
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
            <TextField
              label="Job name"
              variant="outlined"
              size="small"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(0); setJobNameFilter(jobName.trim()); } }}
              sx={{ '& .MuiInputBase-input': { fontSize: 12 }, '& .MuiInputLabel-root': { fontSize: 12 } }}
            />
            <Button variant="contained" size="small"
sx={{ fontSize: 12, height: 36 }}
              onClick={() => { setPage(0); setJobNameFilter(jobName.trim()); }}>
              Filter
            </Button>
            {jobNameFilter && (
              <Button variant="text" size="small"
sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}
                onClick={() => { setJobName(''); setPage(0); setJobNameFilter(''); }}>
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
                    <TableCell sx={{ ...headSx, width: 40 }}>#</TableCell>
                    <TableCell sx={headSx}>Job</TableCell>
                    <TableCell align="center" sx={headSx}>Status</TableCell>
                    <TableCell sx={headSx}>Started</TableCell>
                    <TableCell sx={headSx}>Finished</TableCell>
                    <TableCell align="right" sx={headSx}>Duration</TableCell>
                    <TableCell sx={{ ...headSx, borderLeft: '1px solid rgba(255,255,255,0.08)', pl: '20px' }}>Error</TableCell>
                    <TableCell sx={headSx}>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ ...cellSx, py: 5, color: 'rgba(255,255,255,0.25)' }}>
                        No events found
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((row, index) => (
                    <React.Fragment key={row.id}>
                    <TableRow
                      hover
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }, ...(expandedId === row.id && { bgcolor: 'rgba(255,255,255,0.025)' }) }}
                    >
                      <TableCell sx={{ ...cellSx, color: 'rgba(255,255,255,0.28)', fontVariantNumeric: 'tabular-nums' }}>
                        {index + 1 + page * rowsPerPage}
                      </TableCell>
                      <TableCell sx={{ ...cellSx, fontWeight: 600, color: 'rgba(255,255,255,0.80)', whiteSpace: 'nowrap' }}>
                        {prettyJobName(row.job_name)}
                      </TableCell>
                      <TableCell align="center" sx={cellSx}>
                        <StatusChip status={row.status} />
                      </TableCell>
                      <TableCell sx={{ ...cellSx, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11 }}>
                        {formatTs(row.started_at)}
                      </TableCell>
                      <TableCell sx={{ ...cellSx, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11 }}>
                        {formatTs(row.finished_at)}
                      </TableCell>
                      <TableCell align="right" sx={{ ...cellSx, color: 'rgba(255,255,255,0.50)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {formatDuration(row.started_at, row.finished_at)}
                      </TableCell>
                      <TableCell sx={{ ...cellSx, borderLeft: '1px solid rgba(255,255,255,0.08)', pl: '20px', color: row.error_message ? '#f87171' : 'rgba(255,255,255,0.25)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.error_message ? (
                          <Tooltip arrow title={row.error_message}>
                            <span style={{ cursor: 'default' }}>{row.error_message.length > 40 ? row.error_message.slice(0, 40) + '…' : row.error_message}</span>
                          </Tooltip>
                        ) : '—'}
                      </TableCell>
                      <TableCell sx={{ ...cellSx, color: 'rgba(255,255,255,0.40)', maxWidth: 200 }}>
                        {fullDetails(row.details) === '—' ? '—' : (
                          <Tooltip arrow title={<pre style={{ fontSize: 11, margin: 0, maxWidth: 420, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{fullDetails(row.details)}</pre>}>
                            <span style={{ cursor: 'default', fontFamily: 'monospace', fontSize: 11 }}>{truncateDetails(row.details)}</span>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedId === row.id && (
                      <TableRow>
                        <TableCell colSpan={8} sx={{ p: 0, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                          <Box sx={{ px: 3, py: 2, bgcolor: 'rgba(255,255,255,0.015)', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {row.error_message && (
                              <Box>
                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', mb: 0.5 }}>Error</Typography>
                                <Typography sx={{ fontSize: 12, color: '#f87171', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6 }}>
                                  {row.error_message}
                                </Typography>
                              </Box>
                            )}
                            <Box>
                              <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', mb: 0.5 }}>Details</Typography>
                              {fullDetails(row.details) === '—' ? (
                                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.28)' }}>No details</Typography>
                              ) : (
                                <Box component="pre" sx={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', lineHeight: 1.6, p: 1.5, borderRadius: 1, bgcolor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                  {fullDetails(row.details)}
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                    </React.Fragment>
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

export default Events;
