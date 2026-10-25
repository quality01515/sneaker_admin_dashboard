import { Blockhash, createSolanaRpc, type Signature } from '@solana/kit';
import axios from 'axios';
import { ConfirmAndCommitOptions, ConfirmAndCommitResult, ConfirmResult } from './types';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;

const REACT_APP_HELIUS_RPC_SECRET_URL  = process.env.REACT_APP_HELIUS_RPC_SECRET_URL;;

// Create RPC instance using server-side secret
const rpc = createSolanaRpc(REACT_APP_HELIUS_RPC_SECRET_URL);

const MAX_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 1000;

export async function confirmTransaction(signature: string, recentBlockhash?: string): Promise<ConfirmResult> {
  try {
    const signatureResult = await rpc
      .getSignatureStatuses([signature as Signature], { searchTransactionHistory: true })
      .send() as unknown as { value?: ReadonlyArray<{ confirmationStatus?: string } | null> };

    const signatureStatus = signatureResult?.value?.[0];
    console.log('signatureStatus', signatureStatus);

    // If signature status exists, check confirmation status
    if (signatureStatus) {
      const { confirmationStatus } = signatureStatus;
      const isConfirmed = confirmationStatus === 'confirmed' || confirmationStatus === 'finalized';

      return {
        expired: false,
        pending: !isConfirmed,
        confirmed: isConfirmed
      };
    }

    // No signature status found - check if blockhash is still valid
    if (!recentBlockhash) {
      return { expired: false, pending: true, confirmed: false };
    }

    const blockhashResult = await rpc.isBlockhashValid(recentBlockhash as Blockhash).send() as unknown as { value?: boolean };
    const isBlockhashValid = blockhashResult?.value === true;
    console.log('isBlockhashValid', isBlockhashValid);

    return {
      expired: !isBlockhashValid,
      pending: isBlockhashValid,
      confirmed: false
    };
  } catch (error) {
    console.error('Error confirming transaction:', error);
    return { expired: false, pending: true, confirmed: false };
  }
}

export async function waitForConfirmation(signature: string, recentBlockhash?: string): Promise<ConfirmResult> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await confirmTransaction(signature, recentBlockhash ?? '');

    if (result.confirmed || result.expired) return result;

    if (attempt < MAX_ATTEMPTS) await sleep(POLL_INTERVAL_MS);
  }

  return { expired: true, pending: false, confirmed: false };
}

export async function confirmAndCommitTransaction(options: ConfirmAndCommitOptions): Promise<ConfirmAndCommitResult> {
  const { signature, recentBlockhash, blocked_tx_id, refund_tx_id } = options;
  console.log(signature, recentBlockhash, blocked_tx_id, refund_tx_id);

  try {
    const confirmationResult = await waitForConfirmation(signature, recentBlockhash);
    if (confirmationResult.expired) return { success: false, message: 'Transaction expired' };

    try {
      const commitResponse = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/super_admin/blocked_deposits/refund/commit`,
        {tx_id: blocked_tx_id, refund_tx_id},
        {
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );
      const commitStatus = commitResponse?.data?.status ?? commitResponse?.status;

      if (commitStatus === 'completed') return { success: true };
      if (commitStatus === 'expired') return { success: false, message: 'Transaction expired' };

      return {
        success: false,
        message: 'Failed to commit transaction'
      };
    } catch (commitError) {
      const message = commitError instanceof Error ? commitError.message : 'Error calling commit API';
      return { success: false, message };
    }
  } catch (error) {
    const message = `Error during confirmation process: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return { success: false, message };
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
