import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import { User } from '@/types';

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in when app starts
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          // Fetch the user's real profile from Django
          const response = await api.get('/users/me/');
          setCurrentUser(response.data);
        } catch (error) {
          console.error("Session expired", error);
          logout();
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // --- DEEP CLEAN FIX ---
      // 1. Remove all existing tokens to prevent the interceptor from picking them up.
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');

      // 2. Send the login request with an empty Authorization header.
      // This explicitly overrides any global headers or interceptor logic that might 
      // accidentally attach an old/invalid token. This forces Django to verify 
      // ONLY the username and password body.
      const response = await api.post('/token/', 
        { username, password },
        {
          headers: {
            Authorization: '' // Force empty header to bypass token validation
          }
        }
      );
      
      const { access, refresh, user } = response.data; 

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      if (user) {
          setCurrentUser(user);
          localStorage.setItem('user', JSON.stringify(user));
          return true;
      }
      
      // Fallback
      const userResponse = await api.get('/users/me/');
      setCurrentUser(userResponse.data);
      localStorage.setItem('user', JSON.stringify(userResponse.data));
      return true;

    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      login,
      logout,
      isAuthenticated: !!currentUser,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};