import { Container, Box, Button, Divider } from '@mui/material';
import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import LoadingOverlay from 'react-loading-overlay-ts';
import { toast } from 'react-toastify';
import { useWallet } from '@solana/wallet-adapter-react';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { getSignature, getSignedMessageByWallet, SignatureExpiredError, handleSessionExpired } from 'src/utils';
import { useNavigate } from 'react-router-dom';
import { ADMIN_ADDRESS } from 'src/config';
import { TurnkeyWalletsTable, type TurnkeyWallet } from './TurnkeyWalletsTable';
import { AddTurnkeyWalletDialog, type AddTurnkeyWalletForm } from './AddTurnkeyWalletDialog';
import { EditTurnkeyWalletDialog, type UpdateTurnkeyWalletForm } from './EditTurnkeyWalletDialog';
const RENT_ADDRESS = 'BxEpKHc9MhTNNNL3m9hHufb4sbHqVzZ1wm7Yt8BMeJDD';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;
const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

const TurnkeyWallets = () => {
  const navigate = useNavigate();
  const { signMessage, publicKey } = useWallet();
  const [loading, setLoading] = useState(true);
  const [wallets, setWallets] = useState<TurnkeyWallet[]>([]);
  const [rentSol, setRentSol] = useState<number | null>(null);
  const [walletBalances, setWalletBalances] = useState<Record<string, number | null>>({});
  const alerted = useRef(false);

  const fetchRentBalance = useCallback(async () => {
    try {
      const res = await axios.get(`/api/balance?address=${RENT_ADDRESS}`);
      setRentSol(res.data?.sol ?? null);
    } catch { /* silent */ }
  }, []);

  const fetchAllBalances = useCallback(async (addresses: string[]) => {
    const results = await Promise.allSettled(
      addresses.map((addr) => axios.get(`/api/balance?address=${addr}`))
    );
    const map: Record<string, number | null> = {};
    addresses.forEach((addr, i) => {
      const r = results[i];
      map[addr] = r.status === 'fulfilled' ? (r.value.data?.sol ?? null) : null;
    });
    setWalletBalances(map);
    if (map[RENT_ADDRESS] != null) setRentSol(map[RENT_ADDRESS]);
  }, []);

  useEffect(() => {
    fetchRentBalance();
    const id = setInterval(fetchRentBalance, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchRentBalance]);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<TurnkeyWallet | null>(null);

  const fetchWallets = async () => {
    setLoading(true);
    setError(null);
    try {
      const { super_admin_signature, timestamp } = await getSignature(
        signMessage || undefined,
        'read'
      );

      const response = await axios.post(
        `${API_BASE}/super_admin/turnkey_wallets/get_turnkey_wallets`,
        {
          super_admin_address: localStorage.getItem(ADMIN_ADDRESS),
          timestamp,
          super_admin_signature,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      const data = response.data;
      let loaded: TurnkeyWallet[] = [];
      if (data?.wallets && Array.isArray(data.wallets)) {
        loaded = data.wallets;
      } else if (Array.isArray(data)) {
        loaded = data;
      }
      setWallets(loaded);
      fetchAllBalances(loaded.map((w) => w.address));
    } catch (err: unknown) {
      console.error('Failed to fetch turnkey wallets:', err);
      if (err instanceof SignatureExpiredError) {
        handleSessionExpired(navigate);
        return;
      }
      setError(
        err && typeof err === 'object' && 'message' in err
          ? String((err as Error).message)
          : 'Failed to load turnkey wallets'
      );
      setWallets([]);
      toast.error('Failed to fetch turnkey wallets', {

        autoClose: 1500,
      });
    } finally {
      setLoading(false);
    }
  };

  const addWallet = async (form: AddTurnkeyWalletForm) => {
    setLoading(true);
    try {
      const timestamp = new Date().getTime();
      const message = `write:super_admin/turnkey_wallets/add_turnkey_wallet:${form.wallet_name}:${timestamp}`;
      const super_admin_signature = await getSignedMessageByWallet(
        signMessage!,
        message
      );

      const response = await axios.post(
        `${API_BASE}/super_admin/turnkey_wallets/add_turnkey_wallet`,
        {
          super_admin_address: localStorage.getItem(ADMIN_ADDRESS),
          timestamp,
          super_admin_signature,
          wallet_name: form.wallet_name,
          wallet_address: form.wallet_address,
          organization_id: form.organization_id,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      if (
        response.status === 200 ||
        response.status === 204 ||
        response.status === 201
      ) {
        const created = response.data;
        const newWallet: TurnkeyWallet = {
          id: created.id ?? 0,
          name: created.name ?? form.wallet_name,
          address: created.address ?? form.wallet_address,
          organization_id: created.organization_id ?? form.organization_id,
          created_at: created.created_at ?? new Date().toISOString(),
        };
        setWallets([...wallets, newWallet]);
        setAddDialogOpen(false);
        toast.success('Turnkey wallet added successfully', {

          autoClose: 1500,
        });
      } else {
        toast.error(response.data?.message ?? 'Failed to add turnkey wallet', {

          autoClose: 1500,
        });
      }
    } catch (err: unknown) {
      console.error('Error adding turnkey wallet:', err);
      toast.error(
        err && typeof err === 'object' && 'message' in err
          ? String((err as Error).message)
          : 'Failed to add turnkey wallet',
        { autoClose: 1500 }
      );
    } finally {
      setLoading(false);
    }
  };

  const updateWallet = async (form: UpdateTurnkeyWalletForm) => {
    if (!editingWallet) return;
    setLoading(true);
    try {
      const timestamp = new Date().getTime();
      const message = `write:super_admin/turnkey_wallets/update_turnkey_wallet:${form.name}:${timestamp}`;
      const super_admin_signature = await getSignedMessageByWallet(
        signMessage!,
        message
      );

      const response = await axios.post(
        `${API_BASE}/super_admin/turnkey_wallets/update_turnkey_wallet`,
        {
          super_admin_address: localStorage.getItem(ADMIN_ADDRESS),
          timestamp,
          super_admin_signature,
          name: form.name,
          wallet_address: form.wallet_address,
          organization_id: form.organization_id,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      if (
        response.status === 200 ||
        response.status === 204 ||
        response.status === 201
      ) {
        setWallets(
          wallets.map((w) =>
            w.address === editingWallet.address
              ? {
                  ...w,
                  name: form.name,
                  address: form.wallet_address,
                  organization_id: form.organization_id,
                }
              : w
          )
        );
        setEditDialogOpen(false);
        setEditingWallet(null);
        toast.success('Turnkey wallet updated successfully', {

          autoClose: 1500,
        });
      } else {
        toast.error(response.data?.message ?? 'Failed to update turnkey wallet', {

          autoClose: 1500,
        });
      }
    } catch (err: unknown) {
      console.error('Error updating turnkey wallet:', err);
      toast.error(
        err && typeof err === 'object' && 'message' in err
          ? String((err as Error).message)
          : 'Failed to update turnkey wallet',
        { autoClose: 1500 }
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteWallet = async (name: string) => {
    if (!window.confirm('Are you sure you want to delete this turnkey wallet?')) return;
    setLoading(true);
    try {
      const timestamp = new Date().getTime();
      const message = `write:super_admin/turnkey_wallets/remove_turnkey_wallet:${name}:${timestamp}`;
      const super_admin_signature = await getSignedMessageByWallet(
        signMessage!,
        message
      );

      const response = await axios.post(
        `${API_BASE}/super_admin/turnkey_wallets/remove_turnkey_wallet`,
        {
          super_admin_address: localStorage.getItem(ADMIN_ADDRESS),
          timestamp,
          super_admin_signature,
          name,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      if (response.status === 200 || response.status === 204) {
        setWallets(wallets.filter((w) => w.name !== name));
        toast.success('Turnkey wallet deleted successfully', {

          autoClose: 1500,
        });
      } else {
        toast.error(response.data?.message ?? 'Failed to delete turnkey wallet', {

          autoClose: 1500,
        });
      }
    } catch (err: unknown) {
      console.error('Error deleting turnkey wallet:', err);
      toast.error(
        err && typeof err === 'object' && 'message' in err
          ? String((err as Error).message)
          : 'Failed to delete turnkey wallet',
        { autoClose: 1500 }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (wallet: TurnkeyWallet) => {
    setEditingWallet(wallet);
    setEditDialogOpen(true);
  };

  const handleCloseEdit = () => {
    setEditDialogOpen(false);
    setEditingWallet(null);
  };

  useEffect(() => {
    fetchWallets();
  }, [signMessage]);

  return (
    <main>
      <Container maxWidth="xl">
        <LoadingOverlay
          active={loading}
          spinner
          styles={{
            wrapper: (base) => ({ ...base, width: '100%' }),
          }}
        >
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<AccountBalanceWalletIcon />}
                onClick={() => setAddDialogOpen(true)}
              >
                Add Account
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {error ? (
              <Box sx={{ p: 4, textAlign: 'center', color: 'error.main' }}>
                {error}
              </Box>
            ) : (
              <TurnkeyWalletsTable
                wallets={wallets}
                onEdit={handleEditClick}
                onDelete={deleteWallet}
                rentSol={rentSol}
                walletBalances={walletBalances}
                onRentTopUpSuccess={fetchRentBalance}
                onRefreshBalances={() => fetchAllBalances(wallets.map((w) => w.address))}
              />
            )}
          </Box>
        </LoadingOverlay>
      </Container>

      <AddTurnkeyWalletDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSubmit={addWallet}
      />

      {editingWallet && (
        <EditTurnkeyWalletDialog
          open={editDialogOpen}
          wallet={editingWallet}
          onClose={handleCloseEdit}
          onSubmit={updateWallet}
        />
      )}
    </main>
  );
};

export default TurnkeyWallets;
