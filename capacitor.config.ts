const config = {
  appId: 'com.contractwatch75.app',
  appName: 'ContractWatch75',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com', 'apple.com'],
    },
  },
} as const;

export default config;
