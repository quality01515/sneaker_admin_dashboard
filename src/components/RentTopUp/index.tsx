import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { VersionedTransaction, SystemProgram, PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle,
  Divider, IconButton, ToggleButton, ToggleButtonGroup, Typography, alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

const USDC_MINT   = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOL_MINT    = 'So11111111111111111111111111111111111111112';
const RENT_PUBKEY = new PublicKey('BxEpKHc9MhTNNNL3m9hHufb4sbHqVzZ1wm7Yt8BMeJDD');
const JUP_API     = 'https://lite.jup.ag/v6';
const FEE_BUFFER  = 10_000;

const USDC_LOGO = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png';
const SOL_LOGO  = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

type Mode = 'usdc' | 'sol';
type Step = 'idle' | 'quoting' | 'ready' | 'swapping' | 'transferring' | 'done' | 'error';

interface QuoteResponse {
  outAmount: string;
  priceImpactPct: string;
  [key: string]: unknown;
}

function fmtSol(lamports: number) { return (lamports / 1e9).toFixed(4); }

function TokenLogo({ src, size = 32 }: { src: string; size?: number }) {
  return (
    <Box sx={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden',
      bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Box component="img" src={src} alt="" sx={{ width: size - 4, height: size - 4, borderRadius: '50%' }} />
    </Box>
  );
}

function TokenRow({
  logo, symbol, name, amount, amountLabel, loading,
}: {
  logo: string; symbol: string; name: string;
  amount?: string; amountLabel?: string; loading?: boolean;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <TokenLogo src={logo} size={36} />
        <Box>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1.2 }}>{symbol}</Typography>
          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', mt: 0.25 }}>{name}</Typography>
        </Box>
      </Box>
      <Box sx={{ textAlign: 'right' }}>
        {loading ? (
          <CircularProgress size={14} sx={{ color: '#2DD4D1' }} />
        ) : (
          <>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1.2 }}>{amount ?? '—'}</Typography>
            {amountLabel && <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', mt: 0.25 }}>{amountLabel}</Typography>}
          </>
        )}
      </Box>
    </Box>
  );
}

function StepRow({ label, status }: { label: string; status: 'pending' | 'active' | 'done' | 'error' }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.6 }}>
      <Box sx={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {status === 'active'  && <CircularProgress size={14} sx={{ color: '#2DD4D1' }} />}
        {status === 'done'    && <CheckCircleOutlineIcon sx={{ fontSize: 16, color: '#3DD68C' }} />}
        {status === 'error'   && <ErrorOutlineIcon sx={{ fontSize: 16, color: '#F04E6A' }} />}
        {status === 'pending' && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.18)', m: 'auto' }} />}
      </Box>
      <Typography sx={{
        fontSize: 12,
        color: status === 'pending' ? 'rgba(255,255,255,0.3)' : status === 'done' ? '#3DD68C' : status === 'error' ? '#F04E6A' : 'rgba(255,255,255,0.85)',
      }}>
        {label}
      </Typography>
    </Box>
  );
}

