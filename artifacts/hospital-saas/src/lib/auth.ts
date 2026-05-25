import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey, useGetMe } from "@workspace/api-client-react";

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  name: string;
  hospitalId?: number | null;
  hospitalName?: string | null;
  avatarUrl?: string | null;
}

const TOKEN_KEY = "medicore_token";

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function useAuth() {
  const queryClient = useQueryClient();
  const token = getToken();

  const { data: user, isLoading, refetch } = useGetMe({
    query: {
      enabled: !!token,
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  const login = useCallback(
    (newToken: string, userData: AuthUser) => {
      setToken(newToken);
      queryClient.setQueryData(getGetMeQueryKey(), userData);
      refetch();
    },
    [queryClient, refetch]
  );

  const logout = useCallback(() => {
    clearToken();
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.clear();
  }, [queryClient]);

  // If there is no token, we are definitively not loading and have no user
  const isAuthLoading = !!token && isLoading;

  return {
    user,
    token,
    login,
    logout,
    isLoading: isAuthLoading,
    isAuthenticated: !!user && !!token,
  };
}
