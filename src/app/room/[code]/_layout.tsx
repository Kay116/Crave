import { Stack, useLocalSearchParams } from 'expo-router';
import { RoomProvider } from '@/context/room-context';
import { colors } from '@/theme';

export default function RoomLayout() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return (
    <RoomProvider code={code ?? ''}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream }, animation: 'fade' }} />
    </RoomProvider>
  );
}
