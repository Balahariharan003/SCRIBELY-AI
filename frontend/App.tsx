import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import HomeScreen from './src/screens/HomeScreen';
import RecorderScreen from './src/screens/RecorderScreen';
import NotesScreen from './src/screens/NotesScreen';
import HistoryScreen from './src/screens/HistoryScreen';

import CustomizeScreen from './src/screens/CustomizeScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator id="RootNavigator" screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            // Auth Stack
            <>
              <Stack.Screen name="Login">
                {(props) => <LoginScreen {...props} onLogin={() => setIsAuthenticated(true)} />}
              </Stack.Screen>
              <Stack.Screen name="Signup">
                {(props) => <SignupScreen {...props} onSignup={() => setIsAuthenticated(true)} />}
              </Stack.Screen>
            </>
          ) : (
            // Main Stack
            <>
              <Stack.Screen name="Home" component={HomeScreen} />
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
