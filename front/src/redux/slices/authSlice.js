import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { ENDPOINTS } from '../../../api';

// Async thunk for login
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await axios.post(ENDPOINTS.LOGIN, { email, password });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Async thunk for register
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async ({ name, email, password }, { rejectWithValue }) => {
    try {
      const response = await axios.post(ENDPOINTS.REGISTER, { name, email, password });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Async thunk for checking if user exists
export const checkUserExists = createAsyncThunk(
  'auth/checkUserExists',
  async (email, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${ENDPOINTS.USER_EXISTS}?email=${email}`);
      return response.data.exists;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const loadAuthFromStorage = () => {
  try {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    if (token && user) {
      return { user, token, isAuthenticated: true };
    }
  } catch (error) {
    console.error('Error loading auth from storage:', error);
  }
  return { user: null, token: null, isAuthenticated: false };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    ...loadAuthFromStorage(),
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // eslint-disable-next-line no-unused-vars
      .addCase(checkUserExists.fulfilled, (state, action) => {
        // Handle if needed
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;