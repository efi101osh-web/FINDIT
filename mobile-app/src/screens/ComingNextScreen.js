import Screen from '../components/Screen';
import { EmptyState } from '../components/StateViews';

/** A stand-in for a screen that is built in the next step. Says so plainly. */
export default function ComingNextScreen({ icon, title, message }) {
  return (
    <Screen>
      <EmptyState icon={icon} title={title} message={message} />
    </Screen>
  );
}
