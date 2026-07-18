import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';

/**
 * Drop-in <Route path="/callback" element={<CallbackHandler ... />} />.
 *
 * Must run in the SAME app/browser context that called signinRedirect() —
 * oidc-client-ts stores PKCE/state in localStorage at signinRedirect() time,
 * and signinRedirectCallback() validates against it. Building the authorize
 * URL yourself elsewhere (e.g. deep-linking from another app) and landing
 * here will fail validation silently. If you want a one-click deep-link
 * into this app, use useSsoAutoTrigger on this app's own login page instead
 * of constructing the authorize URL externally.
 *
 * @param {(user: import('oidc-client-ts').User) => void} onSuccess
 *   Called once the OIDC round-trip completes. This is where each app
 *   supplies its own logic: check groups, call a backend token-exchange,
 *   show a custom form, redirect to a role-specific dashboard, etc. The
 *   package intentionally has no opinion about what happens here.
 * @param {(err: Error) => void} [onError]
 *   Defaults to logging and re-throwing nothing — pass this to redirect to
 *   a login/error page.
 * @param {React.ReactNode} [loadingContent]
 */
export function CallbackHandler({ onSuccess, onError, loadingContent }) {
  const { userManager } = useAuth();
  const handled = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Guards against React StrictMode's dev-mode double-invoke of effects,
    // which would otherwise call signinRedirectCallback() twice against a
    // code that's only valid once.
    if (handled.current) return;
    handled.current = true;

    userManager
      .signinRedirectCallback()
      .then((user) => {
        onSuccess?.(user);
      })
      .catch((err) => {
        console.error('[bescom-authentik-auth] callback error:', err);
        setError(err);
        onError?.(err);
      });
  }, [userManager, onSuccess, onError]);

  if (error) {
    return loadingContent ?? <p>Something went wrong signing you in.</p>;
  }

  return loadingContent ?? <p>Signing you in…</p>;
}
