import { Helmet } from 'react-helmet-async';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, Typography, alpha } from '@mui/material';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import useFetchAdminRole from 'src/hooks/useFetchAdminRole';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useRef, useState } from 'react';
import { ADMIN_FLAG } from 'src/config';
import { RootState } from 'src/store';

const CYAN = '#42FFFC';

const globalStyles = `
  /* ── Wallet button ──────────────────────────────── */
  .wallet-adapter-button {
    font-family: 'Consolas', 'Courier New', monospace !important;
    font-size: 12px !important;
    font-weight: 500 !important;
    letter-spacing: 0.06em !important;
    text-transform: uppercase !important;
    height: 40px !important;
    padding: 0 28px !important;
    border-radius: 4px !important;
    background-color: rgba(255,255,255,0.04) !important;
    color: rgba(255,255,255,0.70) !important;
    border: 1px solid rgba(255,255,255,0.12) !important;
    box-shadow: none !important;
    transition: all 0.15s ease !important;
    line-height: 1 !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 8px !important;
    white-space: nowrap !important;
    width: auto !important;
    min-width: 0 !important;
  }
  .wallet-adapter-button:hover {
    background-color: rgba(255,255,255,0.08) !important;
    border-color: rgba(255,255,255,0.25) !important;
    color: rgba(255,255,255,0.92) !important;
    box-shadow: none !important;
  }
  .wallet-adapter-button-start-icon {
    width: 16px !important;
    height: 16px !important;
    opacity: 0.5 !important;
  }

  /* ── Wallet modal ───────────────────────────────── */
  .wallet-adapter-modal-wrapper {
    background: #1A1A1F !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    border-radius: 14px !important;
    box-shadow: 0 32px 80px rgba(0,0,0,0.70) !important;
    padding: 60px 28px 28px !important;
    max-width: 380px !important;
  }
  .wallet-adapter-modal-title {
    display: none !important;
  }
  .wallet-adapter-modal-list {
    margin-top: 0 !important;
  }
  .wallet-adapter-modal-button-close {
    background: rgba(255,255,255,0.05) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    border-radius: 6px !important;
    top: 14px !important;
    right: 14px !important;
    width: 32px !important;
    height: 32px !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  .wallet-adapter-modal-button-close:hover {
    background: rgba(255,255,255,0.09) !important;
  }
  .wallet-adapter-modal-button-close svg {
    fill: rgba(255,255,255,0.50) !important;
    width: 14px !important;
    height: 14px !important;
  }
  .wallet-adapter-modal-list {
    margin: 0 !important;
    padding: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 6px !important;
  }
  .wallet-adapter-modal-list li {
    border-radius: 8px !important;
    overflow: hidden !important;
  }
  .wallet-adapter-modal-list .wallet-adapter-button {
    width: 100% !important;
    height: 48px !important;
    border-radius: 8px !important;
    background-color: rgba(255,255,255,0.04) !important;
    border: 1px solid rgba(255,255,255,0.07) !important;
    color: rgba(255,255,255,0.80) !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    padding: 0 16px !important;
    justify-content: flex-start !important;
    gap: 12px !important;
  }
  .wallet-adapter-modal-list .wallet-adapter-button:hover {
    background-color: rgba(255,255,255,0.07) !important;
    border-color: rgba(66,255,252,0.18) !important;
    color: rgba(255,255,255,0.92) !important;
  }
  .wallet-adapter-modal-list .wallet-adapter-button .wallet-adapter-button-end-icon,
  .wallet-adapter-modal-list .wallet-adapter-button span:last-child {
    font-size: 11px !important;
    font-weight: 500 !important;
    color: rgba(255,255,255,0.30) !important;
    margin-left: auto !important;
  }
  .wallet-adapter-modal-list-more {
    font-family: 'Inter', sans-serif !important;
    font-size: 12px !important;
    font-weight: 500 !important;
    color: rgba(255,255,255,0.35) !important;
    margin-top: 8px !important;
    cursor: pointer !important;
    display: flex !important;
    align-items: center !important;
    gap: 4px !important;
    background: none !important;
    border: none !important;
    padding: 4px 0 !important;
  }
  .wallet-adapter-modal-list-more:hover {
    color: rgba(255,255,255,0.60) !important;
  }
  .wallet-adapter-modal-overlay {
    background: rgba(0,0,0,0.75) !important;
    backdrop-filter: blur(6px) !important;
  }
`;

