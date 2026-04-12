/**
 * authMiddleware.js
 * Robust JWT Authentication Middleware for Express.js
 *
 * Required packages:
 *   npm install jsonwebtoken express-rate-limit helmet express-validator
 */

const jwt = require("jsonwebtoken");
const { rateLimit } = require("express-rate-limit");

// ─────────────────────────────────────────────
// CONFIG  (pull from env — never hard-code)
// ─────────────────────────────────────────────
const {
  JWT_SECRET,
  JWT_SECRET_REFRESH,
  NODE_ENV = "development",
} = process.env;

if (!JWT_SECRET) {
  throw new Error("[Auth] JWT_SECRET env variable is required.");
}

// ─────────────────────────────────────────────
// TOKEN BLACKLIST  (in-memory — swap for Redis in production)
// ─────────────────────────────────────────────
const tokenBlacklist = new Set();

/**
 * Revoke a token (logout, password reset, account suspension).
 * In production replace this Set with a Redis TTL entry keyed to `jti`.
 */
const revokeToken = (token) => tokenBlacklist.add(token);

// ─────────────────────────────────────────────
// RATE LIMITER  (brute-force / token-stuffing protection)
// ─────────────────────────────────────────────
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests — please try again later.",
  },
});

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Extract the raw token string from the Authorization header or a cookie.
 * Supports:  "Bearer <token>"  |  "Token <token>"  |  cookie "accessToken"
 */
const extractToken = (req) => {
  const { authorization } = req.headers;

  if (authorization) {
    const parts = authorization.trim().split(/\s+/);

    // Edge case: malformed header (no space, wrong number of parts)
    if (parts.length !== 2) return null;

    const [scheme, token] = parts;
    const schemeUpper = scheme.toUpperCase();

    if (schemeUpper === "BEARER" || schemeUpper === "TOKEN") {
      return token;
    }
    return null;
  }

  // Fallback to httpOnly cookie (web clients)
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
};

/**
 * Unified error sender — never leaks internals in production.
 */
const sendAuthError = (res, status, message, details = null) => {
  const body = { success: false, error: message };
  if (details && NODE_ENV !== "production") body.details = details;
  return res.status(status).json(body);
};

// ─────────────────────────────────────────────
// CORE MIDDLEWARE
// ─────────────────────────────────────────────

/**
 * authenticate(options?)
 *
 * Options:
 *   roles       {string[]}  — allowed roles, e.g. ["admin", "editor"]
 *   optional    {boolean}   — when true, a missing token doesn't block the request
 *                             but req.user is populated if a valid token is present
 */
const authenticate = (options = {}) => {
  const { roles = [], optional = false } = options;

  return [
    authRateLimiter,

    (req, res, next) => {
      // ── 1. Extract token ─────────────────────────────────────────
      const token = extractToken(req);

      if (!token) {
        if (optional) {
          req.user = null;
          return next();
        }
        return sendAuthError(res, 401, "No authentication token provided.");
      }

      // ── 2. Blacklist check ───────────────────────────────────────
      if (tokenBlacklist.has(token)) {
        return sendAuthError(res, 401, "Token has been revoked.");
      }

      // ── 3. Verify signature & expiry ────────────────────────────
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET, {
          algorithms: ["HS256"],   // be explicit; reject HS384, RS256, etc.
          clockTolerance: 30,      // seconds — handles minor clock skew
        });
      } catch (err) {
        // Granular error messages (hidden in production)
        const map = {
          TokenExpiredError:   [401, "Token has expired."],
          JsonWebTokenError:   [401, "Invalid token."],
          NotBeforeError:      [401, "Token not yet active."],
        };
        const [status, message] = map[err.name] ?? [401, "Authentication failed."];
        return sendAuthError(res, status, message, err.message);
      }

      // ── 4. Sanity-check payload shape ────────────────────────────
      if (!decoded.sub || typeof decoded.sub !== "string") {
        return sendAuthError(res, 401, "Invalid token payload: missing subject.");
      }

      // ── 5. Role-based access control (RBAC) ─────────────────────
      if (roles.length > 0) {
        const userRoles = Array.isArray(decoded.roles) ? decoded.roles : [];
        const hasRole = roles.some((r) => userRoles.includes(r));
        if (!hasRole) {
          return sendAuthError(
            res,
            403,
            `Access denied. Required role(s): ${roles.join(", ")}.`
          );
        }
      }

      // ── 6. Attach user to request ────────────────────────────────
      req.user = {
        id:     decoded.sub,
        email:  decoded.email  ?? null,
        roles:  decoded.roles  ?? [],
        jti:    decoded.jti    ?? null,
      };

      // Optional: log authenticated access (strip in production or use a logger)
      if (NODE_ENV !== "production") {
        console.debug(`[Auth] ✓ user=${req.user.id} route=${req.method} ${req.path}`);
      }

      next();
    },
  ];
};

// ─────────────────────────────────────────────
// CONVENIENCE WRAPPERS
// ─────────────────────────────────────────────

/** Require authentication, no role check. */
const requireAuth = authenticate();

/** Require one or more roles. */
const requireRole = (...roles) => authenticate({ roles });

/** Attach user if token present, but don't block unauthenticated requests. */
const optionalAuth = authenticate({ optional: true });

// ─────────────────────────────────────────────
// REFRESH TOKEN MIDDLEWARE  (separate endpoint)
// ─────────────────────────────────────────────

/**
 * Use on POST /auth/refresh.
 * Expects { refreshToken } in request body.
 */
const handleRefresh = (req, res, next) => {
  if (!JWT_SECRET_REFRESH) {
    return sendAuthError(res, 500, "Refresh tokens not configured.");
  }

  const { refreshToken } = req.body ?? {};

  if (!refreshToken || typeof refreshToken !== "string") {
    return sendAuthError(res, 400, "Refresh token is required.");
  }

  if (tokenBlacklist.has(refreshToken)) {
    return sendAuthError(res, 401, "Refresh token has been revoked.");
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, JWT_SECRET_REFRESH, {
      algorithms: ["HS256"],
    });
  } catch (err) {
    const message =
      err.name === "TokenExpiredError"
        ? "Refresh token expired. Please log in again."
        : "Invalid refresh token.";
    return sendAuthError(res, 401, message, err.message);
  }

  // Issue a new access token
  const newAccessToken = jwt.sign(
    {
      sub:   decoded.sub,
      email: decoded.email,
      roles: decoded.roles,
    },
    JWT_SECRET,
    { algorithm: "HS256", expiresIn: "15m" }
  );

  req.newAccessToken = newAccessToken;   // caller sends this to the client
  next();
};

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
module.exports = {
  authenticate,
  requireAuth,
  requireRole,
  optionalAuth,
  handleRefresh,
  revokeToken,
  authRateLimiter,
};