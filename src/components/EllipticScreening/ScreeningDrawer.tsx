import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Drawer, IconButton, Typography } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { screenWallet, type EllipticScreeningResult } from 'src/utils/elliptic';
import { ScreeningResult } from './ScreeningResult';
import { RiskGauge } from './RiskGauge';

interface ScreeningDrawerProps {
  label?: string;
  walletAddress?: string;
  buttonSize?: 'small' | 'medium';
  syncUrl?: boolean;
}

export function ScreeningDrawer({ label, walletAddress, buttonSize = 'small', syncUrl = false }: ScreeningDrawerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EllipticScreeningResult | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Auto-open if URL hash is #screen on mount
  useEffect(() => {
    if (syncUrl && location.hash === '#screen') {
      setOpen(true);
      if (walletAddress && !result) doScreen(walletAddress);
    }
  }, []); // eslint-disable-line

  const doScreen = async (value: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await screenWallet(value));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Screening failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (syncUrl) navigate({ search: location.search, hash: 'screen' }, { replace: true });
    if (walletAddress && !result) doScreen(walletAddress);
  };

  const handleClose = () => {
    setOpen(false);
    if (syncUrl) navigate({ search: location.search, hash: '' }, { replace: true });
  };

  return (
    <>
      <Button
        variant="outlined"
        size={buttonSize}
        startIcon={<SecurityIcon sx={{ fontSize: buttonSize === 'small' ? 14 : 18 }} />}
        onClick={handleOpen}
        sx={{ fontSize: buttonSize === 'small' ? 11 : 13, borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: '#2DD4D1', color: '#2DD4D1', bgcolor: 'rgba(45,212,209,0.06)' } }}
      >
        {label ?? 'Screen'}
      </Button>

      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: { xs: '100vw', sm: 480 },
            bgcolor: '#13131A',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 2, borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <SecurityIcon sx={{ fontSize: 18, color: '#2DD4D1' }} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>Vanish Integrity</Typography>
            <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>Risk Screening</Typography>
          </Box>
          {result && <RiskGauge score={result.risk_score} size={48} />}
          <IconButton size="small" onClick={handleClose} sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: 'rgba(255,255,255,0.8)' } }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
          {loading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 2 }}>
              <CircularProgress size={36} sx={{ color: '#2DD4D1' }} />
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Running integrity check…</Typography>
            </Box>
          )}

          {error && (
            <Box sx={{ p: 2, bgcolor: 'rgba(240,78,106,0.08)', border: '1px solid rgba(240,78,106,0.2)', borderRadius: 1.5 }}>
              <Typography sx={{ fontSize: 12, color: '#F04E6A', fontWeight: 600, mb: 0.5 }}>Screening Failed</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{error}</Typography>
            </Box>
          )}

          {result && walletAddress && !loading && (
            <ScreeningResult result={result} subject={walletAddress} subjectType="wallet" />
          )}
        </Box>

        {/* Footer */}
        {result && walletAddress && (
          <Box sx={{ display: 'flex', gap: 1, px: 2.5, py: 2, borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <Button
              variant="outlined" size="small"
              startIcon={loading ? <CircularProgress size={12} color="inherit" /> : <SecurityIcon sx={{ fontSize: 14 }} />}
              disabled={loading}
              onClick={() => doScreen(walletAddress)}
              sx={{ fontSize: 11, flex: 1 }}
            >
              Re-screen
            </Button>
            <Button
              variant="outlined" size="small" startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
              component="a"
              href={`https://solscan.io/account/${walletAddress}`}
              target="_blank" rel="noopener noreferrer"
              sx={{ fontSize: 11, flex: 1 }}
            >
              Solscan
            </Button>
          </Box>
        )}
      </Drawer>
    </>
  );
}
