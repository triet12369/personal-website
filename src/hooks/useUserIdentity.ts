import { useEffect, useState } from 'react';

const TOKEN_KEY = 'tc_blog_user_token';
const NAME_KEY = 'tc_blog_user_name';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older iOS / environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r =
      typeof crypto !== 'undefined' && crypto.getRandomValues
        ? (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> (c === 'x' ? 0 : 1)
        : (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Provides a stable, localStorage-persisted UUID token that identifies this
 * browser, plus the most recently saved display name for pre-filling forms.
 *
 * Returns empty strings during SSR / before the first useEffect fires.
 * Consumers should treat an empty token as "identity not yet loaded".
 */
export function useUserIdentity() {
  const [token, setToken] = useState('');
  const [savedName, setSavedName] = useState('');

  useEffect(() => {
    try {
      let t = localStorage.getItem(TOKEN_KEY);
      if (!t) {
        t = generateUUID();
        localStorage.setItem(TOKEN_KEY, t);
      }
      setToken(t);
      setSavedName(localStorage.getItem(NAME_KEY) ?? '');
    } catch {
      // localStorage blocked (e.g. private browsing with strict settings)
      // Fall back to an ephemeral token; is_mine will work within the session.
      setToken(generateUUID());
    }
  }, []);

  const saveName = (name: string) => {
    if (!name) return;
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {
      // ignore
    }
    setSavedName(name);
  };

  return { token, savedName, saveName };
}
