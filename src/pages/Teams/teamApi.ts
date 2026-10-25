import axios from 'axios';
import { ADMIN_ADDRESS } from 'src/config';
import { getSignature } from 'src/utils';
import type { Team } from './TeamsTable';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;
const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

type SignMessage = ((message: Uint8Array) => Promise<Uint8Array>) | undefined;

export function normalizeTeams(data: unknown): Team[] {
  const rawTeams = Array.isArray(data)
    ? data
    : data &&
        typeof data === 'object' &&
        'teams' in data &&
        Array.isArray((data as { teams?: unknown }).teams)
      ? (data as { teams: unknown[] }).teams
      : [];

  return rawTeams.map((t) => {
    const team = t as Record<string, unknown>;
    return {
      ...team,
      fee_share_daily_enabled: team.fee_share_daily_enabled ?? null,
      fee_share_to_platform_percentage: team.fee_share_to_platform_percentage ?? null,
      fee_share_to_platform_address: team.fee_share_to_platform_address ?? null,
      fee_share_to_vanish_address: team.fee_share_to_vanish_address ?? null,
      rate_limit_per_second: team.rate_limit_per_second ?? 50,
    };
  }) as Team[];
}

export async function fetchTeamsList(signMessage: SignMessage): Promise<Team[]> {
  const { super_admin_signature, timestamp } = await getSignature(
    signMessage,
    'read'
  );

  const response = await axios.post(
    `${API_BASE}/super_admin/teams/get_teams`,
    {
      super_admin_address: localStorage.getItem(ADMIN_ADDRESS),
      timestamp,
      super_admin_signature,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
        'x-api-key': ADMIN_DASHBOARD_API_KEY,
      },
    }
  );

  return normalizeTeams(response.data);
}
