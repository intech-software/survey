"use client";
import { useContext, createContext, useEffect, useState } from "react";

type TokenCache = {
  accessToken: string | null;
  refreshToken: string | null;
};

const TOKEN_CACHE_KEY = "token-cache";

const loadTokenCache = (): TokenCache => {
  if (typeof window === "undefined") {
    return { accessToken: null, refreshToken: null };
  }
  try {
    const raw = sessionStorage.getItem(TOKEN_CACHE_KEY);
    if (!raw) {
      return { accessToken: null, refreshToken: null };
    }
    const parsed = JSON.parse(raw) as Partial<TokenCache>;
    return {
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
};

const persistTokenCache = (cache: TokenCache) => {
  if (typeof window === "undefined") {
    return;
  }
  if (!cache.accessToken && !cache.refreshToken) {
    sessionStorage.removeItem(TOKEN_CACHE_KEY);
    return;
  }
  sessionStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(cache));
};

let tokenCache: TokenCache = loadTokenCache();

export const getTokenCache = () => tokenCache;

export const setTokenCache = (
  accessToken: string | null,
  refreshToken: string | null
) => {
  tokenCache = { accessToken, refreshToken };
  persistTokenCache(tokenCache);
};

export const clearTokenCache = () => {
  tokenCache = { accessToken: null, refreshToken: null };
  persistTokenCache(tokenCache);
};

type TokenContextType = {
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearTokens: () => void;
};

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export const useTokens = () => {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error("useTokens must be used within a TokenProvider");
  }
  return context;
};

export const TokenProvider = ({
  children,
  initalToken,
}: {
  children: React.ReactNode;
  initalToken: { accessToken: string | null; refreshToken: string | null };
}) => {
  const [tokens, setTokensState] = useState<TokenCache>(() => {
    const initialTokens = {
      accessToken: initalToken.accessToken,
      refreshToken: initalToken.refreshToken,
    };

    // sessionStorage is scoped to one browser tab, while the initial tokens
    // come from cookies on the server. Initialize the cache before children
    // can issue their first API request.
    if (typeof window !== "undefined") {
      setTokenCache(initialTokens.accessToken, initialTokens.refreshToken);
    }
    return initialTokens;
  });
  const { accessToken, refreshToken } = tokens;

  const setTokens = (accessToken: string, refreshToken: string) => {
    setTokenCache(accessToken, refreshToken);
    setTokensState({ accessToken, refreshToken });
  };
  const clearTokens = () => {
    clearTokenCache();
    setTokensState({ accessToken: null, refreshToken: null });
  };

  useEffect(() => {
    setTokenCache(accessToken, refreshToken);
  }, [accessToken, refreshToken]);

  return (
    <TokenContext.Provider
      value={{ accessToken, refreshToken, setTokens, clearTokens }}
    >
      {children}
    </TokenContext.Provider>
  );
};
