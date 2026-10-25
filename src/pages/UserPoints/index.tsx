import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import LoadingOverlay from 'react-loading-overlay-ts';
import { toast } from 'react-toastify';
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ADMIN_ADDRESS, ADMIN_FLAG } from 'src/config';
import { RootState } from 'src/store';
import {
  getSignature,
  getSignedMessageByWallet,
  SignatureExpiredError,
  handleSessionExpired,
  truncateAddress,
} from 'src/utils';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;

type UserPointsItem = {
  id: number;
  user_address: string;
  total: string;
  by_ref: string;
  updated_at: string | null;
};

type UserPointsListResponse = {
  data: UserPointsItem[];
  page: number;
  per_page: number;
  has_more: boolean;
};

const emptyList: UserPointsListResponse = {
  data: [],
  page: 0,
  per_page: 0,
  has_more: false,
};

const UserPoints = () => {
  const navigate = useNavigate();
  const { signMessage, connected, publicKey } = useWallet();
  const { is_super_admin: isSuperAdminRedux } = useSelector((state: RootState) => state.admin);
  const isSuperAdmin =
    isSuperAdminRedux || localStorage.getItem(ADMIN_FLAG) === '1';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UserPointsListResponse>(emptyList);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [userAddressInput, setUserAddressInput] = useState('');
  const [userAddressFilter, setUserAddressFilter] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<UserPointsItem | null>(null);
  const [editTotal, setEditTotal] = useState('');
  const [editByRef, setEditByRef] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(
    async (pageArg: number, perPage: number, userAddress?: string) => {
      setLoading(true);
      try {
        const { super_admin_signature, timestamp } = await getSignature(
          signMessage || undefined,
          'read'
        );

        const response = await axios.post<UserPointsListResponse>(
          `${process.env.REACT_APP_API_BASE_URL}/super_admin/user_points/list`,
          {
            super_admin_address: localStorage.getItem(ADMIN_ADDRESS),
            timestamp,
            super_admin_signature: super_admin_signature,
            page: pageArg,
            per_page: perPage,
            ...(userAddress ? { user_address: userAddress } : {}),
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
        console.error('Error listing user points', err);
        setData(emptyList);
        if (err instanceof SignatureExpiredError) {
          handleSessionExpired(navigate);
          return;
        }
        const message =
          axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
            ? String((err.response.data as { message?: string }).message ?? err.message)
            : err instanceof Error
              ? err.message
              : 'Failed to load user points';
        toast.error(message, { autoClose: 2000 });
      } finally {
        setLoading(false);
      }
    },
    [navigate, signMessage]
  );

  useEffect(() => {
    fetchList(page, rowsPerPage, userAddressFilter);
  }, [signMessage, page, rowsPerPage, userAddressFilter, fetchList]);

  const handleApplyUserAddressFilter = () => {
    const nextFilter = userAddressInput.trim();
    setPage(0);
    setUserAddressFilter(nextFilter);
  };

  const handleResetUserAddressFilter = () => {
    setUserAddressInput('');
    setPage(0);
    setUserAddressFilter('');
  };

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard', { autoClose: 1500 });
  };

  const openEdit = (row: UserPointsItem) => {
    setEditRow(row);
    setEditTotal(row.total);
    setEditByRef('');
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (saving) return;
    setEditOpen(false);
    setEditRow(null);
  };

  const submitUpdate = async () => {
    if (!editRow || !isSuperAdmin) return;
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet.', { autoClose: 2000 });
      return;
    }
    if (!signMessage) {
      toast.error('Wallet does not support message signing.', {

        autoClose: 2000,
      });
      return;
    }

    const totalTrimmed = editTotal.trim();
    const byRefTrimmed = editByRef.trim();
    const includeByRef = byRefTrimmed !== '';
    const byRefForSig = includeByRef ? byRefTrimmed : '';

    if (!totalTrimmed) {
      toast.error('Total is required.', { autoClose: 2000 });
      return;
    }

    setSaving(true);
    try {
      const timestamp = Date.now();
      const message = `write:super_admin/user_points/update:${editRow.user_address}:${totalTrimmed}:${byRefForSig}:${timestamp}`;
      const super_admin_signature = await getSignedMessageByWallet(signMessage, message);

      const payload: Record<string, unknown> = {
        super_admin_address: localStorage.getItem(ADMIN_ADDRESS),
        timestamp,
        super_admin_signature,
        user_address: editRow.user_address,
        total: totalTrimmed,
      };
      if (includeByRef) {
        payload.by_ref = byRefTrimmed;
      }

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/super_admin/user_points/update`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      toast.success(
        `Updated. Δ total: ${response.data.delta_total}` +
          (response.data.change_id != null ? ` (change #${response.data.change_id})` : ''),
        { autoClose: 2500 }
      );
      setEditOpen(false);
      setEditRow(null);
      await fetchList(page, rowsPerPage, userAddressFilter);
    } catch (err: unknown) {
      console.error('Error updating user points', err);
      if (err instanceof SignatureExpiredError) {
        handleSessionExpired(navigate);
        return;
      }
      const message =
        axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
          ? String((err.response.data as { message?: string }).message ?? err.message)
          : err instanceof Error
            ? err.message
            : 'Update failed';
      toast.error(message, { autoClose: 2500 });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePage = (_: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <main>
      <Container maxWidth="xl">
        <Box mt={3} mb={2}>
          <Typography variant="h4" component="h1" sx={{ color: 'rgba(255,255,255,0.88)', fontWeight: 600 }}>
            User Points
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255,255,255,0.7)' }}>
            Browse user point balances. Super admins can adjust totals and the optional by_ref field.
          </Typography>
        </Box>

        <Paper>
          <Box
            sx={{
              px: 2,
              pt: 2,
              display: 'flex',
              gap: 1,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <TextField
              label="User address"
              value={userAddressInput}
              onChange={(e) => setUserAddressInput(e.target.value)}
              size="small"
              sx={{ minWidth: 340, maxWidth: 520 }}
              placeholder="Filter by wallet address"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleApplyUserAddressFilter();
                }
              }}
            />
            <Button variant="contained" onClick={handleApplyUserAddressFilter}>
              Search
            </Button>
            <Button variant="outlined" onClick={handleResetUserAddressFilter}>
              Reset
            </Button>
          </Box>
          <Box display="flex" justifyContent="center" sx={{ p: 1 }}>
            <TableContainer style={{ maxWidth: '100%' }}>
              <LoadingOverlay
                active={loading}
                spinner
                styles={{
                  wrapper: (base) => ({
                    ...base,
                    width: '100%',
                  }),
                }}
              >
                <Table sx={{ overflowX: 'auto', width: '100%' }}>
                  <TableHead>
                    <TableRow sx={{ height: 56 }}>
                      <TableCell align="center">ID</TableCell>
                      <TableCell align="center">User</TableCell>
                      <TableCell align="center">Total</TableCell>
                      <TableCell align="center">By ref</TableCell>
                      <TableCell align="center">Updated</TableCell>
                      {isSuperAdmin && <TableCell align="center">Actions</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.data.map((row) => (
                      <TableRow hover key={row.id}>
                        <TableCell align="center">{row.id}</TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 0.5,
                            }}
                          >
                            <Tooltip title={row.user_address}>
                              <Typography
                                component="button"
                                type="button"
                                variant="body2"
                                onClick={() =>
                                  navigate(`/user?user_address=${encodeURIComponent(row.user_address)}`)
                                }
                                sx={{
                                  cursor: 'pointer',
                                  background: 'none',
                                  border: 'none',
                                  color: 'inherit',
                                  textDecoration: 'underline',
                                  maxWidth: 280,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {truncateAddress(row.user_address, 6, 6)}
                              </Typography>
                            </Tooltip>
                            <IconButton
                              size="small"
                              aria-label="copy address"
                              onClick={() => handleCopy(row.user_address)}
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                        <TableCell align="center">{row.total}</TableCell>
                        <TableCell align="center">{row.by_ref}</TableCell>
                        <TableCell align="center">
                          {row.updated_at != null ? String(row.updated_at) : '—'}
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell align="center">
                            <Tooltip title="Edit points">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => openEdit(row)}
                                aria-label="edit user points"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  component="div"
                  page={page}
                  count={page * rowsPerPage + data.data.length}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  nextIconButtonProps={{ disabled: !data.has_more }}
                  backIconButtonProps={{ disabled: page === 0 }}
                />
              </LoadingOverlay>
            </TableContainer>
          </Box>
        </Paper>

        <Dialog open={editOpen} onClose={closeEdit} fullWidth maxWidth="sm">
          <DialogTitle>Update user points</DialogTitle>
          <DialogContent>
            {editRow && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <TextField
                  label="User address"
                  value={editRow.user_address}
                  fullWidth
                  InputProps={{ readOnly: true }}
                  size="small"
                />
                <TextField
                  label="Total"
                  value={editTotal}
                  onChange={(e) => setEditTotal(e.target.value)}
                  fullWidth
                  required
                  size="small"
                  helperText="Decimal string; must differ from the current row unless you change by ref."
                />
                <TextField
                  label="By ref (optional)"
                  value={editByRef}
                  onChange={(e) => setEditByRef(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder={`Current: ${editRow.by_ref}`}
                  helperText="Leave empty to keep the existing by_ref value unchanged."
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeEdit} disabled={saving}>
              Cancel
            </Button>
            <Button variant="contained" onClick={() => void submitUpdate()} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </main>
  );
};

export default UserPoints;
