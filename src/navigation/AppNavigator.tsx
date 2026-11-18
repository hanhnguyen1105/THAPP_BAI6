import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer, RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Icon, IconName } from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { AddMembersScreen } from '../screens/AddMembersScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ContactsScreen } from '../screens/ContactsScreen';
import { CreateGroupScreen } from '../screens/CreateGroupScreen';
import { GroupInfoScreen } from '../screens/GroupInfoScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors } from '../theme';
import { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.background, primary: colors.primaryDeep },
};

const tabIcons: Record<keyof TabParamList, IconName> = {
  Home: 'message',
  Contacts: 'contacts',
  Notifications: 'bell',
  Settings: 'settings',
};

function TabIcon({ name, color, focused }: { name: IconName; color: string; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Icon name={name} size={20} color={color} />
    </View>
  );
}

const tabScreenOptions = ({ route }: { route: RouteProp<TabParamList> }) => ({
  headerShown: false,
  tabBarActiveTintColor: colors.primaryDeep,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarLabelStyle: styles.tabLabel,
  tabBarStyle: styles.tabBar,
  tabBarBadgeStyle: styles.badge,
  tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
    <TabIcon name={tabIcons[route.name]} color={color} focused={focused} />
  ),
});

const badge = (n: number) => (n > 0 ? (n > 99 ? '99+' : n) : undefined);

function MainTabs() {
  // Badge lấy từ DataContext (luôn lắng nghe), nên hiện đúng cả khi tab chưa được mở.
  const { unreadChats, unreadNotifications } = useData();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Đoạn chat', tabBarBadge: badge(unreadChats) }}
      />
      <Tab.Screen name="Contacts" component={ContactsScreen} options={{ title: 'Danh bạ' }} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Thông báo', tabBarBadge: badge(unreadNotifications) }}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Cài đặt' }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { user } = useAuth();

  if (user === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Tabs" component={MainTabs} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
            <Stack.Screen name="GroupInfo" component={GroupInfoScreen} />
            <Stack.Screen name="AddMembers" component={AddMembersScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    height: 64,
    paddingTop: 6,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  tabIcon: { paddingHorizontal: 14, paddingVertical: 3, borderRadius: 999 },
  tabIconActive: { backgroundColor: colors.primarySoft },
  badge: { backgroundColor: colors.primaryDeep, fontSize: 10 },
});
