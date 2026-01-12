import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import axios from "axios";
import { ENDPOINTS, SOCKET_URL } from "../api";
import { useAuth } from "../context/AuthContext";
import {
  Chat,
  MessageType,
  User as ChatUser,
} from "@flyerhq/react-native-chat-ui";
import { io, Socket } from "socket.io-client";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import { WebView } from "react-native-webview";
import { defaultTheme } from "@flyerhq/react-native-chat-ui";

const PRIMARY_COLOR = "#AC97D8";

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
    id: 7,
    src: require("../../assets/images/ben.jpg"),
    bg: "#efc119ff",
  },
  {
    id: 8,
    src: require("../../assets/images/dog.jpg"),
    bg: "#efc119ff",
  },
  {
    id: 6,
    src: require("../../assets/images/ronaldo.jpg"),
    bg: "#efc119ff",
  },
];

// Deterministic "random" avatar per user
const getRandomAvatar = (userId: string | undefined | null) => {
  if (!userId || AVATARS.length === 0) {
    return AVATARS[0];
  }

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % AVATARS.length;
  return AVATARS[index];
};

type User = {
  _id?: string;
  id?: string;
  name: string;
  email?: string;
  role?: string;
  avatar?: string | null;
  createdAt?: string;
};

const WHEREBY_ROOM_URL = "https://whereby.com/bytesroom";
const WHEREBY_ROOM_PARAMS = "?needancestor&skipMediaPermissionPrompt";

type Conversation = {
  user: User;
  lastMessage?: {
    _id?: string;
    text?: string;
    createdAt?: string;
    owner_id?: User;
    receiver_id?: User;
    imageBase64?: string;
    audioBase64?: string;
  };
};

// Map backend message → Chat UI message
const mapPrivateApiMessageToChat = (
  msg: any,
  myId: string,
  authUser: any
): MessageType.Any => {
  const isMine = msg.owner_id?._id === myId;

  const base = {
    id: msg._id,
    createdAt: new Date(msg.createdAt).getTime(),
    author: isMine
      ? {
          id: myId,
          firstName: authUser.name,
          imageUrl: authUser.avatar ?? undefined,
        }
      : {
          id: msg.owner_id?._id || "unknown",
          firstName: msg.owner_id?.name,
          imageUrl: msg.owner_id?.avatar ?? undefined,
        },
  };

  if (msg.imageBase64) {
    const imageMessage: MessageType.Image = {
      ...base,
      type: "image",
      name: "Image",
      size: 0,
      uri: `data:image/jpeg;base64,${msg.imageBase64}`,
      width: 0,
      height: 0,
    };
    return imageMessage;
  }

  if (msg.audioBase64) {
    // For audio messages, create text message with audio indicator
    const audioMessage: MessageType.Text = {
      ...base,
      type: "text",
      text: "🎤 Voice message",
      audioBase64: msg.audioBase64,
    };
    return audioMessage;
  }

  const textMessage: MessageType.Text = {
    ...base,
    type: "text",
    text: msg.text || "",
  };

  return textMessage;
};

