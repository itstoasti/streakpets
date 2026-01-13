import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip auth checks if Supabase is not configured
    if (!isSupabaseConfigured()) {
      // Clear any cached Supabase auth data to prevent network errors
      const clearStaleAuth = async () => {
        try {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          const keys = await AsyncStorage.getAllKeys();
          const supabaseKeys = keys.filter(key =>
            key.startsWith('supabase.') ||
            key.includes('auth-token') ||
            key.includes('.auth.')
          );
          if (supabaseKeys.length > 0) {
            await AsyncStorage.multiRemove(supabaseKeys);
          }
        } catch (error) {
          // Silently fail if we can't clear the cache
        }
        setLoading(false);
      };
      clearStaleAuth();
      return () => {}; // Return empty cleanup function
    }

    // Initialize auth state
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        // AuthSessionMissingError is expected when no user is logged in - ignore it
        if (error && error.name !== 'AuthSessionMissingError' && !error?.message?.includes('Auth session missing')) {
          console.log('Auth initialization error:', error.message);
        }

        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        // Silently handle auth errors - user just isn't logged in
        // AuthSessionMissingError is expected when no user is logged in
        if (error?.name !== 'AuthSessionMissingError' && !error?.message?.includes('Auth session missing')) {
          console.log('Auth error:', error?.message);
        }
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Cleanup subscription on unmount
    return () => subscription?.unsubscribe();
  }, []);

  const value = {
    user,
    session,
    loading,

    /**
     * Sign up a new user with email and password
     * @param {string} email - User's email address
     * @param {string} password - User's password
     * @returns {Promise<{data, error}>}
     */
    signUp: async (email, password) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      return { data, error };
    },

    /**
     * Sign in an existing user with email and password
     * @param {string} email - User's email address
     * @param {string} password - User's password
     * @returns {Promise<{data, error}>}
     */
    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    },

    /**
     * Sign out the current user
     * @returns {Promise<{error}>}
     */
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      return { error };
    },

    /**
     * Send password reset email
     * @param {string} email - User's email address
     * @returns {Promise<{data, error}>}
     */
    resetPassword: async (email) => {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'streakpets://reset-password',
      });
      return { data, error };
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to access authentication context
 * Must be used within AuthProvider
 * @returns {{user, session, loading, signUp, signIn, signOut, resetPassword}}
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
