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

import { Alert } from 'react-native';
import { supabase } from './src/config/supabase';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{name: string, email: string, id: string} | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    // 1. Handle Splash Screen
    const timer = setTimeout(() => {
      setIsAppLoading(false);
    }, 2500);

    // 2. Initial Auth Check
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({
          email: session.user.email || '',
          name: session.user.user_metadata?.name || 'User',
          id: session.user.id
        });
        setIsAuthenticated(true);
      }
    };
    checkUser();

    // 3. Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          email: session.user.email || '',
          name: session.user.user_metadata?.name || 'User',
          id: session.user.id
        });
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  if (isAppLoading) {
    return <SplashScreen />;
  }

  const handleLogin = async (email: string, pass: string) => {
    if (!email || !pass) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      Alert.alert("Login Failed", error.message);
    }
  };

  const handleSignup = async (email: string, pass: string, name: string) => {
    if (!email || !pass || !name) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    // Password Length Validation
    if (pass.length < 8) {
      Alert.alert("Weak Password", "Password must be at least 8 characters long");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { 
          full_name: name,
          name: name,
          display_name: name 
        }
      }
    });

    if (error) {
      Alert.alert("Signup Failed", error.message);
    } else {
      Alert.alert("Success", "Account created successfully! You can now log in.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
                {(props) => <HomeScreen {...props} user={user} onLogout={handleLogout} />}
              </Stack.Screen>
              <Stack.Screen name="Record">
                {(props) => <RecorderScreen {...props} user={user} />}
              </Stack.Screen>
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
