import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/context/auth-context';
import { CraveProvider } from '@/context/crave-context';
import { colors } from '@/theme';

export default function RootLayout() {
  return <GestureHandlerRootView style={{ flex: 1 }}><AuthProvider><CraveProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream }, animation: 'fade' }} /></CraveProvider></AuthProvider></GestureHandlerRootView>;
}
