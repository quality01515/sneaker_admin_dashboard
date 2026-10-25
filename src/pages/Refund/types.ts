export interface Refund {
  user_address: string;
  token_address: string;
  tx_id: string;
  created_at: string;
  amount: number;
  ledger_action_id: number;
  decimals: number;
  status: string;
  refund_tx_id: string;
}

export interface RefundResponse {
  data: Refund[],
  page: number,
  per_page: number,
  has_more: boolean,
}

export interface RefundOverview {
  total: number;
  refunded: number;
  blocked: number;
  in_progress: number;
}

export interface ConfirmAndCommitOptions {
  signature: string;
  recentBlockhash?: string;
  blocked_tx_id: string;
  refund_tx_id: string;
}

export interface ConfirmResult {
  confirmed: boolean;
  expired: boolean;
  pending: boolean;
}

export interface ConfirmAndCommitResult {
  success: boolean;
  message?: string;
}
