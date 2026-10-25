export type Volumes = {
  totalVolume: number | null;
  buyVolume: number | null;
  sellVolume: number | null;
  snipeVolume: number | null;
};

export interface AdminTxBundle {
    tx_id: string,
    created_at: string,
    completed_at: string,
    action_type: string,
    status: string,
    source_token_address: string,
    target_token_address: string,
    sol_delta: number,
    source_token_delta: number,
    target_token_delta: number,
    source_token_price: number,
    target_token_price: number,
    decimals_source: number,
    decimals_target: number,
}

export interface BalanceRecord {
    symbol: string,
    token_address: string,
    balance: string,
    decimals: number
}

export interface Overview {
    user_address: string,
    joined_at: string,
    base_referral_cut: number,
    point_multiplier: number,
    referred_by: string,
    silent_rewards_claimed: number,
    silent_rewards_unclaimed: number,
    total_points: number,
    points_from_ref: number,
    current_fee_received: number,
    referral_fee_received: number,
    referral_fee_next_payout: number,
    direct_referral_volume: number,
    indirect_referral_volume: number,
    direct_referral_count: number,
    indirect_referral_count: number,
    balances: BalanceRecord[],
    volume_1d: string,
    volume_7d: string,
    volume_total: string,
}

export interface TxBundleResponse {
    data: AdminTxBundle[],
    page: number,
    per_page: number,
    has_more: boolean,
}

export interface AdminUserBalanceChange {
    id: number,
    ledger_action_id: number,
    bank_id: number,
    token_address: string,
    amount: string,
    purpose: string,
    phase: string,
    created_at: string | null,
}

export interface UserBalanceChangesResponse {
    data: AdminUserBalanceChange[],
    page: number,
    per_page: number,
    has_more: boolean,
}
