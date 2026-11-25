import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ReportScreen from '../screens/ReportScreen';
import MyReportsScreen from '../screens/MyReportsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

// [icon when not selected, icon when selected]
export const TAB_ICONS = {
  Home: ['home-outline', 'home'],
  Search: ['search-outline', 'search'],
  Report: ['add-circle-outline', 'add-circle'],
  MyReports: ['list-outline', 'list'],
  Profile: ['person-outline', 'person'],
};

// The five tabs along the bottom once you are logged in.
export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.neutralTint },
        tabBarIcon: ({ focused, color, size }) => <Ionicons name={TAB_ICONS[route.name][focused ? 1 : 0]} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Report" component={ReportScreen} />
      <Tab.Screen name="MyReports" component={MyReportsScreen} options={{ tabBarLabel: 'My reports' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
