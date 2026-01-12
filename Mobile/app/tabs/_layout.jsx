import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#94a3b8",
      }}
    >
      {/* Messages Tab */}
      <Tabs.Screen
        name="messages"
        options={{
          headerShown: true,
          title: "Messages",
          headerStyle: {
            backgroundColor: "#DBFBF1",
            elevation: 0,
          },

          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "chatbubble" : "chatbubble-outline"}
              color={"#AC97D8"}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="hall"
        options={{
          headerShown: false,
          title: "Bytes4Future",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "people" : "people-outline"}
              color={"#AC97D8"}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              color={"#AC97D8"}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
