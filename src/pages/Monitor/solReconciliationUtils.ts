const LAMPORTS_PER_SOL = BigInt(1_000_000_000);
const ZERO_LAMPORTS = BigInt(0);
const MIN_RECONCILIATION_LAMPORTS = BigInt(1_000_000_000);

export type SolReconciliationStatus = 'matched' | 'actionable' | 'below_threshold' | 'rpc_error';

export type MakeBalanceAction = 'sweep_to_authority' | 'fund_from_authority';

export type ApiBankItem = {
  bank_id: number;
  bank_no: number;
  bank_pda: string;
  database_balance_lamports: string;
  onchain_balance_lamports: string | null;
  rpc_error: string | null;
};

export type EnrichedBankItem = ApiBankItem & {
  differenceLamports: string | null;
  differenceSol: string | null;
  transferLamports: string | null;
  status: SolReconciliationStatus;
  canSweepToAuthority: boolean;
  canFundFromAuthority: boolean;
  makeBalanceAction: MakeBalanceAction | null;
};

export type SolReconciliationCheckResponse = {
  data: ApiBankItem[];
};

export type SolReconciliationMakeBalanceResponse = {
  bank_id: number;
  tx_id: string;
  bank: ApiBankItem;
};

export type SolReconciliationSummary = {
  checkedBanks: number;
  matchedBanks: number;
  mismatchBanks: number;
  actionableBanks: number;
  rpcErrors: number;
  totalDifferenceLamports: string;
};

const absBigInt = (value: bigint): bigint => (value < ZERO_LAMPORTS ? -value : value);

export const formatLamports = (lamports: string | null | undefined): string => {
  const raw = lamports?.trim() ?? '';
  if (!raw) return '—';
  try {
    const negative = raw.startsWith('-');
    const abs = BigInt(negative ? raw.slice(1) : raw);
    const whole = abs / LAMPORTS_PER_SOL;
    const frac = abs % LAMPORTS_PER_SOL;
    let fracStr = frac.toString().padStart(9, '0').replace(/0+$/, '');
    const sign = negative && abs !== ZERO_LAMPORTS ? '-' : '';
    return fracStr ? `${sign}${whole}.${fracStr}` : `${sign}${whole}`;
  } catch {
    return lamports ?? '—';
  }
};

/** Convert a SOL decimal string (e.g. "1.5") to lamports string. Returns null if invalid. */
export const solToLamports = (solAmount: string): string | null => {
  const raw = solAmount.trim();
  if (!raw || raw.startsWith('-')) return null;
  if (!/^\d+(\.\d+)?$/.test(raw)) return null;

  const [wholePart, fracPart = ''] = raw.split('.');
  if (fracPart.length > 9) return null;

  try {
    const whole = BigInt(wholePart || '0');
    const fracPadded = (fracPart + '000000000').slice(0, 9);
    const frac = BigInt(fracPadded);
    const lamports = whole * LAMPORTS_PER_SOL + frac;
    if (lamports <= ZERO_LAMPORTS) return null;
    return lamports.toString();
  } catch {
    return null;
  }
};

export function enrichBank(row: ApiBankItem): EnrichedBankItem {
  if (row.rpc_error || row.onchain_balance_lamports == null) {
    return {
      ...row,
      differenceLamports: null,
      differenceSol: null,
      transferLamports: null,
      status: 'rpc_error',
      canSweepToAuthority: false,
      canFundFromAuthority: false,
      makeBalanceAction: null,
    };
  }

  const db = BigInt(row.database_balance_lamports);
  const onchain = BigInt(row.onchain_balance_lamports);
  const diff = onchain - db;
  const absDiff = absBigInt(diff);

  if (diff === ZERO_LAMPORTS) {
    return {
      ...row,
      differenceLamports: '0',
      differenceSol: formatLamports('0'),
      transferLamports: '0',
      status: 'matched',
      canSweepToAuthority: false,
      canFundFromAuthority: false,
      makeBalanceAction: null,
    };
  }

  const makeBalanceAction: MakeBalanceAction = diff > ZERO_LAMPORTS ? 'sweep_to_authority' : 'fund_from_authority';
  const canSweepToAuthority = diff > ZERO_LAMPORTS && absDiff >= MIN_RECONCILIATION_LAMPORTS;
  const canFundFromAuthority = diff < ZERO_LAMPORTS;
  const canReconcile = canSweepToAuthority || canFundFromAuthority;

  return {
    ...row,
    differenceLamports: diff.toString(),
    differenceSol: formatLamports(diff.toString()),
    transferLamports: absDiff.toString(),
    status: canReconcile ? 'actionable' : 'below_threshold',
    canSweepToAuthority,
    canFundFromAuthority,
    makeBalanceAction: canReconcile ? makeBalanceAction : null,
  };
}

export function enrichBanks(rows: ApiBankItem[]): EnrichedBankItem[] {
  return rows.map(enrichBank);
}

export function computeSummary(rows: EnrichedBankItem[]): SolReconciliationSummary {
  let totalDiff = ZERO_LAMPORTS;
  let matchedBanks = 0;
  let actionableBanks = 0;
  let rpcErrors = 0;

  for (const row of rows) {
    if (row.status === 'matched') matchedBanks++;
    if (row.status === 'actionable') actionableBanks++;
    if (row.status === 'rpc_error') rpcErrors++;
    if (row.differenceLamports != null) {
      totalDiff += BigInt(row.differenceLamports);
    }
  }

  return {
    checkedBanks: rows.length,
    matchedBanks,
    mismatchBanks: rows.length - matchedBanks,
    actionableBanks,
    rpcErrors,
    totalDifferenceLamports: totalDiff.toString(),
  };
}

export const getTotalDifferenceColor = (lamports: string): string => {
  try {
    const raw = lamports.trim();
    const abs = absBigInt(BigInt(raw.startsWith('-') ? raw.slice(1) : raw));
    if (abs === ZERO_LAMPORTS) return '#22c55e';
    if (abs >= LAMPORTS_PER_SOL) return '#f87171';
    return '#fbbf24';
  } catch {
    return 'rgba(255,255,255,0.88)';
  }
};

export const getDifferenceColor = (
  status: SolReconciliationStatus,
  differenceLamports: string | null
): string => {
  if (status === 'rpc_error' || status === 'actionable') return '#f87171';
  if (differenceLamports != null) {
    try {
      if (BigInt(differenceLamports) === ZERO_LAMPORTS) return '#22c55e';
    } catch {
      // fall through
    }
  }
  if (status === 'below_threshold') return '#fbbf24';
  if (status === 'matched') return '#22c55e';
  return 'rgba(255,255,255,0.88)';
};

export const statusChipStyles: Record<
  SolReconciliationStatus,
  { color: string; bg: string; border: string; label: string }
> = {
  matched: {
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.10)',
    border: 'rgba(34,197,94,0.25)',
    label: 'Matched',
  },
  actionable: {
    color: '#f87171',
    bg: 'rgba(248,113,113,0.10)',
    border: 'rgba(248,113,113,0.25)',
    label: 'Actionable',
  },
  below_threshold: {
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.10)',
    border: 'rgba(251,191,36,0.25)',
    label: 'Below threshold',
  },
  rpc_error: {
    color: '#f87171',
    bg: 'rgba(248,113,113,0.10)',
    border: 'rgba(248,113,113,0.25)',
    label: 'RPC error',
  },
};
