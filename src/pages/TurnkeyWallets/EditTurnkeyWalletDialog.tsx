import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import { useState, useEffect } from 'react';
import type { TurnkeyWallet } from './TurnkeyWalletsTable';

export interface UpdateTurnkeyWalletForm {
  name: string;
  wallet_address: string;
  organization_id: string;
}

interface EditTurnkeyWalletDialogProps {
  open: boolean;
  wallet: TurnkeyWallet;
  onClose: () => void;
  onSubmit: (data: UpdateTurnkeyWalletForm) => void;
}

export const EditTurnkeyWalletDialog = ({
  open,
  wallet,
  onClose,
  onSubmit,
}: EditTurnkeyWalletDialogProps) => {
  const [form, setForm] = useState<UpdateTurnkeyWalletForm>({
    name: wallet.name,
    wallet_address: wallet.address,
    organization_id: wallet.organization_id,
  });

  useEffect(() => {
    if (open && wallet) {
      setForm({
        name: wallet.name,
        wallet_address: wallet.address,
        organization_id: wallet.organization_id,
      });
    }
  }, [open, wallet]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Turnkey Wallet</DialogTitle>
      <form onSubmit={handleSubmit} id="edit-turnkey-wallet-form">
        <DialogContent>
          <TextField
            autoFocus
            required
            margin="dense"
            name="name"
            label="Wallet Name"
            value={form.name}
            onChange={handleChange}
            fullWidth
            variant="standard"
          />
          <TextField
            required
            margin="dense"
            name="wallet_address"
            label="Wallet Address"
            value={form.wallet_address}
            onChange={handleChange}
            fullWidth
            variant="standard"
          />
          <TextField
            required
            margin="dense"
            name="organization_id"
            label="Organization ID"
            value={form.organization_id}
            onChange={handleChange}
            fullWidth
            variant="standard"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="edit-turnkey-wallet-form" variant="contained">
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
