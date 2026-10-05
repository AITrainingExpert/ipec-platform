import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { getSession, signOut as dbSignOut, ensureSeed } from './db';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true, setUser: () => {}, logout: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureSeed();
    getSession().then(u => { setUser(u); setLoading(false); });
  }, []);

  const logout = async () => { await dbSignOut(); setUser(null); };

  return <Ctx.Provider value={{ user, loading, setUser, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
