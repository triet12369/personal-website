import { useEffect, useState } from 'react';

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((data: { admin?: boolean; name?: string | null }) => {
        setIsAdmin(data.admin ?? false);
        setAdminName(data.name ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    try {
      const res = await fetch('/api/admin/logout', { method: 'POST' });
      const data: { logoutUrl: string | null } = await res.json();
      if (data.logoutUrl) {
        window.location.href = data.logoutUrl;
      } else {
        // Dev mode: no CF Access logout URL; just clear local state.
        setIsAdmin(false);
        setAdminName(null);
      }
    } catch {
      setIsAdmin(false);
      setAdminName(null);
    }
  };

  return { isAdmin, adminName, loading, logout };
}
