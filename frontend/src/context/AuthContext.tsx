import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserPlan, PLAN_SIGNAL_LIMITS, TradingSymbol, Timeframe } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authMode: 'login' | 'register';
  googleClientId: string;
  isGoogleAuthEnabled: boolean;
  userPlan: UserPlan;
  isProOrUltra: boolean;
  signalLimit: number;
  login: (email: string, password?: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  googleLogin: (credential?: string, accessToken?: string) => Promise<void>;
  logout: () => void;
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  updatePreferences: (symbol?: TradingSymbol, timeframe?: Timeframe) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'forexpro_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [googleClientId, setGoogleClientId] = useState<string>('');
  const [isGoogleAuthEnabled, setIsGoogleAuthEnabled] = useState<boolean>(false);

  // Computed plan properties
  const userPlan: UserPlan = user?.plan || 'free';
  const isProOrUltra = userPlan === 'pro' || userPlan === 'ultra';
  const signalLimit = PLAN_SIGNAL_LIMITS[userPlan] || 1;

  // Load Google Auth Config & verify existing token
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // Fetch oauth config
        const config = await api.auth.getConfig();
        if (isMounted && config) {
          setGoogleClientId(config.googleClientId || '');
          setIsGoogleAuthEnabled(config.isGoogleAuthEnabled);
        }
      } catch (err) {
        console.warn('Failed to fetch auth config:', err);
      }

      // Check current token
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        try {
          const profile = await api.auth.getMe();
          if (isMounted && profile) {
            setUser(profile);
            setToken(storedToken);
          }
        } catch (err) {
          console.warn('Stored token is invalid or expired:', err);
          localStorage.removeItem(TOKEN_KEY);
          if (isMounted) {
            setUser(null);
            setToken(null);
          }
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshUser = async () => {
    try {
      const profile = await api.auth.getMe();
      if (profile) {
        setUser(profile);
      }
    } catch {}
  };

  const updatePreferences = async (symbol?: TradingSymbol, timeframe?: Timeframe) => {
    if (!user) return;
    try {
      const updated = await api.auth.updatePreferences({ symbol, timeframe });
      setUser(updated);
    } catch (err) {
      console.warn('Lỗi cập nhật sở thích người dùng:', err);
    }
  };

  const login = async (email: string, password?: string) => {
    const data = await api.auth.login({ email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    setIsAuthModalOpen(false);
  };

  const register = async (email: string, password: string, name: string) => {
    const data = await api.auth.register({ email, password, name });
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    setIsAuthModalOpen(false);
  };

  const googleLogin = async (credential?: string, accessToken?: string) => {
    const data = await api.auth.googleAuth({ credential, accessToken });
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        isAuthModalOpen,
        authMode,
        googleClientId,
        isGoogleAuthEnabled,
        userPlan,
        isProOrUltra,
        signalLimit,
        login,
        register,
        googleLogin,
        logout,
        openAuthModal,
        closeAuthModal,
        updatePreferences,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
