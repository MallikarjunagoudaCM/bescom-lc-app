/**
 * Builds the oidc-client-ts UserManager config.
 *
 * @param {Object} opts
 * @param {string} opts.clientId       - Client ID from the Authentik Provider
 * @param {string} opts.redirectUri    - Must EXACTLY match a Redirect URI
 *                                       registered on that Provider (protocol,
 *                                       host, path, trailing slash — all of it).
 *                                       A mismatch here is the #1 way this
 *                                       silently breaks.
 * @param {string} opts.authority      - e.g. https://<host>/application/o/<slug>
 * @param {string} [opts.scope]        - defaults to 'openid profile email groups'
 * @param {string} [opts.postLogoutRedirectUri]
 */
export function createOidcConfig({
  clientId,
  redirectUri,
  authority,
  scope = 'openid profile email groups',
  postLogoutRedirectUri,
}) {
  if (!clientId) throw new Error('[bescom-authentik-auth] clientId is required');
  if (!redirectUri) throw new Error('[bescom-authentik-auth] redirectUri is required');
  if (!authority) throw new Error('[bescom-authentik-auth] authority is required');

  const baseUrl = authority.split('/application/')[0];

  return {
    authority,
    client_id: clientId,
    redirect_uri: redirectUri,
    post_logout_redirect_uri: postLogoutRedirectUri || redirectUri,
    response_type: 'code',
    scope,
    loadUserInfo: false,
    // Explicit endpoints rather than relying purely on discovery — this
    // matches the working config we already had in production, and avoids
    // depending on the authority URL's own /.well-known/openid-configuration
    // resolving correctly in every environment.
    metadata: {
      issuer: `${authority}/`,
      authorization_endpoint: `${baseUrl}/application/o/authorize/`,
      token_endpoint: `${baseUrl}/application/o/token/`,
      userinfo_endpoint: `${baseUrl}/application/o/userinfo/`,
      end_session_endpoint: `${authority}/end-session/`,
    },
  };
}
