import { useCallback, useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { isAndroidApp } from './lib/platform';
import { useAuth } from './hooks/useAuth';
import { AppMain } from './AppMain';
import { WelcomeScreen } from './components/WelcomeScreen';
import {
  AuthScreen,
  type AuthMode,
  type SignUpIslandChoice,
} from './components/AuthScreen';
import {
  getAppStorageMode,
  setAppStorageMode,
  clearAppStorageMode,
} from './lib/appMode';
import { loadIslandFromCloud, saveIslandToCloud } from './lib/cloudStorage';
import { getSupabase } from './lib/supabase';
import { loadFromStorage } from './lib/storage';
import { detectAccountCountry } from './lib/detectCountry';
import { ensureUserProfile } from './lib/userProfile';
import './index.css';

const WebAnalytics = () => (isAndroidApp() ? null : <Analytics />);

function App() {
  const auth = useAuth();
  const [appMode, setAppMode] = useState(getAppStorageMode);
  const [authView, setAuthView] = useState<AuthMode | null>(null);

  useEffect(() => {
    if (auth.user) {
      setAppStorageMode('cloud');
      setAppMode('cloud');
    }
  }, [auth.user]);

  const migrateLocalToCloud = useCallback(async (userId: string) => {
    const cloud = await loadIslandFromCloud(userId);
    if (cloud && cloud.characters.length > 0) return;

    const local = loadFromStorage();
    const data =
      local && local.characters.length > 0
        ? local
        : { version: 1 as const, characters: [] };
    await saveIslandToCloud(userId, data);
  }, []);

  const handleContinueLocal = () => {
    setAppStorageMode('local');
    setAppMode('local');
    setAuthView(null);
  };

  const handleOpenAuth = (mode: AuthMode) => {
    setAuthView(mode);
  };

  const handleAuthSubmit = useCallback(
    async (
      mode: AuthMode,
      email: string,
      password: string,
      islandChoice?: SignUpIslandChoice,
    ) => {
      const supabase = getSupabase();

      if (mode === 'signUp') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session?.user) {
          throw new Error(
            'Account created but not signed in. In Supabase: Auth → Email → turn OFF “Confirm email”, then sign in.',
          );
        }
        await ensureUserProfile(
          data.session.user.id,
          detectAccountCountry(),
        );
        if (islandChoice === 'local') {
          await migrateLocalToCloud(data.session.user.id);
        } else {
          await saveIslandToCloud(data.session.user.id, {
            version: 1,
            characters: [],
          });
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          await ensureUserProfile(data.user.id, detectAccountCountry());
        }
      }

      setAppStorageMode('cloud');
      setAppMode('cloud');
      setAuthView(null);
    },
    [migrateLocalToCloud],
  );

  const handleSignOut = async () => {
    await auth.signOut();
    clearAppStorageMode();
    setAppMode('unset');
    setAuthView(null);
  };

  const hasLocalData = (loadFromStorage()?.characters.length ?? 0) > 0;

  if (auth.loading) {
    return (
      <>
        <div className="app-loading">
          <p>Loading…</p>
        </div>
        <WebAnalytics />
      </>
    );
  }

  const inApp = auth.user || appMode === 'local';

  if (!inApp && !authView) {
    return (
      <>
        <WelcomeScreen
          syncAvailable={auth.configured}
          onContinueLocal={handleContinueLocal}
          onSignIn={() => handleOpenAuth('signIn')}
          onSignUp={() => handleOpenAuth('signUp')}
        />
        <WebAnalytics />
      </>
    );
  }

  if (authView && auth.configured) {
    return (
      <>
        <AuthScreen
          mode={authView}
          hasLocalData={hasLocalData}
          onBack={() => setAuthView(null)}
          onSubmit={handleAuthSubmit}
        />
        <WebAnalytics />
      </>
    );
  }

  return (
    <>
      <AppMain
        storageMode={auth.user ? 'cloud' : 'local'}
        userId={auth.user?.id}
        userEmail={auth.user?.email}
        syncAvailable={auth.configured}
        onSignOut={handleSignOut}
        onOpenAuth={handleOpenAuth}
      />
      <WebAnalytics />
    </>
  );
}

export default App;
