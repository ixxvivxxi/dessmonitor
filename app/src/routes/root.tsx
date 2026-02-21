import { AppLayout } from '../components/app-layout.tsx';
import { SetupScreen } from '../components/setup-screen.tsx';
import { useDessAuth } from '../hooks/use-dess-auth.ts';

export function RootComponent() {
  const { session } = useDessAuth();
  if (!session) return <SetupScreen />;
  return <AppLayout />;
}
