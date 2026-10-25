import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Chip,
  Tooltip
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { getSignature, SignatureExpiredError, handleSessionExpired } from 'src/utils';
import { useWallet } from '@solana/wallet-adapter-react';
import LoadingOverlay from 'react-loading-overlay-ts';
import axios from 'axios';
import { ADMIN_ADDRESS } from 'src/config';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { UserBalanceChangesResponse } from './types';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;

const Balance_Changes = ({ user_address }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UserBalanceChangesResponse>({
    data: [],
    page: 0,
    per_page: 0,
    has_more: false,
  });
  const { signMessage } = useWallet();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [ledgerActionIdFilter, setLedgerActionIdFilter] = useState<number | null>(null);
  const navigate = useNavigate();

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard', {

        autoClose: 1500
      });
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setPage(newPage);
    fetchBalanceChanges(newPage, rowsPerPage, ledgerActionIdFilter);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const nextRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(nextRowsPerPage);
    setPage(0);
    fetchBalanceChanges(0, nextRowsPerPage, ledgerActionIdFilter);
  };

  const handleLedgerActionIdClick = (ledgerActionId: number) => {
    const nextLedgerActionIdFilter = ledgerActionIdFilter === ledgerActionId ? null : ledgerActionId;
    setLedgerActionIdFilter(nextLedgerActionIdFilter);
    setPage(0);
    fetchBalanceChanges(0, rowsPerPage, nextLedgerActionIdFilter);
  };

  const handleClearLedgerActionIdFilter = () => {
    setLedgerActionIdFilter(null);
    setPage(0);
    fetchBalanceChanges(0, rowsPerPage, null);
  };

  const fetchBalanceChanges = async (targetPage?: number, targetRowsPerPage?: number, targetLedgerActionId?: number | null) => {
    setLoading(true);
    try {
      const { super_admin_signature, timestamp } = await getSignature(signMessage || undefined, 'read');

      if (!user_address) {
        setLoading(false);
        return;
      }

      const requestBody: any = {
        admin_address: localStorage.getItem(ADMIN_ADDRESS) || "",
        timestamp,
        admin_signature: super_admin_signature,
        page: targetPage,
        per_page: targetRowsPerPage,
        user_address,
      };

      if (targetLedgerActionId !== null && targetLedgerActionId !== undefined) {
        requestBody.ledger_action_id = targetLedgerActionId;
      }

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/user/balance_changes`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      setData(response.data);
      setLoading(false);
    } catch (err: any) {
      console.error('Error listing balance changes', err);
      setLoading(false);
      if (err instanceof SignatureExpiredError) {
        handleSessionExpired(navigate);
        return;
      }
      toast.error(err.message, {

        autoClose: 1500
      });
    }
  };

  useEffect(() => {
    fetchBalanceChanges(page, rowsPerPage, ledgerActionIdFilter);
  }, [signMessage]);

  return (
    <Paper>
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
        {ledgerActionIdFilter !== null && (
          <Box display="flex" justifyContent="flex-end" sx={{ px: 2, pt: 2 }}>
            <Chip
              label={"Ledger Action ID: " + ledgerActionIdFilter}
              size="small"
              color="primary"
              variant="outlined"
              onDelete={handleClearLedgerActionIdFilter}
            />
          </Box>
        )}
        <Box display="flex" justifyContent="center">
          <TableContainer style={{ maxWidth: '100%' }}>
            <Table sx={{ overflowX: 'auto', width: '100%' }}>
              <TableHead>
                <TableRow style={{ width: '100%' }}>
                  <TableCell align="center">No</TableCell>
                  <TableCell align="center">ID</TableCell>
                  <TableCell align="center">Ledger Action ID</TableCell>
                  <TableCell align="center">Bank ID</TableCell>
                  <TableCell align="center">Token Address</TableCell>
                  <TableCell align="center">Amount</TableCell>
                  <TableCell align="center">Purpose</TableCell>
                  <TableCell align="center">Phase</TableCell>
                  <TableCell align="center">Created At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.data.map((balanceChange, index) => (
                  <TableRow hover key={`row-${balanceChange.id}`}>
                    <TableCell align="center">{page * rowsPerPage + index + 1}</TableCell>
                    <TableCell align="center">{balanceChange.id}</TableCell>
                    <TableCell align="center">
                      <Tooltip
                        title={
                          "Ledger Action ID " +
                          balanceChange.ledger_action_id +
                          (ledgerActionIdFilter === balanceChange.ledger_action_id ? " (filtered)" : " - Click to filter")
                        }
                      >
                        <Button
                          variant="text"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLedgerActionIdClick(balanceChange.ledger_action_id);
                          }}
                          sx={{
                            minWidth: 0,
                            px: 1,
                            textTransform: "none",
                            fontWeight: ledgerActionIdFilter === balanceChange.ledger_action_id ? 700 : 500,
                          }}
                        >
                          {balanceChange.ledger_action_id}
                        </Button>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">{balanceChange.bank_id}</TableCell>
                    <TableCell align="center">
                      <div
                        className="flex"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(balanceChange.token_address);
                        }}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        <p className="truncate w-[180px]">{balanceChange.token_address || '—'}</p>
                        <ContentCopyIcon sx={{ width: 18, height: 18 }} />
                      </div>
                    </TableCell>
                    <TableCell align="center">{balanceChange.amount}</TableCell>
                    <TableCell align="center">{balanceChange.purpose}</TableCell>
                    <TableCell align="center">{balanceChange.phase}</TableCell>
                    <TableCell align="center">{balanceChange.created_at || '—'}</TableCell>
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
              nextIconButtonProps={{ disabled: !data.has_more }}
            />
          </TableContainer>
        </Box>
      </LoadingOverlay>
    </Paper>
  );
};

export default Balance_Changes;