type AuthPhase = 'idle' | 'awaiting' | 'verifying' | 'authorized' | 'unauthorized';

function Login() {
  const hasWelcomedRef    = useRef<string | null>(null);
  const authAnimRef       = useRef(false);
  const verifyingStartRef = useRef<number>(0);
  const awaitingTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [authPhase, setAuthPhase] = useState<AuthPhase>('idle');
  const [svcStatus, setRpcStatus] = useState<'checking' | 'ok' | 'degraded'>('checking');
  const [svcDismissed, setSvcDismissed] = useState(() => localStorage.getItem('vanish_svc_dismissed') === '1');

  useEffect(() => {
    const check = async () => {
      try {
        const ac = new AbortController();
        const tid = setTimeout(() => ac.abort(), 5000);
        const r = await fetch(`${process.env.REACT_APP_API_BASE_URL}/health`, { signal: ac.signal });
        clearTimeout(tid);
        setRpcStatus(r.ok ? 'ok' : 'degraded');
      } catch { setRpcStatus('degraded'); }
    };
    check();
  }, []);

  const clearAwaitingTimer = () => {
    if (awaitingTimerRef.current) { clearTimeout(awaitingTimerRef.current); awaitingTimerRef.current = null; }
  };
  const { connected, publicKey, disconnect } = useWallet();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { is_admin } = useSelector((state: RootState) => state.admin);

  const focusedModeTarget = (target: string) => {
    const isFocused = localStorage.getItem('vanish_focused_mode') === '1';
    const hiddenInFocused = ['/analyze', '/transactions', '/teams', '/admins', '/silent_fees', '/refferal_fees'];
    return isFocused && hiddenInFocused.some((p) => target.startsWith(p)) ? '/screening' : target;
  };

  const MIN_VERIFY_MS = 1900;

  const fetchAdminRole = useFetchAdminRole(
    () => {
      authAnimRef.current = true;
      const delay = Math.max(0, MIN_VERIFY_MS - (Date.now() - verifyingStartRef.current));
      setTimeout(() => {
        setAuthPhase('unauthorized');
        setTimeout(() => { window.location.href = 'https://vanishlabs.org'; }, 2500);
      }, delay);
    },
    (target: string) => {
      authAnimRef.current = true;
      const delay = Math.max(0, MIN_VERIFY_MS - (Date.now() - verifyingStartRef.current));
      setTimeout(() => {
        setAuthPhase('authorized');
        setTimeout(() => navigate(focusedModeTarget(target), { replace: true }), 1700);
      }, delay);
    },
    () => { clearAwaitingTimer(); verifyingStartRef.current = Date.now(); setAuthPhase('verifying'); },
    () => { clearAwaitingTimer(); hasWelcomedRef.current = null; setAuthPhase('idle'); disconnect(); },
  );

  // Redirect if already authenticated — but not while an animation is in progress
  useEffect(() => {
    if (authAnimRef.current) return;
    const adminFlag = localStorage.getItem(ADMIN_FLAG);
    const isAuthenticated = is_admin || adminFlag === '0' || adminFlag === '1';
    if (isAuthenticated) {
      const redirectUrl = searchParams.get('redirect_url');
      const target =
        redirectUrl && redirectUrl.startsWith('/')
          ? decodeURIComponent(redirectUrl)
          : '/analyze';
      navigate(focusedModeTarget(target), { replace: true });
    } else {
      localStorage.setItem(ADMIN_FLAG, '-1');
    }
  }, [is_admin, navigate, searchParams]);

  useEffect(() => {
    if (!connected || !publicKey) { hasWelcomedRef.current = null; clearAwaitingTimer(); setAuthPhase('idle'); return; }
    const addr = publicKey.toBase58();
    if (hasWelcomedRef.current === addr) return;
    hasWelcomedRef.current = addr;
    setAuthPhase('awaiting');
    clearAwaitingTimer();
    fetchAdminRole();
  }, [connected, publicKey, fetchAdminRole]);

  return (
    <>
      <Helmet>
        <title>Vanish Labs - Staging</title>
      </Helmet>
      <style>{globalStyles}</style>

      <Box
        sx={{
          position:      'fixed',
          inset:         0,
          display:       'flex',
          flexDirection: 'column',
          background: '#08080B'
        }}
      >
        {/* dot-grid */}
        <Box
          aria-hidden
          sx={{
            position:        'absolute',
            inset:           0,
            backgroundImage: `radial-gradient(${alpha('#FFFFFF', 0.065)} 1px, transparent 1px)`,
            backgroundSize:  '28px 28px',
            pointerEvents:   'none'
          }}
        />

        {/* ── Center: logo + wordmark + staging ── */}
        <Box
          sx={{
            flex:           1,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            position:       'relative',
            zIndex:         1,
            // nudge upward slightly so it reads as intentionally above-center
            pb:             '60px'
          }}
        >
          {/* snake icon + halo */}
          <Box sx={{ position: 'relative', mb: 3 }}>
            <Box
              aria-hidden
              sx={{
                position:     'absolute',
                inset:        '-24px',
                borderRadius: '50%',
                background:   `radial-gradient(circle, ${alpha(CYAN, 0.045)} 0%, transparent 68%)`,
                pointerEvents: 'none'
              }}
            />
            <Box
              component="img"
              src="/snake_no_background.png"
              alt="Vanish"
              sx={{
                width:    '80px',
                height:   '80px',
                display:  'block',
                filter:   'brightness(0) invert(1)',
                opacity:  0.88,
                position: 'relative',
                zIndex:   1
              }}
            />
          </Box>

          {/* Wordmark */}
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '7px', mb: 1.5 }}>
            <Typography sx={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em', color: alpha('#FFFFFF', 0.92), lineHeight: 1 }}>
              Vanish
            </Typography>
            <Typography sx={{ fontSize: '24px', fontWeight: 300, letterSpacing: '-0.02em', color: alpha('#FFFFFF', 0.30), lineHeight: 1 }}>
              Labs
            </Typography>
          </Box>

          {/* Staging label — plain text, no border so it doesn't compete with the button */}
          <Typography
            sx={{
              fontSize:      '10px',
              fontWeight:    600,
              letterSpacing: '0.14em',
              color:         alpha(CYAN, 0.40),
              textTransform: 'uppercase',
              mb:            5
            }}
          >
            Staging
          </Typography>

          {/* Login button — grouped with the branding */}
          {/* Outer: clips the rotating gradient to a 1px border */}
          <Box sx={{ position: 'relative', display: 'inline-flex', borderRadius: '4px', overflow: 'hidden' }}>
            <Box sx={{
              position: 'absolute', inset: '-100%',
              background: 'conic-gradient(transparent 0deg, rgba(255,255,255,0.18) 60deg, transparent 120deg)',
              '@keyframes rotateGlow': { to: { transform: 'rotate(360deg)' } },
              animation: 'rotateGlow 3.5s linear infinite',
            }} />
          {/* Inner: 1px margin exposes gradient as border */}
          <Box sx={{ position: 'relative', display: 'inline-flex', m: '1px', borderRadius: '3px', overflow: 'hidden', bgcolor: '#08080B' }}>
            <Box sx={{
              opacity: authPhase === 'idle' ? 1 : 0,
              transition: 'opacity 0.18s ease',
              pointerEvents: authPhase === 'idle' ? 'auto' : 'none',
            }}>
              <WalletMultiButton>Connect Wallet</WalletMultiButton>
            </Box>

            {(authPhase === 'awaiting' || authPhase === 'verifying') && (() => {
              const isVerifying = authPhase === 'verifying';
              const color = isVerifying ? 'rgba(255,255,255,0.88)' : CYAN;
              const bgColor = isVerifying ? '#0d0d0d' : '#080f0f';
              const arcColor = isVerifying ? 'rgba(255,255,255,0.28)' : 'rgba(66,255,252,0.28)';
              return (
              <Box sx={{
                position: 'absolute', inset: 0, borderRadius: '4px', overflow: 'hidden',
                '@keyframes authIn': { '0%': { opacity: 0, transform: 'scale(0.94)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
                animation: 'authIn 0.18s cubic-bezier(0.22,1,0.36,1) both',
              }}>
                {/* Rotating conic gradient border */}
                <Box sx={{
                  position: 'absolute', inset: '-100%',
                  background: `conic-gradient(transparent 0deg, ${arcColor} 60deg, transparent 120deg)`,
                  '@keyframes rotateGlow': { to: { transform: 'rotate(360deg)' } },
                  animation: 'rotateGlow 3.5s linear infinite',
                }} />
                {/* Inner fill */}
                <Box sx={{
                  position: 'absolute', inset: '1px', borderRadius: '3px', bgcolor: bgColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: alpha(color, 0.85) }}>
                    {authPhase === 'awaiting' ? 'Awaiting Signature' : 'Verifying Access'}
                  </Typography>
                </Box>
              </Box>
              );
            })()}

            {authPhase === 'unauthorized' && (
              <Box sx={{
                position: 'absolute', inset: 0, borderRadius: '4px', overflow: 'hidden',
                '@keyframes authIn': { '0%': { opacity: 0, transform: 'scale(0.94)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
                animation: 'authIn 0.18s cubic-bezier(0.22,1,0.36,1) both',
              }}>
                <Box sx={{
                  position: 'absolute', inset: '-100%',
                  background: 'conic-gradient(transparent 0deg, rgba(239,68,68,0.30) 60deg, transparent 120deg)',
                  '@keyframes rotateGlow': { to: { transform: 'rotate(360deg)' } },
                  animation: 'rotateGlow 3.5s linear infinite',
                }} />
                <Box sx={{
                  position: 'absolute', inset: '1px', borderRadius: '3px', bgcolor: '#0f0808',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Typography sx={{
                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(239,68,68,0.85)',
                    '@keyframes slideUp': { '0%': { opacity: 0, transform: 'translateY(4px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
                    animation: 'slideUp 0.22s 0.08s cubic-bezier(0.22,1,0.36,1) both',
                  }}>
                    Not Authorized
                  </Typography>
                </Box>
              </Box>
            )}

            {authPhase === 'authorized' && (
              <Box sx={{
                position: 'absolute', inset: 0, borderRadius: '4px', overflow: 'hidden',
                '@keyframes authIn': { '0%': { opacity: 0, transform: 'scale(0.94)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
                animation: 'authIn 0.18s cubic-bezier(0.22,1,0.36,1) both',
              }}>
                <Box sx={{
                  position: 'absolute', inset: '-100%',
                  background: 'conic-gradient(transparent 0deg, rgba(34,197,94,0.30) 60deg, transparent 120deg)',
                  '@keyframes rotateGlow': { to: { transform: 'rotate(360deg)' } },
                  animation: 'rotateGlow 3.5s linear infinite',
                }} />
                <Box sx={{
                  position: 'absolute', inset: '1px', borderRadius: '3px', bgcolor: '#080f09',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Typography sx={{
                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(34,197,94,0.90)',
                    '@keyframes slideUp': { '0%': { opacity: 0, transform: 'translateY(4px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
                    animation: 'slideUp 0.22s 0.08s cubic-bezier(0.22,1,0.36,1) both',
                  }}>
                    Authorized
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
          </Box>

        </Box>
      </Box>

      {/* Service health — fixed bottom center, text only */}
      {!svcDismissed && (
        <Typography sx={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10,
          fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
          color: svcStatus === 'ok' ? 'rgba(74,222,128,0.75)' : svcStatus === 'degraded' ? 'rgba(248,113,113,0.85)' : 'rgba(255,255,255,0.28)',
          '@keyframes svcFlash': { '0%,100%': { opacity: 0.45 }, '50%': { opacity: 1 } },
          animation: svcStatus !== 'degraded' ? 'svcFlash 5s ease-in-out infinite' : 'none',
        }}>
          {svcStatus === 'ok' ? 'Service Healthy' : svcStatus === 'degraded' ? 'Service Unavailable' : 'Checking…'}
        </Typography>
      )}
    </>
  );
}

export default Login;
