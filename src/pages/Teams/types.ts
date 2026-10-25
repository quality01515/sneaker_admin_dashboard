export default interface Payout {
  user_address: string;
  tx: string;
  amount: number;
}

export default interface RefferalUser {
  user_address: string;
  total: string;
  paid_out: string;
  pending: string;
  next_payout: string;
}