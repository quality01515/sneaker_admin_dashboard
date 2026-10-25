import { useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSearchParams } from 'react-router-dom';
import { getSignature } from 'src/utils';
import { setAdminStatus } from 'src/store/adminSlice';
import { ADMIN_FLAG, ADMIN_ADDRESS, COOKIE_SIGNATURE, COOKIE_TIMESTAMP } from 'src/config';
import { useCookie } from 'src/utils/useCookie';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;

interface AdminProfileResponse {
  is_admin: boolean;
  is_super_admin: boolean;
  [key: string]: unknown;
}

const useFetchAdminRole = (
  onAuthError?: () => void,
  onAuthSuccess?: (target: string) => void,
  onSignatureSent?: () => void,
  onRejected?: () => void,
) => {
  const dispatch = useDispatch();
  const { connected, publicKey, signMessage } = useWallet();
  const [searchParams] = useSearchParams();
  const { deleteCookie } = useCookie();
  // Stable refs so callbacks never destabilise useCallback
  const onAuthErrorRef     = useRef(onAuthError);
  const onAuthSuccessRef   = useRef(onAuthSuccess);
  const onSignatureSentRef = useRef(onSignatureSent);
  const onRejectedRef      = useRef(onRejected);
  onAuthErrorRef.current     = onAuthError;
  onAuthSuccessRef.current   = onAuthSuccess;
  onSignatureSentRef.current = onSignatureSent;
  onRejectedRef.current      = onRejected;

  return useCallback(async () => {
    if (!connected || !publicKey) return null;
    if (!signMessage) {
      dispatch(setAdminStatus({ is_admin: false, is_super_admin: false }));
      return null;
    }

    try {
      const { super_admin_signature, timestamp } = await getSignature(signMessage, 'read');
      onSignatureSentRef.current?.();

      localStorage.setItem(ADMIN_ADDRESS, publicKey.toBase58());
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get_profile`,
        {
          admin_address: publicKey.toBase58(),
          timestamp,
          admin_signature: super_admin_signature,
          page: 0,
          per_page: 1
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY
          }
        }
      );

      const profile = response.data as AdminProfileResponse;
      const isAuthorised = profile.role === 'admin' || profile.role === 'super_admin';
      dispatch(setAdminStatus({ is_admin: isAuthorised, is_super_admin: profile.role === 'super_admin', hasCheckedRole: true }));

      if (isAuthorised) {
        localStorage.setItem(ADMIN_FLAG, profile.role === 'super_admin' ? '1' : '0');
        const redirectUrl = searchParams.get('redirect_url');
        const target = redirectUrl && redirectUrl.startsWith('/') ? decodeURIComponent(redirectUrl) : '/analyze';
        onAuthSuccessRef.current?.(target);
      } else {
        onAuthErrorRef.current?.();
      }

    } catch (error: any) {
      console.error('Error fetching the role of the admin', error);
      const msg: string = error?.message ?? '';
      const isRejected = /rejected|cancelled|canceled|denied/i.test(msg);
      const is401 = axios.isAxiosError(error) && error.response?.status === 401;

      if (is401) {
        deleteCookie(COOKIE_SIGNATURE);
        deleteCookie(COOKIE_TIMESTAMP);
      }

      if (isRejected) {
        onRejectedRef.current?.();
      } else {
        onAuthErrorRef.current?.();
      }
      dispatch(setAdminStatus({ is_admin: false, is_super_admin: false }));
      return null;
    }
  }, [connected, deleteCookie, dispatch, publicKey, signMessage, searchParams]);
};

export default useFetchAdminRole;
