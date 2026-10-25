import { useEffect, useState } from 'react';
import React from 'react';
import axios from 'axios';
import LoadingOverlay from 'react-loading-overlay-ts';
import { toast } from 'react-toastify';
import { VersionedTransaction } from '@solana/web3.js';
import { confirmAndCommitTransaction } from "./confirmation";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { getSignature, SignatureExpiredError, handleSessionExpired } from 'src/utils';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { ADMIN_ADDRESS } from 'src/config';
import TablePagination from '@mui/material/TablePagination';
import { RefundResponse } from './types';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { getSignedMessageByWallet } from 'src/utils';
import { useSelector } from 'react-redux';
import { RootState } from 'src/store';
import { ADMIN_FLAG } from 'src/config';
import { useFocusedMode } from 'src/contexts/FocusedModeContext';
import { useNavigate } from 'react-router-dom';
import Tooltip from '@mui/material/Tooltip';
import { truncateAddress } from 'src/utils';
import { ScreeningDrawer } from 'src/components/EllipticScreening/ScreeningDrawer';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;

const Refund_List = ({ fetchRefundOverview }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RefundResponse>({
    data: [],
    page: 0,
    per_page: 0,
    has_more: false,
  });
  const [page, setPage] = React.useState(0);
  const navigate = useNavigate();
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [walletFilter, setWalletFilter] = React.useState('');
  const [walletFilterInput, setWalletFilterInput] = React.useState('');
  const { connection } = useConnection();
	const { signMessage, publicKey, connected, sendTransaction } = useWallet();
  
  const { is_super_admin } = useSelector((state: RootState) => state.admin);
  const { focused } = useFocusedMode();

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setPage(newPage);
    fetchRefundList(newPage, rowsPerPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
    fetchRefundList(0, parseInt(event.target.value, 10));
  };

  const filteredData = walletFilter.trim()
    ? data.data.filter(r => String(r.user_address).toLowerCase().includes(walletFilter.trim().toLowerCase()))
    : data.data;

	
  const handleUserAddressClick = (e: React.MouseEvent, user_address: string) => {
    e.stopPropagation();
    navigate(`/user?user_address=${user_address}`);
  };

  const handleTxIdClick = (e: React.MouseEvent, tx_id: string) => {
    e.stopPropagation();
    navigate(`/transaction?tx_id=${tx_id}`);
  };

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard', {

      autoClose: 1500
    });
  };
  
  const handleRefund = async (ledger_action_id: number, blocked_tx_id: string, is_to_user: boolean) => {
    try {
      // Check if wallet is connected and signMessage is available
      if (!connected || !publicKey) {
        toast.error('Please connect your wallet again.', {

          autoClose: 2000
        });
        setLoading(false);
        return;
      }
  
      if (!signMessage) {
        toast.error('Wallet does not support message signing. Please reconnect your wallet.', {

          autoClose: 2000
        });
        setLoading(false);
        return;
      }
  
      const timestamp = new Date().getTime();
      const message = `write:super_admin/user/refund_blocked_deposit:${ledger_action_id}:${timestamp}`;
      let admin_signature = await getSignedMessageByWallet( signMessage, message);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/super_admin/blocked_deposits/refund`,
        {
          super_admin_address: localStorage.getItem(ADMIN_ADDRESS),
          timestamp: timestamp,
          super_admin_signature: admin_signature,
          rejected_action_id: ledger_action_id,
          is_to_user: is_to_user,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );
      console.log('Refunded:', response.data);
      const { transaction, tx_id } = response.data;
      console.log('Transaction:', transaction);
      console.log('Tx Id:', tx_id);
      console.log('Connection:', connection);
      if (transaction && tx_id) {
        try {
          const binaryString = atob(transaction);
          const transactionBytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            transactionBytes[i] = binaryString.charCodeAt(i);
          }
          const tx = VersionedTransaction.deserialize(transactionBytes);
          const recentBlockhash = tx.message.recentBlockhash;
          const signature = await sendTransaction(tx, connection);
          
            const result = await confirmAndCommitTransaction({
              signature,
              recentBlockhash,
              blocked_tx_id,
              refund_tx_id: tx_id
            });

            if (result.success) {
              toast.success(
                <span>
                  Refunded successfully:{' '}
                  <a href={`https://solscan.io/tx/${tx_id}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    {tx_id}
                  </a>
                </span>,
                {

                  autoClose: 1500
                }
              )
              fetchRefundList(page, rowsPerPage);
              fetchRefundOverview();
            } else {
              toast.error(result.message, {

                  autoClose: 1500
                }
              );
              setLoading(false);
            }

        } catch (txError) {
          console.error('Transaction processing error:', txError);
          throw new Error(txError instanceof Error ? txError.message : 'Failed to process transaction');
        }
      } else {
        throw new Error('Withdrawal request failed');
      }
    } catch (err) {
      console.error("Failed to refund:", err);
      setLoading(false);
    }
  };

  const fetchRefundList = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    try {
      const {super_admin_signature, timestamp} = await getSignature(signMessage || undefined, 'read');

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/super_admin/blocked_deposits/list`,
        {
          super_admin_address: localStorage.getItem(ADMIN_ADDRESS),
          timestamp: timestamp,
          super_admin_signature: super_admin_signature,
          page,
          per_page: rowsPerPage,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      console.log('Refunds:', response.data);
      
      setData(response.data);
      setLoading(false);
    } catch (err: any) {
      console.error('Error listing refunds', err);
      setLoading(false);
      if (err instanceof SignatureExpiredError) {
        handleSessionExpired(navigate);
        return;
      }
      setData({
        data: [],
        page: 0,
        per_page: 0,
        has_more: false,
      });
      toast.error(err.message, {

        autoClose: 1500
      });
    }
  };

  useEffect(() => {
    setPage(0);
    fetchRefundList(0, rowsPerPage);
  }, [signMessage, status]);

  const exportCSV = () => {
    const headers = ['No', 'User Address', 'Tx ID', 'Amount', 'Status', 'Refund Tx ID', 'Created At'];
    const rows = filteredData.map((r, i) => [
      i + 1 + page * rowsPerPage,
      r.user_address,
      r.tx_id,
      (Number(r.amount) / Math.pow(10, r.decimals)).toFixed(2),
      r.status,
      r.refund_tx_id ?? '',
      new Date(r.created_at).toISOString(),
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blocked_deposits_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Paper>
      {/* Wallet filter + CSV export */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', p: 1.5, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Box sx={{ display: 'flex', flex: '1 1 260px', minWidth: 0, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 1, overflow: 'hidden' }}>
          <input
            placeholder="Filter by wallet address…"
            value={walletFilterInput}
            onChange={e => setWalletFilterInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setWalletFilter(walletFilterInput); } }}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 12, padding: '7px 10px', fontFamily: 'monospace' }}
          />
          {walletFilter && (
            <button onClick={() => { setWalletFilter(''); setWalletFilterInput(''); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '0 8px', fontSize: 14 }}>×</button>
          )}
        </Box>
        <Button size="small" variant="outlined"
sx={{ fontSize: 11, height: 34, whiteSpace: 'nowrap', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: 'rgba(255,255,255,0.35)' } }}
          onClick={() => { setWalletFilter(walletFilterInput); }}>
          Filter
        </Button>
        <Button size="small" variant="outlined"
sx={{ fontSize: 11, height: 34, whiteSpace: 'nowrap', borderColor: 'rgba(45,212,209,0.3)', color: '#2DD4D1', '&:hover': { borderColor: '#2DD4D1', bgcolor: 'rgba(45,212,209,0.06)' } }}
          onClick={exportCSV}>
          Export CSV
        </Button>
      </Box>
      <Box display="flex" justifyContent="center">
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
                  <TableCell align="center">Amount</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Refund Tx Id</TableCell>
                  <TableCell align="center">Created At</TableCell>
                  {(is_super_admin || localStorage.getItem(ADMIN_FLAG) == "1") &&
                  <>
                    <TableCell align="center">To User</TableCell>
                    <TableCell align="center">To Admin</TableCell>
                  </>
                  }
                  <TableCell align="center">Screen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                  {filteredData.map((refund, index) => {
                  return (
                    <TableRow hover key={`row-${refund.tx_id}`}>
                      <TableCell align="center">{index + 1 + page * rowsPerPage}</TableCell>
                      <TableCell align="center">
                        {focused ? (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1, py: 0.25, borderRadius: '4px',
                            bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
                              textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', lineHeight: 1 }}>
                              redacted
                            </Typography>
                          </Box>
                        ) : (
                          <div className="flex" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={(e) => { e.stopPropagation(); handleUserAddressClick(e, String(refund.user_address)); }} >
                            <Tooltip title={String(refund.user_address)}>
                              <p style={{ fontFamily: 'monospace' }}>{truncateAddress(String(refund.user_address))}</p>
                            </Tooltip>
                            <ContentCopyIcon sx={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); handleCopy(e, String(refund.user_address)); }} />
                          </div>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <div className="flex" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={(e) => { e.stopPropagation(); handleTxIdClick(e, String(refund.tx_id)); }} >
                          <p className="truncate w-[260px]">{refund.tx_id}</p>		
                          <ContentCopyIcon sx={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); handleCopy(e, String(refund.tx_id)); }} />
                        </div>	
                      </TableCell>
                      <TableCell align="center">{(Number(refund.amount) / Math.pow(10, refund.decimals)).toFixed(2)}</TableCell>
                      <TableCell align="center">{refund.status == 'completed' ? 'Refunded' : refund.status == 'pending' ? 'Refund in progress' : 'Blocked'}</TableCell>
                       <TableCell align="center">
                        <div className="flex" style={{ cursor: 'pointer', userSelect: 'none' }} >
                          <p className="truncate w-[260px]">{refund.refund_tx_id}</p>		
                          {refund.refund_tx_id != null && <ContentCopyIcon sx={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); handleCopy(e, String(refund.refund_tx_id)); }} />}
                        </div>	
                      </TableCell>
                      <TableCell align="center">{new Date(refund.created_at).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC'}</TableCell>
                      {(is_super_admin || localStorage.getItem(ADMIN_FLAG) == "1") &&
                        <>
                          <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                            <Button variant="contained" color={refund.status == 'completed' ? "success" : "primary"} onClick={() => handleRefund(refund.ledger_action_id, refund.tx_id, true)} disabled={refund.status == 'completed' || refund.status == 'pending'}>{refund.status == 'completed' ? 'Refunded' : refund.status == 'pending' ? 'Refund in progress' : 'Refund To User'}</Button>
                          </TableCell>
                          <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                            <Button variant="contained" color={refund.status == 'completed' ? "success" : "primary"} onClick={() => handleRefund(refund.ledger_action_id, refund.tx_id, false)} disabled={refund.status == 'completed' || refund.status == 'pending'}>{refund.status == 'completed' ? 'Refunded' : refund.status == 'pending' ? 'Refund in progress' : 'Refund To Admin'}</Button>
                          </TableCell>
                          </>
                      }
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        {!focused && (
                          <ScreeningDrawer walletAddress={String(refund.user_address)} label="Re-screen" />
                        )}
                      </TableCell>
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
            />
          </LoadingOverlay>
        </TableContainer>
      </Box>
    </Paper>
  );
};

export default Refund_List;