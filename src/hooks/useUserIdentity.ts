import { useEffect, useState } from 'react';

const TOKEN_KEY = 'tc_blog_user_token';
const NAME_KEY = 'tc_blog_user_name';

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
        t = crypto.randomUUID();
        localStorage.setItem(TOKEN_KEY, t);
      }
      setToken(t);
      setSavedName(localStorage.getItem(NAME_KEY) ?? '');
    } catch {
      // localStorage blocked (e.g. private browsing with strict settings)
      // Fall back to an ephemeral token; is_mine will work within the session.
      setToken(crypto.randomUUID());
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
