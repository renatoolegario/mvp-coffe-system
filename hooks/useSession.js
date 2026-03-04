import { useCallback, useEffect, useState } from "react";
import { addDaysLocalDateTime, toTimestampMillis } from "../utils/datetime";

const SESSION_KEY = "coffee-session";

const resolveExpiry = (expiraEm) => {
  if (typeof expiraEm === "number") return expiraEm;
  const parsed = toTimestampMillis(expiraEm);
  return parsed ?? toTimestampMillis(addDaysLocalDateTime(7));
};

export const createSession = (session) => {
  if (typeof window === "undefined") return;
  const payload = {
    ...session,
    token: session.token || crypto.randomUUID(),
    expira_em: session.expira_em || addDaysLocalDateTime(7),
  };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
};

export const getSession = () => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    const expiraEm = resolveExpiry(session.expira_em);
    if (expiraEm && Date.now() > expiraEm) {
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

export const getAuthToken = () => {
  const session = getSession();
  return session?.token || "";
};

export const getAuthHeaders = () => {
  const token = getAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

export const authenticatedFetch = (path, options = {}) =>
  fetch(path, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

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
