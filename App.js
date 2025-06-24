import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { app, initializeAnalytics } from "./firebase-config";
import { logEvent } from "firebase/analytics";
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // Import Firebase Auth
import WorkoutScreen from './src/Screens/WorkoutScreen.js';
import LogInScreen from './src/Screens/LogInScreen.js';
import CalendarScreen from './src/Screens/CalendarScreen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null); // State to track if user is logged in

  useEffect(() => {
    const setupAnalytics = async () => {
      try {
        const analytics = await initializeAnalytics();
        if (analytics) {
          logEvent(analytics, 'app_open');
        } else {
          console.log('Analytics not supported in this environment');
        }
      } catch (error) {
        console.error('Analytics initialization error:', error);
      }
    };

    setupAnalytics();

    // Set up Firebase Auth state change listener
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Set user state based on auth state
    });

    // Clean up the listener when the component is unmounted
    return () => unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>    
      <NavigationContainer>
        <Stack.Navigator initialRouteName={user ? 'Workout' : 'LogIn'}>
          <Stack.Screen name="LogIn" component={LogInScreen} />
          <Stack.Screen name="Workout" component={WorkoutScreen} options={({ navigation }) => ({})}/>
          <Stack.Screen name="Calendar" component={CalendarScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>

  );
}