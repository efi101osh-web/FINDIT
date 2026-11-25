import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './MainTabs';

const Stack = createNativeStackNavigator();

// The logged-in app: the tabs, plus (from the next step) screens that open on top of them,
// such as a report's details.
export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={MainTabs} />
    </Stack.Navigator>
  );
}
