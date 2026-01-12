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
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { router } from 'expo-router';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const result = await signup(name, email, password, role, avatar || null);
      if (result.success) {
        router.replace('/tabs');
      } else {
        Alert.alert('Signup Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    router.push('/auth/login');
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 bg-white px-6 justify-center py-8">
          {/* Header */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-gray-900 text-center mb-2">
              Create Account
            </Text>
            <Text className="text-gray-600 text-center">
              Sign up to get started
            </Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            {/* Name Input */}
            <View>
              <Text className="text-gray-700 font-medium mb-2">Name *</Text>
              <TextInput
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900"
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* Email Input */}
            <View>
              <Text className="text-gray-700 font-medium mb-2">Email *</Text>
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
              <Text className="text-gray-700 font-medium mb-2">Password *</Text>
              <TextInput
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900"
                placeholder="Enter your password (min 6 characters)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Role Picker */}
            <View>
              <Text className="text-gray-700 font-medium mb-2">Role</Text>
              <View className="border border-gray-300 rounded-xl bg-gray-50">
                <Picker
                  selectedValue={role}
                  onValueChange={setRole}
                  style={{ height: 50 }}
                >
                  <Picker.Item label="User" value="user" />
                  <Picker.Item label="Admin" value="admin" />
                </Picker>
              </View>
            </View>

            {/* Avatar URL Input */}
            <View>
              <Text className="text-gray-700 font-medium mb-2">Avatar URL (Optional)</Text>
              <TextInput
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900"
                placeholder="Enter avatar image URL"
                value={avatar}
                onChangeText={setAvatar}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Signup Button */}
            <TouchableOpacity
              className={`w-full py-4 rounded-xl mt-6 ${
                loading ? 'bg-blue-300' : 'bg-[#06fdab]'
              }`}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-semibold text-lg">
                  Create Account
                </Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View className="flex-row justify-center mt-6">
              <Text className="text-gray-600">Already have an account? </Text>
              <TouchableOpacity onPress={goToLogin}>
                <Text className="text-[#06fdab] font-semibold">Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}