export function RentTopUp({ rentSol, onSuccess, renderTrigger, controlledOpen, onControlledClose }: {
  rentSol: number | null;
  onSuccess?: () => void;
  renderTrigger?: (openDialog: () => void) => React.ReactNode;
  controlledOpen?: boolean;
  onControlledClose?: () => void;
}) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const [mode, setMode]       = useState<Mode>('usdc');
  const [step, setStep]       = useState<Step>('idle');
  const [quote, setQuote]     = useState<QuoteResponse | null>(null);
  const [error, setError]     = useState('');
  const [solAmt, setSolAmt]   = useState('');
  const [usdcAmt, setUsdcAmt] = useState('10');
  const [inputMode, setInputMode] = useState<'sol' | 'usd'>('sol');
  const [solPrice, setSolPrice]   = useState<number | null>(null);

  const color    = rentSol == null ? '#2DD4D1' : rentSol < 0.2 ? '#F04E6A' : rentSol < 0.75 ? '#F5A524' : '#2DD4D1';
  const colorRgb = rentSol == null ? '45,212,209' : rentSol < 0.2 ? '240,78,106' : rentSol < 0.75 ? '245,165,36' : '45,212,209';

  const usdcMicro = Math.round((parseFloat(usdcAmt) || 0) * 1_000_000);

  useEffect(() => {
    if (!open || mode !== 'usdc') return;
    if (!usdcMicro || usdcMicro <= 0) { setStep('idle'); setQuote(null); return; }
    setStep('quoting');
    setQuote(null);
    setError('');
    const timer = setTimeout(() => {
      fetch(`/api/jup-quote?inputMint=${USDC_MINT}&outputMint=${SOL_MINT}&amount=${usdcMicro}&slippageBps=50`)
        .then((r) => r.json())
        .then((q) => {
          if (q.error) throw new Error(q.error);
          setQuote(q);
          setStep('ready');
        })
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : 'Failed to fetch swap quote.');
          setStep('error');
        });
    }, 600);
    return () => clearTimeout(timer);
  }, [open, mode, usdcMicro]);

  useEffect(() => {
    if (!open || mode !== 'sol') return;
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
      .then((r) => r.json())
      .then((d) => setSolPrice(d?.solana?.usd ?? null))
      .catch(() => {});
  }, [open, mode]);

  const reset = () => { setStep('idle'); setQuote(null); setError(''); setSolAmt(''); setUsdcAmt('50'); };

  const handleClose = () => {
    if (step === 'swapping' || step === 'transferring') return;
    if (controlledOpen !== undefined) {
      onControlledClose?.();
    } else {
      setInternalOpen(false);
    }
    setTimeout(reset, 300);
  };

  const handleModeChange = (_: React.MouseEvent<HTMLElement>, val: Mode | null) => {
    if (!val) return;
    setMode(val);
    reset();
  };

  const executeUsdc = async () => {
    if (!publicKey || !quote) return;
    try {
      setStep('swapping');
      const swapRes = await fetch('/api/jup-swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: publicKey.toString(),
          wrapAndUnwrapSol: true,
        }),
      });
      const { swapTransaction, error: swapError } = await swapRes.json();
      if (swapError) throw new Error(swapError);

      const tx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'));
      const swapSig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(swapSig, 'confirmed');

      setStep('transferring');
      const lamports = Math.max(0, Number(quote.outAmount) - FEE_BUFFER);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const transferTx = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey })
        .add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: RENT_PUBKEY, lamports }));
      const sig = await sendTransaction(transferTx, connection);
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
      setStep('done');
      setTimeout(() => onSuccess?.(), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transaction failed.');
      setStep('error');
    }
  };

  const executeSol = async () => {
    if (!publicKey) return;
    const raw = parseFloat(solAmt) || 0;
    const solValue = inputMode === 'sol' ? raw : raw / (solPrice ?? 1);
    const lamports = Math.round(solValue * LAMPORTS_PER_SOL);
    if (!lamports || lamports <= 0) return;
    try {
      setStep('transferring');
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey })
        .add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: RENT_PUBKEY, lamports }));
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
      setStep('done');
      setTimeout(() => onSuccess?.(), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transaction failed.');
      setStep('error');
    }
  };

  if (!connected) return null;

  const outLamports    = quote ? Number(quote.outAmount) : 0;
  const swapStatus     = step === 'swapping' ? 'active' : step === 'transferring' || step === 'done' ? 'done' : step === 'error' ? 'error' : 'pending';
  const xferStatus     = step === 'transferring' ? 'active' : step === 'done' ? 'done' : step === 'error' && swapStatus === 'done' ? 'error' : 'pending';
  const rawAmt         = parseFloat(solAmt) || 0;
  const solValueFloat  = inputMode === 'sol' ? rawAmt : rawAmt / (solPrice ?? 1);
  const usdValueFloat  = inputMode === 'usd' ? rawAmt : rawAmt * (solPrice ?? 0);
  const solLamports    = mode === 'sol' && solAmt ? Math.round(solValueFloat * LAMPORTS_PER_SOL) : 0;
  const isRunning      = step === 'swapping' || step === 'transferring';
  const canExecuteUsdc = mode === 'usdc' && step === 'ready' && !!quote;
  const canExecuteSol  = mode === 'sol' && step === 'idle' && solLamports > 0;

  return (
    <>
      {renderTrigger ? renderTrigger(() => setInternalOpen(true)) : controlledOpen !== undefined ? null : (
        <Button
          size="small"
          onClick={() => setInternalOpen(true)}
          sx={{
            fontSize: '10px', fontWeight: 700, lineHeight: 1, px: 1, py: 0.4,
            minWidth: 0, height: 'auto', borderRadius: '4px',
            bgcolor: `rgba(${colorRgb},0.15)`, color,
            border: `1px solid rgba(${colorRgb},0.35)`,
            '&:hover': { bgcolor: `rgba(${colorRgb},0.25)` },
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}
        >
          Top Up
        </Button>
      )}

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { bgcolor: '#0E0E14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' },
        }}
      >
        <DialogTitle sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.01em' }}>
            Top Up Rent Account
          </Typography>
          <IconButton size="small" onClick={handleClose} disabled={isRunning}
            sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: 'rgba(255,255,255,0.6)' } }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 2.5, pt: 0, pb: 3 }}>

          {/* Mode toggle */}
          <ToggleButtonGroup
            value={mode} exclusive onChange={handleModeChange} size="small"
            disabled={isRunning || step === 'done'}
            sx={{
              mb: 2.5, width: '100%',
              '& .MuiToggleButton-root': {
                flex: 1, fontSize: 11, fontWeight: 700, py: 0.75,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: 'rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.08)',
                '&.Mui-selected': { color: '#2DD4D1', bgcolor: 'rgba(45,212,209,0.1)', borderColor: 'rgba(45,212,209,0.25)' },
              },
            }}
          >
            <ToggleButton value="usdc">Swap USDC</ToggleButton>
            <ToggleButton value="sol">Send SOL</ToggleButton>
          </ToggleButtonGroup>

          {/* USDC swap card */}
          {mode === 'usdc' && (
            <>
              <Box sx={{
                bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '12px', overflow: 'hidden', mb: 2,
              }}>
                <Box sx={{ px: 0.5, pt: 0.5 }}>
                  <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', px: 1.5, pt: 1, pb: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    You pay
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <TokenLogo src={USDC_LOGO} size={36} />
                      <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1.2 }}>USDC</Typography>
                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', mt: 0.25 }}>USD Coin</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Box
                          component="input"
                          value={usdcAmt}
                          size={Math.max(2, usdcAmt.length + 1)}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsdcAmt(e.target.value.replace(/[^0-9.]/g, ''))}
                          disabled={isRunning || step === 'done'}
                          placeholder="0"
                          sx={{
                            background: 'none', border: 'none', outline: 'none',
                            fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
                            textAlign: 'right', minWidth: '2ch', lineHeight: 1.2,
                            '&::placeholder': { color: 'rgba(255,255,255,0.2)' },
                            '&:disabled': { color: 'rgba(255,255,255,0.4)', cursor: 'not-allowed' },
                          }}
                        />
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)', lineHeight: 1.2, ml: 0.25 }}>USDC</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 0.25 }}>
                  <Divider sx={{ width: '100%', borderColor: 'rgba(255,255,255,0.06)' }} />
                  <Box sx={{
                    position: 'absolute', width: 28, height: 28, borderRadius: '50%',
                    bgcolor: '#0E0E14', border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ArrowDownwardIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }} />
                  </Box>
                </Box>

                <Box sx={{ px: 0.5, pb: 0.5 }}>
                  <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', px: 1.5, pt: 1, pb: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Rent account receives
                  </Typography>
                  <TokenRow
                    logo={SOL_LOGO} symbol="SOL" name="Solana"
                    amount={outLamports > 0 ? fmtSol(outLamports) : undefined}
                    amountLabel={outLamports > 0 ? 'est. after 0.5% slippage' : undefined}
                    loading={step === 'quoting'}
                  />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Destination</Typography>
                <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.45)' }}>BxEp…MeJDD</Typography>
              </Box>
            </>
          )}

          {/* Direct SOL card */}
          {mode === 'sol' && (
            <>
              <Box sx={{
                bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '12px', overflow: 'hidden', mb: 2,
              }}>
                {/* Header: label + input mode toggle */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, pt: 1.5, pb: 0.5 }}>
                  <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Amount to send
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {(['sol', 'usd'] as const).map((m) => (
                      <Box
                        key={m}
                        onClick={() => !isRunning && step !== 'done' && (setSolAmt(''), setInputMode(m))}
                        sx={{
                          px: 1, py: 0.3, borderRadius: '4px', cursor: isRunning || step === 'done' ? 'default' : 'pointer',
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                          bgcolor: inputMode === m ? 'rgba(45,212,209,0.12)' : 'transparent',
                          color: inputMode === m ? '#2DD4D1' : 'rgba(255,255,255,0.28)',
                          border: `1px solid ${inputMode === m ? 'rgba(45,212,209,0.3)' : 'rgba(255,255,255,0.07)'}`,
                          transition: 'all 0.15s',
                        }}
                      >
                        {m.toUpperCase()}
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/* Token row with input */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, pb: 1.75 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <TokenLogo src={SOL_LOGO} size={36} />
                    <Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1.2 }}>SOL</Typography>
                      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', mt: 0.25 }}>Solana</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.25 }}>
                      {inputMode === 'usd' && (
                        <Typography sx={{ fontSize: 16, fontWeight: 700, color: solAmt ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)', lineHeight: 1.2 }}>$</Typography>
                      )}
                      <Box
                        component="input"
                        value={solAmt}
                        size={Math.max(4, solAmt.length + 1)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSolAmt(e.target.value.replace(/[^0-9.]/g, ''))}
                        disabled={isRunning || step === 'done'}
                        placeholder="0.00"
                        sx={{
                          background: 'none', border: 'none', outline: 'none',
                          fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
                          textAlign: 'right', minWidth: '3ch', lineHeight: 1.2,
                          '&::placeholder': { color: 'rgba(255,255,255,0.2)' },
                          '&:disabled': { color: 'rgba(255,255,255,0.4)', cursor: 'not-allowed' },
                        }}
                      />
                      {inputMode === 'sol' && (
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)', lineHeight: 1.2, ml: 0.25 }}>SOL</Typography>
                      )}
                    </Box>
                    {rawAmt > 0 && (
                      <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', mt: 0.25 }}>
                        {inputMode === 'sol'
                          ? (solPrice ? `≈ $${usdValueFloat.toFixed(2)}` : '')
                          : `≈ ${solValueFloat.toFixed(4)} SOL`}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Destination</Typography>
                <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.45)' }}>BxEp…MeJDD</Typography>
              </Box>
            </>
          )}

          {/* Progress */}
          {(step !== 'idle' && step !== 'quoting' && step !== 'ready') && (
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', px: 2, py: 1.25, mb: 2 }}>
              {mode === 'usdc' && <StepRow label="Swap USDC → SOL via Jupiter" status={swapStatus} />}
              <StepRow
                label="Transfer SOL to rent account"
                status={mode === 'usdc' ? xferStatus : step === 'transferring' ? 'active' : step === 'done' ? 'done' : step === 'error' ? 'error' : 'pending'}
              />
            </Box>
          )}

          {/* Error */}
          {step === 'error' && (
            <Box sx={{ bgcolor: 'rgba(240,78,106,0.07)', border: '1px solid rgba(240,78,106,0.18)', borderRadius: '10px', px: 2, py: 1.25, mb: 2 }}>
              <Typography sx={{ fontSize: 12, color: '#F04E6A', wordBreak: 'break-word' }}>{error}</Typography>
            </Box>
          )}

          {/* Done */}
          {step === 'done' && (
            <Box sx={{ bgcolor: 'rgba(61,214,140,0.07)', border: '1px solid rgba(61,214,140,0.18)', borderRadius: '10px', px: 2, py: 1.5, mb: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 14, color: '#3DD68C', fontWeight: 700 }}>Rent account topped up.</Typography>
              <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', mt: 0.5 }}>
                {mode === 'usdc' ? `${fmtSol(Math.max(0, outLamports - FEE_BUFFER))} SOL` : `${solValueFloat.toFixed(4)} SOL`} sent successfully.
              </Typography>
            </Box>
          )}

          {/* CTA */}
          {step !== 'done' ? (
            <Button
              fullWidth variant="contained"
              disabled={isRunning || (mode === 'usdc' ? !canExecuteUsdc : !canExecuteSol)}
              onClick={
                step === 'error'
                  ? () => { setStep(mode === 'usdc' ? 'ready' : 'idle'); setError(''); }
                  : mode === 'usdc' ? executeUsdc : executeSol
              }
              sx={{
                height: 44, fontWeight: 700, fontSize: 13, borderRadius: '10px',
                bgcolor: '#2DD4D1', color: '#040408',
                '&:hover': { bgcolor: alpha('#2DD4D1', 0.88) },
                '&:disabled': { bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)' },
                letterSpacing: '-0.01em',
              }}
            >
              {step === 'quoting'       ? 'Fetching quote...'  :
               step === 'swapping'     ? 'Swapping...'         :
               step === 'transferring' ? 'Sending...'          :
               step === 'error'        ? 'Retry'               :
               mode === 'usdc'         ? `Swap ${usdcAmt} USDC → ${outLamports > 0 ? fmtSol(outLamports) + ' SOL' : '...'}` :
                                         `Send ${solValueFloat > 0 ? solValueFloat.toFixed(4) : '...'} SOL`}
            </Button>
          ) : (
            <Button
              fullWidth variant="outlined" onClick={handleClose}
              sx={{ height: 44, fontWeight: 600, fontSize: 13, borderRadius: '10px', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
            >
              Close
            </Button>
          )}

          {/* Footer */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, mt: 1.75 }}>
            {mode === 'usdc' ? (
              <>
                <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Powered by Jupiter · 2 approvals · 0.5% slippage</Typography>
              </>
            ) : (
              <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>1 wallet approval required</Typography>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
