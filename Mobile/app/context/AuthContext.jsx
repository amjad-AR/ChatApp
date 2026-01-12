import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load token from storage on app start
  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('userData');
      
      if (storedToken) {
        setToken(storedToken);
      }
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading token:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveToken = async (newToken, userData) => {
    try {
      await AsyncStorage.setItem('authToken', newToken);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  };

  const removeToken = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  };

  const login = async (email, password) => {
    try {
      const result = await authAPI.login(email, password);
      if (result.success) {
        await saveToken(result.data.token, result.data.user);
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: 'Login failed' };
    }
  };

  const signup = async (name, email, password, role, avatar) => {
    try {
      const result = await authAPI.signup(name, email, password, role, avatar);
      if (result.success) {
        await saveToken(result.data.token, result.data.user);
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: 'Signup failed' };
    }
  };

  const logout = async () => {
    await removeToken();
  };

  const isAuthenticated = () => {
    return !!token;
  };

  const value = {
    token,
    user,
    loading,
    login,
    signup,
    logout,
    isAuthenticated,
    saveToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};