import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import socketService from '../../services/socketService';
import { ENDPOINTS } from '../../../api';

// Async thunk for fetching messages
export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await axios.get(ENDPOINTS.HALL_MESSAGES, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      // Import socketService to map messages
      const socketService = (await import('../../services/socketService')).default;
      return response.data.map(msg => socketService.mapFetchedMessage(msg));
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Async thunk for fetching users
export const fetchUsers = createAsyncThunk(
  'chat/fetchUsers',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await axios.get(ENDPOINTS.USERS, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Async thunk for fetching private messages
export const fetchPrivateMessages = createAsyncThunk(
  'chat/fetchPrivateMessages',
  async (userId, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      console.log('Fetching private messages for userId:', userId);
      const response = await axios.get(`${ENDPOINTS.PRIVATE_MESSAGES}/${userId}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      console.log('Private messages response:', response.data);
      const socketService = (await import('../../services/socketService')).default;
      const messages = response.data.map(msg => socketService.mapPrivateMessage(msg));
      const currentUserId = auth.user.id;
      const chatKey = [currentUserId, userId].sort().join('-');
      console.log('Mapped messages:', messages, 'chatKey:', chatKey);
      return { messages, chatKey };
    } catch (error) {
      console.error('Error fetching private messages:', error);
      return rejectWithValue(error.response.data);
    }
  }
);

// Async thunk for sending private message
export const sendPrivateMessage = createAsyncThunk(
  'chat/sendPrivateMessage',
  async ({ text, recipientId, imageBase64, audioBase64 }, { getState, rejectWithValue, dispatch }) => {
    try {
      const { auth } = getState();
      const response = await axios.post(ENDPOINTS.PRIVATE_MESSAGES, { text, imageBase64, audioBase64, receiver_id: recipientId }, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const message = socketService.mapPrivateMessage(response.data);
      dispatch(addPrivateMessage(message));
      return { text, recipientId, imageBase64, audioBase64 };
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Async thunk for sending message
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ text, imageBase64, audioBase64 }, { getState, rejectWithValue, dispatch }) => {
    try {
      const { auth } = getState();
      const response = await axios.post(ENDPOINTS.HALL_MESSAGES, { text, imageBase64, audioBase64 }, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const message = socketService.mapFetchedMessage(response.data);
      dispatch(addMessage(message));
      return { text, imageBase64, audioBase64 };
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);


const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    messages: [],
    privateMessages: {},
    users: [],
    selectedUser: null,
    currentChatType: 'group', // 'group' or 'private'
    loading: false,
    error: null,
  },
  reducers: {
    addMessage: (state, action) => {
      if (!state.messages.find(m => m.id === action.payload.id)) {
        state.messages.push(action.payload);
      }
    },
    /**
     * Adds a private message to the correct conversation.
     * Uses chatKey (sorted IDs) to ensure both sender and receiver see the same conversation.
     * 
     * @param {Object} action.payload - The mapped message object
     * @param {string} action.payload.senderId - The sender's user ID
     * @param {string} action.payload.recipientId - The recipient's user ID
     */
    addPrivateMessage: (state, action) => {
      const { senderId, recipientId, id: messageId, text } = action.payload;
      
      // 🔧 Validate required fields to prevent undefined chatKey
      if (!senderId || !recipientId) {
        console.error('❌ addPrivateMessage: Missing senderId or recipientId', {
          senderId,
          recipientId,
          payload: action.payload
        });
        return;
      }
      
      // Create a consistent chatKey by sorting the two user IDs
      // This ensures both users see messages in the same conversation
      const chatKey = [senderId, recipientId].sort().join('-');
      
      console.log('💬 addPrivateMessage:', {
        chatKey,
        messageId,
        text: text?.substring(0, 20) + '...',
        senderId,
        recipientId
      });
      
      // Initialize conversation array if it doesn't exist
      if (!state.privateMessages[chatKey]) {
        state.privateMessages[chatKey] = [];
        console.log('📁 Created new conversation:', chatKey);
      }
      
      // Prevent duplicate messages (same ID)
      const isDuplicate = state.privateMessages[chatKey].some(m => m.id === messageId);
      if (!isDuplicate) {
        state.privateMessages[chatKey].push(action.payload);
        console.log('✅ Message added to conversation');
      } else {
        console.log('⚠️ Duplicate message ignored:', messageId);
      }
    },
    selectUser: (state, action) => {
      state.selectedUser = action.payload;
      state.currentChatType = action.payload ? 'private' : 'group';
    },
    connectSocket: (state, action) => {
      socketService.connect(action.payload);
    },
    disconnectSocket: () => {
      socketService.disconnect();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.users;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchPrivateMessages.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPrivateMessages.fulfilled, (state, action) => {
        state.loading = false;
        const { messages, chatKey } = action.payload;
        state.privateMessages[chatKey] = messages;
      })
      .addCase(fetchPrivateMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // eslint-disable-next-line no-unused-vars
      .addCase(sendMessage.fulfilled, (state, action) => {
        // Message will be added via socket
      })
      // eslint-disable-next-line no-unused-vars
      .addCase(sendPrivateMessage.fulfilled, (state, action) => {
        // Message will be added via socket
      })
  },
});

export const { addMessage, addPrivateMessage, selectUser, connectSocket, disconnectSocket } = chatSlice.actions;
export default chatSlice.reducer;