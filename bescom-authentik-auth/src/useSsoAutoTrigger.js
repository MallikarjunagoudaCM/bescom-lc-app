import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthProvider';

/**
 * Drop into any login page to support one-click deep-links from another
 * portal, e.g. <button onClick={() => window.open(`${appUrl}/login?sso=auto`)}>.
 *
 * Deliberately does NOT build the Authentik authorize URL externally —
 * this hook calls THIS app's own userManager.signinRedirect(), so
 * oidc-client-ts's PKCE/state ends up in the right place for this app's
 * own CallbackHandler to validate. That round-trip must stay inside one
 * app's browser context; see CallbackHandler's doc comment for why.
 *
 * @param {string} [paramName] - query param name to watch for, default 'sso'
 * @param {string} [paramValue] - value that triggers auto-login, default 'auto'
 * @returns {{ redirecting: boolean }}
 */
export function useSsoAutoTrigger(paramName = 'sso', paramValue = 'auto') {
  const { userManager } = useAuth();
  const [searchParams] = useSearchParams();
  const triggered = useRef(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (triggered.current) return; // StrictMode double-invoke guard
    if (searchParams.get(paramName) !== paramValue) return;
    triggered.current = true;
    setRedirecting(true);
    userManager.signinRedirect();
  }, [searchParams, paramName, paramValue, userManager]);

  return { redirecting };
}
