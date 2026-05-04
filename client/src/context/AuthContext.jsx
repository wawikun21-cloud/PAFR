import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiPost, setToken, setUser, getUser, getToken, clearAuth } from '@/lib/api';

const AuthContext = createContext(null);

/**
 * AuthProvider - Manages authentication state for the application
 * Provides login, logout, and user state to all children
 */
export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [token, setTokenState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const storedToken = getToken();
    const storedUser = getUser();

    if (storedToken && storedUser) {
      setTokenState(storedToken);
      setUserState(storedUser);
    }

    setIsLoading(false);
  }, []);

  // Listen for 401 logout events from api.js
  useEffect(() => {
    const handleLogout = () => {
      setTokenState(null);
      setUserState(null);
    };

    window.addEventListener('pafr-auth-logout', handleLogout);
    return () => window.removeEventListener('pafr-auth-logout', handleLogout);
  }, []);

/**
 * Login with ID Number and password
 * @param {string} idNumber - User's ID Number (service_number)
 * @param {string} password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const login = useCallback(async (idNumber, password) => {
  try {
    const data = await apiPost('/auth/login', { id_number: idNumber, password }, false);

    if (data.status === 'success' && data.data) {
      const { token: newToken, user: newUser } = data.data;

      // Store in localStorage
      setToken(newToken);
      setUser(newUser);

      // Update state
      setTokenState(newToken);
      setUserState(newUser);

      return { success: true };
    }

    return { success: false, error: data.message || 'Login failed' };
  } catch (error) {
    return { success: false, error: error.message || 'Network error. Please try again.' };
  }
}, []);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    const currentToken = getToken();

    // Call logout endpoint if token exists
    if (currentToken) {
      try {
        await apiPost('/auth/logout', {}, true);
      } catch {
        // Ignore errors - we're logging out anyway
      }
    }

    // Clear storage and state
    clearAuth();
    setTokenState(null);
    setUserState(null);
  }, []);

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback((role) => {
    if (!user) return false;
    if (Array.isArray(role)) return role.includes(user.role);
    return user.role === role;
  }, [user]);

  /**
   * Check if user is admin
   */
  const isAdmin = hasRole('admin');

  /**
   * Check if user is reservist
   */
  const isReservist = hasRole('reservist');

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    hasRole,
    isAdmin,
    isReservist,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth - Hook to consume the AuthContext
 * @returns {object} Auth context value
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
