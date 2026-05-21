import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.tomodict.editor',
  appName: 'Tomodict',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
};

export default config;
