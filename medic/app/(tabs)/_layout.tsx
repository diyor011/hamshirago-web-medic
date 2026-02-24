import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { Theme } from '@/constants/Theme';

function TabIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Theme.primary,
        tabBarInactiveTintColor: Theme.textSecondary,
        headerStyle: { backgroundColor: Theme.surface },
        headerTitleStyle: { color: Theme.text, fontWeight: '700' },
        tabBarStyle: { borderTopColor: Theme.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Заказы',
          tabBarIcon: ({ color }) => <TabIcon name="list-alt" color={color} />,
          headerTitle: 'Доступные заказы',
        }}
      />
      <Tabs.Screen
        name="my-orders"
        options={{
          title: 'Мои',
          tabBarIcon: ({ color }) => <TabIcon name="briefcase" color={color} />,
          headerTitle: 'Мои заказы',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ color }) => <TabIcon name="user" color={color} />,
          headerTitle: 'Мой профиль',
        }}
      />
    </Tabs>
  );
}
