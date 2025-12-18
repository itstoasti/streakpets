import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
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
