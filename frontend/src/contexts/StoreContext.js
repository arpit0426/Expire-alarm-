import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { logger } from "../lib/logger";
import { useAuth } from "./AuthContext";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const { user } = useAuth();
  const [store, setStore] = useState(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setStore(null);
      return;
    }
    try {
      const { data } = await api.get("/store");
      setStore(data);
    } catch (err) {
      logger.warn("store load failed:", err?.message);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <StoreContext.Provider value={{ store, refresh, setStore }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const v = useContext(StoreContext);
  if (!v) throw new Error("useStore must be used inside <StoreProvider>");
  return v;
}
