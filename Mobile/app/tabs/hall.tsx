import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, View, Image, TouchableOpacity, Text, Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Chat, MessageType, User } from "@flyerhq/react-native-chat-ui";
import axios from "axios";
import { ENDPOINTS, SOCKET_URL } from "../api";
import { io, Socket } from "socket.io-client";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import { useAuth } from "../context/AuthContext";
import { defaultTheme } from "@flyerhq/react-native-chat-ui";

const HALL_URL = ENDPOINTS.HALL_MESSAGES;
const ME_URL = ENDPOINTS.ME;

// 👇 Your avatars
const AVATARS = [
  {
    id: 1,
    src: require("../../assets/images/luffy.jpg"),
    bg: "#efc119ff",
  },
  {
    id: 2,
    src: require("../../assets/images/za.jpg"),
    bg: "#efc119ff",
  },
  {
    id: 3,
    src: require("../../assets/images/tom.jpg"),
    bg: "#efc119ff",
  },
  {
    id: 4,
    src: require("../../assets/images/sar.jpg"),
    bg: "#efc119ff",
  },
  {
    id: 5,
    src: require("../../assets/images/messi.jpg"),
    bg: "#efc119ff",
  },
  {
    id: 6,
    src: require("../../assets/images/ronaldo.jpg"),
    bg: "#efc119ff",
  },
  {
    id: 7,
    src: require("../../assets/images/ben.jpg"),
    bg: "#efc119ff",
  },
  {
    id: 8,
    src: require("../../assets/images/dog.jpg"),
    bg: "#efc119ff",
  },
];

// 👇 Cache so each user keeps the same random avatar
const avatarCache: Record<string, string> = {};

const getAvatarForUser = (userId: string) => {
  if (!userId) userId = "unknown";

  if (!avatarCache[userId]) {
    const randomAvatar =
      AVATARS[Math.floor(Math.random() * AVATARS.length)];
    // Convert require(...) to a URI string
    const uri = Image.resolveAssetSource(randomAvatar.src).uri;
    avatarCache[userId] = uri;
  }

  return avatarCache[userId];
};

// 👇 Helper: turn API message (with optional imageBase64 or audioBase64) into Chat message
const mapApiMessageToChat = (m: any): MessageType.Any => {
  const ownerId = m.owner_id?._id || "unknown";

  const base = {
    id: m._id,
    createdAt: new Date(m.createdAt).getTime(),
    author: {
      id: ownerId,
      firstName: m.owner_id?.name,
      // use random avatar based on user id
      imageUrl: getAvatarForUser(ownerId),
    },
  };

  if (m.imageBase64) {
    const imageMessage: MessageType.Image = {
      ...base,
      type: "image",
      name: "Image",
      size: 0,
      uri: `data:image/jpeg;base64,${m.imageBase64}`,
      width: 0,
      height: 0,
    };
    return imageMessage;
  }

  if (m.audioBase64) {
    // For audio messages, we'll create a custom message type
    // Since Chat UI doesn't have built-in audio, we'll use text with audio indicator
    const audioMessage: MessageType.Text = {
      ...base,
      type: "text",
      text: "🎤 Voice message",
      // Store audio data in a custom property
      audioBase64: m.audioBase64,
    };
    return audioMessage;
  }

  const textMessage: MessageType.Text = {
    ...base,
    type: "text",
    text: m.text || "",
  };

  return textMessage;
};

