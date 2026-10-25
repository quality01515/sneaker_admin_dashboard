import { useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { ADMIN_ADDRESS } from 'src/config';
import { AddressDisplay } from 'src/components/AddressDisplay';
import {
  getSignature,
  getSignedMessageByWallet,
  handleSessionExpired,
  SignatureExpiredError,
} from 'src/utils';
import {
  computeSummary,
  enrichBank,
  enrichBanks,
  EnrichedBankItem,
  formatLamports,
  getDifferenceColor,
  getTotalDifferenceColor,
  MakeBalanceAction,
  SolReconciliationCheckResponse,
  SolReconciliationMakeBalanceResponse,
  solToLamports,
} from './solReconciliationUtils';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;

const sweepButtonSx = {
  color: '#2DD4D1',
  borderColor: 'rgba(45,212,209,0.45)',
  fontSize: 11,
  whiteSpace: 'nowrap' as const,
  '&:hover': {
    borderColor: '#2DD4D1',
    bgcolor: 'rgba(45,212,209,0.08)',
  },
  '&.Mui-disabled': {
    borderColor: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.25)',
  },
};

const fundButtonSx = {
  color: '#818CF8',
  borderColor: 'rgba(129,140,248,0.45)',
  fontSize: 11,
  whiteSpace: 'nowrap' as const,
  '&:hover': {
    borderColor: '#818CF8',
    bgcolor: 'rgba(129,140,248,0.08)',
  },
  '&.Mui-disabled': {
    borderColor: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.25)',
  },
};

type PendingReconcileAction = {
  bankId: number;
  action: MakeBalanceAction;
};

type FundAmountModalState = {
  bankId: number;
  suggestedLamports: string;
  differenceSol: string | null;
};

const actionLabels: Record<MakeBalanceAction, string> = {
  sweep_to_authority: 'Bank → Authority',
  fund_from_authority: 'Authority → Bank',
};

type SolReconciliationTabProps = {
  setGlobalLoading: (loading: boolean) => void;
  unauthorized?: boolean;
};

