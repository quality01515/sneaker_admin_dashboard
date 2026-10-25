import { Box, Chip, Typography } from '@mui/material';
import type { EllipticContribution, EllipticScreeningResult } from 'src/utils/elliptic';
import { getCategoryColor, getRiskColor, getRiskLabel } from 'src/utils/elliptic';
import { RiskGauge } from './RiskGauge';

interface ScreeningResultProps {
  result: EllipticScreeningResult;
  subject: string;
  subjectType: 'wallet' | 'transaction';
}

function fmtUsd(n: number | null | undefined): string | null {
  if (n == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

function fmtDate(s: string | null | undefined): string | null {
  if (!s) return null;
  return new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', mb: 1 }}>
      {children}
    </Typography>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, py: 0.65, borderBottom: '1px solid rgba(255,255,255,0.04)', '&:last-child': { borderBottom: 'none' } }}>
      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{label}</Typography>
      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: mono ? 'monospace' : undefined, textAlign: 'right', wordBreak: 'break-all' }}>{value}</Typography>
    </Box>
  );
}

function ExposureBar({ items, score, label }: { items: EllipticContribution[]; score?: number; label: string }) {
  if (!items.length) return null;

  // Build category segments from contributions
  const segments: Array<{ cat: string; pct: number; color: string; usd: number }> = [];
  for (const c of items) {
    const pct = c.contribution_percentage ?? 0;
    const usd = c.contribution_value?.usd ?? 0;
    const cat = c.entities?.[0]?.category ?? 'Unknown';
    const color = getCategoryColor(cat);
    const existing = segments.find((s) => s.cat === cat);
    if (existing) { existing.pct += pct; existing.usd += usd; }
    else segments.push({ cat, pct, color, usd });
  }
  segments.sort((a, b) => b.pct - a.pct);
  const allocated = segments.reduce((s, x) => s + x.pct, 0);
  const unallocated = Math.max(0, 100 - allocated);

  return (
    <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 1.5, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 1.5, pt: 1.5, pb: 1, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            {label}
          </Typography>
          {score != null && (
            <Box sx={{ px: 0.75, py: 0.2, borderRadius: 0.75, bgcolor: `${getRiskColor(score)}18`, border: `1px solid ${getRiskColor(score)}35` }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: getRiskColor(score) }}>{score.toFixed(1)} risk</Typography>
            </Box>
          )}
        </Box>

        {/* Stacked bar */}
        <Box sx={{ height: 32, borderRadius: 1.5, overflow: 'hidden', display: 'flex', bgcolor: 'rgba(255,255,255,0.05)', mb: 1.25, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)' }}>
          {segments.map(({ cat, pct, color }) => (
            <Box key={cat} title={`${cat}: ${pct.toFixed(1)}%`}
              sx={{
                height: '100%', width: `${Math.min(pct, 100)}%`,
                background: `linear-gradient(180deg, ${color}ee 0%, ${color}aa 100%)`,
                boxShadow: `inset 0 1px 0 ${color}55`,
                borderRight: '1px solid rgba(0,0,0,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                transition: 'width 0.5s ease',
                '&:hover': { filter: 'brightness(1.15)' },
              }}
            >
              {pct >= 12 && (
                <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'rgba(0,0,0,0.7)', userSelect: 'none' }}>
                  {pct.toFixed(0)}%
                </Typography>
              )}
            </Box>
          ))}
          {unallocated > 0.5 && <Box sx={{ height: '100%', flex: 1, bgcolor: 'rgba(255,255,255,0.03)' }} />}
        </Box>

        {/* Legend */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {segments.map(({ cat, pct, color, usd }) => (
            <Box key={cat} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.4, borderRadius: 1, bgcolor: `${color}12`, border: `1px solid ${color}30` }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color, boxShadow: `0 0 5px ${color}`, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.65)', textTransform: 'capitalize' }}>{cat}</Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{pct.toFixed(1)}%</Typography>
              {usd > 0 && <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums' }}>{fmtUsd(usd)}</Typography>}
            </Box>
          ))}
          {unallocated > 0.5 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.4, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
              <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Other</Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' }}>{unallocated.toFixed(1)}%</Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Contribution rows */}
      {items.map((c, i) => {
        const cat = c.entities?.[0]?.category ?? 'Unknown';
        const color = getCategoryColor(cat);
        const pct = c.contribution_percentage ?? 0;
        const usd = c.contribution_value?.usd;
        const entityName = c.entities?.[0]?.name ?? cat;
        return (
          <Box key={i} sx={{ px: 1.5, py: 1, borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', bgcolor: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entityName}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                {usd != null && usd > 0 && <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontVariantNumeric: 'tabular-nums' }}>{fmtUsd(usd)}</Typography>}
                <Typography sx={{ fontSize: 13, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', minWidth: 44, textAlign: 'right' }}>{pct.toFixed(1)}%</Typography>
              </Box>
            </Box>
            {/* Mini bar */}
            <Box sx={{ height: 3, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.05)', overflow: 'hidden', mb: 0.5 }}>
              <Box sx={{ height: '100%', width: `${Math.min(pct, 100)}%`, bgcolor: color, borderRadius: 1 }} />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Chip label={cat} size="small" sx={{ height: 16, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', bgcolor: `${color}15`, color, border: `1px solid ${color}35` }} />
              {c.is_screened_address && (
                <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Direct exposure</Typography>
              )}
              {(c.indirect_percentage ?? 0) > 0 && (
                <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' }}>
                  Indirect: {c.indirect_percentage?.toFixed(1)}% ({fmtUsd(c.indirect_value?.usd)})
                </Typography>
              )}
              {c.min_number_of_hops != null && c.min_number_of_hops > 0 && (
                <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                  {c.min_number_of_hops} hop{c.min_number_of_hops !== 1 ? 's' : ''}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

export function ScreeningResult({ result, subject, subjectType }: ScreeningResultProps) {
  const entities = result.cluster_entities ?? [];
  const primaryEntity = entities.find((e) => e.is_primary_entity) ?? entities[0];
  const srcContribs = result.contributions?.source ?? [];
  const dstContribs = result.contributions?.destination ?? [];
  const srcRules = result.evaluation_detail?.source ?? [];
  const dstRules = result.evaluation_detail?.destination ?? [];
  const allRules = [...srcRules, ...dstRules].filter((r, i, arr) => arr.findIndex((x) => x.rule_id === r.rule_id) === i);
  const riskColor = getRiskColor(result.risk_score);
  const riskLabel = getRiskLabel(result.risk_score);
  const screenedTime = result.analysed_at ?? result.updated_at ?? result.created_at;
  const inflow = result.blockchain_info?.cluster?.inflow_value?.usd;
  const outflow = result.blockchain_info?.cluster?.outflow_value?.usd;
  const hasContribs = srcContribs.length > 0 || dstContribs.length > 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

      {/* ── Header ── */}
      <Box sx={{ p: 2.5, bgcolor: 'rgba(255,255,255,0.025)', borderRadius: 2, border: `1px solid ${riskColor}30` }}>
        <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start' }}>
          <RiskGauge score={result.risk_score} size={96} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ px: 1, py: 0.3, borderRadius: 1, bgcolor: `${riskColor}18`, border: `1px solid ${riskColor}35`, display: 'inline-block', mb: 0.75 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: riskColor }}>
                Vanish Integrity · Wallet
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.55)', mb: 1, wordBreak: 'break-all', lineHeight: 1.5 }}>
              {subject}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {result.risk_score_detail?.source != null && (
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  Source: <Box component="span" sx={{ color: getRiskColor(result.risk_score_detail.source), fontWeight: 700 }}>{result.risk_score_detail.source.toFixed(1)}</Box>
                </Typography>
              )}
              {result.risk_score_detail?.destination != null && (
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  Destination: <Box component="span" sx={{ color: getRiskColor(result.risk_score_detail.destination), fontWeight: 700 }}>{result.risk_score_detail.destination.toFixed(1)}</Box>
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
        {primaryEntity?.name && (
          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Primary Entity</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#F04E6A' }}>{primaryEntity.name}</Typography>
            {primaryEntity.category && (
              <Chip label={primaryEntity.category} size="small"
                sx={{ height: 18, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', bgcolor: `${getCategoryColor(primaryEntity.category)}18`, color: getCategoryColor(primaryEntity.category), border: `1px solid ${getCategoryColor(primaryEntity.category)}40` }}
              />
            )}
            {primaryEntity.is_after_sanction_date && (
              <Chip label="Post-sanction" size="small" sx={{ height: 18, fontSize: 9, fontWeight: 700, bgcolor: 'rgba(240,78,106,0.15)', color: '#F04E6A', border: '1px solid rgba(240,78,106,0.35)' }} />
            )}
          </Box>
        )}
      </Box>

      {/* ── Analysis Details ── */}
      <Box>
        <SectionLabel>Analysis Details</SectionLabel>
        <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 1.5, px: 1.5, py: 0.5 }}>
          {result.id && <MetaRow label="Analysis ID" value={result.id} mono />}
          {result.screening_id && <MetaRow label="Screening ID" value={result.screening_id} mono />}
          <MetaRow label="Subject" value={subject} mono />
          <MetaRow label="Type" value="Wallet Exposure" />
          <MetaRow label="Risk Score" value={result.risk_score != null ? `${result.risk_score.toFixed(2)} / 10 — ${riskLabel}` : `No score — ${riskLabel}`} />
          {result.process_status && <MetaRow label="Process Status" value={result.process_status} />}
          {result.workflow_status && <MetaRow label="Workflow Status" value={result.workflow_status} />}
          {result.asset_tier && <MetaRow label="Asset Tier" value={result.asset_tier} />}
          {screenedTime && <MetaRow label="Last Screened" value={fmtDate(screenedTime) ?? screenedTime} />}
          {result.created_at && result.created_at !== screenedTime && <MetaRow label="Created At" value={fmtDate(result.created_at) ?? result.created_at} />}
          {result.updated_at && result.updated_at !== screenedTime && <MetaRow label="Updated At" value={fmtDate(result.updated_at) ?? result.updated_at} />}
          {result.customer?.reference && <MetaRow label="Customer Ref" value={result.customer.reference} mono />}
          {result.changes?.risk_score_change != null && result.changes.risk_score_change !== 0 && (
            <MetaRow label="Score Change" value={`${result.changes.risk_score_change > 0 ? '+' : ''}${result.changes.risk_score_change}`} />
          )}
        </Box>
      </Box>

      {/* ── Triggered Rules ── */}
      {allRules.length > 0 && (
        <Box>
          <SectionLabel>Triggered Rules ({allRules.length})</SectionLabel>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {allRules.map((rule, i) => {
              const catColor = getCategoryColor(rule.matched_elements?.[0]?.category ?? '');
              return (
                <Box key={i} sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 1.5, overflow: 'hidden' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.25 }}>
                    <Box sx={{ width: 3, alignSelf: 'stretch', borderRadius: 1, bgcolor: catColor, flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{rule.rule_name ?? '—'}</Typography>
                        {rule.rule_id && <Typography sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)' }}>#{rule.rule_id}</Typography>}
                      </Box>
                      {rule.rule_type && <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', mt: 0.25 }}>{rule.rule_type}</Typography>}
                    </Box>
                    {rule.risk_score != null && (
                      <Box sx={{ textAlign: 'center', flexShrink: 0 }}>
                        <Typography sx={{ fontSize: 18, fontWeight: 800, color: getRiskColor(rule.risk_score), fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{rule.risk_score.toFixed(1)}</Typography>
                        <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>score</Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Matched elements */}
                  {(rule.matched_elements ?? []).map((el, j) => (
                    <Box key={j} sx={{ px: 1.5, pb: 1.25, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 1, mb: 0.75 }}>
                        {el.category && (
                          <Chip label={el.category} size="small"
                            sx={{ height: 18, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', bgcolor: `${getCategoryColor(el.category)}18`, color: getCategoryColor(el.category), border: `1px solid ${getCategoryColor(el.category)}40` }}
                          />
                        )}
                        {el.contribution_percentage != null && (
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: getCategoryColor(el.category ?? ''), fontVariantNumeric: 'tabular-nums' }}>
                            {el.contribution_percentage.toFixed(1)}% exposure
                          </Typography>
                        )}
                        {el.contribution_value?.usd != null && el.contribution_value.usd > 0 && (
                          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums' }}>{fmtUsd(el.contribution_value.usd)}</Typography>
                        )}
                      </Box>

                      {/* Sub-contributions (individual entities) */}
                      {(el.contributions ?? []).map((sc, k) => {
                        const scColor = getCategoryColor(sc.risk_triggers?.category ?? sc.category ?? '');
                        return (
                          <Box key={k} sx={{ ml: 1, pl: 1.25, borderLeft: `2px solid ${scColor}40`, mb: 0.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{sc.entity ?? '—'}</Typography>
                              <Typography sx={{ fontSize: 11, fontWeight: 700, color: scColor, fontVariantNumeric: 'tabular-nums' }}>
                                {sc.contribution_percentage?.toFixed(1)}%
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.25 }}>
                              {sc.contribution_value?.usd != null && sc.contribution_value.usd > 0 && (
                                <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums' }}>{fmtUsd(sc.contribution_value.usd)}</Typography>
                              )}
                              {sc.risk_triggers?.is_sanctioned && (
                                <Chip label="SANCTIONED" size="small" sx={{ height: 14, fontSize: 8, fontWeight: 800, bgcolor: 'rgba(240,78,106,0.2)', color: '#F04E6A', border: '1px solid rgba(240,78,106,0.4)' }} />
                              )}
                              {(sc.risk_triggers?.country ?? []).map((c) => (
                                <Chip key={c} label={c} size="small" sx={{ height: 14, fontSize: 8, fontWeight: 700, bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }} />
                              ))}
                              {sc.min_number_of_hops != null && sc.min_number_of_hops === 0 && (
                                <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Direct</Typography>
                              )}
                              {sc.min_number_of_hops != null && sc.min_number_of_hops > 0 && (
                                <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{sc.min_number_of_hops} hop{sc.min_number_of_hops !== 1 ? 's' : ''}</Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  ))}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* ── On-chain Info ── */}
      <Box>
        <SectionLabel>On-chain Info</SectionLabel>
        {(inflow != null || outflow != null) ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1 }}>
            {[
              { label: 'Total Inflow', value: fmtUsd(inflow) },
              { label: 'Total Outflow', value: fmtUsd(outflow) },
            ].filter((r) => r.value != null).map(({ label, value }) => (
              <Box key={label} sx={{ px: 1.5, py: 1.25, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 1.5 }}>
                <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.3 }}>{label}</Typography>
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.88)', fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Box sx={{ px: 1.5, py: 1.25, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 1.5 }}>
            <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
              On-chain metrics not available — wallet not yet indexed by Elliptic
            </Typography>
          </Box>
        )}
      </Box>

      {/* ── Exposure Breakdown ── */}
      {hasContribs && (
        <Box>
          <SectionLabel>Exposure Breakdown</SectionLabel>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <ExposureBar items={srcContribs} score={result.risk_score_detail?.source} label="Source Exposure" />
            <ExposureBar items={dstContribs} score={result.risk_score_detail?.destination} label="Destination Exposure" />
          </Box>
        </Box>
      )}

      {/* ── Associated Entities ── */}
      {entities.length > 0 && (
        <Box>
          <SectionLabel>Associated Entities ({entities.length})</SectionLabel>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {entities.map((e, i) => {
              const catColor = getCategoryColor(e.category ?? '');
              return (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, bgcolor: e.is_primary_entity ? `${catColor}08` : 'rgba(255,255,255,0.02)', border: `1px solid ${e.is_primary_entity ? catColor + '30' : 'rgba(255,255,255,0.07)'}`, borderRadius: 1.5 }}>
                  {e.is_primary_entity && (
                    <Box sx={{ px: 0.75, py: 0.2, bgcolor: `${catColor}20`, border: `1px solid ${catColor}40`, borderRadius: 0.75, flexShrink: 0 }}>
                      <Typography sx={{ fontSize: 9, fontWeight: 700, color: catColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Primary</Typography>
                    </Box>
                  )}
                  <Typography sx={{ fontSize: 12, fontWeight: e.is_primary_entity ? 700 : 400, color: e.is_primary_entity ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.65)', flex: 1 }}>
                    {e.name ?? '—'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
                    {e.category && (
                      <Chip label={e.category} size="small"
                        sx={{ height: 18, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', bgcolor: `${catColor}15`, color: catColor, border: `1px solid ${catColor}35` }}
                      />
                    )}
                    {e.is_vasp && <Chip label="VASP" size="small" sx={{ height: 18, fontSize: 9, fontWeight: 700, bgcolor: 'rgba(45,212,209,0.1)', color: '#2DD4D1', border: '1px solid rgba(45,212,209,0.3)' }} />}
                    {e.is_after_sanction_date && <Chip label="Post-sanction" size="small" sx={{ height: 18, fontSize: 9, fontWeight: 700, bgcolor: 'rgba(240,78,106,0.15)', color: '#F04E6A', border: '1px solid rgba(240,78,106,0.35)' }} />}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* ── Clean result ── */}
      {!hasContribs && allRules.length === 0 && (result.risk_score == null || result.risk_score < 3) && (
        <Box sx={{ p: 2, bgcolor: 'rgba(61,214,140,0.06)', border: '1px solid rgba(61,214,140,0.2)', borderRadius: 1.5, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 13, color: '#3DD68C', fontWeight: 700 }}>No risk indicators detected</Typography>
          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', mt: 0.25 }}>Address passed screening with no flagged categories</Typography>
        </Box>
      )}
    </Box>
  );
}
