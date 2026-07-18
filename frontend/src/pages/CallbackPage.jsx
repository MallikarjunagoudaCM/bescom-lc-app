import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CallbackHandler } from '@bescom/authentik-auth';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth.api';
import toast from 'react-hot-toast';

// The SSO Portal's own dashboard is where a person adds a missing mobile
// number today (see AddPhone.jsx there). Sent there as a plain link — per
// how the Transfer App flow works, they land on the SSO Portal's own
// dashboard afterward, not back here automatically.
const SSO_PORTAL_URL = import.meta.env.VITE_SSO_PORTAL_URL || 'http://localhost:4000';

export default function CallbackPage() {
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();
  // Holds { name, email } for the account that needs a mobile number, so
  // this can be shown to the person before redirecting — a toast that
  // vanishes right as the page navigates away isn't a real confirmation,
  // and doesn't tell them which account is about to be modified.
  const [needsMobileFor, setNeedsMobileFor] = useState(null);

  if (needsMobileFor) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ maxWidth: 420, textAlign: 'center', background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, padding: '2rem', boxShadow: 'var(--c-shadow-md)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📱</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Mobile Number Required</h2>
          <p style={{ fontSize: 14, color: 'var(--c-text2)', marginBottom: 4 }}>
            BESCOM LC needs a mobile number on file to sign you in.
          </p>
          <p style={{ fontSize: 14, marginBottom: 20 }}>
            You'll be adding one for:<br />
            <strong>{needsMobileFor.username || needsMobileFor.name || needsMobileFor.email}</strong>
            {needsMobileFor.email ? (
              <><br /><span style={{ color: 'var(--c-text3)', fontSize: 13 }}>{needsMobileFor.email}</span></>
            ) : null}
          </p>
          <button
            onClick={() => { window.location.href = `${SSO_PORTAL_URL}/add-phone`; }}
            style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: 'var(--c-primary)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>
            Continue to Add Mobile Number →
          </button>
          <button
            onClick={() => navigate('/login', { replace: true })}
            style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--c-border)', background: 'transparent', color: 'var(--c-text2)', fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <CallbackHandler
      loadingContent={
        <div className="page-loading">Signing you in with SSO…</div>
      }
      onSuccess={async (oidcUser) => {
        try {
          const { data } = await authApi.loginSso(oidcUser.id_token);
          loginWithTokens(data.accessToken, data.refreshToken, data.user);
          navigate('/', { replace: true });
        } catch (err) {
          if (err.response?.status === 428 && err.response?.data?.needsMobile) {
            setNeedsMobileFor({
              username: oidcUser.profile?.preferred_username,
              name: oidcUser.profile?.name,
              email: oidcUser.profile?.email,
            });
            return;
          }
          // 403 (not provisioned) and any other failure already show a
          // toast via the axios interceptor — just send them back to login.
          navigate('/login', { replace: true });
        }
      }}
      onError={() => {
        toast.error('SSO sign-in failed. Please try again.');
        navigate('/login', { replace: true });
      }}
    />
  );
}
