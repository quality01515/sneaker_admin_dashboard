import { useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RadarIcon from '@mui/icons-material/Radar';
import CloseIcon from '@mui/icons-material/Close';
import { toast } from 'react-toastify';
import { TokenSearch } from 'src/pages/TurnkeyWallets/TokenSearch';

const ACCENT = '#42FFFC';

const cellSx = { fontSize: 12, px: '10px', py: '3px', borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)' };
const headSx = { ...cellSx, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.35)', bgcolor: 'rgba(255,255,255,0.02)' };

const Balances = ({ data }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [scanMint, setScanMint] = useState<string | null>(null);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied', { autoClose: 1000 });
    } catch { /* silent */ }
  };

  if (!data || data.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>No balances</Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 400 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headSx, width: 48, display: { xs: 'none', sm: 'table-cell' } }}>#</TableCell>
              <TableCell sx={headSx}>Token</TableCell>
              <TableCell sx={{ ...headSx, display: { xs: 'none', sm: 'table-cell' } }}>Address</TableCell>
              <TableCell align="right" sx={headSx}>Balance</TableCell>
              <TableCell sx={{ ...headSx, width: 40 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((balance, index) => {
              const symbol = balance.symbol || 'SOL';
              const addr = balance.token_address;
              const bal = (Number(balance.balance) / Math.pow(10, Number(balance.decimals))).toFixed(6);

              return (
                <TableRow key={`row-${addr ?? index}`} hover sx={{ '&:last-child td': { borderBottom: 'none' }, '&:hover td': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell sx={{ ...cellSx, color: 'rgba(255,255,255,0.3)', display: { xs: 'none', sm: 'table-cell' } }}>{index + 1}</TableCell>
                  <TableCell sx={{ ...cellSx, fontWeight: 600, color: 'rgba(255,255,255,0.88)' }}>{symbol}</TableCell>
                  <TableCell sx={{ ...cellSx, display: { xs: 'none', sm: 'table-cell' } }}>
                    {addr ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Tooltip title={addr} placement="top">
                          <Typography
                            component="a"
                            href={`https://solscan.io/token/${addr}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ fontSize: 12, color: '#2DD4D1', fontFamily: 'monospace', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {addr.slice(0, 8)}…{addr.slice(-6)}
                          </Typography>
                        </Tooltip>
                        <IconButton size="small" onClick={() => copy(addr)} sx={{ p: 0.25, color: 'rgba(255,255,255,0.2)', '&:hover': { color: 'rgba(255,255,255,0.6)' } }}>
                          <ContentCopyIcon sx={{ fontSize: 11 }} />
                        </IconButton>
                      </Box>
                    ) : (
                      <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Native SOL</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ ...cellSx, fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                      <span>{bal}</span>
                      {addr && (
                        <Box component="button" onClick={() => setScanMint(addr)}
                          sx={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', px: '6px', py: '2px', borderRadius: '4px', border: `1px solid ${ACCENT}30`, color: `${ACCENT}70`, bgcolor: 'transparent', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s', '&:hover': { bgcolor: `${ACCENT}12`, borderColor: `${ACCENT}60`, color: ACCENT } }}>
                          Scan
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Token Holdings modal */}
      <Dialog
        open={!!scanMint}
        onClose={() => setScanMint(null)}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            borderRadius: isMobile ? 0 : 2,
            border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)',
            overflow: 'hidden',
            maxHeight: isMobile ? '100vh' : '90vh',
          },
        }}
      >
        <DialogContent sx={{ p: isMobile ? 0 : 1.5 }}>
          {scanMint && <TokenSearch key={scanMint} defaultMint={scanMint} onClose={() => setScanMint(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Balances;
