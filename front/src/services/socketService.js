import { io } from 'socket.io-client';
import { store } from '../redux/store';
import { addMessage, addPrivateMessage } from '../redux/slices/chatSlice';
import { SOCKET_URL } from '../../api';

class SocketService {
  constructor() {
    this.socket = null;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.onIncomingCall = null;
    this.onCallAccepted = null;
    this.onCallEnded = null;
    this.onRemoteStream = null;
  }

  connect(token) {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token },
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket');
      // Join user room
      const userId = store.getState().auth.user?.id;
      if (userId) {
        this.socket.emit('user:join', userId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from socket');
      this.endCall();
    });

    this.socket.on('hall:new-message', (message) => {
      store.dispatch(addMessage(this.mapMessage(message)));
    });

    // 🔔 Real-time private message handler
    this.socket.on('private:new-message', (message) => {
      console.log('📩 Received private message via socket:', message);
      const mappedMessage = this.mapPrivateMessage(message);
      console.log('📝 Mapped message:', mappedMessage);
      store.dispatch(addPrivateMessage(mappedMessage));
    });

    // Video call events
    this.socket.on('call:incoming', (data) => {
      console.log('Incoming call from:', data.fromUserId);
      if (this.onIncomingCall) {
        this.onIncomingCall(data.fromUserId, data.sdp);
      }
    });

    this.socket.on('call:accepted', (data) => {
      console.log('Call accepted by:', data.fromUserId);
      if (this.peerConnection && data.sdp) {
        this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
      }
      if (this.onCallAccepted) {
        this.onCallAccepted(data.fromUserId);
      }
    });

    this.socket.on('call:candidate', (data) => {
      if (this.peerConnection && data.candidate) {
        this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    this.socket.on('call:ended', () => {
      console.log('Call ended');
      this.endCall();
      if (this.onCallEnded) {
        this.onCallEnded();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  mapMessage(m) {
    const { auth } = store.getState();
    return {
      id: m._id,
      text: m.text,
      imageBase64: m.imageBase64,
      audioBase64: m.audioBase64,
      senderId: m.owner_id._id,
      senderName: m.owner_id.name,
      timestamp: new Date(m.createdAt).toISOString(),
      isOwn: m.owner_id._id === auth.user?.id,
    };
  }

  mapFetchedMessage(m) {
    const { auth } = store.getState();
    return {
      id: m._id,
      text: m.text,
      imageBase64: m.imageBase64,
      audioBase64: m.audioBase64,
      senderId: m.owner_id._id,
      senderName: m.owner_id.name,
      timestamp: new Date(m.createdAt).toISOString(),
      isOwn: m.owner_id._id === auth.user?.id,
    };
  }

  /**
   * Maps a private message from the server format to the client format.
   * Handles both real-time socket messages and fetched messages.
   * 
   * @param {Object} m - The message object from the server
   * @returns {Object} The mapped message object for the client
   */
  mapPrivateMessage(m) {
    const { auth } = store.getState();
    
    // 🔧 FIX: Backend uses 'receiver_id' not 'recipient_id'
    // Handle both populated object and plain ID formats
    const receiverData = m.receiver_id;
    const recipientId = typeof receiverData === 'object' && receiverData !== null 
      ? receiverData._id 
      : receiverData;
    const recipientName = typeof receiverData === 'object' && receiverData !== null 
      ? receiverData.name 
      : 'Unknown';
    
    // Get sender information (always populated from backend)
    const senderId = typeof m.owner_id === 'object' ? m.owner_id._id : m.owner_id;
    const senderName = typeof m.owner_id === 'object' ? m.owner_id.name : 'Unknown';
    
    console.log('🔄 mapPrivateMessage:', {
      messageId: m._id,
      senderId,
      recipientId,
      isOwn: senderId === auth.user?.id
    });
    
    return {
      id: m._id,
      text: m.text,
      imageBase64: m.imageBase64,
      audioBase64: m.audioBase64,
      senderId: senderId,
      senderName: senderName,
      recipientId: recipientId,
      recipientName: recipientName,
      timestamp: new Date(m.createdAt).toISOString(),
      isOwn: senderId === auth.user?.id,
    };
  }

  sendMessage(text, imageBase64) {
    if (this.socket) {
      this.socket.emit('hall:send-message', { text, imageBase64 });
    }
  }

  sendPrivateMessage(text, recipientId, imageBase64) {
    if (this.socket) {
      this.socket.emit('private:send-message', { text, recipientId, imageBase64 });
    }
  }

  // Video call methods
  async startCall(toUserId) {
    try {
      // Get local media stream
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Add local stream to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.socket) {
          this.socket.emit('call:candidate', { toUserId, candidate: event.candidate });
        }
      };

      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Send offer
      if (this.socket) {
        this.socket.emit('call:offer', { toUserId, sdp: offer });
      }

      return this.localStream;
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  async answerCall(fromUserId, offerSdp) {
    try {
      // Get local media stream
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun1.l.google.com:19302' }
        ]
      });

      // Add local stream to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.socket) {
          this.socket.emit('call:candidate', { toUserId: fromUserId, candidate: event.candidate });
        }
      };

      // Set remote description
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerSdp));

      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send answer
      if (this.socket) {
        this.socket.emit('call:answer', { toUserId: fromUserId, sdp: answer });
      }

      return this.localStream;
    } catch (error) {
      console.error('Error answering call:', error);
      throw error;
    }
  }

  endCall() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    this.remoteStream = null;

    // Notify other peer
    if (this.socket) {
      // We need to know who we're calling, but for simplicity, emit to current selected user or something
      // For now, assume we have a currentCallUserId
      if (this.currentCallUserId) {
        this.socket.emit('call:end', { toUserId: this.currentCallUserId });
      }
    }
  }

  setOnIncomingCall(callback) {
    this.onIncomingCall = callback;
  }

  setOnCallAccepted(callback) {
    this.onCallAccepted = callback;
  }

  setOnCallEnded(callback) {
    this.onCallEnded = callback;
  }

  setOnRemoteStream(callback) {
    this.onRemoteStream = callback;
  }

  setCurrentCallUserId(userId) {
    this.currentCallUserId = userId;
  }
}

export default new SocketService();