import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { apiClient, detectDefaultServerUrl, smartAgriApi } from '../services/api';
import type { AuthUser } from '../types/models';
import { AppFormatters } from '../utils/formatters';

const KEY_SERVER_URL = 'smart_agri_rn_server_url';
const KEY_ACCESS_TOKEN = 'smart_agri_rn_token';
const KEY_USER_JSON = 'smart_agri_rn_user';

interface ToastMessage {
  type: 'success' | 'error';
  text: string;
}

interface AppContextValue {
  initializing: boolean;
  user: AuthUser | null;
  serverUrl: string;
  activeAlertCount: number;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    fullName: string;
    email: string;
    phone?: string | null;
    password: string;
    role?: string;
    otpCode?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateServerUrl: (url: string) => Promise<void>;
  updateCurrentUser: (user: AuthUser) => Promise<void>;
  refreshAlertBadge: () => Promise<void>;
  showSuccess: (msg: string) => void;
  showError: (err: unknown) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [serverUrl, setServerUrlState] = useState(detectDefaultServerUrl());
  const [activeAlertCount, setActiveAlertCount] = useState(0);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((cur) => (cur?.text === text ? null : cur));
    }, 3200);
  }, []);

  const showSuccess = useCallback(
    (msg: string) => showToast('success', AppFormatters.cleanDescription(msg)),
    [showToast],
  );

  const showError = useCallback(
    (err: unknown) => showToast('error', AppFormatters.friendlyError(err)),
    [showToast],
  );

  const clearSession = useCallback(async () => {
    apiClient.setAccessToken(null);
    setUser(null);
    setActiveAlertCount(0);
    await AsyncStorage.multiRemove([KEY_ACCESS_TOKEN, KEY_USER_JSON]);
  }, []);

  useEffect(() => {
    apiClient.onUnauthorized = () => {
      void clearSession();
    };
  }, [clearSession]);

  const refreshAlertBadge = useCallback(async () => {
    if (!apiClient.getAccessToken()) return;
    try {
      const summary = await smartAgriApi.alertSummary();
      setActiveAlertCount(summary.active ?? 0);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const savedUrl = await AsyncStorage.getItem(KEY_SERVER_URL);
        if (savedUrl) {
          apiClient.setServerUrl(savedUrl);
          setServerUrlState(apiClient.getServerUrl());
        } else {
          setServerUrlState(apiClient.getServerUrl());
        }

        const savedToken = await AsyncStorage.getItem(KEY_ACCESS_TOKEN);
        const savedUser = await AsyncStorage.getItem(KEY_USER_JSON);
        if (savedToken) {
          apiClient.setAccessToken(savedToken);
          if (savedUser) {
            try {
              setUser(JSON.parse(savedUser) as AuthUser);
            } catch {}
          }
          try {
            const freshUser = await smartAgriApi.getMe();
            setUser(freshUser);
            await AsyncStorage.setItem(KEY_USER_JSON, JSON.stringify(freshUser));
            await refreshAlertBadge();
          } catch {
            // Keep cached user if transient network hiccup
          }
        }
      } finally {
        setInitializing(false);
      }
    })();
  }, [refreshAlertBadge]);

  const updateServerUrl = useCallback(async (url: string) => {
    apiClient.setServerUrl(url);
    const normalized = apiClient.getServerUrl();
    setServerUrlState(normalized);
    await AsyncStorage.setItem(KEY_SERVER_URL, normalized);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await smartAgriApi.login(email, password);
      apiClient.setAccessToken(res.accessToken);
      setUser(res.user);
      await AsyncStorage.setItem(KEY_ACCESS_TOKEN, res.accessToken);
      await AsyncStorage.setItem(KEY_USER_JSON, JSON.stringify(res.user));
      await refreshAlertBadge();
    },
    [refreshAlertBadge],
  );

  const register = useCallback(
    async (input: {
      fullName: string;
      email: string;
      phone?: string | null;
      password: string;
      role?: string;
      otpCode?: string;
    }) => {
      const res = await smartAgriApi.register(input);
      apiClient.setAccessToken(res.accessToken);
      setUser(res.user);
      await AsyncStorage.setItem(KEY_ACCESS_TOKEN, res.accessToken);
      await AsyncStorage.setItem(KEY_USER_JSON, JSON.stringify(res.user));
      await refreshAlertBadge();
    },
    [refreshAlertBadge],
  );

  const updateCurrentUser = useCallback(async (updated: AuthUser) => {
    setUser(updated);
    await AsyncStorage.setItem(KEY_USER_JSON, JSON.stringify(updated));
  }, []);

  const logout = useCallback(async () => {
    await smartAgriApi.logout();
    await clearSession();
  }, [clearSession]);

  return (
    <AppContext.Provider
      value={{
        initializing,
        user,
        serverUrl,
        activeAlertCount,
        login,
        register,
        logout,
        updateServerUrl,
        updateCurrentUser,
        refreshAlertBadge,
        showSuccess,
        showError,
      }}
    >
      <View style={styles.root}>
        {children}
        {toast && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setToast(null)}
            style={[
              styles.toast,
              toast.type === 'error' ? styles.toastError : styles.toastSuccess,
            ]}
          >
            <Text style={styles.toastText}>{toast.text}</Text>
          </TouchableOpacity>
        )}
      </View>
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 84,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 9999,
  },
  toastSuccess: {
    backgroundColor: '#15803D',
  },
  toastError: {
    backgroundColor: '#991B1B',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
