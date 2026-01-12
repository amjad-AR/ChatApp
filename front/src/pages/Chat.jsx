import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMessages,
  sendMessage,
  fetchUsers,
  fetchPrivateMessages,
  sendPrivateMessage,
  selectUser,
  connectSocket,
  disconnectSocket
} from "../redux/slices/chatSlice";
import { logout } from "../redux/slices/authSlice";
import { useNavigate, Link } from "react-router-dom";
import { FiSend, FiUser, FiLogOut, FiMessageSquare, FiUsers, FiPhone } from "react-icons/fi";
import bg from "../assets/bg.jpg";
import VideoCall from "../components/chat/VideoCall";

const Chat = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    messages,
    privateMessages,
    users,
    selectedUser,
    currentChatType,
    loading
  } = useSelector((state) => state.chat);
  const { token, user: currentUser } = useSelector((state) => state.auth);
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [isVideoCallVisible, setIsVideoCallVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const fileInputRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  useEffect(() => {
    if (token) {
      dispatch(connectSocket(token));
      dispatch(fetchMessages());
      dispatch(fetchUsers());
    }

    return () => {
      dispatch(disconnectSocket());
    };
  }, [dispatch, token]);

  useEffect(() => {
    if (selectedUser && token) {
      dispatch(fetchPrivateMessages(selectedUser._id));
    }
  }, [dispatch, selectedUser, token]);

  useEffect(() => {
    const savedId = localStorage.getItem('selectedUserId');
    if (savedId && users.length > 0 && !selectedUser) {
      const user = users.find(u => u._id === savedId);
      if (user) {
        dispatch(selectUser(user));
      }
    }
  }, [users, selectedUser, dispatch]);

  const handleSend = async () => {
    if (text.trim() || selectedImage) {
      let imageBase64 = null;
      if (selectedImage) {
        imageBase64 = await convertImageToBase64(selectedImage);
      }
      if (currentChatType === 'private' && selectedUser) {
        dispatch(sendPrivateMessage({ text, recipientId: selectedUser._id, imageBase64 }));
      } else {
        dispatch(sendMessage({ text, imageBase64 }));
      }
      setText("");
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const base64 = await convertBlobToBase64(blob);
        
        if (currentChatType === 'private' && selectedUser) {
          dispatch(sendPrivateMessage({ audioBase64: base64, recipientId: selectedUser._id }));
        } else {
          dispatch(sendMessage({ audioBase64: base64 }));
        }
        
        stream.getTracks().forEach(track => track.stop());
        setAudioChunks([]);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Failed to start recording. Please check microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      setRecordingDuration(0);
    }
  };

  const convertBlobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result;
        // Remove data:audio/webm;base64, prefix
        const base64 = base64data.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const playAudio = (audioBase64) => {
    const audio = new Audio(`data:audio/webm;base64,${audioBase64}`);
    audio.play().catch(err => {
      console.error("Error playing audio:", err);
      alert("Failed to play audio");
    });
  };

  const handleUserSelect = (user) => {
    dispatch(selectUser(user));
    localStorage.setItem('selectedUserId', user._id);
  };

  const handleBackToGroup = () => {
    dispatch(selectUser(null));
    localStorage.removeItem('selectedUserId');
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const handleVideoCall = () => {
    setIsVideoCallVisible(true);
  };

  const handleCloseVideoCall = () => {
    setIsVideoCallVisible(false);
  };

  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
    }
  };


  // Get current messages based on chat type
  const getCurrentMessages = () => {
    if (currentChatType === 'private' && selectedUser && currentUser) {
      const chatKey = [currentUser.id, selectedUser._id].sort().join('-');
      const msgs = privateMessages[chatKey] || [];
      console.log('Getting private messages for chatKey:', chatKey, 'messages:', msgs);
      return msgs;
    }
    console.log('Getting group messages:', messages);
    return messages;
  };

  const currentMessages = getCurrentMessages();

  return (
    <section
      style={{ backgroundImage: `url(${bg})`, backgroundSize: "cover" }}
      className="flex items-center justify-center h-screen p-4"
    >
      <div className="flex h-[80%] w-[70%]  text-white rounded-2xl overflow-hidden shadow-lg">
        {/* Sidebar */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
          className="w-1/4 bg-white/10 border-r border-white/20 flex flex-col p-2"
        >
          <div className="p-4 border-b border-white/20">
            <h2 className="text-lg font-semibold flex items-center">
              <FiMessageSquare className="mr-2" />
              Chats
            </h2>
            <Link
              to="/profile"
              className="flex items-center mt-2 text-[#8973b3] hover:text-white"
            >
              <FiUser className="mr-2" />
              Profile
            </Link>
          </div>
          
          <div className="flex-1 overflow-y-auto pt-1 space-y-2">
            {/* Group Chat */}
            <div
              onClick={handleBackToGroup}
              className={`p-3 flex items-center rounded-xl cursor-pointer transition-colors ${
                currentChatType === 'group'
                  ? 'bg-[#8973b3]/30'
                  : 'bg-[#8973b3]/10 hover:bg-[#8973b3]/20'
              }`}
            >
              <div className="w-8 h-8 bg-[#8973b3] rounded-full flex items-center justify-center mr-3">
                <FiMessageSquare className="text-white" />
              </div>
              <span className="text-sm">Group Chat</span>
            </div>

            {/* Users List */}
            <div className="border-t border-white/10 pt-2">
              <div className="flex items-center mb-2 px-3">
                <FiUsers className="mr-2 text-gray-300" />
                <span className="text-sm text-gray-300">Users</span>
              </div>
              {users.filter(user => user._id !== currentUser?.id).map((user) => (
                <div
                  key={user._id}
                  onClick={() => handleUserSelect(user)}
                  className={`p-3 flex items-center rounded-xl cursor-pointer transition-colors ${
                    selectedUser?._id === user._id
                      ? 'bg-[#8973b3]/30'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center mt-2 text-red-400 hover:text-red-300"
          >
            <FiLogOut className="mr-2" />
            Logout
          </button>
        </div>

        {/* Chat Area */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
          className="flex-1 flex flex-col"
        >
          <div className="p-4 border-b border-white/20 bg-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {currentChatType === 'private' && selectedUser && (
                  <button
                    onClick={handleBackToGroup}
                    className="mr-3 p-1 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <span className="text-white">←</span>
                  </button>
                )}
                <div className="flex items-center">
                  {currentChatType === 'private' && selectedUser ? (
                    <>
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm font-semibold">
                          {selectedUser.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                        <p className="text-xs text-gray-300">{selectedUser.email}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <FiMessageSquare className="mr-3" />
                      <h3 className="text-lg font-semibold">Group Chat</h3>
                    </>
                  )}
                </div>
              </div>
              {currentChatType === 'private' && selectedUser && (
                <button
                  onClick={handleVideoCall}
                  className="p-2 rounded-full bg-[#8973b3] hover:bg-[#7a63a3] text-white transition-colors"
                  title="Start Video Call"
                >
                  <FiPhone />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {currentMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.isOwn ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs p-3 rounded-lg ${
                    msg.isOwn
                      ? "bg-[#8973b3] text-white"
                      : "bg-white/20 text-white"
                  }`}
                >
                  {msg.imageBase64 && (
                    <div className="mb-2 p-2 bg-black/20 rounded">
                      <img
                        src={msg.imageBase64}
                        alt="Shared image"
                        className="max-w-full max-h-64 object-contain rounded border border-white/30"
                        onError={(e) => console.error('Image failed to load:', e)}
                      />
                    </div>
                  )}
                  {msg.audioBase64 && (
                    <div className="mb-2 p-2 bg-black/20 rounded">
                      <button
                        onClick={() => playAudio(msg.audioBase64)}
                        className="flex items-center space-x-2 px-4 py-2 bg-[#8973b3] hover:bg-[#7a63a3] rounded text-white transition-colors"
                      >
                        <span>🎤</span>
                        <span>Play Voice Message</span>
                      </button>
                    </div>
                  )}
                  {msg.text && <p>{msg.text}</p>}
                  <small className="text-xs opacity-70">
                    {msg.senderName} - {new Date(msg.timestamp).toLocaleString()}
                  </small>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-white/20 bg-white/10 backdrop-blur-md flex items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="mr-2 p-2 bg-white/10 border border-white/20 rounded text-white file:bg-[#8973b3] file:text-white file:border-none file:rounded file:px-2 file:py-1"
            />
            {isRecording && (
              <div className="mr-2 px-3 py-2 bg-red-500/20 border border-red-500/50 rounded text-white text-sm">
                {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, "0")}
              </div>
            )}
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder={
                currentChatType === 'private' && selectedUser
                  ? `Message ${selectedUser.name}...`
                  : "Type a message..."
              }
              className="flex-1 p-3 bg-white/10 border border-white/20 rounded-l text-white placeholder-gray-400 focus:outline-none focus:border-[#8973b3]"
            />
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`px-4 py-3 ${isRecording ? 'bg-red-500' : 'bg-[#8973b3]'} text-white rounded hover:bg-[#7a63a3] disabled:opacity-50 flex items-center mr-2`}
              title="Hold to record voice message"
            >
              🎤
            </button>
            <button
              onClick={handleSend}
              disabled={loading}
              className="px-4 py-3 bg-[#8973b3] text-white rounded-r hover:bg-[#7a63a3] disabled:opacity-50 flex items-center"
            >
              <FiSend />
            </button>
          </div>
        </div>
      </div>
      <VideoCall
        isVisible={isVideoCallVisible}
        onClose={handleCloseVideoCall}
        selectedUser={selectedUser}
      />
    </section>
  );
};

export default Chat;
