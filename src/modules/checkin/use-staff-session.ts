import { useCallback, useEffect, useState } from "react";

const KEY = "curtaincall.staff.sessionId";

/** Selected check-in session, persisted on the device so reloads keep context. */
export function useStaffSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSessionId(localStorage.getItem(KEY));
    setHydrated(true);
  }, []);

  const select = useCallback((id: string | null) => {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
    setSessionId(id);
  }, []);

  return { sessionId, select, hydrated };
}
