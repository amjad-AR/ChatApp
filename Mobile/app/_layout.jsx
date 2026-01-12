// import { Stack } from "expo-router";
// import { AuthProvider, useAuth } from "./context/AuthContext";
// import { useEffect } from "react";
// import { router } from "expo-router";
// import { View, ActivityIndicator, Text } from "react-native";

// function AuthNavigator() {
//   const { isAuthenticated, loading } = useAuth();

//   useEffect(() => {
//     if (!loading) {
//       if (isAuthenticated()) {
//         router.replace("/tabs");
//       } else {
//         router.replace("/auth/login");
//       }
//     }
//   }, [loading, isAuthenticated]);

//   if (loading) {
//     return (
//       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//         <ActivityIndicator size="large" color="#2563eb" />
//         <Text style={{ marginTop: 10, color: '#6b7280' }}>Loading...</Text>
//       </View>
//     );
//   }

//   return (
//     <Stack>
//       <Stack.Screen name="auth/login" options={{ headerShown: false }} />
//       <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
//       <Stack.Screen name="tabs" options={{ headerShown: false }} />
//     </Stack>
//   );
// }

// export default function RootLayout() {
//   return (
//     <AuthProvider>
//       <AuthNavigator />
//     </AuthProvider>
//   );
// }


// app/_layout.jsx
// ✅ Import global CSS here (NativeWind v4 requirement)
import "../global.css";

import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { View, ActivityIndicator, Text } from "react-native";

function AuthNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10, color: '#6b7280' }}>Loading...</Text>
      </View>
    );
  }

  const authed = isAuthenticated();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {authed ? (
        <>
          {/* Authenticated stack */}
          <Stack.Screen name="tabs" />
        </>
      ) : (
        <>
          {/* Not authenticated: show landing + auth */}
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/signup" />
        </>
      )}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthNavigator />
    </AuthProvider>
  );
}