const MessagesPage = () => {
  const { token, user: authUser } = useAuth();

  // Canonical ID used everywhere (must match backend owner_id._id)
  const myId = authUser?._id || (authUser as any)?.id;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageType.Any[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const selectedConversationRef = useRef<Conversation | null>(null);

  // Video call state (WebView)
  const [videoRoom, setVideoRoom] = useState<string | null>(null);

  // Audio recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingDurationRef = useRef<NodeJS.Timeout | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Keep ref in sync with state so socket handler sees latest
  const setSelectedConversationSafe = (conv: Conversation | null) => {
    selectedConversationRef.current = conv;
    setSelectedConversation(conv);
  };

  // Ensure a conversation exists for a given user (used for messages from non-contacts)
  const ensureConversationForUser = (user: User) => {
    setConversations((prev) => {
      const exists = prev.some((c) => c.user._id === user._id);
      if (exists) return prev;
      return [...prev, { user }];
    });
  };

  // Update lastMessage and sort conversations
  const updateConversationLastMessage = (userId: string, lastMessage: any) => {
    setConversations((prev) =>
      prev
        .map((conv) =>
          conv.user._id === userId ? { ...conv, lastMessage } : conv
        )
        .sort(
          (a, b) =>
            new Date(b.lastMessage?.createdAt || 0).getTime() -
            new Date(a.lastMessage?.createdAt || 0).getTime()
        )
    );
  };

  // Fetch contacts -> build conversations list
  useEffect(() => {
    if (!token || !myId) return;

    const fetchContacts = async () => {
      try {
        const response = await axios.get(ENDPOINTS.CONTACTS, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // response.data = { count, users: [...] }
        const users: User[] = response.data.users || [];

        // Optional: filter out myself
        const filteredUsers = users.filter((u) => u._id !== myId);

        const initialConversations: Conversation[] = filteredUsers.map(
          (user) => ({
            user,
            // no lastMessage yet; will be filled by socket or sending messages
          })
        );

        setConversations(initialConversations);
      } catch (err: any) {
        console.log("Error fetching contacts", err?.response?.data || err);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [token, myId]);

  // Socket setup
  useEffect(() => {
    if (!myId) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to socket");
      socket.emit("user:join", myId);
    });

    socket.on("private:new-message", (message: any) => {
      console.log("New private message", message);

      const isMine = message.owner_id?._id === myId;

      // Ignore my own text messages; I add them optimistically
      if (isMine && message.text && !message.imageBase64) {
        return;
      }

      // Determine partner user + id
      const partnerIsReceiver = message.owner_id._id === myId;
      const partnerUser: User = partnerIsReceiver
        ? message.receiver_id
        : message.owner_id;
      const partnerId = partnerUser._id as string;

      // Ensure partner is in conversations (in case not in contacts)
      ensureConversationForUser(partnerUser);

      // Update last message & sort list
      updateConversationLastMessage(partnerId, message);

      const currentConv = selectedConversationRef.current;

      // Only add to messages if this is the open conversation
      if (
        currentConv &&
        (message.owner_id._id === currentConv.user._id ||
          message.receiver_id._id === currentConv.user._id)
      ) {
        const chatMessage = mapPrivateApiMessageToChat(
          message,
          myId,
          authUser
        );

        // De-duplicate by id
        setMessages((prev) => {
          if (prev.some((m) => m.id === chatMessage.id)) {
            return prev;
          }
          return [...prev, chatMessage];
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, [myId, authUser?.name, authUser?.avatar]);

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversationSafe(conversation);

    if (!token || !myId) return;

    try {
      const response = await axios.get(
        ENDPOINTS.PRIVATE_MESSAGES(conversation.user._id as string),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const msgs: MessageType.Any[] = response.data.map((msg: any) =>
        mapPrivateApiMessageToChat(msg, myId, authUser)
      );

      setMessages(msgs);
    } catch (err) {
      console.log("Error fetching messages", err);
    }
  };

  const handleSendPress = async (message: MessageType.PartialText) => {
    if (!selectedConversation || !token || !myId) return;

    const optimisticId = `temp-${Date.now()}`;

    const newMessage: MessageType.Text = {
      author: {
        id: myId,
        firstName: authUser.name,
        imageUrl: authUser.avatar ?? undefined,
      },
      createdAt: Date.now(),
      id: optimisticId,
      text: message.text,
      type: "text",
    };

    // Show immediately (text only)
    setMessages((prev) => [...prev, newMessage]);

    // Update conversation last message optimistically
    updateConversationLastMessage(selectedConversation.user._id as string, {
      text: message.text,
      createdAt: new Date().toISOString(),
      owner_id: {
        _id: myId,
        name: authUser.name,
        avatar: authUser.avatar,
      },
    });

    try {
      const response = await axios.post(
        ENDPOINTS.SEND_PRIVATE_MESSAGE,
        {
          text: message.text,
          receiver_id: selectedConversation.user._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Replace temp ID with real ID
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticId ? { ...msg, id: response.data._id } : msg
        )
      );
    } catch (err) {
      console.log("Error sending message", err);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));
    }
  };

  // Handle image attachment
  const handleAttachmentPress = async () => {
    if (!selectedConversation || !token) return;

    try {
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

      await axios.post(
        ENDPOINTS.SEND_PRIVATE_MESSAGE,
        {
          imageBase64: asset.base64,
          receiver_id: selectedConversation.user._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (err: any) {
      console.log(
        "Error picking/sending image",
        err?.response?.data || err?.message || err
      );
    }
  };

  // Handle audio recording
  const startRecording = async () => {
    if (!selectedConversation || !token) return;

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
    if (!recording || !selectedConversation || !token) return;

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
            ENDPOINTS.SEND_PRIVATE_MESSAGE,
            {
              audioBase64: base64,
              receiver_id: selectedConversation.user._id,
            },
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

  // ===== VIDEO CALL (WebView) =====

  const buildRoomName = (a: string, b: string) => {
    // stable room name for both users, order-independent
    return [a, b].sort().join("_");
  };

  const startCall = () => {
    if (!selectedConversation || !myId) return;

    const peerId = (selectedConversation.user._id ||
      selectedConversation.user.id) as string;

    const room = buildRoomName(myId, peerId);
    setVideoRoom(room);
  };

  const closeCall = () => {
    setVideoRoom(null);
  };

  // ===== RENDERING =====

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: "#F5F3FF" }}
      >
        <ActivityIndicator color={PRIMARY_COLOR} />
        <Text className="mt-3 text-gray-600 font-medium">
          Loading your conversations...
        </Text>
      </View>
    );
  }

  if (selectedConversation && myId) {
    const chatUser: ChatUser = {
      id: myId,
      firstName: authUser.name,
      imageUrl: authUser.avatar ?? undefined,
    };

    return (
      <View className="flex-1" style={{ backgroundColor: "#F5F3FF" }}>
        {/* Top bar */}
        <View
          className="px-4 pt-10 pb-3 flex-row items-center justify-between"
          style={{
            backgroundColor: "#DBFBF1",
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 5,
          }}
        >
          <TouchableOpacity
            onPress={() => setSelectedConversationSafe(null)}
            className="flex-row items-center"
          >
            <Text className="text-black text-lg mr-1">←</Text>
            <View>
              <Text className="text-black font-semibold text-sm">
                Back to conversations
              </Text>
              <Text className="text-black/70 text-[11px]">
                Chatting with {selectedConversation.user.name}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Video Call button */}
          <TouchableOpacity
            onPress={startCall}
            className="px-3 py-1 rounded-full flex-row items-center"
            style={{ backgroundColor: "rgba(255,255,255,0.16)" }}
          >
            <Text className="text-xs text-black mr-1">●</Text>
            <Text className="text-black text-[15px] font-semibold">
              📽️ Video Call
            </Text>
          </TouchableOpacity>
        </View>

        {/* Video call overlay via WebView */}
        {videoRoom && (
          <View className="absolute inset-0 bg-black z-20">
            <View className="flex-row justify-between items-center px-4 py-3 bg-black/80">
              <Text className="text-white font-semibold">Video call</Text>
              <TouchableOpacity
                onPress={closeCall}
                className="px-3 py-1 rounded-full bg-red-600"
              >
                <Text className="text-white text-[15px]">End Call</Text>
              </TouchableOpacity>
            </View>

            <WebView
              startInLoadingState
              source={{ uri: WHEREBY_ROOM_URL + WHEREBY_ROOM_PARAMS }}
              style={{ flex: 1 }}
              javaScriptEnabled
              domStorageEnabled
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              mediaCapturePermissionGrantType="grant"
            />
          </View>
        )}

        <View className="flex-1">
          <Chat
            messages={[...messages].reverse()}
            onSendPress={handleSendPress}
            user={chatUser}
            showUserNames
            sendButtonVisibilityMode="always"
            onAttachmentPress={handleAttachmentPress}
            theme={{
              ...defaultTheme,
              colors: {
                ...defaultTheme.colors,
                inputBackground: PRIMARY_COLOR,
                primary: PRIMARY_COLOR,
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
                backgroundColor: isRecording ? "#ff4444" : PRIMARY_COLOR,
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
        </View>
      </View>
    );
  }

  // ===== CONVERSATION LIST (CONTACTS) =====
  return (
    <View className="flex-1" style={{ backgroundColor: "#F5F3FF" }}>
      {/* Header */}
      <View className="px-5 pt-12 pb-4">
        <Text className="text-xs font-semibold tracking-[2px] text-gray-500">
          MESSAGES
        </Text>
        <Text className="text-2xl font-bold text-gray-900 mt-1">Inbox</Text>
        <Text className="text-xs text-gray-500 mt-1">
          Chat privately with your Friends &amp; Coaches.
        </Text>
      </View>

      {/* Rounded top container for list */}
      <View
        className="flex-1 px-4 pt-4"
        style={{
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          backgroundColor: "#FFFFFF",
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 4,
        }}
      >
        <FlatList
          data={conversations}
          keyExtractor={(item) => (item.user._id || item.user.id) as string}
          ItemSeparatorComponent={() => <View className="h-3" />}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}
          ListEmptyComponent={() => (
            <View className="mt-16 items-center justify-center">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: "#F5F0FF" }}
              >
                <Text
                  className="text-3xl font-semibold"
                  style={{ color: PRIMARY_COLOR }}
                >
                  💬
                </Text>
              </View>
              <Text className="text-gray-800 font-semibold">
                No contacts yet
              </Text>
              <Text className="text-xs text-gray-500 mt-1 text-center px-6">
                When you add friends or coaches, they will appear here and you
                can start chatting with them.
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleSelectConversation(item)}>
              <ConversationCard conversation={item} />
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
};

const ConversationCard = ({ conversation }: { conversation: Conversation }) => {
  const user = conversation.user;
  const lastMessage = conversation.lastMessage;

  const userId = user._id || user.id || "";
  const randomAvatar = getRandomAvatar(userId);

  const lastText =
    lastMessage?.text ||
    (lastMessage?.imageBase64 ? "📷 Photo" : "Start a conversation");

  const dateLabel = lastMessage?.createdAt
    ? new Date(lastMessage.createdAt).toLocaleDateString()
    : "New";

  return (
    <View
      className="flex-row items-center px-3 py-3 mb-1"
      style={{
        borderRadius: 18,
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 3,
      }}
    >
      {/* Avatar */}
      <View
        className="w-12 h-12 rounded-full overflow-hidden items-center justify-center mr-3"
        style={{ backgroundColor: randomAvatar.bg || "#F0E9FF" }}
      >
        {user.avatar ? (
          <Image
            source={{ uri: user.avatar }}
            className="w-12 h-12"
            resizeMode="cover"
          />
        ) : (
          <Image
            source={randomAvatar.src}
            className="w-12 h-12"
            resizeMode="cover"
          />
        )}
      </View>

      {/* Info */}
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text
            className="text-base font-semibold text-gray-900"
            numberOfLines={1}
          >
            {user.name}
          </Text>
          <View
            className="px-2 py-0.5 rounded-full ml-2"
            style={{ backgroundColor: "#F5F0FF" }}
          >
            <Text
              className="text-[10px] font-medium"
              style={{ color: PRIMARY_COLOR }}
            >
              {dateLabel}
            </Text>
          </View>
        </View>

        <Text className="text-[12px] text-gray-500 mt-1" numberOfLines={1}>
          {lastText}
        </Text>
      </View>
    </View>
  );
};

export default MessagesPage;
