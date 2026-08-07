import { useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Returns the current React Native AppState ('active' | 'background' | 'inactive').
 * Updates automatically when the user backgrounds or foregrounds the app.
 * Use this to pause polling/subscriptions when the app is not visible.
 */
export function useAppState(): AppStateStatus {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', setAppState);
    return () => sub.remove();
  }, []);

  return appState;
}
