import { createOidcConfig } from '@bescom/authentik-auth';

// Vite exposes env vars via import.meta.env with a VITE_ prefix — NOT
// process.env.REACT_APP_* (that's the CRA convention used by the other
// BESCOM apps). See .env / .env.example for the actual values.
export const oidcConfig = createOidcConfig({
  clientId: import.meta.env.VITE_AUTHENTIK_CLIENT_ID,
  redirectUri: import.meta.env.VITE_AUTHENTIK_REDIRECT_URI,
  authority: import.meta.env.VITE_AUTHENTIK_AUTHORITY,
  scope: 'openid profile email groups',
});
