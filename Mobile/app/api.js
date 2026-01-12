// src/api.js
import axios from "axios";
import { Platform } from "react-native";

/**
 * ✅ Dynamic API Base URL Configuration
 * 
 * - Android Emulator: Uses 10.0.2.2 (special alias for host machine's localhost)
 * - iOS Simulator: Uses localhost directly
 * - Physical Device: Uses your machine's local network IP
 * 
 * To find your IP:
 * - Windows: Run `ipconfig` in terminal, look for IPv4 Address
 * - Mac/Linux: Run `ifconfig` or `ip addr`
 */

// 🔧 CHANGE THIS to your computer's IP when testing on physical device
const PHYSICAL_DEVICE_IP = "192.168.0.119";

const getBaseUrl = () => {
  // For development
  if (__DEV__) {
    // Android Emulator uses special IP to reach host machine
    if (Platform.OS === "android") {
      // Check if running on emulator or physical device
      // For emulator, use 10.0.2.2; for physical device, use your IP
      return "http://10.0.2.2:3000";
    }
    // iOS Simulator can use localhost
    if (Platform.OS === "ios") {
      return "http://localhost:3000";
    }
  }
  // Fallback to physical device IP
  return `http://${PHYSICAL_DEVICE_IP}:3000`;
};

export const API_BASE = getBaseUrl();

export const ENDPOINTS = {
  ME: `${API_BASE}/api/me`,
  HALL_MESSAGES: `${API_BASE}/api/messages/hall`,
  LOGIN: `${API_BASE}/api/auth/login`,
  SIGNUP: `${API_BASE}/api/auth/signup`,
  USERS: `${API_BASE}/api/users`,
  CONTACTS: `${API_BASE}/api/users/contacts`,
  PRIVATE_CONVERSATIONS: `${API_BASE}/api/messages/private/conversations`,
  PRIVATE_MESSAGES: (userId) => `${API_BASE}/api/messages/private/${userId}`,
  SEND_PRIVATE_MESSAGE: `${API_BASE}/api/messages/private`,
};

// For socket.io
export const SOCKET_URL = API_BASE;

// Authentication API functions
export const authAPI = {
  login: async (email, password) => {
    try {
      const response = await axios.post(ENDPOINTS.LOGIN, {
        email,
        password,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Login failed",
      };
    }
  },

  signup: async (name, email, password, role, avatar) => {
    try {
      const response = await axios.post(ENDPOINTS.SIGNUP, {
        name,
        email,
        password,
        role,
        avatar,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Signup failed",
      };
    }
  },

  getMe: async (token) => {
    try {
      const response = await axios.get(ENDPOINTS.ME, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to get user data",
      };
    }
  },
};