const SolReconciliationTab = ({ setGlobalLoading, unauthorized }: SolReconciliationTabProps) => {
  const navigate = useNavigate();
  const { signMessage } = useWallet();

  const [banks, setBanks] = useState<EnrichedBankItem[]>([]);
  const [hasChecked, setHasChecked] = useState(false);
  const [onlyActionable, setOnlyActionable] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [makingBalanceBankId, setMakingBalanceBankId] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingReconcileAction | null>(null);
  const [fundAmountModal, setFundAmountModal] = useState<FundAmountModalState | null>(null);
  const [fundAmountSol, setFundAmountSol] = useState('');
  const [lastTxByBankId, setLastTxByBankId] = useState<Record<number, string>>({});

  const summary = useMemo(() => computeSummary(banks), [banks]);

  const displayedBanks = useMemo(
    () => (onlyActionable ? banks.filter((row) => row.status === 'actionable') : banks),
    [banks, onlyActionable]
  );

  const extractErrorMessage = (err: unknown, fallback: string): string =>
    axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
      ? String((err.response.data as { message?: string }).message ?? err.message)
      : err instanceof Error
        ? err.message
        : fallback;

  const runCheck = async () => {
    setGlobalLoading(true);
    try {
      const { super_admin_signature, timestamp } = await getSignature(signMessage || undefined, 'read');

      const payload = {
        admin_address: localStorage.getItem(ADMIN_ADDRESS),
        timestamp,
        admin_signature: super_admin_signature,
        bank_id: null,
      };

      const res = await axios.post<SolReconciliationCheckResponse>(
        `${process.env.REACT_APP_API_BASE_URL}/super_admin/monitor/sol_reconciliation/check`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      setBanks(enrichBanks(res.data.data));
      setHasChecked(true);
      setPage(0);
      toast.success('SOL reconciliation check completed', { autoClose: 1500 });
    } catch (err: unknown) {
      setBanks([]);
      setHasChecked(false);
      if (err instanceof SignatureExpiredError) {
        handleSessionExpired(navigate);
        return;
      }
      toast.error(extractErrorMessage(err, 'SOL reconciliation check failed'), { autoClose: 2000 });
    } finally {
      setGlobalLoading(false);
    }
  };

  const onStartReconciliation = () => {
    if (
      !window.confirm(
        'Warning: This process may take 10–20 seconds and may impact service performance. Proceed only if necessary.'
      )
    ) {
      return;
    }
    void runCheck();
  };

  const executeMakeBalance = async (bankId: number, amountLamports: string) => {
    if (!signMessage) {
      toast.error('Wallet does not support message signing.', { autoClose: 2000 });
      return;
    }

    let amount: number;
    try {
      const amountBig = BigInt(amountLamports);
      if (amountBig <= BigInt(0)) {
        toast.error('Amount must be greater than 0.', { autoClose: 2000 });
        return;
      }
      if (amountBig > BigInt(Number.MAX_SAFE_INTEGER)) {
        toast.error('Amount is too large.', { autoClose: 2000 });
        return;
      }
      amount = Number(amountBig);
    } catch {
      toast.error('Invalid amount.', { autoClose: 2000 });
      return;
    }

    setMakingBalanceBankId(bankId);
    try {
      const timestamp = Date.now();
      const message = `write:super_admin/monitor/sol_reconciliation/make_balance:${bankId}:${timestamp}`;
      const super_admin_signature = await getSignedMessageByWallet(signMessage, message);

      const payload = {
        admin_address: localStorage.getItem(ADMIN_ADDRESS),
        timestamp,
        admin_signature: super_admin_signature,
        bank_id: bankId,
        amount,
      };

      const res = await axios.post<SolReconciliationMakeBalanceResponse>(
        `${process.env.REACT_APP_API_BASE_URL}/super_admin/monitor/sol_reconciliation/make_balance`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      const updatedBank = enrichBank(res.data.bank);
      setBanks((prev) => prev.map((row) => (row.bank_id === bankId ? updatedBank : row)));
      setLastTxByBankId((prev) => ({ ...prev, [bankId]: res.data.tx_id }));

      if (updatedBank.status === 'matched') {
        toast.success(
          <span>
            Make balance succeeded.{' '}
            <Link
              href={`https://solscan.io/tx/${encodeURIComponent(res.data.tx_id)}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: '#2DD4D1' }}
            >
              View tx
            </Link>
          </span>,
          { autoClose: 4000 }
        );
      } else {
        toast.warning(
          `Make balance completed with remaining difference (${updatedBank.differenceSol ?? '—'} SOL)`,
          { autoClose: 3000 }
        );
      }
    } catch (err: unknown) {
      if (err instanceof SignatureExpiredError) {
        handleSessionExpired(navigate);
        return;
      }
      toast.error(extractErrorMessage(err, 'Make balance failed'), { autoClose: 2000 });
    } finally {
      setMakingBalanceBankId(null);
    }
  };

  const onReconcileClick = (row: EnrichedBankItem, action: MakeBalanceAction) => {
    if (action === 'fund_from_authority') {
      const suggested = row.transferLamports || '0';
      setFundAmountModal({
        bankId: row.bank_id,
        suggestedLamports: suggested,
        differenceSol: row.differenceSol,
      });
      setFundAmountSol(formatLamports(suggested) === '—' ? '' : formatLamports(suggested));
      return;
    }
    setPendingAction({ bankId: row.bank_id, action });
  };

  const onConfirmSweep = async () => {
    const pending = pendingAction;
    setPendingAction(null);
    if (pending === null) return;

    const row = banks.find((b) => b.bank_id === pending.bankId);
    const amountLamports = row?.transferLamports;
    if (!amountLamports || amountLamports === '0') {
      toast.error('No transfer amount available for this bank.', { autoClose: 2000 });
      return;
    }

    await executeMakeBalance(pending.bankId, amountLamports);
  };

  const onConfirmFundWithdraw = async () => {
    const modal = fundAmountModal;
    if (modal === null) return;

    const amountLamports = solToLamports(fundAmountSol);
    if (!amountLamports) {
      toast.error('Enter a valid SOL amount greater than 0.', { autoClose: 2000 });
      return;
    }

    setFundAmountModal(null);
    setFundAmountSol('');
    await executeMakeBalance(modal.bankId, amountLamports);
  };

  const paginatedData = displayedBanks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const fundAmountLamportsPreview = solToLamports(fundAmountSol);
  const isFundRowLoading =
    fundAmountModal !== null && makingBalanceBankId === fundAmountModal.bankId;

  if (unauthorized) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', backgroundColor: 'background.paper' }}>
        <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.75)' }}>
          Unauthorized
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255,255,255,0.5)' }}>
          SOL Reconciliation is available to Super Admins only.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, backgroundColor: 'background.paper' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="contained" onClick={onStartReconciliation}>
            Check SOL balances
          </Button>
          <FormControlLabel
            control={
              <Checkbox
                checked={onlyActionable}
                onChange={(e) => {
                  setOnlyActionable(e.target.checked);
                  setPage(0);
                }}
              />
            }
            label="Show only actionable banks"
          />
        </Box>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
          mb: 2,
        }}
      >
        <Paper sx={{ p: 1.5 }}>
          <Typography variant="caption">Total Difference (SOL)</Typography>
          <Typography variant="h6" sx={{ color: getTotalDifferenceColor(summary.totalDifferenceLamports) }}>
            {formatLamports(summary.totalDifferenceLamports)}
          </Typography>
        </Paper>
        <Paper sx={{ p: 1.5 }}>
          <Typography variant="caption">Checked / Matched / Mismatch</Typography>
          <Typography variant="h6">
            {summary.checkedBanks} / {summary.matchedBanks} / {summary.mismatchBanks}
          </Typography>
        </Paper>
        <Paper sx={{ p: 1.5 }}>
          <Typography variant="caption">Actionable / RPC Errors</Typography>
          <Typography variant="h6">
            {summary.actionableBanks} / {summary.rpcErrors}
          </Typography>
        </Paper>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Bank ID</TableCell>
              <TableCell>Bank #</TableCell>
              <TableCell>Bank PDA</TableCell>
              <TableCell align="right">DB SOL</TableCell>
              <TableCell align="right">On-chain SOL</TableCell>
              <TableCell align="right">Difference (SOL)</TableCell>
              <TableCell align="center">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row) => {
              const isRowLoading = makingBalanceBankId === row.bank_id;
              const lastTx = lastTxByBankId[row.bank_id];
              return (
                <TableRow key={row.bank_id} hover>
                  <TableCell>{row.bank_id}</TableCell>
                  <TableCell>{row.bank_no}</TableCell>
                  <TableCell sx={{ maxWidth: 180 }}>
                    <AddressDisplay address={row.bank_pda} first={4} last={4} />
                  </TableCell>
                  <TableCell align="right">{formatLamports(row.database_balance_lamports)}</TableCell>
                  <TableCell align="right">{formatLamports(row.onchain_balance_lamports)}</TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: getDifferenceColor(row.status, row.differenceLamports),
                      fontWeight: 600,
                    }}
                  >
                    {row.differenceSol ?? '—'}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                      {row.canSweepToAuthority && (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={isRowLoading}
                          onClick={() => onReconcileClick(row, 'sweep_to_authority')}
                          startIcon={
                            isRowLoading ? <CircularProgress size={14} color="inherit" /> : undefined
                          }
                          sx={sweepButtonSx}
                        >
                          Bank → Authority
                        </Button>
                      )}
                      {row.canFundFromAuthority && (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={isRowLoading}
                          onClick={() => onReconcileClick(row, 'fund_from_authority')}
                          startIcon={
                            isRowLoading ? <CircularProgress size={14} color="inherit" /> : undefined
                          }
                          sx={fundButtonSx}
                        >
                          Authority → Bank
                        </Button>
                      )}
                      {lastTx && (
                        <Link
                          href={`https://solscan.io/tx/${encodeURIComponent(lastTx)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ fontSize: 11, color: '#2DD4D1' }}
                        >
                          View tx
                        </Link>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
            {!hasChecked && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Click Check SOL balances to compare bank balances.
                </TableCell>
              </TableRow>
            )}
            {hasChecked && displayedBanks.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  {onlyActionable ? 'No actionable banks found.' : 'No banks found.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={displayedBanks.length}
        page={page}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(Number(event.target.value));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />

      <Dialog open={pendingAction !== null} onClose={() => setPendingAction(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Confirm {pendingAction ? actionLabels[pendingAction.action] : 'reconciliation'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            This operation should only be performed after discussion and approval from the team. Continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingAction(null)}>Cancel</Button>
          <Button color="warning" variant="contained" onClick={() => void onConfirmSweep()}>
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={fundAmountModal !== null}
        onClose={() => (!isFundRowLoading ? setFundAmountModal(null) : undefined)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Authority → Bank</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5, color: 'rgba(255,255,255,0.7)' }}>
            Enter how much SOL to transfer from the authority wallet to bank #
            {fundAmountModal?.bankId}.
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Difference
          </Typography>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {fundAmountModal?.differenceSol ?? '—'} SOL
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Amount (SOL)"
            placeholder="e.g. 0.5"
            value={fundAmountSol}
            onChange={(e) => setFundAmountSol(e.target.value)}
            disabled={isFundRowLoading}
            helperText={
              fundAmountSol.trim()
                ? fundAmountLamportsPreview
                  ? `${fundAmountLamportsPreview} lamports`
                  : 'Invalid amount'
                : 'Enter the SOL amount to transfer'
            }
          />
          <Box sx={{ mt: 1 }}>
            <Button
              size="small"
              disabled={isFundRowLoading || !fundAmountModal?.suggestedLamports}
              onClick={() => {
                const suggested = formatLamports(fundAmountModal?.suggestedLamports);
                setFundAmountSol(suggested === '—' ? '' : suggested);
              }}
            >
              Use suggested
            </Button>
          </Box>
          <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'rgba(255,255,255,0.5)' }}>
            This operation should only be performed after discussion and approval from the team.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFundAmountModal(null)} disabled={isFundRowLoading}>
            Cancel
          </Button>
          <Button
            color="warning"
            variant="contained"
            disabled={isFundRowLoading || !fundAmountLamportsPreview}
            onClick={() => void onConfirmFundWithdraw()}
            startIcon={isFundRowLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            Transfer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SolReconciliationTab;
