const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Authentik issues a signed ID token per-Application (via its slug). This
// verifies that signature against Authentik's own JWKS endpoint — this is
// what actually proves the token wasn't forged; never trust claims from a
// token that hasn't been through this check.
const AUTHENTIK_ISSUER = process.env.AUTHENTIK_ISSUER; // https://34-180-36-71.nip.io/application/o/bescom-lc/
const AUTHENTIK_JWKS_URI = process.env.AUTHENTIK_JWKS_URI; // https://34-180-36-71.nip.io/application/o/bescom-lc/jwks/
const AUTHENTIK_CLIENT_ID = process.env.AUTHENTIK_CLIENT_ID; // 2Fz18sBhfVNQo9BWBiwsFfQGtMCmsqwARiY5dl6h

const client = jwksClient({
  jwksUri: AUTHENTIK_JWKS_URI,
  cache: true,
  cacheMaxAge: 60 * 60 * 1000, // 1 hour — Authentik rotates keys rarely
  rateLimit: true,
});

function getSigningKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

/**
 * Verifies an Authentik ID token and returns its decoded claims.
 * Throws if the signature, issuer, or audience don't check out.
 */
function verifyAuthentikToken(idToken) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      idToken,
      getSigningKey,
      {
        algorithms: ['RS256'],
        issuer: AUTHENTIK_ISSUER,
        audience: AUTHENTIK_CLIENT_ID,
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      }
    );
  });
}

module.exports = { verifyAuthentikToken };
