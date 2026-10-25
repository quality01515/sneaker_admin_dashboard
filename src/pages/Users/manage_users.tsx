import { useEffect, useState } from 'react';
import axios from 'axios';
import LoadingOverlay from 'react-loading-overlay-ts';
import { toast } from 'react-toastify';
import {
  Box,
  Divider,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  useMediaQuery,
} from '@mui/material';
import { getSignature, SignatureExpiredError, handleSessionExpired } from 'src/utils';
import { useWallet } from '@solana/wallet-adapter-react';
import { ADMIN_ADDRESS } from 'src/config';
import TablePagination from '@mui/material/TablePagination';
import { UserResponse, User } from './types';
import InputBase from '@mui/material/InputBase';
import IconButtonMui from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { useNavigate } from 'react-router-dom';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { truncateAddress } from 'src/utils';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Box>{children}</Box>
    </Box>
  );
}

const Users_Table = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UserResponse>({
    data: [],
    page: 0,
    per_page: 0,
    has_more: false,
  });
  const { signMessage, publicKey } = useWallet();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [kol, setKol] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(hover: none)');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard', { autoClose: 1500 });
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  };

  const handleSearchClick = () => {
    setPage(0);
    fetchUsers(0, rowsPerPage, searchText, kol);
  };

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setPage(newPage);
    fetchUsers(newPage, rowsPerPage, searchText, kol);
  };

  const onlyKol = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPage(0);
    setKol(event.target.checked);
    fetchUsers(0, rowsPerPage, searchText, event.target.checked);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value));
    setPage(0);
    fetchUsers(0, parseInt(event.target.value), searchText, kol);
  };

  const fetchUsers = async (page?: number, rowsPerPage?: number, filter_keyword?: string, only_kol?: boolean) => {
    setLoading(true);
    try {
      const {super_admin_signature, timestamp} = await getSignature(signMessage || undefined, 'read');
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/users/list`,
        {
          admin_address: localStorage.getItem(ADMIN_ADDRESS),
          timestamp,
          admin_signature: super_admin_signature,
          page,
          per_page: rowsPerPage,
          filter_keyword,
          only_kol,
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
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      if (err instanceof SignatureExpiredError) { handleSessionExpired(navigate); return; }
      toast.error(err.message, { autoClose: 1500 });
    }
  };

  useEffect(() => {
    fetchUsers(page, rowsPerPage, searchText, kol);
  }, [signMessage]);

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, flexWrap: 'wrap' }}>
        <Paper component="form" sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', flex: '1 1 260px', minWidth: 0 }}>
          <InputBase
            sx={{ ml: 1, flex: 1, fontSize: 13 }}
            placeholder="Search user address"
            value={searchText}
            onChange={handleInputChange}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchClick(); } }}
          />
          <IconButtonMui type="button" sx={{ p: '8px' }} onClick={handleSearchClick}>
            <SearchIcon />
          </IconButtonMui>
        </Paper>
        <FormControlLabel
          control={<Checkbox sx={{ transform: 'scale(1.0)' }} checked={kol} />}
          label={<Typography sx={{ fontSize: 13 }}>Only KOL</Typography>}
          onChange={onlyKol}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <TableContainer style={{ maxWidth: '100%' }}>
            <LoadingOverlay active={loading} spinner styles={{ wrapper: (base) => ({ ...base, width: '100%' }) }}>
              <Table sx={{ overflowX: 'auto', width: '100%', '& .MuiTableCell-root': { fontSize: 12, py: '7px', px: '10px' }, '& .MuiTableHead-root .MuiTableCell-root': { fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', bgcolor: 'rgba(255,255,255,0.02)' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell align="center">#</TableCell>
                    <TableCell>User Address</TableCell>
                    <TableCell>Referrer</TableCell>
                    <TableCell align="center">Created At</TableCell>
                    <TableCell align="center">Multiplier</TableCell>
                    <TableCell align="center">Invites</TableCell>
                    <TableCell align="center">Referral Cut</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.data.map((user: User, index) => {
                    const isSelected = selectedUser?.user_address === user.user_address;
                    return (
                      <TableRow
                        hover
                        key={`row-${user.user_address}`}
                        onClick={() => setSelectedUser(isSelected ? null : user)}
                        onContextMenu={isMobile ? undefined : (e) => { e.preventDefault(); window.open(`/user?user_address=${user.user_address}`, '_blank'); }}
                        sx={{
                          cursor: 'pointer', userSelect: 'none',
                          ...(isSelected && { bgcolor: 'rgba(45,212,209,0.07)', outline: '1px solid rgba(45,212,209,0.25)' }),
                        }}
                      >
                        <TableCell align="center">{index + 1 + page * rowsPerPage}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography sx={{ fontFamily: 'monospace', fontSize: 12 }}>{truncateAddress(user.user_address)}</Typography>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleCopy(user.user_address); }} sx={{ p: 0.25, color: 'rgba(255,255,255,0.3)', '&:hover': { color: 'rgba(255,255,255,0.7)' } }}>
                              <ContentCopyIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography sx={{ fontFamily: 'monospace', fontSize: 12 }}>{truncateAddress(user.referrer_address)}</Typography>
                            {user.referrer_address && (
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleCopy(user.referrer_address); }} sx={{ p: 0.25, color: 'rgba(255,255,255,0.3)', '&:hover': { color: 'rgba(255,255,255,0.7)' } }}>
                                <ContentCopyIcon sx={{ fontSize: 13 }} />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">{user.created_at}</TableCell>
                        <TableCell align="center">{user.kol_multiplier}</TableCell>
                        <TableCell align="center">{user.current_invites}</TableCell>
                        <TableCell align="center">{user.referral_base_cut}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                page={page}
                count={page * rowsPerPage + data.data.length}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                nextIconButtonProps={{ disabled: !data.has_more }}
                sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: 12 } }}
              />
            </LoadingOverlay>
          </TableContainer>
        </Box>

        {selectedUser && (
          <Box sx={{
            width: 300,
            flexShrink: 0,
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            bgcolor: '#0f0f14',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            animation: 'panelSlideIn 0.2s ease-out',
            '@keyframes panelSlideIn': { from: { opacity: 0, transform: 'translateX(16px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: 0, bgcolor: '#0f0f14', zIndex: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>User</Typography>
              <IconButton size="small" onClick={() => setSelectedUser(null)} sx={{ color: 'rgba(255,255,255,0.35)', p: 0.5, '&:hover': { color: 'rgba(255,255,255,0.7)' } }}>
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>

            <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <DetailRow label="Address">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.75)', wordBreak: 'break-all' }}>{selectedUser.user_address}</Typography>
                  <IconButton size="small" onClick={() => handleCopy(selectedUser.user_address)} sx={{ p: 0.25, color: 'rgba(255,255,255,0.3)', flexShrink: 0, '&:hover': { color: 'rgba(255,255,255,0.7)' } }}>
                    <ContentCopyIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                  <IconButton size="small" component="a" href={`https://solscan.io/account/${selectedUser.user_address}`} target="_blank" rel="noopener noreferrer" sx={{ p: 0.25, color: 'rgba(255,255,255,0.3)', flexShrink: 0, '&:hover': { color: '#2DD4D1' } }}>
                    <OpenInNewIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </Box>
              </DetailRow>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

              {selectedUser.referrer_address && (
                <>
                  <DetailRow label="Referred By">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.75)' }}>{truncateAddress(selectedUser.referrer_address)}</Typography>
                      <IconButton size="small" onClick={() => handleCopy(selectedUser.referrer_address)} sx={{ p: 0.25, color: 'rgba(255,255,255,0.3)', '&:hover': { color: 'rgba(255,255,255,0.7)' } }}>
                        <ContentCopyIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                      <IconButton size="small" component="a" href={`https://solscan.io/account/${selectedUser.referrer_address}`} target="_blank" rel="noopener noreferrer" sx={{ p: 0.25, color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#2DD4D1' } }}>
                        <OpenInNewIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    </Box>
                  </DetailRow>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
                </>
              )}

              <DetailRow label="Joined">{selectedUser.created_at}</DetailRow>
              <DetailRow label="Invites">{selectedUser.current_invites}</DetailRow>
              <DetailRow label="Referral Cut">{selectedUser.referral_base_cut}</DetailRow>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

              <Button
                variant="outlined" size="small" component="a"
                href={`/user?user_address=${selectedUser.user_address}`}
                target="_blank" rel="noopener noreferrer"
                endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                sx={{ fontSize: 11, borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: 'rgba(255,255,255,0.35)', color: 'rgba(255,255,255,0.9)' } }}
              >
                Full Profile
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default Users_Table;
