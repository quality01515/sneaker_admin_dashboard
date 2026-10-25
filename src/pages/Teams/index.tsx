import { Container, Box, Button, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import axios from 'axios';
import LoadingOverlay from 'react-loading-overlay-ts';
import { toast } from 'react-toastify';
import { useWallet } from '@solana/wallet-adapter-react';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import { getSignedMessageByWallet, SignatureExpiredError, handleSessionExpired } from 'src/utils';
import { useNavigate } from 'react-router-dom';
import { ADMIN_ADDRESS } from 'src/config';
import { TeamsTable, type Team } from './TeamsTable';
import { AddTeamDialog } from './AddTeamDialog';
import { EditTeamDialog } from './EditTeamDialog';
import { fetchTeamsList } from './teamApi';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;
const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

const Teams = () => {
  const navigate = useNavigate();
  const { signMessage } = useWallet();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [createdTeamApiKey, setCreatedTeamApiKey] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const fetchTeams = async () => {
    setLoading(true);
    setError(null);
    try {
      const teams = await fetchTeamsList(signMessage || undefined);
      setTeams(teams);
    } catch (err: unknown) {
      console.error('Failed to fetch teams:', err);
      if (err instanceof SignatureExpiredError) {
        handleSessionExpired(navigate);
        return;
      }
      setError(
        err && typeof err === 'object' && 'message' in err
          ? String((err as Error).message)
          : 'Failed to load teams'
      );
      setTeams([]);
      toast.error('Failed to fetch teams', {

        autoClose: 1500,
      });
    } finally {
      setLoading(false);
    }
  };

  const addTeam = async (team: Omit<Team, 'id'>) => {
    setLoading(true);
    try {
      const timestamp = new Date().getTime();
      const message = `write:super_admin/teams/generate_team:${team.name}:${timestamp}`;
      const super_admin_signature = await getSignedMessageByWallet(
        signMessage!,
        message
      );

      const response = await axios.post(
        `${API_BASE}/super_admin/teams/generate_team`,
        {
          super_admin_address: localStorage.getItem(ADMIN_ADDRESS),
          timestamp,
          super_admin_signature,
          name: team.name,
          fee_bps: team.fee_bps,
          fee_address: team.fee_address || null,
          silent_reward_token_bps: team.silent_reward_token_bps,
          silent_reward_sol_bps: team.silent_reward_sol_bps,
          is_referral_fee_enabled: team.is_referral_fee_enabled,
          fee_share_daily_enabled: team.fee_share_daily_enabled ?? null,
          fee_share_to_platform_percentage: team.fee_share_to_platform_percentage ?? null,
          fee_share_to_platform_address: team.fee_share_to_platform_address || null,
          fee_share_to_vanish_address: team.fee_share_to_vanish_address || null,
          rate_limit_per_second: team.rate_limit_per_second,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      if (
        response.status === 200 ||
        response.status === 204 ||
        response.status === 201
      ) {
        const newTeam: Team = {
          id: response.data.id,
          name: response.data.name ?? team.name,
          fee_bps: response.data.fee_bps ?? team.fee_bps,
          fee_address: response.data.fee_address ?? team.fee_address,
          silent_reward_token_bps:
            response.data.silent_reward_token_bps ??
            team.silent_reward_token_bps,
          silent_reward_sol_bps:
            response.data.silent_reward_sol_bps ?? team.silent_reward_sol_bps,
          is_referral_fee_enabled:
            response.data.is_referral_fee_enabled ??
            team.is_referral_fee_enabled,
          fee_share_daily_enabled:
            response.data.fee_share_daily_enabled ?? team.fee_share_daily_enabled ?? null,
          fee_share_to_platform_percentage:
            response.data.fee_share_to_platform_percentage ?? team.fee_share_to_platform_percentage ?? null,
          fee_share_to_platform_address:
            response.data.fee_share_to_platform_address ?? team.fee_share_to_platform_address ?? null,
          fee_share_to_vanish_address:
            response.data.fee_share_to_vanish_address ?? team.fee_share_to_vanish_address ?? null,
          rate_limit_per_second:
            response.data.rate_limit_per_second ?? team.rate_limit_per_second,
        };
        setTeams([...teams, newTeam]);
        const apiKey = response.data.api_key ?? null;
        setCreatedTeamApiKey(apiKey);
        if (!apiKey) setAddDialogOpen(false);
        toast.success('Team added successfully', {

          autoClose: 1500,
        });
      } else {
        toast.error(response.data?.message ?? 'Failed to add team', {

          autoClose: 1500,
        });
      }
    } catch (err: unknown) {
      console.error('Error adding team:', err);
      toast.error(
        err && typeof err === 'object' && 'message' in err
          ? String((err as Error).message)
          : 'Failed to add team',
        { autoClose: 1500 }
      );
    } finally {
      setLoading(false);
    }
  };

  const updateTeam = async (team: Team) => {
    if (!editingTeam) return;
    setLoading(true);
    try {
      const timestamp = new Date().getTime();
      const message = `write:super_admin/teams/update_team:${team.name}:${timestamp}`;
      const super_admin_signature = await getSignedMessageByWallet(
        signMessage!,
        message
      );

      const response = await axios.post(
        `${API_BASE}/super_admin/teams/update_team`,
        {
          super_admin_address: localStorage.getItem(ADMIN_ADDRESS),
          timestamp,
          super_admin_signature,
          id: team.id,
          name: team.name,
          fee_bps: team.fee_bps,
          fee_address: team.fee_address || null,
          silent_reward_token_bps: team.silent_reward_token_bps,
          silent_reward_sol_bps: team.silent_reward_sol_bps,
          is_referral_fee_enabled: team.is_referral_fee_enabled,
          fee_share_daily_enabled: team.fee_share_daily_enabled ?? null,
          fee_share_to_platform_percentage: team.fee_share_to_platform_percentage ?? null,
          fee_share_to_platform_address: team.fee_share_to_platform_address || null,
          fee_share_to_vanish_address: team.fee_share_to_vanish_address || null,
          rate_limit_per_second: team.rate_limit_per_second,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      if (
        response.status === 200 ||
        response.status === 204 ||
        response.status === 201
      ) {
        setTeams(
          teams.map((t) => (t.id === team.id ? { ...team } : t))
        );
        setEditDialogOpen(false);
        setEditingTeam(null);
        toast.success('Team updated successfully', {

          autoClose: 1500,
        });
      } else {
        toast.error(response.data?.message ?? 'Failed to update team', {

          autoClose: 1500,
        });
      }
    } catch (err: unknown) {
      console.error('Error updating team:', err);
      toast.error(
        err && typeof err === 'object' && 'message' in err
          ? String((err as Error).message)
          : 'Failed to update team',
        { autoClose: 1500 }
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteTeam = async (name: string) => {
    setLoading(true);
    try {
      const timestamp = new Date().getTime();
      const message = `write:super_admin/teams/remove_team:${name}:${timestamp}`;
      const super_admin_signature = await getSignedMessageByWallet(
        signMessage!,
        message
      );

      const response = await axios.post(
        `${API_BASE}/super_admin/teams/remove_team`,
        {
          super_admin_address: localStorage.getItem(ADMIN_ADDRESS),
          timestamp,
          super_admin_signature,
          name: name,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      if (response.status === 200 || response.status === 204) {
        setTeams(teams.filter((t) => t.name !== name));
        toast.success('Team deleted successfully', {

          autoClose: 1500,
        });
      } else {
        toast.error(response.data?.message ?? 'Failed to delete team', {

          autoClose: 1500,
        });
      }
    } catch (err: unknown) {
      console.error('Error deleting team:', err);
      toast.error(
        err && typeof err === 'object' && 'message' in err
          ? String((err as Error).message)
          : 'Failed to delete team',
        { autoClose: 1500 }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (team: Team) => {
    setEditingTeam(team);
    setEditDialogOpen(true);
  };

  const handleCloseEdit = () => {
    setEditDialogOpen(false);
    setEditingTeam(null);
  };

  useEffect(() => {
    fetchTeams();
  }, [signMessage]);

  const referralEnabledCount = teams.filter((t) => t.is_referral_fee_enabled).length;
  const srEnabledCount = teams.filter((t) => (t.silent_reward_token_bps ?? 0) > 0 || (t.silent_reward_sol_bps ?? 0) > 0).length;
  const avgFeeBps = teams.length > 0
    ? Math.round(teams.reduce((sum, t) => sum + (t.fee_bps ?? 0), 0) / teams.length)
    : 0;

  return (
    <main>
      <Container maxWidth="xl">
        <LoadingOverlay
          active={loading}
          spinner
          styles={{
            wrapper: (base) => ({ ...base, width: '100%' }),
          }}
        >
          <Box sx={{ pt: 1 }}>
            {/* Page header row */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.88)', mb: 0.25 }}>Teams</Typography>
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>Manage platform teams and fee configurations</Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<PersonAddAltIcon />}
                onClick={() => setAddDialogOpen(true)}
              >
                Add Team
              </Button>
            </Box>

            {/* Stat tiles */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1.5, mb: 2 }}>
              {[
                { label: 'Total Teams', value: teams.length },
                { label: 'Referral Enabled', value: referralEnabledCount },
                { label: 'Rewards Enabled', value: srEnabledCount },
                { label: 'Avg Fee', value: `${avgFeeBps} bps` },
              ].map(({ label, value: val }) => (
                <Box key={label} sx={{ px: 2, py: 1.5, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', mb: 0.5 }}>
                    {label}
                  </Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.88)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                    {val}
                  </Typography>
                </Box>
              ))}
            </Box>

            {error ? (
              <Box sx={{ p: 4, textAlign: 'center', color: 'error.main' }}>
                {error}
              </Box>
            ) : (
              <TeamsTable
                teams={teams}
                search={search}
                onSearchChange={setSearch}
                onEdit={handleEditClick}
                onDelete={deleteTeam}
              />
            )}
          </Box>
        </LoadingOverlay>
      </Container>

      <AddTeamDialog
        open={addDialogOpen}
        onClose={() => {
          setAddDialogOpen(false);
          setCreatedTeamApiKey(null);
        }}
        onSubmit={addTeam}
        apiKey={createdTeamApiKey}
      />

      {editingTeam && (
        <EditTeamDialog
          open={editDialogOpen}
          team={editingTeam}
          onClose={handleCloseEdit}
          onSubmit={updateTeam}
        />
      )}
    </main>
  );
};

export default Teams;
