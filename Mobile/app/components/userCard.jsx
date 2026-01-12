// components/UserCard.jsx
import { View, Text, Image, TouchableOpacity } from "react-native";

export default function UserCard({ name, avatar, onPress }) {
  return (
    <TouchableOpacity
      className="flex-row items-center px-4 py-3 bg-white"
      onPress={onPress}
    >
      <Image
        source={{ uri: avatar }}
        className="w-14 h-14 rounded-full bg-gray-200"
      />

      <View className="ml-4">
        <Text className="text-lg font-semibold text-black">{name}</Text>
      </View>
    </TouchableOpacity>
  );
}
