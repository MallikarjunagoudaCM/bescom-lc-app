# @bescom/authentik-auth

Shared Authentik OIDC integration for BESCOM React apps. Handles the OIDC
mechanics only (login trigger, callback validation, session state) — every
app decides what happens after authentication.

## Authentik-side setup (once per app)

1. Create an OAuth2/OIDC **Provider**:
   - Redirect URI: must exactly match your app's `redirect_uri` (protocol,
     host, path, trailing slash).
   - Scopes: attach the shared `BESCOM Groups Mapping` (or `groups`) plus
     `email`/`profile` if needed.
2. Create an **Application** linking to that Provider. Note its slug and
   the Provider's Client ID.

## Install

```json
"@bescom/authentik-auth": "git+https://github.com/<org>/bescom-authentik-auth.git#v0.1.0"
```

## Simple pattern: group-gated dashboard access (recommended default)

No OTP, no registration form, no custom backend JWT — the Authentik
session itself is the source of truth, and access is purely "is this
account in the right group."

```jsx
// oidc.js
import { createOidcConfig } from '@bescom/authentik-auth';

export const oidcConfig = createOidcConfig({
  clientId: process.env.REACT_APP_CLIENT_ID,
  redirectUri: `${window.location.origin}/callback`,
  authority: process.env.REACT_APP_AUTHENTIK_AUTHORITY,
});
```

```jsx
// App.jsx
import { AuthProvider, CallbackHandler, useAuth } from '@bescom/authentik-auth';
import { oidcConfig } from './oidc';

function CallbackRoute() {
  const navigate = useNavigate();
  return (
    <CallbackHandler
      onSuccess={(user) => {
        const groups = user.profile?.groups || [];
        navigate(groups.includes('new-app-users') ? '/dashboard' : '/access-denied');
      }}
      onError={() => navigate('/login')}
    />
  );
}

function LoginPage() {
  const { login } = useAuth();
  return <button onClick={login}>Login with Authentik SSO</button>;
}

export default function App() {
  return (
    <AuthProvider config={oidcConfig}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/callback" element={<CallbackRoute />} />
        {/* ... */}
      </Routes>
    </AuthProvider>
  );
}
```

## Extension point: custom form / check post-authentication

`onSuccess` is a plain callback — nothing about the package assumes what
happens after login. A future app needing something like an OTP step, a
"complete your profile" form, or a backend token-exchange just does more
inside `onSuccess`:

```jsx
onSuccess={async (user) => {
  const res = await fetch('/api/auth/exchange', {
    method: 'POST',
    body: JSON.stringify({ oidcToken: user.access_token }),
  });
  const data = await res.json();
  if (!data.profileComplete) {
    navigate('/complete-profile');
  } else {
    navigate('/dashboard');
  }
}}
```

## One-click deep-link from another portal

On the portal side, just open the target app's login page with a marker —
do NOT build the Authentik authorize URL yourself from the portal (breaks
PKCE/state validation on the target app's callback):

```jsx
window.open(`${transferAppUrl}/login?sso=auto`, '_blank');
```

On the target app's login page:

```jsx
import { useSsoAutoTrigger } from '@bescom/authentik-auth';

function LoginPage() {
  const { redirecting } = useSsoAutoTrigger();
  if (redirecting) return <p>Signing you in…</p>;
  return <button onClick={/* ... */}>Login with SSO</button>;
}
```

## Notes

- `decodeAppToken` is only needed if your app issues its own backend JWT
  alongside the OIDC session (e.g. an OTP-based login path coexisting with
  SSO). Most new apps using the simple pattern above won't need it.
- This package is React-only. Non-JS apps (Python/Java/etc.) need their own
  equivalent, following the same shape — see project notes for
  framework-specific OIDC client recommendations.
