export interface EllipticClusterEntity {
  name?: string;
  category?: string;
  category_id?: string;
  actor_id?: number;
  entity_id?: string;
  is_primary_entity?: boolean;
  is_vasp?: boolean;
  is_after_sanction_date?: boolean;
}

export interface EllipticContributionEntity {
  name?: string;
  category?: string;
  category_id?: string;
  is_primary_entity?: boolean;
  is_vasp?: boolean;
}

export interface EllipticContribution {
  contribution_percentage?: number;
  contribution_value?: { usd?: number; native?: number; native_major?: number };
  counterparty_percentage?: number;
  counterparty_value?: { usd?: number };
  entities?: EllipticContributionEntity[];
  is_screened_address?: boolean;
  indirect_percentage?: number;
  indirect_value?: { usd?: number };
  min_number_of_hops?: number;
}

export interface EllipticSubContribution {
  entity?: string;
  entity_id?: string;
  category?: string;
  category_id?: string;
  is_screened_address?: boolean;
  contribution_percentage?: number;
  contribution_value?: { usd?: number; native?: number; native_major?: number };
  indirect_percentage?: number;
  indirect_value?: { usd?: number };
  min_number_of_hops?: number;
  risk_triggers?: {
    country?: string[];
    category?: string;
    category_id?: string;
    is_sanctioned?: boolean;
  };
}

export interface EllipticMatchedElement {
  category?: string;
  category_id?: string;
  contribution_percentage?: number;
  contribution_value?: { usd?: number; native?: number; native_major?: number };
  counterparty_percentage?: number;
  indirect_percentage?: number;
  contributions?: EllipticSubContribution[];
}

export interface EllipticEvaluationRule {
  rule_id?: string;
  rule_type?: string;
  risk_score?: number;
  rule_name?: string;
  matched_behaviors?: unknown[];
  matched_elements?: EllipticMatchedElement[];
}

export interface EllipticScreeningResult {
  id?: string;
  screening_id?: string;
  type?: string;
  risk_score?: number | null;
  process_status?: string;
  workflow_status?: string;
  asset_tier?: string;

  created_at?: string;
  updated_at?: string;
  analysed_at?: string;

  customer?: { id?: string | null; reference?: string };
  subject?: { asset?: string; hash?: string; type?: string; blockchain?: string };

  cluster_entities?: EllipticClusterEntity[];

  blockchain_info?: {
    cluster?: {
      inflow_value?: { usd?: number; native?: number; native_major?: number };
      outflow_value?: { usd?: number; native?: number; native_major?: number };
    };
  };

  risk_score_detail?: {
    source?: number;
    destination?: number;
  };

  contributions?: {
    source?: EllipticContribution[];
    destination?: EllipticContribution[];
  };

  evaluation_detail?: {
    source?: EllipticEvaluationRule[];
    destination?: EllipticEvaluationRule[];
  };

  triggered_rules?: unknown[];
  detected_behaviors?: unknown[];
  changes?: { risk_score_change?: number };

  error?: string | null;
}

async function screeningRequest(type: 'wallet' | 'transaction', hash: string): Promise<EllipticScreeningResult> {
  const response = await fetch('/api/screen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, hash }),
  });

  let data: Record<string, unknown>;
  try { data = await response.json(); } catch { data = {}; }

  if (!response.ok) {
    throw new Error((data.error as string) ?? `Integrity screening failed (${response.status})`);
  }

  return data as EllipticScreeningResult;
}

export async function screenWallet(address: string): Promise<EllipticScreeningResult> {
  return screeningRequest('wallet', address);
}

export function getRiskColor(score: number | null | undefined): string {
  if (score == null) return '#3DD68C';
  if (score >= 8) return '#F04E6A';
  if (score >= 5) return '#F97316';
  if (score >= 3) return '#F5A524';
  return '#3DD68C';
}

export function getRiskLabel(score: number | null | undefined): string {
  if (score == null) return 'Low';
  if (score >= 8) return 'Critical';
  if (score >= 5) return 'High';
  if (score >= 3) return 'Medium';
  return 'Low';
}

// Maps both snake_case internal keys and Elliptic display category names
const CATEGORY_COLOR_MAP: Array<[string, string]> = [
  ['sanction', '#F04E6A'],
  ['ofac', '#F04E6A'],
  ['terrorism', '#F04E6A'],
  ['darknet', '#F04E6A'],
  ['ransomware', '#F04E6A'],
  ['csam', '#F04E6A'],
  ['mixer', '#F97316'],
  ['fraud', '#F97316'],
  ['illegal', '#F97316'],
  ['scam', '#F97316'],
  ['p2p', '#F5A524'],
  ['gambling', '#F5A524'],
  ['high_risk', '#F5A524'],
  ['high risk', '#F5A524'],
  ['exchange', '#3DD68C'],
  ['mining', '#3DD68C'],
  ['defi', '#2DD4D1'],
];

export function getCategoryColor(cat: string): string {
  const lower = cat?.toLowerCase() ?? '';
  for (const [key, color] of CATEGORY_COLOR_MAP) {
    if (lower.includes(key)) return color;
  }
  return 'rgba(255,255,255,0.25)';
}