const App = () => {
  const [messages, setMessages] = useState<MessageType.Any[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const { token, user } = useAuth();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingDurationRef = useRef<NodeJS.Timeout | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const addMessage = (message: MessageType.Any) => {
    setMessages((prev) => [message, ...prev]);
  };

  // 1) Load current user + history once
  useEffect(() => {
    if (!token) return; // Don't fetch if no token

    const fetchInitialData = async () => {
      try {
        // Use user from context if available, otherwise fetch from API
        let currentUserData;
        if (user) {
          currentUserData = user;
        } else {
          // /api/me
          const meRes = await axios.get(ME_URL, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          currentUserData = meRes.data.user;
        }

        const chatUserId = currentUserData._id || currentUserData.id;

        const chatUser: User = {
          id: chatUserId, // must match owner_id._id from messages
          firstName: currentUserData.name,
          // random avatar for current user as well
          imageUrl: getAvatarForUser(chatUserId),
        };
        setCurrentUser(chatUser);

        // /api/messages/hall
        const res = await axios.get(HALL_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const apiMessages = res.data;

        // 👇 use helper so it supports text + image
        const mapped: MessageType.Any[] = apiMessages.map(mapApiMessageToChat);

        setMessages(mapped.reverse());
      } catch (err: any) {
        console.log(
          "Error fetching initial data",
          err?.response?.data || err?.message || err
        );
      }
    };

    fetchInitialData();
  }, [token, user]);

  // 2) Setup Socket.io connection + listeners
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"], // RN likes this
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🔌 Connected to socket:", socket.id);
    });

    socket.on("hall:new-message", (m: any) => {
      // Message object from backend
      const msg = mapApiMessageToChat(m); // 👈 use same helper
      addMessage(msg);
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from socket");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 3) Send message with HTTP; UI updates via socket event
  const handleSendPress = async (partialMessage: MessageType.PartialText) => {
    if (!currentUser || !token) return;

    try {
      await axios.post(
        HALL_URL,
        { text: partialMessage.text },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // ❌ Don't call addMessage here
      // The server will emit "hall:new-message" and socket listener above will add it
    } catch (err: any) {
      console.log(
        "Error sending message",
        err?.response?.data || err?.message || err
      );
    }
  };

  // 4) Handle image attachment (Expo Image Picker)
  const handleAttachmentPress = async () => {
    try {
      // Ask for permission
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission to access media library was denied");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.7,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        console.log("No base64 data from selected image");
        return;
      }

      // Send image to backend
      await axios.post(
        HALL_URL,
        { imageBase64: asset.base64 },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Don't addMessage here -> socket 'hall:new-message' will handle it
    } catch (err: any) {
      console.log(
        "Error picking/sending image",
        err?.response?.data || err?.message || err
      );
    }
  };

  // 5) Handle audio recording
  const startRecording = async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Audio recording permission is required");
        return;
      }

      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      recordingDurationRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("Error", "Failed to start recording");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      if (recordingDurationRef.current) {
        clearInterval(recordingDurationRef.current);
        recordingDurationRef.current = null;
      }

      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      if (!uri) {
        Alert.alert("Error", "No recording URI found");
        return;
      }

      // Convert audio to base64
      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        // Remove data:audio/m4a;base64, prefix
        const base64 = base64data.split(",")[1];

        try {
          // Send audio to backend
          await axios.post(
            HALL_URL,
            { audioBase64: base64 },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );
        } catch (err: any) {
          console.log(
            "Error sending audio",
            err?.response?.data || err?.message || err
          );
          Alert.alert("Error", "Failed to send audio message");
        }
      };

      reader.readAsDataURL(blob);
      setRecording(null);
      setRecordingDuration(0);
    } catch (err) {
      console.error("Failed to stop recording", err);
      Alert.alert("Error", "Failed to stop recording");
    }
  };

  // Play audio message
  const playAudio = async (audioBase64: string) => {
    try {
      // Stop any currently playing sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // Create data URI
      const audioUri = `data:audio/m4a;base64,${audioBase64}`;
      
      // Load and play
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );

      soundRef.current = sound;

      // Clean up when finished
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (err) {
      console.error("Failed to play audio", err);
      Alert.alert("Error", "Failed to play audio");
    }
  };

  // Custom render function for messages with audio support
  const renderMessage = (message: MessageType.Any) => {
    // Check if message has audio
    if ((message as any).audioBase64) {
      return (
        <TouchableOpacity
          onPress={() => playAudio((message as any).audioBase64)}
          style={{
            padding: 12,
            backgroundColor: "#AC97D8",
            borderRadius: 12,
            marginVertical: 4,
          }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>
            🎤 Tap to play voice message
          </Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <SafeAreaProvider>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={{ flex: 1 }}>
          {currentUser && (
            <>
              <Chat
                onAttachmentPress={handleAttachmentPress}
                showUserAvatars
                messages={messages}
                onSendPress={handleSendPress}
                user={currentUser}
                showUserNames
                sendButtonVisibilityMode="always"
                theme={{
                  ...defaultTheme,
                  colors: {
                    ...defaultTheme.colors,
                    inputBackground: "#AC97D8",
                    primary: "#AC97D8",
                  },
                }}
              />
              {/* Audio recording button */}
              <View
                style={{
                  position: "absolute",
                  bottom: 80,
                  right: 20,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                {isRecording && (
                  <View
                    style={{
                      backgroundColor: "rgba(0,0,0,0.7)",
                      padding: 8,
                      borderRadius: 8,
                      marginRight: 8,
                    }}
                  >
                    <Text style={{ color: "white" }}>
                      {Math.floor(recordingDuration / 60)}:
                      {String(recordingDuration % 60).padStart(2, "0")}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  onPressIn={startRecording}
                  onPressOut={stopRecording}
                  style={{
                    backgroundColor: isRecording ? "#ff4444" : "#AC97D8",
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    justifyContent: "center",
                    alignItems: "center",
                    elevation: 4,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                  }}
                >
                  <Text style={{ color: "white", fontSize: 24 }}>
                    {isRecording ? "⏹" : "🎤"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaProvider>
  );
};

export default App;
