import { useCallback, useEffect, useState } from "react";

const SESSION_KEY = "coffee-session";

export const createSession = (session) => {
  if (typeof window === "undefined") return;
  const payload = {
    ...session,
    token: session.token || crypto.randomUUID(),
    expira_em: session.expira_em || Date.now() + 1000 * 60 * 60 * 8,
  };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
};

export const getSession = () => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (session.expira_em && Date.now() > session.expira_em) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch (error) {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const clearSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
};

export const useSession = () => {
  const [session, setSession] = useState(null);

  const refresh = useCallback(() => {
    setSession(getSession());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { session, refresh };
};
