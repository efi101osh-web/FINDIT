import { useAuth } from '../context/AuthContext';
import { LoadingView } from '../components/StateViews';
import AuthStack from './AuthStack';
import AppStack from './AppStack';

// Chooses between the logged-out screens and the app, from the login state alone.
export default function RootNavigator() {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingView message="Opening FINDIT…" />;
  return status === 'signedIn' ? <AppStack /> : <AuthStack />;
}
