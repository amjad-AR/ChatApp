// ✅ Removed global.css import - should only be in _layout.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { router } from 'expo-router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        router.replace('/tabs');
      } else {
        Alert.alert('Login Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const goToSignup = () => {
    router.push('/auth/signup');
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 bg-white px-6 justify-center">
          {/* Header */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-gray-900 text-center mb-2">
              Welcome Back
            </Text>
            <Text className="text-gray-600 text-center">
              Sign in to your account
            </Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            {/* Email Input */}
            <View>
              <Text className="text-gray-700 font-medium mb-2">Email</Text>
              <TextInput
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View>
              <Text className="text-gray-700 font-medium mb-2">Password</Text>
              <TextInput
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Login Button */}
            <TouchableOpacity
              className={`w-full py-4 rounded-xl mt-6 ${
                loading ? 'bg-[#06fdab]' : 'bg-[#06fdab]'
              }`}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-semibold text-lg">
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            {/* Signup Link */}
            <View className="flex-row justify-center mt-6">
              <Text className="text-gray-600">Don't have an account? </Text>
              <TouchableOpacity onPress={goToSignup}>
                <Text className="text-[#06fdab] font-semibold">Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}