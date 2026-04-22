import { useState, useEffect } from 'react';
import { isAuthenticated, getUser } from '~/lib/auth';

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated);
  const [user, setUser] = useState(getUser);

  useEffect(() => {
    // Re-evaluate on focus (tab switch, window restore)
    function check() {
      const ok = isAuthenticated();
      setAuthenticated(ok);
      setUser(ok ? getUser() : null);
    }

    window.addEventListener('focus', check);
    // Periodic check every 30 seconds catches expiry mid-session
    const interval = setInterval(check, 30_000);

    return () => {
      window.removeEventListener('focus', check);
      clearInterval(interval);
    };
  }, []);

  return { authenticated, user };
}
