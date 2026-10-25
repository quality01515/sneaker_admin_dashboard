export type Volumes = {
  totalVolume: number | null;
  buyVolume: number | null;
  sellVolume: number | null;
  snipeVolume: number | null;
};

export interface Overview {
    trade_total: number,
    trade_completed_at: number,
    trade_pending: number,
    trade_expired: number,
    trade_failed: number,
    withdraw_completed_at: number,
    deposit_completed_at: number,
    trade_total_48h: number,
    trade_completed_at_48h: number,
    trade_pending_48h: number,
    trade_expired_48h: number,
    trade_failed_48h: number,
    deposit_withdraw_total_48h: number,
    deposit_withdraw_completed_at_48h: number,
    deposit_withdraw_pending_48h: number,
    deposit_withdraw_expired_48h: number,
    deposit_withdraw_failed_48h: number,
}

export interface Transaction {
    user_address: String,
    tx_id: String,
    created_at: String,
    completed_at: String,
    team_name: String,
    status: String,
    sol_delta: String,
    token_delta: String,
    action_type: String,
    jito_bundle_id: String,
    decimals: number,
    token_symbol?: string,
    token_mint?: string,
}