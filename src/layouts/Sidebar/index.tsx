import { useContext } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import Logo from 'src/components/LogoSign';
import Scrollbar from 'src/components/Scrollbar';
import { SidebarContext } from 'src/contexts/SidebarContext';

import {
  alpha,
  Box,
  Button,
  Divider,
  Drawer,
  useTheme
} from '@mui/material';

import LogoutIcon from '@mui/icons-material/Logout';

import { initialAuthState, setToken } from 'src/store/authSlice';
import { setLoginStatus } from 'src/store/userSlice';
import { resetAdminStatus } from 'src/store/adminSlice';
import { useCookie } from 'src/utils/useCookie';
import { COOKIE_SIGNATURE, COOKIE_TIMESTAMP } from 'src/config';

import SidebarMenu from './SidebarMenu';
import { SidebarWrapper } from './StyledWrapper';

function Sidebar() {
  const { sidebarToggle, toggleSidebar } = useContext(SidebarContext);
  const closeSidebar = () => toggleSidebar();
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { disconnect } = useWallet();
  const { deleteCookie } = useCookie();

  const handleSignOut = async () => {
    try { await disconnect(); } catch { /* ignore */ }
    dispatch(resetAdminStatus());
    dispatch(setLoginStatus(''));
    dispatch(setToken(initialAuthState.token));
    deleteCookie(COOKIE_SIGNATURE);
    deleteCookie(COOKIE_TIMESTAMP);
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  const sidebarBg = theme.sidebar.background;

  const SidebarContent = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Scrollable nav area */}
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Scrollbar>
          <Box sx={{ px: 1, pt: 1.5, pb: 1.5, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Logo />
          </Box>
          <Divider sx={{ borderColor: theme.sidebar.dividerBg }} />
          <SidebarMenu />
        </Scrollbar>
      </Box>

      {/* Sign out — always visible at bottom, outside scroll */}
      <Box sx={{ borderTop: `1px solid ${alpha('#FFFFFF', 0.05)}` }}>
        <Box sx={{
          m: 1.25,
          borderRadius: '6px',
          border: `1px solid ${alpha('#FFFFFF', 0.06)}`,
          backgroundColor: alpha('#FFFFFF', 0.02)
        }}>
          <Button
            fullWidth
            onClick={handleSignOut}
            startIcon={<LogoutIcon sx={{ fontSize: '14px !important' }} />}
            sx={{
              justifyContent: 'flex-start',
              color:          alpha(theme.palette.common.white, 0.38),
              fontSize:       '12px',
              fontWeight:     500,
              borderRadius:   '6px',
              padding:        '7px 12px',
              '&:hover': {
                backgroundColor: alpha(theme.palette.error.main, 0.09),
                color:           theme.palette.error.main
              }
            }}
          >
            Sign out
          </Button>
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <SidebarWrapper
        sx={{
          display:    { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          position:   'fixed',
          left:       0,
          top:        0,
          height:     '100%',
          background: sidebarBg,
          boxShadow:  theme.sidebar.boxShadow
        }}
      >
        <SidebarContent />
      </SidebarWrapper>

      {/* Mobile drawer */}
      <Drawer
        anchor="left"
        open={sidebarToggle}
        onClose={closeSidebar}
        variant="temporary"
        elevation={9}
        PaperProps={{
          sx: { background: sidebarBg, boxShadow: theme.sidebar.boxShadow }
        }}
      >
        <SidebarWrapper sx={{ background: sidebarBg, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <SidebarContent />
        </SidebarWrapper>
      </Drawer>
    </>
  );
}

export default Sidebar;
