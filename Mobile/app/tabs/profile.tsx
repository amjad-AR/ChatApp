import "../../global.css";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../api";
import { router } from "expo-router";

export default function Profile() {
  const [profileUser, setProfileUser] = useState<any>();
  const [loading, setLoading] = useState(true);
  const { user, token, logout } = useAuth();

  const PRIMARY = "#AC97D8";
  const SECONDARY = "#DBFBF1";

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const result = await authAPI.getMe(token);
        if (result.success) {
          setProfileUser(result.data?.user);
        } else {
          console.log("Profile error:", result.error);
          if (
            result.error.includes("token") ||
            result.error.includes("unauthorized")
          ) {
            await logout();
            router.replace("/(auth)/login" as any);
          }
        }
      } catch (err) {
        console.log("Profile error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: SECONDARY }}
      >
        <ActivityIndicator color={PRIMARY} />
        <Text className="mt-3 text-gray-600">Loading profile...</Text>
      </View>
    );
  }

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login" as any);
        },
      },
    ]);
  };

  const displayUser = user || profileUser;

  if (!displayUser) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-lg text-red-500">Failed to load profile.</Text>
      </View>
    );
  }

  const joinedDate = displayUser.createdAt
    ? new Date(displayUser.createdAt).toLocaleDateString()
    : "11/26/2025";

  return (
    <View className="flex-1 px-6 pt-16" style={{ backgroundColor: SECONDARY }}>
      {/* Avatar Section */}
      <View className="items-center mb-8">
        <View
          className="w-40 h-40 rounded-full overflow-hidden shadow-xl"
          style={{
            borderWidth: 4,
            borderColor: PRIMARY,
            backgroundColor: "#F1F1F1",
          }}
        >
          <Image
            source={require("../../assets/images/ronaldo.jpg")}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>

        <Text className="text-3xl mt-5 font-semibold" style={{ color: "#333" }}>
          {displayUser.name}
        </Text>

        <Text className="text-gray-600">{displayUser.email}</Text>

        <View
          className="mt-3 px-4 py-1 rounded-full"
          style={{
            backgroundColor: PRIMARY + "20",
            borderColor: PRIMARY,
            borderWidth: 1,
          }}
        >
          <Text
            className="text-xs font-medium capitalize"
            style={{ color: PRIMARY }}
          >
            {displayUser.role}
          </Text>
        </View>
      </View>

      {/* Info Section */}
      <View
        className="rounded-2xl p-6 mb-8"
        style={{
          backgroundColor: "#fff",
          borderColor: PRIMARY + "50",
          borderWidth: 1,
          shadowColor: PRIMARY,
          shadowOpacity: 0.1,
          shadowRadius: 6,
        }}
      >
        <Text className="text-gray-500 text-sm">Joined</Text>
        <Text className="text-lg font-semibold text-gray-800 mt-1">
          {joinedDate}
        </Text>
      </View>

      {/* Buttons */}
      <View className="mt-2">
        {/* Edit Profile */}
        <TouchableOpacity
          className="w-full py-3 rounded-xl mb-4"
          style={{ backgroundColor: PRIMARY }}
        >
          <Text className="text-center text-white text-lg font-semibold">
            Edit Profile
          </Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          className="w-full py-3 rounded-xl border"
          style={{ borderColor: "#DC2626" }}
          onPress={handleLogout}
        >
          <Text className="text-center text-red-500 text-lg font-semibold">
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
