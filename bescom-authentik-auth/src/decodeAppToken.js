/**
 * Optional — only needed if your app ALSO issues its own backend JWT
 * (e.g. because it has non-Authentik login paths too, like an OTP flow, or
 * needs its own session independent of the OIDC one). Most new apps using
 * the simple "check groups → dashboard" pattern won't need this at all;
 * the OIDC session from AuthProvider is enough on its own.
 *
 * Decodes a JWT and returns its claims. Does not verify the signature —
 * this is for reading a token your OWN backend already issued and you
 * already trust; never use this to validate a token from an untrusted
 * source.
 */
export function decodeAppToken(token) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const json = decodeURIComponent(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json);
  } catch (err) {
    console.error('[bescom-authentik-auth] failed to decode token:', err);
    return null;
  }
}
