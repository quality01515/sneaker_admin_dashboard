import { useState } from "react";
import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import NorthIcon from "@mui/icons-material/North";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import { toast } from "react-toastify";
import { AddressDisplay } from "src/components/AddressDisplay";
import { RentTopUp } from "src/components/RentTopUp";

const RENT_ADDRESS = 'BxEpKHc9MhTNNNL3m9hHufb4sbHqVzZ1wm7Yt8BMeJDD';

export interface TurnkeyWallet {
  id: number;
  name: string;
  address: string;
  organization_id: string;
  created_at: string;
}

interface RowProps {
  row: TurnkeyWallet;
  index: number;
  onEdit?: (w: TurnkeyWallet) => void;
  onDelete?: (name: string) => void;
  rentSol?: number | null;
  sol?: number | null;
  onRentTopUpSuccess?: () => void;
  onRefreshBalance?: () => void;
}

function WalletTableRow({ row, index, onEdit, onDelete, rentSol, sol, onRentTopUpSuccess, onRefreshBalance }: RowProps) {
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    onRefreshBalance?.();
    setTimeout(() => setRefreshing(false), 1200);
  };
  const isRent = row.address === RENT_ADDRESS;
  const displaySol = isRent ? (rentSol ?? sol ?? null) : sol;
  const colored = index < 3;
  const isCrit = colored && displaySol != null && displaySol < 0.2;
  const isLow  = colored && displaySol != null && displaySol < 0.75;
  const balColor = isCrit ? '#f87171' : isLow ? '#fbbf24' : colored ? '#4ade80' : 'rgba(255,255,255,0.55)';
  const borderColor = isCrit ? 'rgba(248,113,113,0.25)' : isLow ? 'rgba(251,191,36,0.25)' : 'rgba(74,222,128,0.22)';
  const bgColor = isCrit ? 'rgba(248,113,113,0.07)' : isLow ? 'rgba(251,191,36,0.07)' : 'rgba(74,222,128,0.06)';

  return (
    <TableRow hover sx={(theme) => ({ '&:nth-of-type(even)': { bgcolor: theme.palette.mode === 'dark' ? theme.palette.action.hover : 'grey.50' } })}>
      <TableCell>{index + 1}</TableCell>
      <TableCell>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            {isRent ? 'Vanish Rent Account' : row.name}
          </Typography>
          {isRent && (
            <Box
              onClick={() => setTopUpOpen(true)}
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.3,
                borderRadius: '6px',
                border: `1px solid ${borderColor}`,
                bgcolor: bgColor,
                px: 0.75, py: 0.35,
                cursor: 'pointer', color: balColor,
                flexShrink: 0,
                transition: 'opacity 0.15s', '&:hover': { opacity: 0.7 },
              }}
            >
              <NorthIcon sx={{ fontSize: 9 }} />
              <Typography sx={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1, color: 'inherit' }}>
                Top Up
              </Typography>
            </Box>
          )}
        </Box>
        {isRent && (
          <RentTopUp
            rentSol={displaySol}
            onSuccess={onRentTopUpSuccess}
            controlledOpen={topUpOpen}
            onControlledClose={() => setTopUpOpen(false)}
          />
        )}
      </TableCell>
      <TableCell>
        <AddressDisplay
          address={row.address}
          showSolscan="account"
          onCopy={() => toast.success('Copied to clipboard', { position: 'top-right', autoClose: 1000 })}
        />
      </TableCell>
      <TableCell>{row.organization_id}</TableCell>
      {/* Balance column */}
      <TableCell align="right">
        {displaySol != null ? (
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: balColor, fontVariantNumeric: 'tabular-nums' }}>
            {displaySol.toFixed(3)}
          </Typography>
        ) : (
          <CircularProgress size={10} thickness={5} sx={{ color: 'rgba(255,255,255,0.2)' }} />
        )}
      </TableCell>
      <TableCell>{row.created_at}</TableCell>
      <TableCell align="center" sx={{ py: 0.5, width: '1%', whiteSpace: 'nowrap' }}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Refresh balance">
            <span>
              <IconButton size="small" onClick={handleRefresh} sx={{ color: refreshing ? balColor : 'rgba(255,255,255,0.35)', '&:hover': { color: 'rgba(255,255,255,0.7)' } }}>
                {refreshing
                  ? <CircularProgress size={14} thickness={5} sx={{ color: 'inherit' }} />
                  : <RefreshIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
          {onEdit && (
            <Tooltip title="Edit">
              <span>
                <IconButton size="small" color="primary" disabled onClick={() => onEdit(row)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="Delete">
              <span>
                <IconButton size="small" color="error" disabled onClick={() => onDelete(row.name)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
}

interface TurnkeyWalletsTableProps {
  wallets: TurnkeyWallet[];
  onEdit?: (wallet: TurnkeyWallet) => void;
  onDelete?: (name: string) => void;
  rentSol?: number | null;
  walletBalances?: Record<string, number | null>;
  onRentTopUpSuccess?: () => void;
  onRefreshBalances?: () => void;
}

export const TurnkeyWalletsTable = ({
  wallets,
  onEdit,
  onDelete,
  rentSol,
  walletBalances = {},
  onRentTopUpSuccess,
  onRefreshBalances,
}: TurnkeyWalletsTableProps) => {
  return (
    <Paper
      elevation={0}
      sx={(theme) => ({
        overflow: "hidden",
        borderRadius: 2,
        border: "1px solid",
        borderColor: theme.palette.divider,
        bgcolor: theme.palette.background.paper,
        boxShadow:
          theme.palette.mode === "dark"
            ? "0px 1px 2px rgba(0,0,0,0.35)"
            : theme.shadows[1],
        transition: "all 0.25s ease",
        "&:hover": {
          boxShadow: "0px 2px 4px rgba(0,0,0,0.45)",
        },
      })}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
          Accounts
        </Typography>
      </Box>
      <Box sx={{ p: 2 }}>
        <TableContainer
          sx={(theme) => ({
            overflowX: "auto",
            borderRadius: 1,
            border: "1px solid",
            borderColor: theme.palette.divider,
            bgcolor: theme.palette.background.paper,
            "& .MuiTableCell-root": {
              color: theme.palette.text.primary,
              borderColor: theme.palette.divider,
            },
            "& .MuiTableRow-root:hover": {
              bgcolor: theme.palette.action.hover,
            },
          })}
        >
          <Table size="small" sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Address</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Organization ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Balance (SOL)</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Created At</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, width: '1%', whiteSpace: 'nowrap' }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {wallets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align="center"
                    sx={{ py: 4 }}
                  >
                    No turnkey wallets found
                  </TableCell>
                </TableRow>
              ) : (
                wallets.map((row, index) => (
                  <WalletTableRow
                    key={row.id}
                    row={row}
                    index={index}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    rentSol={rentSol}
                    sol={walletBalances[row.address] ?? null}
                    onRentTopUpSuccess={onRentTopUpSuccess}
                    onRefreshBalance={onRefreshBalances}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Paper>
  );
};
