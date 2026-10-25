export interface TopUserVolume {
    user_address: String,
    volume: String,
}

export interface TopUserBusy {
    user_address: String,
    count: number,
}

export interface TopTokenVolume {
    token_address: String,
    volume: String,
}

export interface TopTokenBusy {
    token_address: String,
    count: number,
}

export interface VolumeByTeam24 {
    day?: string,
    team?: string,
    team_name?: string,
    /** Legacy: lamports when volume_sol is absent */
    volume: string,
    volume_sol?: string,
    volume_usd?: string,
    trade_count?: string,
    active_user_count?: string | number,
}

export interface TeamVolumeTotal {
    team: string;
    /** Legacy: lamports when volume_sol is absent */
    volume: string;
    volume_sol?: string;
    volume_usd?: string;
    average_daily_volume?: string;
    average_daily_volume_usd?: string;
    trade_count?: string;
    active_user_count?: string | number;
}

export interface TopTokenVolumeUsd1h {
    token_address: string;
    ticker: string;
    volume_usd: string;
}

export interface HourlyVolume {
    volume: string;
    volume_usd: string;
    trade_count: string | number;
    active_user_count: string | number;
}

export interface AnalyzeTeamVolumeResponse {
    teams_volume?: VolumeByTeam24[];
    teams?: VolumeByTeam24[];
    team_totals?: TeamVolumeTotal[];
    hourly_volume?: HourlyVolume;
    top_tokens_1h_volume_usd?: TopTokenVolumeUsd1h[];
    lifetime_start_at?: string | null;
    missed_deposits_count?: number;
}

export interface AnalyzeItem {
    top_user_24h_volume: TopUserVolume,
    top_user_24h_profiter: TopUserVolume,
    top_user_24h_busy: TopUserBusy,
    top_user_24h_growth: TopUserVolume,
    top_tokens_1h_volume: TopTokenVolume[],
    top_tokens_1h_count: TopTokenBusy[]
}