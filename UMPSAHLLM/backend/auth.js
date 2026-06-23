// Firebase ID-token verification middleware for the UMPSAHLLM backend.
//
// Opt-in: it only enforces when FIREBASE_PROJECT_ID is set. Until then it is a
// no-op so existing deployments keep working. To lock the API down:
//   1. Set FIREBASE_PROJECT_ID=umpsahllm  (and optionally FIREBASE_SERVICE_ACCOUNT
//      = the service-account JSON as a single-line string for full verification).
//   2. Have the frontend send `Authorization: Bearer <firebaseIdToken>`.

let admin = null;
let enabled = false;

try {
  if (process.env.FIREBASE_PROJECT_ID) {
    admin = require('firebase-admin');
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (sa) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(sa)) });
    } else {
      // projectId-only init is enough to verify ID tokens against Google's public keys.
      admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
    }
    enabled = true;
    console.log('🔐 Firebase auth ENABLED — verifying ID tokens on protected routes');
  } else {
    console.log('⚠️ Firebase auth DISABLED (set FIREBASE_PROJECT_ID to enforce). Protected routes are OPEN.');
  }
} catch (e) {
  console.error('Firebase admin init failed; auth left disabled:', e.message);
  admin = null;
  enabled = false;
}

// Verifies the bearer token when auth is enabled; otherwise passes through.
async function requireAuth(req, res, next) {
  if (!enabled) return next();
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized: missing bearer token' });
  try {
    req.user = await admin.auth().verifyIdToken(token);
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }
}

module.exports = { requireAuth, authEnabled: () => enabled };
