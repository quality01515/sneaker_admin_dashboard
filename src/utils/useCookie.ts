const isBrowser = typeof document !== 'undefined';

const defaultExpiresIn = 24 * 60 * 60 * 1000; // 24 hours

const serializeCookie = (name: string, value: string, expires: Date) => {
  const encodedName = encodeURIComponent(name);
  const encodedValue = encodeURIComponent(value);
  return `${encodedName}=${encodedValue}; expires=${expires.toUTCString()}; path=/; SameSite=Lax; Secure`;
};

const setCookieValue = (name: string, value: string, expiresIn = defaultExpiresIn) => {
  if (!isBrowser) return;

  const expirationDate = new Date(Date.now() + expiresIn);
  document.cookie = serializeCookie(name, value, expirationDate);
};

const getCookieValue = (name: string): string | null => {
  if (!isBrowser) return null;

  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const cookie of cookies) {
    const [cookieName, ...valueParts] = cookie.split('=');
    if (decodeURIComponent(cookieName) === name) {
      return decodeURIComponent(valueParts.join('='));
    }
  }
  return null;
};

const deleteCookieValue = (name: string) => {
  if (!isBrowser) return;
  const expirationDate = new Date(0);
  document.cookie = serializeCookie(name, '', expirationDate);
};

export const deleteCookie = deleteCookieValue;
export { getCookieValue };

export const useCookie = () => ({
  setCookie: setCookieValue,
  getCookie: getCookieValue,
  deleteCookie: deleteCookieValue
});
