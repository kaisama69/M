import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FontAwesome5 } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { Colors, FontFamily } from '../theme';

// Import Screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import JournalScreen from '../screens/JournalScreen';
import DashboardScreen from '../screens/DashboardScreen';
import BreathingScreen from '../screens/BreathingScreen';
import AdminScreen from '../screens/AdminScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth stack for login/signup — wraps screens to inject onLoginSuccess as a prop
const AuthNavigator = ({ onLoginSuccess }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bgDark },
      }}
    >
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} onLoginSuccess={onLoginSuccess} />}
      </Stack.Screen>
      <Stack.Screen name="Signup">
        {(props) => <SignupScreen {...props} onLoginSuccess={onLoginSuccess} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

// Main bottom tab bar navigator
const TabNavigator = ({ user, onLogout }) => {
  const isAdmin = user?.is_admin === 1;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bgDark,
          borderTopWidth: 1,
          borderTopColor: Colors.cardBorder,
          height: Platform.OS === 'web' ? 75 : 60,
          paddingBottom: Platform.OS === 'web' ? 20 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: {
          fontFamily: FontFamily.medium,
          fontSize: 11,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Journal') {
            iconName = 'book';
          } else if (route.name === 'Dashboard') {
            iconName = 'chart-bar';
          } else if (route.name === 'Breathing') {
            iconName = 'spa';
          } else if (route.name === 'Admin') {
            iconName = 'shield-alt';
          }

          return <FontAwesome5 name={iconName} size={size - 2} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Journal" component={JournalScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Breathing" component={BreathingScreen} />
      {isAdmin && <Tab.Screen name="Admin" component={AdminScreen} />}
    </Tab.Navigator>
  );
};

const AppNavigator = ({ user, onLoginSuccess, onLogout }) => {
  return user ? (
    <TabNavigator user={user} onLogout={onLogout} />
  ) : (
    <AuthNavigator onLoginSuccess={onLoginSuccess} />
  );
};

export default AppNavigator;
