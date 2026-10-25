import { Box, Typography } from '@mui/material';
import { getRiskColor, getRiskLabel } from 'src/utils/elliptic';

interface RiskGaugeProps {
  score: number | null | undefined;
  size?: number;
}

export function RiskGauge({ score, size = 96 }: RiskGaugeProps) {
  const color = getRiskColor(score);
  const label = getRiskLabel(score);
  const sw = size > 80 ? 8 : size > 56 ? 6 : 5;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const pct = score != null ? Math.min(Math.max(score / 10, 0), 1) : 0;
  const dash = circ * pct;
  const gap = circ - dash;
  const scoreFontSize = size > 80 ? 22 : size > 56 ? 15 : 12;

  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={sw} />
        {pct > 0.005 && (
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={sw}
            strokeDasharray={`${dash} ${gap}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease' }}
          />
        )}
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: scoreFontSize, fontWeight: 700, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {score != null ? score.toFixed(1) : '0.0'}
        </Typography>
        <Typography sx={{ fontSize: size > 56 ? 9 : 8, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', mt: 0.25 }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}
