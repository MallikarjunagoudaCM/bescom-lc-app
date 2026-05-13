/**
 * Validates required environment variables on startup.
 * Called from server.js before anything else runs.
 */
function validateEnv() {
  const required = [
    { key: 'MONGODB_URI',  hint: 'MongoDB Atlas connection string' },
    { key: 'JWT_SECRET',   hint: 'Random string, min 32 chars (run: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))")' },
  ];

  const warnings = [
    { key: 'JWT_EXPIRES_IN',   fallback: '7d' },
    { key: 'ALLOWED_ORIGINS',  fallback: 'http://localhost:3000' },
    { key: 'NODE_ENV',         fallback: 'development' },
    { key: 'PORT',             fallback: '5000' },
  ];

  let hasError = false;
  for (const { key, hint } of required) {
    if (!process.env[key]) {
      console.error(`❌ Missing required env var: ${key}`);
      console.error(`   → ${hint}`);
      hasError = true;
    }
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET is too short — must be at least 32 characters');
    hasError = true;
  }

  if (hasError) {
    console.error('\nServer cannot start with missing configuration.');
    console.error('Copy backend/.env.example to backend/.env and fill in all values.\n');
    process.exit(1);
  }

  for (const { key, fallback } of warnings) {
    if (!process.env[key]) {
      console.warn(`⚠  ${key} not set — using default: "${fallback}"`);
      process.env[key] = fallback;
    }
  }

  console.log('✓ Environment validated');
}

module.exports = validateEnv;
