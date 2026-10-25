import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Button, CircularProgress, IconButton, InputBase, Snackbar, Typography } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import HistoryIcon from '@mui/icons-material/History';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LinkIcon from '@mui/icons-material/Link';
import CloseIcon from '@mui/icons-material/Close';
import { screenWallet, type EllipticScreeningResult } from 'src/utils/elliptic';
import { ScreeningResult } from './ScreeningResult';
import { RiskGauge } from './RiskGauge';

interface HistoryEntry {
  id: string;
  subject: string;
  subjectType: 'wallet' | 'transaction';
  result: EllipticScreeningResult;
  screenedAt: string;
}

const HISTORY_KEY = 'elliptic_screening_history';

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); } catch { return []; }
}

function saveHistory(h: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 50)));
}

export function ScreeningPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<HistoryEntry | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  const screen = async (value?: string) => {
    const v = (value ?? query).trim();
    if (!v) return;
    setLoading(true);
    setError(null);
    setCurrent(null);
    setShowHistory(false);
    setQuery(v);
    // Update URL
    setSearchParams({ w: v }, { replace: true });
    try {
      const result = await screenWallet(v);
      const entry: HistoryEntry = {
        id: `${Date.now()}`,
        subject: v,
        subjectType: 'wallet',
        result,
        screenedAt: new Date().toISOString(),
      };
      setCurrent(entry);
      const updated = [entry, ...history.filter((h) => h.subject !== v)];
      setHistory(updated);
      saveHistory(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Screening failed');
      // Clear param on error so stale address isn't shared
      setSearchParams({}, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  // Auto-screen on mount if ?screening= is in the URL
  useEffect(() => {
    const addr = searchParams.get('w');
    if (addr) screen(addr);
  }, []); // eslint-disable-line

  const clearHistory = () => { setHistory([]); saveHistory([]); };

  const clearResult = () => {
    setCurrent(null);
    setQuery('');
    setError(null);
    setShowHistory(false);
    setSearchParams({}, { replace: true });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* Search bar */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Box sx={{
          flex: 1, display: 'flex', alignItems: 'center',
          bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 1.5, px: 1.5, height: 40, gap: 1,
          '&:focus-within': { borderColor: 'rgba(255,255,255,0.2)' }, transition: 'border-color 0.15s',
        }}>
          <SecurityIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
          <InputBase
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') screen(); }}
            placeholder="Wallet address…"
            sx={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.82)', '& .MuiInputBase-input': { p: 0, '&::placeholder': { color: 'rgba(255,255,255,0.28)', opacity: 1 } } }}
          />
          {current && (
            <IconButton
              size="small"
              onClick={clearResult}
              sx={{ p: 0.5, color: 'rgba(255,255,255,0.28)', '&:hover': { color: 'rgba(255,255,255,0.7)' }, flexShrink: 0 }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Box>
        <Button
          variant="contained" onClick={() => screen()} disabled={loading || !query.trim()}
          sx={{ height: 40, px: 2.5, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          {loading ? <CircularProgress size={16} color="inherit" /> : 'Screen'}
        </Button>
        {current && (
          <IconButton
            onClick={copyLink}
            title="Copy shareable link"
            sx={{ height: 40, width: 40, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 1.5, color: copied ? '#2DD4D1' : 'rgba(255,255,255,0.5)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#2DD4D1' } }}
          >
            <LinkIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
        <IconButton
          onClick={() => setShowHistory((v) => !v)}
          sx={{ height: 40, width: 40, bgcolor: showHistory ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 1.5, color: 'rgba(255,255,255,0.5)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
        >
          <HistoryIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Helper text */}
      {!current && !error && !showHistory && (
        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', mt: -0.5 }}>
          Enter a wallet address to run an integrity risk screening
        </Typography>
      )}

      {/* Error */}
      {error && (
        <Box sx={{ p: 2, bgcolor: 'rgba(240,78,106,0.08)', border: '1px solid rgba(240,78,106,0.2)', borderRadius: 1.5 }}>
          <Typography sx={{ fontSize: 12, color: '#F04E6A' }}>{error}</Typography>
        </Box>
      )}

      {/* Loading state */}
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
          <CircularProgress size={16} sx={{ color: '#2DD4D1' }} />
          <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Screening {query}…</Typography>
        </Box>
      )}

      {/* Current result */}
      {current && !showHistory && !loading && (
        <ScreeningResult result={current.result} subject={current.subject} subjectType={current.subjectType} />
      )}

      {/* History panel */}
      {showHistory && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
              Recent Screenings ({history.length})
            </Typography>
            {history.length > 0 && (
              <IconButton size="small" onClick={clearHistory} sx={{ color: 'rgba(255,255,255,0.25)', p: 0.5, '&:hover': { color: '#F04E6A' } }}>
                <DeleteOutlineIcon sx={{ fontSize: 14 }} />
              </IconButton>
            )}
          </Box>
          {history.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', py: 2, textAlign: 'center' }}>No screening history</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {history.map((entry) => (
                <Box
                  key={entry.id}
                  onClick={() => { setCurrent(entry); setShowHistory(false); setQuery(entry.subject); setSearchParams({ w: entry.subject }, { replace: true }); }}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.25, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)' }, transition: 'all 0.15s' }}
                >
                  <RiskGauge score={entry.result.risk_score} size={52} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.subject}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', mt: 0.25 }}>
                      wallet · {new Date(entry.screenedAt).toLocaleString()}
                    </Typography>
                  </Box>
                  <Button size="small" onClick={(e) => { e.stopPropagation(); screen(entry.subject); }} sx={{ fontSize: 10, minWidth: 0, px: 1, py: 0.5, color: 'rgba(255,255,255,0.4)', '&:hover': { color: 'rgba(255,255,255,0.8)' } }}>
                    Re-screen
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Link copied to clipboard"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
