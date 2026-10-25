import { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import axios from 'axios';
import LoadingOverlay from 'react-loading-overlay-ts';
import { toast } from 'react-toastify';
import {
  AppBar,
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { ADMIN_ADDRESS } from 'src/config';
import { getSignature, handleSessionExpired, SignatureExpiredError } from 'src/utils';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;

type BalancesCheckItem = {
  user_address: string;
  token_address: string;
  user_balances_balance: string;
  history_changes_sum: string;
  delta: string;
  missing_in_user_balances: boolean;
  missing_in_history: boolean;
  is_mismatch: boolean;
};

type BalancesCheckResponse = {
  checked_pairs: number;
  mismatch_pairs: number;
  matched_pairs: number;
  missing_in_user_balances: number;
  missing_in_history: number;
  data: BalancesCheckItem[];
};

type BankBalancesCheckItem = {
  bank_id: number;
  token_address: string;
  vanish_bank_balances_balance: string;
  history_changes_sum: string;
  delta: string;
  missing_in_vanish_bank_balances: boolean;
  missing_in_history: boolean;
  is_mismatch: boolean;
};

type BankBalancesCheckResponse = {
  checked_pairs: number;
  mismatch_pairs: number;
  matched_pairs: number;
  missing_in_vanish_bank_balances: number;
  missing_in_history: number;
  data: BankBalancesCheckItem[];
};

type UserPointsCheckItem = {
  user_address: string;
  user_points_total: string;
  changes_total_sum: string;
  total_delta: string;
  user_points_by_ref: string;
  changes_by_ref_sum: string;
  by_ref_delta: string;
  missing_in_user_points: boolean;
  missing_in_changes: boolean;
  total_mismatch: boolean;
  by_ref_mismatch: boolean;
  is_mismatch: boolean;
};

type UserPointsCheckResponse = {
  checked_users: number;
  mismatch_users: number;
  matched_users: number;
  missing_in_user_points: number;
  missing_in_changes: number;
  data: UserPointsCheckItem[];
};

type LedgerActionBalancesCheckItem = {
  ledger_action_id: number;
  token_address: string;
  balance_changes_sum: string;
  action_info_delta_sum: string;
  delta: string;
  missing_in_balance_changes: boolean;
  missing_in_action_info: boolean;
  is_mismatch: boolean;
};

type LedgerActionBalancesCheckResponse = {
  checked_pairs: number;
  mismatch_pairs: number;
  matched_pairs: number;
  missing_in_balance_changes: number;
  missing_in_action_info: number;
  data: LedgerActionBalancesCheckItem[];
};

type LedgerActionTxDeltasCheckItem = {
  ledger_action_id: number;
  tx_id: string;
  action_type: string;
  source_token_address: string | null;
  db_source_token_delta: string | null;
  chain_source_delta: string | null;
  source_delta_match: boolean | null;
  target_token_address: string | null;
  db_target_token_delta: string | null;
  chain_target_delta: string | null;
  target_delta_match: boolean | null;
  rpc_error: string | null;
};

type LedgerActionTxDeltasCheckResponse = {
  checked_actions: number;
  mismatch_actions: number;
  matched_actions: number;
  rpc_errors: number;
  data: LedgerActionTxDeltasCheckItem[];
};

type BankOnchainBalancesCheckItem = {
  bank_id: number;
  bank_pda: string;
  token_address: string;
  vanish_bank_balances_balance: string;
  onchain_balance: string;
  delta: string;
  is_mismatch: boolean;
  rpc_error: string | null;
};

type BankOnchainBalancesCheckResponse = {
  checked_pairs: number;
  mismatch_pairs: number;
  matched_pairs: number;
  rpc_errors: number;
  data: BankOnchainBalancesCheckItem[];
};

const emptyResponse: BalancesCheckResponse = {
  checked_pairs: 0,
  mismatch_pairs: 0,
  matched_pairs: 0,
  missing_in_user_balances: 0,
  missing_in_history: 0,
  data: [],
};

const emptyBankResponse: BankBalancesCheckResponse = {
  checked_pairs: 0,
  mismatch_pairs: 0,
  matched_pairs: 0,
  missing_in_vanish_bank_balances: 0,
  missing_in_history: 0,
  data: [],
};

const emptyUserPointsResponse: UserPointsCheckResponse = {
  checked_users: 0,
  mismatch_users: 0,
  matched_users: 0,
  missing_in_user_points: 0,
  missing_in_changes: 0,
  data: [],
};

const emptyLedgerActionResponse: LedgerActionBalancesCheckResponse = {
  checked_pairs: 0,
  mismatch_pairs: 0,
  matched_pairs: 0,
  missing_in_balance_changes: 0,
  missing_in_action_info: 0,
  data: [],
};

const emptyTxDeltasResponse: LedgerActionTxDeltasCheckResponse = {
  checked_actions: 0,
  mismatch_actions: 0,
  matched_actions: 0,
  rpc_errors: 0,
  data: [],
};

const emptyBankOnchainResponse: BankOnchainBalancesCheckResponse = {
  checked_pairs: 0,
  mismatch_pairs: 0,
  matched_pairs: 0,
  rpc_errors: 0,
  data: [],
};

const formatOptionalBool = (v: boolean | null | undefined): string => {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  return '—';
};

const Monitor = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { signMessage } = useWallet();
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const [userAddressInput, setUserAddressInput] = useState('');
  const [tokenAddressInput, setTokenAddressInput] = useState('');
  const [onlyMismatch, setOnlyMismatch] = useState(true);
  const [response, setResponse] = useState<BalancesCheckResponse>(emptyResponse);
  const [bankIdInput, setBankIdInput] = useState('');
  const [bankTokenAddressInput, setBankTokenAddressInput] = useState('');
  const [bankOnlyMismatch, setBankOnlyMismatch] = useState(true);
  const [bankResponse, setBankResponse] = useState<BankBalancesCheckResponse>(emptyBankResponse);
  const [userPointsAddressInput, setUserPointsAddressInput] = useState('');
  const [userPointsFilterInput, setUserPointsFilterInput] = useState('');
  const [userPointsOnlyMismatch, setUserPointsOnlyMismatch] = useState(true);
  const [userPointsResponse, setUserPointsResponse] =
    useState<UserPointsCheckResponse>(emptyUserPointsResponse);
  const [ledgerActionIdInput, setLedgerActionIdInput] = useState('');
  const [ledgerTokenAddressInput, setLedgerTokenAddressInput] = useState('');
  const [ledgerOnlyMismatch, setLedgerOnlyMismatch] = useState(true);
  const [ledgerResponse, setLedgerResponse] =
    useState<LedgerActionBalancesCheckResponse>(emptyLedgerActionResponse);
  const [balancesPage, setBalancesPage] = useState(0);
  const [balancesRowsPerPage, setBalancesRowsPerPage] = useState(25);
  const [bankPage, setBankPage] = useState(0);
  const [bankRowsPerPage, setBankRowsPerPage] = useState(25);
  const [userPointsPage, setUserPointsPage] = useState(0);
  const [userPointsRowsPerPage, setUserPointsRowsPerPage] = useState(25);
  const [ledgerPage, setLedgerPage] = useState(0);
  const [ledgerRowsPerPage, setLedgerRowsPerPage] = useState(25);
  const [txDeltasLedgerActionIdInput, setTxDeltasLedgerActionIdInput] = useState('');
  const [txDeltasLimitInput, setTxDeltasLimitInput] = useState('20');
  const [txDeltasOnlyMismatch, setTxDeltasOnlyMismatch] = useState(false);
  const [txDeltasResponse, setTxDeltasResponse] =
    useState<LedgerActionTxDeltasCheckResponse>(emptyTxDeltasResponse);
  const [txDeltasPage, setTxDeltasPage] = useState(0);
  const [txDeltasRowsPerPage, setTxDeltasRowsPerPage] = useState(25);
  const [bankOnchainBankIdInput, setBankOnchainBankIdInput] = useState('');
  const [bankOnchainTokenAddressInput, setBankOnchainTokenAddressInput] = useState('');
  const [bankOnchainOnlyMismatch, setBankOnchainOnlyMismatch] = useState(true);
  const [bankOnchainResponse, setBankOnchainResponse] =
    useState<BankOnchainBalancesCheckResponse>(emptyBankOnchainResponse);
  const [bankOnchainPage, setBankOnchainPage] = useState(0);
  const [bankOnchainRowsPerPage, setBankOnchainRowsPerPage] = useState(25);

  const shouldProceedComparison = () =>
    window.confirm(
      'Warning: This process may take 10–20 seconds and may impact service performance. Proceed only if necessary.'
    );

  const onCompareBalances = async () => {
    if (!shouldProceedComparison()) return;
    setLoading(true);
    try {
      const { super_admin_signature, timestamp } = await getSignature(
        signMessage || undefined,
        'read'
      );

      const payload = {
        admin_address: localStorage.getItem(ADMIN_ADDRESS),
        timestamp,
        admin_signature: super_admin_signature,
        only_mismatch: onlyMismatch,
        ...(userAddressInput.trim() ? { user_address: userAddressInput.trim() } : {}),
        ...(tokenAddressInput.trim() ? { token_address: tokenAddressInput.trim() } : {}),
      };

      const res = await axios.post<BalancesCheckResponse>(
        `${process.env.REACT_APP_API_BASE_URL}/super_admin/monitor/balances_check`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      setResponse(res.data);
      setBalancesPage(0);
      toast.success('Balances comparison completed', { autoClose: 1500 });
    } catch (err: unknown) {
      setResponse(emptyResponse);
      if (err instanceof SignatureExpiredError) {
        handleSessionExpired(navigate);
        return;
      }
      const message =
        axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
          ? String((err.response.data as { message?: string }).message ?? err.message)
          : err instanceof Error
            ? err.message
            : 'Balances comparison failed';
      toast.error(message, { autoClose: 2000 });
    } finally {
      setLoading(false);
    }
  };

  const onCompareBankBalances = async () => {
    if (!shouldProceedComparison()) return;
    setLoading(true);
    try {
      const { super_admin_signature, timestamp } = await getSignature(
        signMessage || undefined,
        'read'
      );

      const trimmedBankId = bankIdInput.trim();
      const parsedBankId = trimmedBankId === '' ? undefined : Number(trimmedBankId);
      if (parsedBankId !== undefined && !Number.isInteger(parsedBankId)) {
        toast.error('Bank ID must be an integer', { autoClose: 2000 });
        setLoading(false);
        return;
      }

      const payload = {
        admin_address: localStorage.getItem(ADMIN_ADDRESS),
        timestamp,
        admin_signature: super_admin_signature,
        only_mismatch: bankOnlyMismatch,
        ...(parsedBankId !== undefined ? { bank_id: parsedBankId } : {}),
        ...(bankTokenAddressInput.trim() ? { token_address: bankTokenAddressInput.trim() } : {}),
      };

      const res = await axios.post<BankBalancesCheckResponse>(
        `${process.env.REACT_APP_API_BASE_URL}/super_admin/monitor/bank_balances_check`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      setBankResponse(res.data);
      setBankPage(0);
      toast.success('Bank balances comparison completed', {

        autoClose: 1500,
      });
    } catch (err: unknown) {
      setBankResponse(emptyBankResponse);
      if (err instanceof SignatureExpiredError) {
        handleSessionExpired(navigate);
        return;
      }
      const message =
        axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
          ? String((err.response.data as { message?: string }).message ?? err.message)
          : err instanceof Error
            ? err.message
            : 'Bank balances comparison failed';
      toast.error(message, { autoClose: 2000 });
    } finally {
      setLoading(false);
    }
  };

  const onCompareUserPoints = async () => {
    if (!shouldProceedComparison()) return;
    setLoading(true);
    try {
      const { super_admin_signature, timestamp } = await getSignature(
        signMessage || undefined,
        'read'
      );

      const payload = {
        admin_address: localStorage.getItem(ADMIN_ADDRESS),
        timestamp,
        admin_signature: super_admin_signature,
        only_mismatch: userPointsOnlyMismatch,
        ...(userPointsAddressInput.trim() ? { user_address: userPointsAddressInput.trim() } : {}),
        ...(userPointsFilterInput.trim() ? { user_filter: userPointsFilterInput.trim() } : {}),
      };

      const res = await axios.post<UserPointsCheckResponse>(
        `${process.env.REACT_APP_API_BASE_URL}/super_admin/monitor/user_points_check`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      setUserPointsResponse(res.data);
      setUserPointsPage(0);
      toast.success('User points comparison completed', {

        autoClose: 1500,
      });
    } catch (err: unknown) {
      setUserPointsResponse(emptyUserPointsResponse);
      if (err instanceof SignatureExpiredError) {
        handleSessionExpired(navigate);
        return;
      }
      const message =
        axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
          ? String((err.response.data as { message?: string }).message ?? err.message)
          : err instanceof Error
            ? err.message
            : 'User points comparison failed';
      toast.error(message, { autoClose: 2000 });
    } finally {
      setLoading(false);
    }
  };

  const onCompareLedgerActionBalances = async () => {
    if (!shouldProceedComparison()) return;
    setLoading(true);
    try {
      const { super_admin_signature, timestamp } = await getSignature(
        signMessage || undefined,
        'read'
      );

      const trimmedLedgerActionId = ledgerActionIdInput.trim();
      const parsedLedgerActionId =
        trimmedLedgerActionId === '' ? undefined : Number(trimmedLedgerActionId);
      if (parsedLedgerActionId !== undefined && !Number.isInteger(parsedLedgerActionId)) {
        toast.error('Ledger Action ID must be an integer', {

          autoClose: 2000,
        });
        setLoading(false);
        return;
      }

      const payload = {
        admin_address: localStorage.getItem(ADMIN_ADDRESS),
        timestamp,
        admin_signature: super_admin_signature,
        only_mismatch: ledgerOnlyMismatch,
        ...(parsedLedgerActionId !== undefined ? { ledger_action_id: parsedLedgerActionId } : {}),
        ...(ledgerTokenAddressInput.trim()
          ? { token_address: ledgerTokenAddressInput.trim() }
          : {}),
      };

      const res = await axios.post<LedgerActionBalancesCheckResponse>(
        `${process.env.REACT_APP_API_BASE_URL}/super_admin/monitor/ledger_action_balances_check`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      setLedgerResponse(res.data);
      setLedgerPage(0);
      toast.success('Ledger action balances comparison completed', {

        autoClose: 1500,
      });
    } catch (err: unknown) {
      setLedgerResponse(emptyLedgerActionResponse);
      if (err instanceof SignatureExpiredError) {
        handleSessionExpired(navigate);
        return;
      }
      const message =
        axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
          ? String((err.response.data as { message?: string }).message ?? err.message)
          : err instanceof Error
            ? err.message
            : 'Ledger action balances comparison failed';
      toast.error(message, { autoClose: 2000 });
    } finally {
      setLoading(false);
    }
  };

  const onCompareLedgerActionTxDeltas = async () => {
    if (!shouldProceedComparison()) return;
    setLoading(true);
    try {
      const { super_admin_signature, timestamp } = await getSignature(
        signMessage || undefined,
        'read'
      );

      const trimmedId = txDeltasLedgerActionIdInput.trim();
      const parsedId = trimmedId === '' ? undefined : Number(trimmedId);
      if (parsedId !== undefined && !Number.isInteger(parsedId)) {
        toast.error('Ledger Action ID must be an integer', {

          autoClose: 2000,
        });
        setLoading(false);
        return;
      }

      const trimmedLimit = txDeltasLimitInput.trim();
      const parsedLimit = trimmedLimit === '' ? undefined : Number(trimmedLimit);
      if (parsedLimit !== undefined && (!Number.isInteger(parsedLimit) || parsedLimit < 1)) {
        toast.error('Limit must be a positive integer (1–500)', {

          autoClose: 2000,
        });
        setLoading(false);
        return;
      }

      const payload = {
        admin_address: localStorage.getItem(ADMIN_ADDRESS),
        timestamp,
        admin_signature: super_admin_signature,
        only_mismatch: txDeltasOnlyMismatch,
        ...(parsedId !== undefined ? { ledger_action_id: parsedId } : {}),
        ...(parsedLimit !== undefined ? { limit: parsedLimit } : {}),
      };

      const res = await axios.post<LedgerActionTxDeltasCheckResponse>(
        `${process.env.REACT_APP_API_BASE_URL}/super_admin/monitor/ledger_action_tx_deltas_check`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      setTxDeltasResponse(res.data);
      setTxDeltasPage(0);
      toast.success('Chain vs DB delta check completed', {

        autoClose: 1500,
      });
    } catch (err: unknown) {
      setTxDeltasResponse(emptyTxDeltasResponse);
      if (err instanceof SignatureExpiredError) {
        handleSessionExpired(navigate);
        return;
      }
      const message =
        axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
          ? String((err.response.data as { message?: string }).message ?? err.message)
          : err instanceof Error
            ? err.message
            : 'Chain vs DB delta check failed';
      toast.error(message, { autoClose: 2000 });
    } finally {
      setLoading(false);
    }
  };

  const onCompareBankOnchainBalances = async () => {
    if (!shouldProceedComparison()) return;
    setLoading(true);
    try {
      const { super_admin_signature, timestamp } = await getSignature(
        signMessage || undefined,
        'read'
      );

      const trimmedBankId = bankOnchainBankIdInput.trim();
      const parsedBankId = trimmedBankId === '' ? undefined : Number(trimmedBankId);
      if (parsedBankId !== undefined && !Number.isInteger(parsedBankId)) {
        toast.error('Bank ID must be an integer', { autoClose: 2000 });
        setLoading(false);
        return;
      }

      const payload = {
        admin_address: localStorage.getItem(ADMIN_ADDRESS),
        timestamp,
        admin_signature: super_admin_signature,
        only_mismatch: bankOnchainOnlyMismatch,
        ...(parsedBankId !== undefined ? { bank_id: parsedBankId } : {}),
        ...(bankOnchainTokenAddressInput.trim()
          ? { token_address: bankOnchainTokenAddressInput.trim() }
          : {}),
      };

      const res = await axios.post<BankOnchainBalancesCheckResponse>(
        `${process.env.REACT_APP_API_BASE_URL}/super_admin/monitor/bank_onchain_balances_check`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      setBankOnchainResponse(res.data);
      setBankOnchainPage(0);
      toast.success('Bank onchain comparison completed', { autoClose: 1500 });
    } catch (err: unknown) {
      setBankOnchainResponse(emptyBankOnchainResponse);
      if (err instanceof SignatureExpiredError) {
        handleSessionExpired(navigate);
        return;
      }
      const message =
        axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
          ? String((err.response.data as { message?: string }).message ?? err.message)
          : err instanceof Error
            ? err.message
            : 'Bank onchain comparison failed';
      toast.error(message, { autoClose: 2000 });
    } finally {
      setLoading(false);
    }
  };

  const paginatedBalancesData = response.data.slice(
    balancesPage * balancesRowsPerPage,
    balancesPage * balancesRowsPerPage + balancesRowsPerPage
  );
  const paginatedBankData = bankResponse.data.slice(
    bankPage * bankRowsPerPage,
    bankPage * bankRowsPerPage + bankRowsPerPage
  );
  const paginatedUserPointsData = userPointsResponse.data.slice(
    userPointsPage * userPointsRowsPerPage,
    userPointsPage * userPointsRowsPerPage + userPointsRowsPerPage
  );
  const paginatedLedgerData = ledgerResponse.data.slice(
    ledgerPage * ledgerRowsPerPage,
    ledgerPage * ledgerRowsPerPage + ledgerRowsPerPage
  );
  const paginatedTxDeltasData = txDeltasResponse.data.slice(
    txDeltasPage * txDeltasRowsPerPage,
    txDeltasPage * txDeltasRowsPerPage + txDeltasRowsPerPage
  );
  const paginatedBankOnchainData = bankOnchainResponse.data.slice(
    bankOnchainPage * bankOnchainRowsPerPage,
    bankOnchainPage * bankOnchainRowsPerPage + bankOnchainRowsPerPage
  );

  return (
    <main>
      <Container maxWidth="xl">
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
          <Box mt={3}>
            <Typography variant="h4" component="h1" sx={{ color: 'rgba(255,255,255,0.88)', fontWeight: 600 }}>
              Monitor
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255,255,255,0.75)' }}>
              Admin integrity checks and diagnostics.
            </Typography>
          </Box>

          <Box mt={3}>
            <AppBar position="static">
              <Tabs
                value={tabValue}
                onChange={(_, next) => setTabValue(next)}
                indicatorColor="secondary"
                textColor="inherit"
                variant={isMobile ? 'scrollable' : 'fullWidth'}
                scrollButtons={isMobile ? 'auto' : false}
                allowScrollButtonsMobile={isMobile}
              >
                <Tab label={<Box component="span"><Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Balances Check</Box><Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Balances</Box></Box>} sx={{ fontSize: { xs: 11, sm: 13 }, minWidth: { xs: 90, sm: 160 } }} />
                <Tab label={<Box component="span"><Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Bank Balances Check</Box><Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Bank Bal.</Box></Box>} sx={{ fontSize: { xs: 11, sm: 13 }, minWidth: { xs: 90, sm: 160 } }} />
                <Tab label={<Box component="span"><Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>User Points Check</Box><Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Points</Box></Box>} sx={{ fontSize: { xs: 11, sm: 13 }, minWidth: { xs: 90, sm: 160 } }} />
                <Tab label={<Box component="span"><Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Ledger Action Balances Check</Box><Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Ledger</Box></Box>} sx={{ fontSize: { xs: 11, sm: 13 }, minWidth: { xs: 90, sm: 160 } }} />
                <Tab label={<Box component="span"><Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Chain vs DB (Tx Deltas)</Box><Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Chain vs DB</Box></Box>} sx={{ fontSize: { xs: 11, sm: 13 }, minWidth: { xs: 90, sm: 160 } }} />
                <Tab label={<Box component="span"><Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Bank Onchain Balances Check</Box><Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Onchain</Box></Box>} sx={{ fontSize: { xs: 11, sm: 13 }, minWidth: { xs: 90, sm: 160 } }} />
              </Tabs>
            </AppBar>

            <Box hidden={tabValue !== 0} sx={{ p: 2, backgroundColor: 'background.paper' }}>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <TextField
                    label="User Address"
                    value={userAddressInput}
                    onChange={(e) => setUserAddressInput(e.target.value)}
                    size="small"
                    sx={{ minWidth: 320 }}
                    placeholder="Optional exact address"
                  />
                  <TextField
                    label="Token Address"
                    value={tokenAddressInput}
                    onChange={(e) => setTokenAddressInput(e.target.value)}
                    size="small"
                    sx={{ minWidth: 320 }}
                    placeholder="Optional exact token"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={onlyMismatch}
                        onChange={(e) => setOnlyMismatch(e.target.checked)}
                      />
                    }
                    label="Only mismatches"
                  />
                  <Button variant="contained" onClick={() => void onCompareBalances()}>
                    Compare
                  </Button>
                </Box>
              </Paper>

              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(5, minmax(0, 1fr))' },
                  mb: 2,
                }}
              >
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Checked Pairs</Typography>
                  <Typography variant="h6">{response.checked_pairs}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Mismatch Pairs</Typography>
                  <Typography variant="h6">{response.mismatch_pairs}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Matched Pairs</Typography>
                  <Typography variant="h6">{response.matched_pairs}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Missing in UserBalances</Typography>
                  <Typography variant="h6">{response.missing_in_user_balances}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Missing in History</Typography>
                  <Typography variant="h6">{response.missing_in_history}</Typography>
                </Paper>
              </Box>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>User Address</TableCell>
                      <TableCell>Token Address</TableCell>
                      <TableCell align="right">UserBalances</TableCell>
                      <TableCell align="right">History Sum</TableCell>
                      <TableCell align="right">Delta</TableCell>
                      <TableCell align="center">Missing UserBalances</TableCell>
                      <TableCell align="center">Missing History</TableCell>
                      <TableCell align="center">Mismatch</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedBalancesData.map((row, idx) => (
                      <TableRow key={`${row.user_address}-${row.token_address}-${idx}`} hover>
                        <TableCell sx={{ maxWidth: 300, wordBreak: 'break-all' }}>
                          {row.user_address}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 300, wordBreak: 'break-all' }}>
                          {row.token_address}
                        </TableCell>
                        <TableCell align="right">{row.user_balances_balance}</TableCell>
                        <TableCell align="right">{row.history_changes_sum}</TableCell>
                        <TableCell align="right">{row.delta}</TableCell>
                        <TableCell align="center">
                          {row.missing_in_user_balances ? 'Yes' : 'No'}
                        </TableCell>
                        <TableCell align="center">{row.missing_in_history ? 'Yes' : 'No'}</TableCell>
                        <TableCell align="center">{row.is_mismatch ? 'Yes' : 'No'}</TableCell>
                      </TableRow>
                    ))}
                    {!loading && response.data.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          No rows found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={response.data.length}
                page={balancesPage}
                onPageChange={(_, nextPage) => setBalancesPage(nextPage)}
                rowsPerPage={balancesRowsPerPage}
                onRowsPerPageChange={(event) => {
                  setBalancesRowsPerPage(Number(event.target.value));
                  setBalancesPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </Box>

            <Box hidden={tabValue !== 1} sx={{ p: 2, backgroundColor: 'background.paper' }}>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <TextField
                    label="Bank ID"
                    value={bankIdInput}
                    onChange={(e) => setBankIdInput(e.target.value)}
                    size="small"
                    sx={{ minWidth: 220 }}
                    placeholder="Optional exact bank id"
                  />
                  <TextField
                    label="Token Address"
                    value={bankTokenAddressInput}
                    onChange={(e) => setBankTokenAddressInput(e.target.value)}
                    size="small"
                    sx={{ minWidth: 320 }}
                    placeholder="Optional exact token"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={bankOnlyMismatch}
                        onChange={(e) => setBankOnlyMismatch(e.target.checked)}
                      />
                    }
                    label="Only mismatches"
                  />
                  <Button variant="contained" onClick={() => void onCompareBankBalances()}>
                    Compare
                  </Button>
                </Box>
              </Paper>

              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(5, minmax(0, 1fr))' },
                  mb: 2,
                }}
              >
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Checked Pairs</Typography>
                  <Typography variant="h6">{bankResponse.checked_pairs}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Mismatch Pairs</Typography>
                  <Typography variant="h6">{bankResponse.mismatch_pairs}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Matched Pairs</Typography>
                  <Typography variant="h6">{bankResponse.matched_pairs}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Missing in VanishBankBalances</Typography>
                  <Typography variant="h6">{bankResponse.missing_in_vanish_bank_balances}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Missing in History</Typography>
                  <Typography variant="h6">{bankResponse.missing_in_history}</Typography>
                </Paper>
              </Box>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Bank ID</TableCell>
                      <TableCell>Token Address</TableCell>
                      <TableCell align="right">VanishBankBalances</TableCell>
                      <TableCell align="right">History Sum</TableCell>
                      <TableCell align="right">Delta</TableCell>
                      <TableCell align="center">Missing VanishBankBalances</TableCell>
                      <TableCell align="center">Missing History</TableCell>
                      <TableCell align="center">Mismatch</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedBankData.map((row, idx) => (
                      <TableRow key={`${row.bank_id}-${row.token_address}-${idx}`} hover>
                        <TableCell>{row.bank_id}</TableCell>
                        <TableCell sx={{ maxWidth: 300, wordBreak: 'break-all' }}>
                          {row.token_address}
                        </TableCell>
                        <TableCell align="right">{row.vanish_bank_balances_balance}</TableCell>
                        <TableCell align="right">{row.history_changes_sum}</TableCell>
                        <TableCell align="right">{row.delta}</TableCell>
                        <TableCell align="center">
                          {row.missing_in_vanish_bank_balances ? 'Yes' : 'No'}
                        </TableCell>
                        <TableCell align="center">{row.missing_in_history ? 'Yes' : 'No'}</TableCell>
                        <TableCell align="center">{row.is_mismatch ? 'Yes' : 'No'}</TableCell>
                      </TableRow>
                    ))}
                    {!loading && bankResponse.data.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          No rows found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={bankResponse.data.length}
                page={bankPage}
                onPageChange={(_, nextPage) => setBankPage(nextPage)}
                rowsPerPage={bankRowsPerPage}
                onRowsPerPageChange={(event) => {
                  setBankRowsPerPage(Number(event.target.value));
                  setBankPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </Box>

            <Box hidden={tabValue !== 2} sx={{ p: 2, backgroundColor: 'background.paper' }}>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <TextField
                    label="User Address"
                    value={userPointsAddressInput}
                    onChange={(e) => setUserPointsAddressInput(e.target.value)}
                    size="small"
                    sx={{ minWidth: 320 }}
                    placeholder="Optional exact address"
                  />
                  <TextField
                    label="User Filter"
                    value={userPointsFilterInput}
                    onChange={(e) => setUserPointsFilterInput(e.target.value)}
                    size="small"
                    sx={{ minWidth: 320 }}
                    placeholder="Optional partial match"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={userPointsOnlyMismatch}
                        onChange={(e) => setUserPointsOnlyMismatch(e.target.checked)}
                      />
                    }
                    label="Only mismatches"
                  />
                  <Button variant="contained" onClick={() => void onCompareUserPoints()}>
                    Compare
                  </Button>
                </Box>
              </Paper>

              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(5, minmax(0, 1fr))' },
                  mb: 2,
                }}
              >
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Checked Users</Typography>
                  <Typography variant="h6">{userPointsResponse.checked_users}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Mismatch Users</Typography>
                  <Typography variant="h6">{userPointsResponse.mismatch_users}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Matched Users</Typography>
                  <Typography variant="h6">{userPointsResponse.matched_users}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Missing in UserPoints</Typography>
                  <Typography variant="h6">{userPointsResponse.missing_in_user_points}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Missing in Changes</Typography>
                  <Typography variant="h6">{userPointsResponse.missing_in_changes}</Typography>
                </Paper>
              </Box>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>User Address</TableCell>
                      <TableCell align="right">UserPoints Total</TableCell>
                      <TableCell align="right">Changes Total Sum</TableCell>
                      <TableCell align="right">Total Delta</TableCell>
                      <TableCell align="right">UserPoints By Ref</TableCell>
                      <TableCell align="right">Changes By Ref Sum</TableCell>
                      <TableCell align="right">By Ref Delta</TableCell>
                      <TableCell align="center">Missing in UserPoints</TableCell>
                      <TableCell align="center">Missing in Changes</TableCell>
                      <TableCell align="center">Total Mismatch</TableCell>
                      <TableCell align="center">By Ref Mismatch</TableCell>
                      <TableCell align="center">Mismatch</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedUserPointsData.map((row, idx) => (
                      <TableRow key={`${row.user_address}-${idx}`} hover>
                        <TableCell sx={{ maxWidth: 300, wordBreak: 'break-all' }}>
                          {row.user_address}
                        </TableCell>
                        <TableCell align="right">{row.user_points_total}</TableCell>
                        <TableCell align="right">{row.changes_total_sum}</TableCell>
                        <TableCell align="right">{row.total_delta}</TableCell>
                        <TableCell align="right">{row.user_points_by_ref}</TableCell>
                        <TableCell align="right">{row.changes_by_ref_sum}</TableCell>
                        <TableCell align="right">{row.by_ref_delta}</TableCell>
                        <TableCell align="center">
                          {row.missing_in_user_points ? 'Yes' : 'No'}
                        </TableCell>
                        <TableCell align="center">{row.missing_in_changes ? 'Yes' : 'No'}</TableCell>
                        <TableCell align="center">{row.total_mismatch ? 'Yes' : 'No'}</TableCell>
                        <TableCell align="center">{row.by_ref_mismatch ? 'Yes' : 'No'}</TableCell>
                        <TableCell align="center">{row.is_mismatch ? 'Yes' : 'No'}</TableCell>
                      </TableRow>
                    ))}
                    {!loading && userPointsResponse.data.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={12} align="center">
                          No rows found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={userPointsResponse.data.length}
                page={userPointsPage}
                onPageChange={(_, nextPage) => setUserPointsPage(nextPage)}
                rowsPerPage={userPointsRowsPerPage}
                onRowsPerPageChange={(event) => {
                  setUserPointsRowsPerPage(Number(event.target.value));
                  setUserPointsPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </Box>

            <Box hidden={tabValue !== 3} sx={{ p: 2, backgroundColor: 'background.paper' }}>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <TextField
                    label="Ledger Action ID"
                    value={ledgerActionIdInput}
                    onChange={(e) => setLedgerActionIdInput(e.target.value)}
                    size="small"
                    sx={{ minWidth: 260 }}
                    placeholder="Optional exact id"
                  />
                  <TextField
                    label="Token Address"
                    value={ledgerTokenAddressInput}
                    onChange={(e) => setLedgerTokenAddressInput(e.target.value)}
                    size="small"
                    sx={{ minWidth: 320 }}
                    placeholder="Optional exact token"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={ledgerOnlyMismatch}
                        onChange={(e) => setLedgerOnlyMismatch(e.target.checked)}
                      />
                    }
                    label="Only mismatches"
                  />
                  <Button variant="contained" onClick={() => void onCompareLedgerActionBalances()}>
                    Compare
                  </Button>
                </Box>
              </Paper>

              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(5, minmax(0, 1fr))' },
                  mb: 2,
                }}
              >
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Checked Pairs</Typography>
                  <Typography variant="h6">{ledgerResponse.checked_pairs}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Mismatch Pairs</Typography>
                  <Typography variant="h6">{ledgerResponse.mismatch_pairs}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Matched Pairs</Typography>
                  <Typography variant="h6">{ledgerResponse.matched_pairs}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Missing in Balance Changes</Typography>
                  <Typography variant="h6">{ledgerResponse.missing_in_balance_changes}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Missing in Action Info</Typography>
                  <Typography variant="h6">{ledgerResponse.missing_in_action_info}</Typography>
                </Paper>
              </Box>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ledger Action ID</TableCell>
                      <TableCell>Token Address</TableCell>
                      <TableCell align="right">Balance Changes Sum</TableCell>
                      <TableCell align="right">Action Info Delta Sum</TableCell>
                      <TableCell align="right">Delta</TableCell>
                      <TableCell align="center">Missing in Balance Changes</TableCell>
                      <TableCell align="center">Missing in Action Info</TableCell>
                      <TableCell align="center">Mismatch</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedLedgerData.map((row, idx) => (
                      <TableRow key={`${row.ledger_action_id}-${row.token_address}-${idx}`} hover>
                        <TableCell>{row.ledger_action_id}</TableCell>
                        <TableCell sx={{ maxWidth: 300, wordBreak: 'break-all' }}>
                          {row.token_address}
                        </TableCell>
                        <TableCell align="right">{row.balance_changes_sum}</TableCell>
                        <TableCell align="right">{row.action_info_delta_sum}</TableCell>
                        <TableCell align="right">{row.delta}</TableCell>
                        <TableCell align="center">
                          {row.missing_in_balance_changes ? 'Yes' : 'No'}
                        </TableCell>
                        <TableCell align="center">
                          {row.missing_in_action_info ? 'Yes' : 'No'}
                        </TableCell>
                        <TableCell align="center">{row.is_mismatch ? 'Yes' : 'No'}</TableCell>
                      </TableRow>
                    ))}
                    {!loading && ledgerResponse.data.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          No rows found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={ledgerResponse.data.length}
                page={ledgerPage}
                onPageChange={(_, nextPage) => setLedgerPage(nextPage)}
                rowsPerPage={ledgerRowsPerPage}
                onRowsPerPageChange={(event) => {
                  setLedgerRowsPerPage(Number(event.target.value));
                  setLedgerPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </Box>

            <Box hidden={tabValue !== 4} sx={{ p: 2, backgroundColor: 'background.paper' }}>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <TextField
                    label="Ledger Action ID"
                    value={txDeltasLedgerActionIdInput}
                    onChange={(e) => setTxDeltasLedgerActionIdInput(e.target.value)}
                    size="small"
                    sx={{ minWidth: 260 }}
                    placeholder="Optional exact id"
                  />
                  <TextField
                    label="Limit"
                    value={txDeltasLimitInput}
                    onChange={(e) => setTxDeltasLimitInput(e.target.value)}
                    size="small"
                    sx={{ width: 120 }}
                    placeholder="1–500"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={txDeltasOnlyMismatch}
                        onChange={(e) => setTxDeltasOnlyMismatch(e.target.checked)}
                      />
                    }
                    label="Only mismatches / RPC errors"
                  />
                  <Button variant="contained" onClick={() => void onCompareLedgerActionTxDeltas()}>
                    Compare
                  </Button>
                </Box>
              </Paper>

              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
                  mb: 2,
                }}
              >
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Checked Actions</Typography>
                  <Typography variant="h6">{txDeltasResponse.checked_actions}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Mismatch Actions</Typography>
                  <Typography variant="h6">{txDeltasResponse.mismatch_actions}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Matched Actions</Typography>
                  <Typography variant="h6">{txDeltasResponse.matched_actions}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">RPC Errors (rows)</Typography>
                  <Typography variant="h6">{txDeltasResponse.rpc_errors}</Typography>
                </Paper>
              </Box>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ledger Action ID</TableCell>
                      <TableCell>Tx</TableCell>
                      <TableCell>Action Type</TableCell>
                      <TableCell>Source Mint</TableCell>
                      <TableCell align="right">DB Source Δ</TableCell>
                      <TableCell align="right">Chain Source Δ</TableCell>
                      <TableCell align="center">Source Match</TableCell>
                      <TableCell>Target Mint</TableCell>
                      <TableCell align="right">DB Target Δ</TableCell>
                      <TableCell align="right">Chain Target Δ</TableCell>
                      <TableCell align="center">Target Match</TableCell>
                      <TableCell>RPC / Parse Error</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedTxDeltasData.map((row, idx) => (
                      <TableRow key={`${row.ledger_action_id}-${row.tx_id}-${idx}`} hover>
                        <TableCell>{row.ledger_action_id}</TableCell>
                        <TableCell sx={{ maxWidth: 140, wordBreak: 'break-all' }}>
                          <Button
                            size="small"
                            variant="text"
                            href={`https://solscan.io/tx/${encodeURIComponent(row.tx_id.trim())}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ p: 0, minWidth: 0, textTransform: 'none' }}
                          >
                            {row.tx_id.length > 12
                              ? `${row.tx_id.slice(0, 6)}…${row.tx_id.slice(-4)}`
                              : row.tx_id}
                          </Button>
                        </TableCell>
                        <TableCell>{row.action_type}</TableCell>
                        <TableCell sx={{ maxWidth: 160, wordBreak: 'break-all' }}>
                          {row.source_token_address ?? '—'}
                        </TableCell>
                        <TableCell align="right">{row.db_source_token_delta ?? '—'}</TableCell>
                        <TableCell align="right">{row.chain_source_delta ?? '—'}</TableCell>
                        <TableCell align="center">
                          {formatOptionalBool(row.source_delta_match)}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 160, wordBreak: 'break-all' }}>
                          {row.target_token_address ?? '—'}
                        </TableCell>
                        <TableCell align="right">{row.db_target_token_delta ?? '—'}</TableCell>
                        <TableCell align="right">{row.chain_target_delta ?? '—'}</TableCell>
                        <TableCell align="center">
                          {formatOptionalBool(row.target_delta_match)}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 280, wordBreak: 'break-word' }}>
                          {row.rpc_error ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && txDeltasResponse.data.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={12} align="center">
                          No rows found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={txDeltasResponse.data.length}
                page={txDeltasPage}
                onPageChange={(_, nextPage) => setTxDeltasPage(nextPage)}
                rowsPerPage={txDeltasRowsPerPage}
                onRowsPerPageChange={(event) => {
                  setTxDeltasRowsPerPage(Number(event.target.value));
                  setTxDeltasPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </Box>

            <Box hidden={tabValue !== 5} sx={{ p: 2, backgroundColor: 'background.paper' }}>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <TextField
                    label="Bank ID"
                    value={bankOnchainBankIdInput}
                    onChange={(e) => setBankOnchainBankIdInput(e.target.value)}
                    size="small"
                    sx={{ minWidth: 220 }}
                    placeholder="Optional exact bank id"
                  />
                  <TextField
                    label="Token Address"
                    value={bankOnchainTokenAddressInput}
                    onChange={(e) => setBankOnchainTokenAddressInput(e.target.value)}
                    size="small"
                    sx={{ minWidth: 320 }}
                    placeholder="Optional exact token"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={bankOnchainOnlyMismatch}
                        onChange={(e) => setBankOnchainOnlyMismatch(e.target.checked)}
                      />
                    }
                    label="Only mismatches"
                  />
                  <Button variant="contained" onClick={() => void onCompareBankOnchainBalances()}>
                    Compare
                  </Button>
                </Box>
              </Paper>

              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
                  mb: 2,
                }}
              >
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Checked Pairs</Typography>
                  <Typography variant="h6">{bankOnchainResponse.checked_pairs}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Mismatch Pairs</Typography>
                  <Typography variant="h6">{bankOnchainResponse.mismatch_pairs}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">Matched Pairs</Typography>
                  <Typography variant="h6">{bankOnchainResponse.matched_pairs}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5 }}>
                  <Typography variant="caption">RPC Errors (rows)</Typography>
                  <Typography variant="h6">{bankOnchainResponse.rpc_errors}</Typography>
                </Paper>
              </Box>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Bank ID</TableCell>
                      <TableCell>Bank PDA</TableCell>
                      <TableCell>Token Address</TableCell>
                      <TableCell align="right">DB Balance</TableCell>
                      <TableCell align="right">Onchain Balance</TableCell>
                      <TableCell align="right">Delta</TableCell>
                      <TableCell align="center">Mismatch</TableCell>
                      <TableCell>RPC Error</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedBankOnchainData.map((row, idx) => (
                      <TableRow key={`${row.bank_id}-${row.bank_pda}-${row.token_address}-${idx}`} hover>
                        <TableCell>{row.bank_id}</TableCell>
                        <TableCell sx={{ maxWidth: 250, wordBreak: 'break-all' }}>
                          {row.bank_pda}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 250, wordBreak: 'break-all' }}>
                          {row.token_address}
                        </TableCell>
                        <TableCell align="right">{row.vanish_bank_balances_balance}</TableCell>
                        <TableCell align="right">{row.onchain_balance}</TableCell>
                        <TableCell align="right">{row.delta}</TableCell>
                        <TableCell align="center">{row.is_mismatch ? 'Yes' : 'No'}</TableCell>
                        <TableCell sx={{ maxWidth: 280, wordBreak: 'break-word' }}>
                          {row.rpc_error ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && bankOnchainResponse.data.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          No rows found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={bankOnchainResponse.data.length}
                page={bankOnchainPage}
                onPageChange={(_, nextPage) => setBankOnchainPage(nextPage)}
                rowsPerPage={bankOnchainRowsPerPage}
                onRowsPerPageChange={(event) => {
                  setBankOnchainRowsPerPage(Number(event.target.value));
                  setBankOnchainPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </Box>

          </Box>
        </LoadingOverlay>
      </Container>
    </main>
  );
};

export default Monitor;
