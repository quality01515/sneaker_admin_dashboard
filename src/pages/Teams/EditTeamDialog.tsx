import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { useState, useEffect } from 'react';
import type { Team } from './TeamsTable';

interface EditTeamDialogProps {
  open: boolean;
  team: Team;
  onClose: () => void;
  onSubmit: (team: Team) => void;
}

export const EditTeamDialog = ({
  open,
  team,
  onClose,
  onSubmit,
}: EditTeamDialogProps) => {
  const [form, setForm] = useState<Team>(team);

  useEffect(() => {
    if (open && team) {
      setForm(team);
    }
  }, [open, team]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const isOptionalNumber = name === 'fee_share_to_platform_percentage';
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
      fee_share_to_platform_address: form.fee_share_to_platform_address?.trim() || null,
      fee_share_to_vanish_address: form.fee_share_to_vanish_address?.trim() || null,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Team</DialogTitle>
      <form onSubmit={handleSubmit} id="edit-team-form">
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
            placeholder="Optional"
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
          <Button type="submit" form="edit-team-form" variant="contained">
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
