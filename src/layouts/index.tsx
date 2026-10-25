import { FC, ReactNode } from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';

import Sidebar from './Sidebar';
import Header from './Header';
import useInactivityLogout from 'src/hooks/useInactivityLogout';
import { handleSessionExpired } from 'src/utils';

interface LayoutProps {
  children?: ReactNode;
}

const Layout: FC<LayoutProps> = () => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { disconnect } = useWallet();

  const handleLogout = () => {
    disconnect();
    handleSessionExpired(navigate);
  };

  const { showWarning, countdown, dismiss } = useInactivityLogout(handleLogout);

  return (
    <Box sx={{ display: 'flex', flex: 1, height: '100%' }}>
      <Header />
      <Sidebar />

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: theme.header.height,
          [theme.breakpoints.up('lg')]: {
            marginLeft: theme.sidebar.width
          }
        }}
      >
        <Box
          key={location.pathname}
          sx={{
            flex: 1,
            overflowX: 'hidden',
            overflowY: 'auto',
            p: { xs: 1, sm: 1.5, md: 2 },
            '@keyframes pageIn': {
              '0%':   { opacity: 0, transform: 'translateY(10px)' },
              '100%': { opacity: 1, transform: 'translateY(0)' },
            },
            animation: 'pageIn 0.4s cubic-bezier(0.22,1,0.36,1) both',
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {showWarning && (
        <Box sx={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'rgba(0,0,0,0.70)',
          backdropFilter: 'blur(8px)',
          '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
          animation: 'fadeIn 0.18s ease both',
        }}>
          <Box sx={{
            bgcolor: '#0c0c10',
            border: '1px solid rgba(245,158,11,0.18)',
            borderRadius: 3,
            boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,158,11,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
            p: '32px 28px 28px',
            width: 300,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0,
            '@keyframes slideUp': { from: { opacity: 0, transform: 'translateY(20px) scale(0.97)' }, to: { opacity: 1, transform: 'translateY(0) scale(1)' } },
            animation: 'slideUp 0.28s cubic-bezier(0.22,1,0.36,1) both',
          }}>

            {/* Circular countdown */}
            <Box component="svg" viewBox="0 0 72 72" sx={{ width: 72, height: 72, display: 'block', mb: 2.5, overflow: 'visible' }}>
              {/* Ambient glow behind ring */}
              <circle cx="36" cy="36" r="30" fill="rgba(245,158,11,0.04)" />
              {/* Track */}
              <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
              {/* Progress arc */}
              <circle cx="36" cy="36" r="28" fill="none" stroke="#f59e0b" strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - countdown / 30)}`}
                strokeLinecap="round"
                transform="rotate(-90 36 36)"
                style={{ transition: 'stroke-dashoffset 0.9s linear', filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.55))' }}
              />
              {/* Number — SVG text guarantees centering */}
              <text
                x="36" y="36"
                dominantBaseline="central"
                textAnchor="middle"
                fill="#f59e0b"
                fontSize="18"
                fontWeight="700"
                fontFamily="inherit"
              >
                {countdown}
              </text>
            </Box>

            {/* Title */}
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: '0.01em', mb: 0.75 }}>
              Session Expiring
            </Typography>

            {/* Subtitle */}
            <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', lineHeight: 1.65, textAlign: 'center', mb: 3 }}>
              No activity detected. You'll be signed out in {countdown} second{countdown !== 1 ? 's' : ''} unless you stay.
            </Typography>

            {/* Buttons */}
            <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
              <Button
                fullWidth variant="text" size="small"
                onClick={handleLogout}
                sx={{
                  fontSize: 11, py: 1, borderRadius: 1.5,
                  color: 'rgba(255,255,255,0.30)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.55)' },
                }}
              >
                Sign out
              </Button>
              <Button
                fullWidth size="small"
                onClick={dismiss}
                sx={{
                  fontSize: 11, py: 1, borderRadius: 1.5,
                  bgcolor: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                  border: '1px solid rgba(245,158,11,0.22)',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: 'rgba(245,158,11,0.20)', boxShadow: 'none' },
                }}
              >
                Stay logged in
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Layout;
