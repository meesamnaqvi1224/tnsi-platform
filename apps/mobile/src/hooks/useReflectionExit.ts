import { useCallback } from 'react';
import { useNavigation, useRouter } from 'expo-router';
import type { ReflectionOrigin } from '@/lib/reflection-origin';

export { parseReflectionOrigin, type ReflectionOrigin } from '@/lib/reflection-origin';

interface Navigator {
  getState: () => { index?: number; routes: { name: string }[] };
  getParent: () => unknown;
  goBack: () => void;
  reset: (state: { index: number; routes: { name: string }[] }) => void;
}

/**
 * How My Reflections screens leave, whatever way they were opened.
 *
 * The cards on Home and My Progress open a Profile-tab screen from ANOTHER tab. Depending on whether the
 * Profile stack was already created, that screen is either the only route on it or sits above Profile's
 * root. In the first case there is no back target, the header has no back button and Android's Back
 * switches tabs without closing the screen (an editor with unsaved writing would be left alive and hidden
 * inside the Profile tab); in the second, a plain back lands on the Profile screen, not where the member
 * came from. So the screens leave explicitly:
 *  - a screen of Profile's own stack is underneath (the history, or Progress): go back to it;
 *  - otherwise (the Home card): clear the screen off Profile's stack (pop it, or reset to Profile's root if
 *    it was the only route), then focus the Home tab.
 */
export function useReflectionExit(origin: ReflectionOrigin | undefined) {
  const navigation = useNavigation() as unknown as Navigator;
  const router = useRouter();

  return useCallback(() => {
    const state = navigation.getState();
    const index = state.index ?? 0;
    // The history (or the Progress screen it was opened from) is underneath: simply go back to it.
    if (origin === 'progress' || state.routes[index - 1]?.name === 'reflections') {
      router.back();
      return;
    }
    if (index > 0) navigation.goBack();
    else navigation.reset({ index: 0, routes: [{ name: 'index' }] });

    // Let the stack change settle, then focus the originating tab. Doing both in one tick leaves the
    // Profile tab in front.
    const tabs = navigation.getParent() as { navigate: (name: string) => void } | undefined;
    setTimeout(() => {
      if (tabs) tabs.navigate('index');
      else router.navigate('/');
    }, 150);
  }, [navigation, router, origin]);
}
