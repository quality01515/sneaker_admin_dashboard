import { useContext } from 'react';
import { useSelector } from 'react-redux';
import { useFocusedMode } from 'src/contexts/FocusedModeContext';
import { NavLink as RouterLink } from 'react-router-dom';
import {
  Button,
  Divider,
  List,
  ListItem,
  ListSubheader,
  alpha,
} from '@mui/material';

import BarChartIcon from '@mui/icons-material/BarChart';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import BuildIcon from '@mui/icons-material/Build';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import ForumIcon from '@mui/icons-material/Forum';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import Groups2Icon from '@mui/icons-material/Groups2';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

import { SidebarContext } from 'src/contexts/SidebarContext';
import { MenuWrapper, SubMenuWrapper } from '../StyledWrapper';
import { RootState } from 'src/store';
import { ADMIN_FLAG } from 'src/config';

function SidebarMenu() {
  const { closeSidebar } = useContext(SidebarContext);
  const { is_super_admin } = useSelector((state: RootState) => state.admin);
  const isSuperAdmin = is_super_admin || localStorage.getItem(ADMIN_FLAG) === '1';
  const { focused } = useFocusedMode();

  return (
    <MenuWrapper>
      {/* ── MONITOR ────────────────────────────────── */}
      <List
        component="div"
        subheader={
          <ListSubheader component="div" disableSticky>Monitor</ListSubheader>
        }
      >
        <SubMenuWrapper>
          <List component="div">
            {!focused && (
              <ListItem component="div">
                <Button disableRipple component={RouterLink} onClick={closeSidebar} to="/analyze" startIcon={<BarChartIcon />}>
                  Analyze
                </Button>
              </ListItem>
            )}

            <ListItem component="div">
              <Button disableRipple component={RouterLink} onClick={closeSidebar} to="/monitor" startIcon={<MonitorHeartIcon />}>
                Diagnostics
              </Button>
            </ListItem>

            <ListItem component="div">
              <Button disableRipple component={RouterLink} onClick={closeSidebar} to="/utils" startIcon={<BuildIcon />}>
                Utilities
              </Button>
            </ListItem>
          </List>
        </SubMenuWrapper>
      </List>

      <Divider sx={{ mx: 2, my: 0.5 }} />

      {/* ── EVENTS ─────────────────────────────────── */}
      <List
        component="div"
        subheader={
          <ListSubheader component="div" disableSticky>Events</ListSubheader>
        }
      >
        <SubMenuWrapper>
          <List component="div">
            <ListItem component="div">
              <Button disableRipple component={RouterLink} onClick={closeSidebar} to="/events" startIcon={<EventNoteIcon />}>
                Cron Events
              </Button>
            </ListItem>

            <ListItem component="div">
              <Button disableRipple component={RouterLink} onClick={closeSidebar} to="/missed_deposits" startIcon={<ReportProblemIcon />}>
                Missed Deposits
              </Button>
            </ListItem>
          </List>
        </SubMenuWrapper>
      </List>

      {isSuperAdmin && (
        <>
          <Divider sx={{ mx: 2, my: 0.5 }} />
          <List
            component="div"
            subheader={
              <ListSubheader component="div" disableSticky>Reconciliation</ListSubheader>
            }
          >
            <SubMenuWrapper>
              <List component="div">
                <ListItem component="div">
                  <Button disableRipple component={RouterLink} onClick={closeSidebar} to="/reconciliation" startIcon={<FactCheckIcon />}>
                    SOL Balances
                  </Button>
                </ListItem>
              </List>
            </SubMenuWrapper>
          </List>
        </>
      )}

      <Divider sx={{ mx: 2, my: 0.5 }} />

      {/* ── PROTOCOL ───────────────────────────────── */}
      <List
        component="div"
        subheader={
          <ListSubheader component="div" disableSticky>Protocol</ListSubheader>
        }
      >
        <SubMenuWrapper>
          <List component="div">
            {!focused && (
              <ListItem component="div">
                <Button disableRipple component={RouterLink} onClick={closeSidebar} to="/transactions" startIcon={<CurrencyExchangeIcon />}>
                  Transactions
                </Button>
              </ListItem>
            )}

            <ListItem component="div">
              <Button disableRipple component={RouterLink} onClick={closeSidebar} to="/screening" startIcon={<FilterAltIcon />}>
                Screening
              </Button>
            </ListItem>
          </List>
        </SubMenuWrapper>
      </List>

      {!focused && (
        <>
          <Divider sx={{ mx: 2, my: 0.5 }} />

          {/* ── PLATFORM ───────────────────────────────── */}
          <List
            component="div"
            subheader={
              <ListSubheader component="div" disableSticky>Platform</ListSubheader>
            }
          >
            <SubMenuWrapper>
              <List component="div">
                <ListItem component="div">
                  <Button disableRipple component={RouterLink} onClick={closeSidebar} to="/silent_fees" startIcon={<WorkspacePremiumIcon />}>
                    Silent Rewards
                  </Button>
                </ListItem>
                <ListItem component="div">
                  <Button disableRipple component={RouterLink} onClick={closeSidebar} to="/refferal_fees" startIcon={<ForumIcon />}>
                    Referral Fees
                  </Button>
                </ListItem>
              </List>
            </SubMenuWrapper>
          </List>
        </>
      )}

      {/* ── CORE (super admin only) ─────────────────── */}
      {isSuperAdmin && (
        <>
          <Divider sx={{ mx: 2, my: 0.5 }} />
          <List
            component="div"
            subheader={
              <ListSubheader component="div" disableSticky>Core</ListSubheader>
            }
          >
            <SubMenuWrapper>
              <List component="div">
                {!focused && (
                  <ListItem component="div">
                    <Button disableRipple component={RouterLink} onClick={closeSidebar} to="/teams" startIcon={<Groups2Icon />}>
                      Teams
                    </Button>
                  </ListItem>
                )}
                <ListItem component="div">
                  <Button disableRipple component={RouterLink} onClick={closeSidebar} to="/wallets" startIcon={<AccountBalanceWalletIcon />}>
                    Accounts
                  </Button>
                </ListItem>
                {!focused && (
                  <ListItem component="div">
                    <Button disableRipple component={RouterLink} onClick={closeSidebar} to="/admins" startIcon={<AdminPanelSettingsIcon />}>
                      Members
                    </Button>
                  </ListItem>
                )}
              </List>
            </SubMenuWrapper>
          </List>
        </>
      )}
    </MenuWrapper>
  );
}

export default SidebarMenu;
