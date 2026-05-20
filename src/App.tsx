import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { AppMain } from './AppMain';
import { WelcomeScreen } from './components/WelcomeScreen';
import { AuthScreen, type AuthMode } from './components/AuthScreen';
import {
  getAppStorageMode,
  setAppStorageMode,
  clearAppStorageMode,
} from './lib/appMode';
import { loadIslandFromCloud, saveIslandToCloud } from './lib/cloudStorage';
import { getSupabase } from './lib/supabase';
import { loadFromStorage } from './lib/storage';
import './index.css';

function App() {
  const auth = useAuth();
  const [appMode, setAppMode] = useState(getAppStorageMode);
  const [authView, setAuthView] = useState<AuthMode | null>(null);
  const [migrateHint, setMigrateHint] = useState(false);

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

  const handleOpenAuth = (mode: AuthMode, hint = false) => {
    setAuthView(mode);
    setMigrateHint(hint);
  };

  const handleAuthSubmit = useCallback(
    async (email: string, password: string) => {
      const supabase = getSupabase();

      if (authView === 'signUp') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session?.user) {
          throw new Error(
            'Account created. Confirm your email in Supabase (or disable email confirmation in Auth settings), then sign in.',
          );
        }
        if (migrateHint || (loadFromStorage()?.characters.length ?? 0) > 0) {
          await migrateLocalToCloud(data.session.user.id);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          const cloud = await loadIslandFromCloud(data.user.id);
          const local = loadFromStorage();
          if (
            (!cloud || cloud.characters.length === 0) &&
            local &&
            local.characters.length > 0
          ) {
            await saveIslandToCloud(data.user.id, local);
          }
        }
      }

      setAppStorageMode('cloud');
      setAppMode('cloud');
      setAuthView(null);
      setMigrateHint(false);
    },
    [authView, migrateHint, migrateLocalToCloud],
  );

  const handleSignOut = async () => {
    await auth.signOut();
    clearAppStorageMode();
    setAppMode('unset');
    setAuthView(null);
  };

  if (auth.loading) {
    return (
      <div className="app-loading">
        <p>Loading…</p>
      </div>
    );
  }

  const inApp = auth.user || appMode === 'local';

  if (!inApp && !authView) {
    return (
      <WelcomeScreen
        syncAvailable={auth.configured}
        onContinueLocal={handleContinueLocal}
        onSignIn={() => handleOpenAuth('signIn')}
        onSignUp={() => handleOpenAuth('signUp')}
      />
    );
  }

  if (authView && auth.configured) {
    return (
      <AuthScreen
        mode={authView}
        migrateHint={migrateHint}
        onBack={() => {
          setAuthView(null);
          setMigrateHint(false);
        }}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  return (
    <AppMain
      storageMode={auth.user ? 'cloud' : 'local'}
      userId={auth.user?.id}
      userEmail={auth.user?.email}
      syncAvailable={auth.configured}
      onSignOut={handleSignOut}
      onOpenAuth={handleOpenAuth}
    />
  );
}

export default App;
