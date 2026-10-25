import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import { useState, useEffect } from 'react';

export interface AddTurnkeyWalletForm {
  wallet_name: string;
  wallet_address: string;
  organization_id: string;
}

interface AddTurnkeyWalletDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AddTurnkeyWalletForm) => void;
}

const initialForm: AddTurnkeyWalletForm = {
  wallet_name: '',
  wallet_address: '',
  organization_id: '',
};

export const AddTurnkeyWalletDialog = ({
  open,
  onClose,
  onSubmit,
}: AddTurnkeyWalletDialogProps) => {
  const [form, setForm] = useState<AddTurnkeyWalletForm>(initialForm);

  useEffect(() => {
    if (open) {
      setForm(initialForm);
    }
  }, [open]);

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
      <DialogTitle>Add Turnkey Wallet</DialogTitle>
      <form onSubmit={handleSubmit} id="add-turnkey-wallet-form">
        <DialogContent>
          <TextField
            autoFocus
            required
            margin="dense"
            name="wallet_name"
            label="Wallet Name"
            value={form.wallet_name}
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
          <Button type="submit" form="add-turnkey-wallet-form" variant="contained">
            Add
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
