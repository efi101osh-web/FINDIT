import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import ItemDetailsScreen from '../screens/ItemDetailsScreen';
import EditReportScreen from '../screens/EditReportScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

// The logged-in app: the five tabs, and the screens that open on top of them
// (one report in full, and editing your own report).
export default function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ItemDetails" component={ItemDetailsScreen} options={{ title: 'Report' }} />
      <Stack.Screen name="EditReport" component={EditReportScreen} options={{ title: 'Edit report' }} />
    </Stack.Navigator>
  );
}
