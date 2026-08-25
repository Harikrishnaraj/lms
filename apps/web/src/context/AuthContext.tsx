import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: string;
  streakDays: number;
  overallProgress: number;
  hoursLearned: number;
}

interface AuthContextProps {
  user: User | null;
  login: (email: string, password?: string) => Promise<{ requiresVerification: boolean; email?: string }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  sendResetOtp: (email: string) => Promise<void>;
  verifyResetOtp: (email: string, code: string) => Promise<void>;
  resetPassword: (email: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('lms_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = async (email: string, password?: string) => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Login failed');
    }

    const data = await response.json();

    if (data.requiresVerification) {
      return { requiresVerification: true, email: data.email };
    }

    setUser(data);
    localStorage.setItem('lms_user', JSON.stringify(data));
    return { requiresVerification: false };
  };

  const verifyEmail = async (email: string, code: string) => {
    const response = await fetch('/api/v1/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Verification failed');
    }

    const data = await response.json();
    setUser(data);
    localStorage.setItem('lms_user', JSON.stringify(data));
  };

  const sendResetOtp = async (email: string) => {
    const response = await fetch('/api/v1/auth/forgot-password/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to send reset code');
    }
  };

  const verifyResetOtp = async (email: string, code: string) => {
    const response = await fetch('/api/v1/auth/forgot-password/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Invalid or expired code');
    }
  };

  const resetPassword = async (email: string, newPassword: string) => {
    const response = await fetch('/api/v1/auth/forgot-password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Password reset failed');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('lms_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, verifyEmail, sendResetOtp, verifyResetOtp, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
