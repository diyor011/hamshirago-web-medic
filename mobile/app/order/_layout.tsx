import { Stack } from 'expo-router';

export default function OrderLayout() {
  return (
    <Stack>
      <Stack.Screen name="location" options={{ title: 'Адрес', headerBackTitle: 'Назад' }} />
      <Stack.Screen name="confirm" options={{ title: 'Подтверждение', headerBackTitle: 'Назад' }} />
      <Stack.Screen name="track" options={{ title: 'Отслеживание заказа', headerBackVisible: false }} />
    </Stack>
  );
}
