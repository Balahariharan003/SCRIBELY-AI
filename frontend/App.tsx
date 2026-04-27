import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import RecorderScreen from './src/screens/RecorderScreen';
import NotesScreen from './src/screens/NotesScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import CustomizeScreen from './src/screens/CustomizeScreen';

import axios from 'axios';
import { Alert } from 'react-native';

const API_BASE_URL = 'http://10.14.26.249:8001';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{name: string, email: string} | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading (Splash Screen Duration)
    setTimeout(() => {
      setIsAppLoading(false);
    }, 2500);
  }, []);

  if (isAppLoading) {
    return <SplashScreen />;
  }

  const handleLogin = async (email, password) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/login`, { email, password });
      setUser(res.data.user);
      setIsAuthenticated(true);
    } catch (err) {
      Alert.alert("Login Failed", "Invalid email or password");
    }
  };

  const handleSignup = async (email, password, name) => {
    try {
      await axios.post(`${API_BASE_URL}/signup`, { email, password, name });
      Alert.alert("Success", "Account created successfully! Please log in.");
      // We don't setAuthenticated here, so they stay on Login screen
    } catch (err) {
      Alert.alert("Signup Failed", "User already exists or server error");
    }
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator id="RootNavigator" screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            // Auth Stack
            <>
              <Stack.Screen name="Login">
                {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
              </Stack.Screen>
              <Stack.Screen name="Signup">
                {(props) => <SignupScreen {...props} onSignup={handleSignup} />}
              </Stack.Screen>
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            </>
          ) : (
            // Main Stack
            <>
              <Stack.Screen name="Home">
                {(props) => <HomeScreen {...props} user={user} onLogout={() => { setUser(null); setIsAuthenticated(false); }} />}
              </Stack.Screen>
              <Stack.Screen name="Record" component={RecorderScreen} />
              <Stack.Screen name="Notes" component={NotesScreen} />
              <Stack.Screen name="History" component={HistoryScreen} />
              <Stack.Screen name="Customize" component={CustomizeScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
