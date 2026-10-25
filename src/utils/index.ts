import type { NavigateFunction } from 'react-router-dom';
import { ChainId, getChainConfig, SIGNING_MESSAGE_PREFIX } from 'src/config';
import { useCookie } from './useCookie';
import { deleteCookie } from './useCookie';
import { COOKIE_SIGNATURE, COOKIE_TIMESTAMP, ADMIN_ADDRESS, ADMIN_FLAG } from 'src/config';
import { store } from 'src/store';
import { resetAdminStatus } from 'src/store/adminSlice';

/** Error thrown when signature is expired or signing fails - caller should redirect to login */
export class SignatureExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SignatureExpiredError';
  }
}

/** Builds login URL with redirect_url param for returning after sign-in */
export const getLoginRedirectUrl = () => {
  const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
  return `/login?redirect_url=${returnUrl}`;
};

/**
 * Clears auth state and redirects to login. Call this when session expires to avoid
 * redirect loops (Login page would otherwise see stale adminFlag and redirect back).
 */
export const handleSessionExpired = (navigate: NavigateFunction) => {
  localStorage.setItem(ADMIN_FLAG, '-1');
  store.dispatch(resetAdminStatus());
  deleteCookie(COOKIE_SIGNATURE);
  deleteCookie(COOKIE_TIMESTAMP);
  navigate(getLoginRedirectUrl(), { replace: true });
};

/**
 * Truncates a blockchain address to first N and last N characters (e.g. "7xKX...9b2F").
 * @param address - Full address string (null/undefined/empty returns empty string)
 * @param first - Number of chars to show at start (default 4)
 * @param last - Number of chars to show at end (default 4)
 */
export const truncateAddress = (
  address: string | null | undefined,
  first = 4,
  last = 4
): string => {
  if (address == null || address === "") return "";
  return address.length > first + last
    ? `${address.slice(0, first)}...${address.slice(-last)}`
    : address;
};

/** @deprecated Use truncateAddress instead */
export const getOmittedAddress = (address: string) => truncateAddress(address, 5, 5);

export const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(String(dateStr).replace(' ', 'T'));
  if (isNaN(date.getTime())) return String(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffS = Math.floor(diffMs / 1000);
  if (diffS < 60) return `${diffS}s ago`;
  const diffM = Math.floor(diffS / 60);
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
};

export const findDiffBetweenDates = (start: Date, end: Date): string => {
  const DAY = 1000 * 60 * 60 * 24;
  const HOUR = 1000 * 60 * 60;
  const MINUTE = 1000 * 60;

  const diff = end.getTime() - start.getTime();
  const days = Math.floor(diff / DAY);
  const hours = Math.floor((diff - days * DAY) / HOUR);
  const minutes = Math.floor((diff - days * DAY - hours * HOUR) / MINUTE);

  if (days === 0) {
    if (hours === 0) return `${minutes}m ago`;
    if (minutes > 0) return `${hours}h ${minutes}m ago`;
    return `${hours}h ago`;
  }
  if (hours > 0) return `${days}d ${hours}h ago`;
  return `${days}d ago`;
};

export function formatNativeAmount(amount: number, chainId: number): string {
  const chainConfig = getChainConfig(chainId);
  const decimal = chainConfig.decimal;
  if (amount < Math.pow(10, -decimal)) {
    return '0';
  }
  return (amount / Math.pow(10, decimal)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  });
}

export const getSignedMessageByWallet = async (
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  message: string
) => {
  try {
    if (!signMessage) throw new Error('Wallet does not support message signing');

    if (!message) throw new Error('Message is required');

    // Convert message to Uint8Array for signing
    const messageBytes = new TextEncoder().encode(SIGNING_MESSAGE_PREFIX + message);


    // Sign the message
    const signature = await signMessage(messageBytes);

    // Convert signature to base64 string using browser-compatible method
    const base64String = btoa(String.fromCharCode(...Array.from(signature)));
    return base64String;
  } catch (error: any) {
    console.error('Error signing message:', error.message);
    throw new Error(error.message || 'Failed to sign message');
  }
};

export const getSignature = async (
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | undefined, message: string
) => {
  const { setCookie, getCookie, deleteCookie } = useCookie();
  try {
    if (getCookie(COOKIE_SIGNATURE) == null) {
      const timestamp = new Date().getTime();
      if (!signMessage) {
        throw new Error('Wallet signMessage function is required');
      }
      const full_message = `${message}:${timestamp}`;
      let admin_signature = await getSignedMessageByWallet( signMessage, full_message);
      setCookie(COOKIE_SIGNATURE, admin_signature);
      setCookie(COOKIE_TIMESTAMP, timestamp.toString());
      return {super_admin_signature: admin_signature, timestamp};
    }else{
      const timestamp = new Date().getTime();
      const current_timestamp = getCookie(COOKIE_TIMESTAMP)? getCookie(COOKIE_TIMESTAMP): timestamp.toString();
      const timeDifference = timestamp - parseInt(current_timestamp, 10);
      const hoursDifference = timeDifference / (1000 * 60 * 60);
      if (hoursDifference >= 1) {
        if (!signMessage) {
          throw new Error('Wallet signMessage function is required');
        }
        const full_message = `${message}:${timestamp}`;
        let admin_signature = await getSignedMessageByWallet( signMessage, full_message);
        setCookie(COOKIE_SIGNATURE, admin_signature);
        setCookie(COOKIE_TIMESTAMP, timestamp.toString());
        return {super_admin_signature: admin_signature, timestamp};
      }else{
        return ({super_admin_signature: getCookie(COOKIE_SIGNATURE), timestamp: Number(getCookie(COOKIE_TIMESTAMP))});
      }
    }
  } catch (error: any) {
    console.error('Error signing message:', error.message);
    throw new SignatureExpiredError(error.message || 'Failed to sign message');
  }
};