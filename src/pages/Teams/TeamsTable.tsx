import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputBase,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNew from "@mui/icons-material/OpenInNew";
import { toast } from "react-toastify";

export interface Team {
  id: number;
  name: string;
  fee_bps: number;
  fee_address: string | null;
  silent_reward_token_bps: number;
  silent_reward_sol_bps: number;
  is_referral_fee_enabled: boolean;
  fee_share_daily_enabled: boolean | null;
  fee_share_to_platform_percentage: number | null;
  fee_share_to_platform_address: string | null;
  fee_share_to_vanish_address: string | null;
  rate_limit_per_second: number;
}

interface TeamsTableProps {
  teams: Team[];
  search: string;
  onSearchChange: (v: string) => void;
  onEdit?: (team: Team) => void;
  onDelete?: (name: string) => void;
}

function DeleteConfirmDialog({ team, onConfirm, onClose }: { team: Team | null; onConfirm: () => void; onClose: () => void }) {
  if (!team) return null;
  return (
    <Dialog open={!!team} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: '#141418', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <WarningAmberIcon sx={{ color: '#F5A524', fontSize: 20 }} />
        <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>
          Delete Team
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', mb: 1.5 }}>
          This action is irreversible. The team and all its configuration will be permanently removed.
        </Typography>
        <Box sx={{ px: 1.5, py: 1, borderRadius: 1.5, bgcolor: 'rgba(240,78,106,0.07)', border: '1px solid rgba(240,78,106,0.20)' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#f87171', letterSpacing: '0.01em' }}>
            {team.name}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', mt: 1.5 }}>
          Your wallet will be asked to sign to authorise this action.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
        <Button onClick={onClose} size="small" sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          Cancel
        </Button>
        <Button onClick={() => { onConfirm(); onClose(); }} size="small" variant="outlined"
          sx={{ fontSize: 12, color: '#f87171', borderColor: 'rgba(240,78,106,0.40)', '&:hover': { bgcolor: 'rgba(240,78,106,0.08)', borderColor: '#f87171' } }}>
          Delete team
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function truncate(s: string | null | undefined, len = 8): string {
  if (!s) return '—';
  return s.length <= len * 2 + 1 ? s : `${s.slice(0, len)}…${s.slice(-len)}`;
}

function CopyAddress({ address }: { address: string | null }) {
  if (!address) return <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>—</Typography>;

  const copy = () => {
    navigator.clipboard.writeText(address).then(() => {
      toast.success('Copied', { autoClose: 1000 });
    });
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Tooltip title={address} placement="top">
        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace', cursor: 'default' }}>
          {truncate(address)}
        </Typography>
      </Tooltip>
      <IconButton size="small" onClick={copy} sx={{ p: 0.25, color: 'rgba(255,255,255,0.25)', '&:hover': { color: 'rgba(255,255,255,0.6)' } }}>
        <ContentCopyIcon sx={{ fontSize: 11 }} />
      </IconButton>
      <IconButton
        size="small"
        component="a"
        href={`https://solscan.io/account/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ p: 0.25, color: 'rgba(255,255,255,0.2)', '&:hover': { color: 'rgba(45,212,209,0.7)' } }}
      >
        <OpenInNew sx={{ fontSize: 10 }} />
      </IconButton>
    </Box>
  );
}

const cellSx = { fontSize: 12, px: '10px', py: '8px', borderColor: 'rgba(255,255,255,0.06)', whiteSpace: 'nowrap' as const };
const headSx = { ...cellSx, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.38)', bgcolor: 'rgba(255,255,255,0.02)' };

export const TeamsTable = ({ teams, search, onSearchChange, onEdit, onDelete }: TeamsTableProps) => {
  const [pendingDelete, setPendingDelete] = useState<Team | null>(null);
  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
      {/* Search bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.25, borderBottom: '1px solid rgba(255,255,255,0.06)', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, maxWidth: 280, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 1, px: 1.25, py: 0.5, gap: 0.75, '&:focus-within': { borderColor: 'rgba(255,255,255,0.18)' }, transition: 'border-color 0.15s' }}>
          <SearchIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
          <InputBase
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search teams…"
            sx={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', flex: 1, '& .MuiInputBase-input': { p: 0, '&::placeholder': { color: 'rgba(255,255,255,0.28)', opacity: 1 } } }}
          />
        </Box>
        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', ml: 'auto' }}>
          {filtered.length} / {teams.length} teams
        </Typography>
      </Box>

      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={headSx}>#</TableCell>
              <TableCell sx={headSx}>Name</TableCell>
              <TableCell align="right" sx={headSx}>Fee (bps)</TableCell>
              <TableCell sx={{ ...headSx, borderLeft: '1px solid rgba(255,255,255,0.10)' }}>Fee Address</TableCell>
              <TableCell align="right" sx={headSx}>SR Token (bps)</TableCell>
              <TableCell align="right" sx={headSx}>SR SOL (bps)</TableCell>
              <TableCell align="center" sx={headSx}>SR Enabled</TableCell>
              <TableCell align="center" sx={headSx}>Referral</TableCell>
              <TableCell align="center" sx={headSx}>Daily Share</TableCell>
              <TableCell align="right" sx={headSx}>Platform %</TableCell>
              <TableCell sx={headSx}>Platform Addr</TableCell>
              <TableCell sx={headSx}>Vanish Addr</TableCell>
              <TableCell align="right" sx={{ ...headSx, borderLeft: '1px solid rgba(255,255,255,0.10)' }}>Rate Limit (/s)</TableCell>
              {(onEdit || onDelete) && <TableCell align="center" sx={headSx}>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} align="center" sx={{ ...cellSx, py: 4, color: 'rgba(255,255,255,0.28)' }}>
                  {search ? 'No teams match your search' : 'No teams found'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row, i) => (
                <TableRow
                  key={row.id}
                  hover
                  sx={{ '&:last-child td': { borderBottom: 'none' }, '&:hover td': { bgcolor: 'rgba(255,255,255,0.025)' } }}
                >
                  <TableCell sx={{ ...cellSx, color: 'rgba(255,255,255,0.3)' }}>{i + 1}</TableCell>
                  <TableCell sx={{ ...cellSx, fontWeight: 600, color: 'rgba(255,255,255,0.88)' }}>{row.name}</TableCell>
                  <TableCell align="right" sx={{ ...cellSx, fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.75)' }}>{row.fee_bps}</TableCell>
                  <TableCell sx={{ ...cellSx, borderLeft: '1px solid rgba(255,255,255,0.10)' }}><CopyAddress address={row.fee_address} /></TableCell>
                  <TableCell align="right" sx={{ ...cellSx, fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.75)' }}>{row.silent_reward_token_bps}</TableCell>
                  <TableCell align="right" sx={{ ...cellSx, fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.75)' }}>{row.silent_reward_sol_bps}</TableCell>
                  <TableCell align="center" sx={cellSx}>
                    {(() => { const on = (row.silent_reward_token_bps ?? 0) > 0 || (row.silent_reward_sol_bps ?? 0) > 0; return (
                      <Chip label={on ? 'Yes' : 'No'} size="small" sx={{ fontSize: 10, height: 18, fontWeight: 600, bgcolor: on ? 'rgba(45,212,209,0.12)' : 'rgba(255,255,255,0.05)', color: on ? '#2DD4D1' : 'rgba(255,255,255,0.35)', border: `1px solid ${on ? 'rgba(45,212,209,0.25)' : 'rgba(255,255,255,0.08)'}` }} />
                    ); })()}
                  </TableCell>
                  <TableCell align="center" sx={cellSx}>
                    <Chip
                      label={row.is_referral_fee_enabled ? 'Yes' : 'No'}
                      size="small"
                      sx={{ fontSize: 10, height: 18, fontWeight: 600, bgcolor: row.is_referral_fee_enabled ? 'rgba(45,212,209,0.12)' : 'rgba(255,255,255,0.05)', color: row.is_referral_fee_enabled ? '#2DD4D1' : 'rgba(255,255,255,0.35)', border: `1px solid ${row.is_referral_fee_enabled ? 'rgba(45,212,209,0.25)' : 'rgba(255,255,255,0.08)'}` }}
                    />
                  </TableCell>
                  <TableCell align="center" sx={cellSx}>
                    {row.fee_share_daily_enabled == null ? (
                      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>—</Typography>
                    ) : (
                      <Chip
                        label={row.fee_share_daily_enabled ? 'Yes' : 'No'}
                        size="small"
                        sx={{ fontSize: 10, height: 18, fontWeight: 600, bgcolor: row.fee_share_daily_enabled ? 'rgba(45,212,209,0.12)' : 'rgba(255,255,255,0.05)', color: row.fee_share_daily_enabled ? '#2DD4D1' : 'rgba(255,255,255,0.35)', border: `1px solid ${row.fee_share_daily_enabled ? 'rgba(45,212,209,0.25)' : 'rgba(255,255,255,0.08)'}` }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ ...cellSx, fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.75)' }}>
                    {row.fee_share_to_platform_percentage != null ? `${row.fee_share_to_platform_percentage}%` : '—'}
                  </TableCell>
                  <TableCell sx={cellSx}><CopyAddress address={row.fee_share_to_platform_address} /></TableCell>
                  <TableCell sx={cellSx}><CopyAddress address={row.fee_share_to_vanish_address} /></TableCell>
                  <TableCell align="right" sx={{ ...cellSx, borderLeft: '1px solid rgba(255,255,255,0.10)', fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.75)' }}>{row.rate_limit_per_second}</TableCell>
                  {(onEdit || onDelete) && (
                    <TableCell align="center" sx={cellSx}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        {onEdit && (
                          <Tooltip title="Edit">
                            <IconButton size="small" color="primary" onClick={() => onEdit(row)} sx={{ p: 0.5 }}>
                              <EditIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {onDelete && (
                          <Tooltip title="Delete team">
                            <IconButton size="small" onClick={() => setPendingDelete(row)} sx={{ p: 0.5, color: 'rgba(255,255,255,0.22)', '&:hover': { color: '#f87171', bgcolor: 'rgba(240,78,106,0.08)' } }}>
                              <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <DeleteConfirmDialog
        team={pendingDelete}
        onConfirm={() => { if (pendingDelete && onDelete) onDelete(pendingDelete.name); }}
        onClose={() => setPendingDelete(null)}
      />
    </Box>
  );
};
