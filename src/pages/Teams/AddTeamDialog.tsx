import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  IconButton,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import type { Team } from './TeamsTable';

interface AddTeamDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (team: Omit<Team, 'id'>) => void;
  apiKey?: string | null;
}

const initialForm: Omit<Team, 'id'> = {
  name: '',
  fee_bps: 0,
  fee_address: '',
  silent_reward_token_bps: 0,
  silent_reward_sol_bps: 0,
  is_referral_fee_enabled: false,
  fee_share_daily_enabled: null,
  fee_share_to_platform_percentage: null,
  fee_share_to_platform_address: '',
  fee_share_to_vanish_address: '',
  rate_limit_per_second: 50,
};

export const AddTeamDialog = ({
  open,
  onClose,
  onSubmit,
  apiKey,
}: AddTeamDialogProps) => {
  const [form, setForm] = useState<Omit<Team, 'id'>>(initialForm);

  useEffect(() => {
    if (open) {
      setForm(initialForm);
    }
  }, [open]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const isOptionalNumber =
      name === 'fee_share_to_platform_percentage';
    setForm((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : type === 'number'
            ? isOptionalNumber
              ? value === '' ? null : parseInt(value, 10) || 0
              : parseInt(value, 10) || 0
            : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      fee_address: form.fee_address?.trim() || null,
      fee_share_daily_enabled: form.fee_share_daily_enabled ?? null,
      fee_share_to_platform_address: form.fee_share_to_platform_address?.trim() || null,
      fee_share_to_vanish_address: form.fee_share_to_vanish_address?.trim() || null,
    });
  };

  const handleCopyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      toast.success('API key copied to clipboard', {

        autoClose: 1500,
      });
    }
  };

  const isRevealMode = Boolean(apiKey);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isRevealMode ? 'Team Added' : 'Add Team'}</DialogTitle>
      {isRevealMode ? (
        <>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Save this API key — it won&apos;t be shown again:
            </Typography>
            <TextField
              fullWidth
              value={apiKey ?? ''}
              variant="outlined"
              size="small"
              inputProps={{
                style: { fontFamily: 'monospace', fontSize: '0.875rem' },
              }}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleCopyApiKey} edge="end" size="small">
                      <ContentCopyIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} variant="contained">Done</Button>
          </DialogActions>
        </>
      ) : (
      <form onSubmit={handleSubmit} id="add-team-form">
        <DialogContent>
          <TextField
            autoFocus
            required
            margin="dense"
            name="name"
            label="Name"
            value={form.name}
            onChange={handleChange}
            fullWidth
            variant="standard"
          />
          <TextField
            margin="dense"
            name="fee_bps"
            label="Fee (bps)"
            type="number"
            value={form.fee_bps}
            onChange={handleChange}
            fullWidth
            variant="standard"
            inputProps={{ min: 0 }}
          />
          <TextField
            margin="dense"
            name="fee_address"
            label="Fee Address"
            value={form.fee_address ?? ''}
            onChange={handleChange}
            fullWidth
            variant="standard"
          />
          <TextField
            margin="dense"
            name="silent_reward_token_bps"
            label="Silent Reward Token (bps)"
            type="number"
            value={form.silent_reward_token_bps}
            onChange={handleChange}
            fullWidth
            variant="standard"
            inputProps={{ min: 0 }}
          />
          <TextField
            margin="dense"
            name="silent_reward_sol_bps"
            label="Silent Reward SOL (bps)"
            type="number"
            value={form.silent_reward_sol_bps}
            onChange={handleChange}
            fullWidth
            variant="standard"
            inputProps={{ min: 0 }}
          />
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.is_referral_fee_enabled}
                  onChange={handleChange}
                  name="is_referral_fee_enabled"
                />
              }
              label="Referral fee enabled"
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.fee_share_daily_enabled ?? false}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      fee_share_daily_enabled: (e.target as HTMLInputElement).checked,
                    }))
                  }
                />
              }
              label="Fee share daily enabled"
            />
          </Box>
          <TextField
            margin="dense"
            name="fee_share_to_platform_percentage"
            label="Fee share to platform (%)"
            type="number"
            value={form.fee_share_to_platform_percentage ?? ''}
            onChange={handleChange}
            fullWidth
            variant="standard"
            placeholder="Optional"
            inputProps={{ min: 0, max: 100 }}
          />
          <TextField
            margin="dense"
            name="fee_share_to_platform_address"
            label="Fee share to platform address"
            value={form.fee_share_to_platform_address ?? ''}
            onChange={handleChange}
            fullWidth
            variant="standard"
            placeholder="Optional"
          />
          <TextField
            margin="dense"
            name="fee_share_to_vanish_address"
            label="Fee share to Vanish address"
            value={form.fee_share_to_vanish_address ?? ''}
            onChange={handleChange}
            fullWidth
            variant="standard"
            placeholder="Optional"
          />
          <TextField
            margin="dense"
            name="rate_limit_per_second"
            label="Rate limit (requests/sec)"
            type="number"
            value={form.rate_limit_per_second}
            onChange={handleChange}
            fullWidth
            variant="standard"
            inputProps={{ min: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="add-team-form" variant="contained">
            Add
          </Button>
        </DialogActions>
      </form>
      )}
    </Dialog>
  );
};
