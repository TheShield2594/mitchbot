# Security Improvements

This document outlines the security and code quality improvements made to mitchbot.

## Summary of Changes

### 1. Centralized Logging System
**File:** `utils/logger.js`

**What was fixed:**
- Created centralized logger to replace scattered `console.log` and `console.error` calls
- Implements structured logging with JSON format
- Automatically sanitizes sensitive data (tokens, passwords, API keys)
- Writes logs to files by level (error.log, warn.log, info.log, debug.log)
- Environment-aware logging (verbose in development, minimal in production)

**Benefits:**
- Easier troubleshooting and audit trails
- No sensitive data leaks in logs
- Consistent logging format across the application
- File-based logs for production monitoring

---

### 2. Automod Configuration - Immutable Updates
**File:** `commands/moderation/automod.js`

**What was fixed:**
- Replaced in-place mutations of config objects with immutable updates
- All config updates now create new objects instead of modifying existing ones
- Used spread operators and array methods (filter, map) for safe updates

**Before:**
```javascript
config.automod.wordFilter.words.push(word); // Mutates directly
updateGuildConfig(interaction.guildId, { automod: config.automod });
```

**After:**
```javascript
const newWords = [...currentWords, normalizedWord]; // Immutable
const newAutomod = {
  ...config.automod,
  wordFilter: { ...config.automod.wordFilter, words: newWords },
};
updateGuildConfig(interaction.guildId, { automod: newAutomod });
```

**Benefits:**
- Prevents bugs from unintended side effects
- Makes code easier to reason about
- Safer for concurrent operations
- Follows functional programming best practices

---

### 3. Domain Validation
**File:** `commands/moderation/automod.js`

**What was fixed:**
- Added `validateAndNormalizeDomain()` helper function
- Validates domain format using regex
- Normalizes domains: strips protocols, paths, ports, converts to lowercase
- Rejects invalid or malicious domains

**Features:**
- Strips `https://`, `http://`, `//` prefixes
- Removes paths, query params, hashes
- Removes port numbers
- Validates against domain pattern (requires TLD)
- Returns `null` for invalid input

**Before:**
```javascript
config.automod.linkFilter.whitelist.push(domain); // No validation
```

**After:**
```javascript
const normalizedDomain = validateAndNormalizeDomain(domainInput);
if (!normalizedDomain) {
  await interaction.editReply('❌ Invalid domain...');
  return;
}
```

**Benefits:**
- Prevents injection of invalid/malicious domains
- Consistent domain format in database
- Better user experience with clear error messages
- Protects against bypass attempts

---

### 4. Centralized Logging in Commands
**Files:** `commands/moderation/ban.js`, `commands/moderation/kick.js`

**What was fixed:**
- Replaced `console.log` and `console.error` with centralized logger
- Added context to log entries (command, user IDs, guild ID, interaction ID)
- Sanitized error objects automatically
- User-facing messages remain generic to avoid leaking internals

**Before:**
```javascript
console.log('Could not DM banned user');
console.error('Error banning user:', error);
```

**After:**
```javascript
logger.warn('Could not DM banned user', {
  command: 'ban',
  targetId: target.id,
  guildId: interaction.guildId,
  error,
});

logger.error('Failed to ban user', {
  command: 'ban',
  targetId: target.id,
  interactionId: interaction.id,
  error,
});
```

**Benefits:**
- Structured, searchable logs
- Context for troubleshooting
- No sensitive data exposure
- Consistent error handling

---

### 5. Session Security - Regeneration on Login
**File:** `web/routes/auth.js`

**What was fixed:**
- Implemented session regeneration after OAuth authentication
- Re-establishes user login after regeneration
- Added error handling for regeneration failures
- Added logging for authentication events

**Before:**
```javascript
router.get('/callback',
  passport.authenticate('discord', { failureRedirect: '/auth/login' }),
  (req, res) => {
    res.redirect('/dashboard'); // Session fixation vulnerability!
  }
);
```

**After:**
```javascript
router.get('/callback',
  passport.authenticate('discord', { failureRedirect: '/auth/login' }),
  (req, res) => {
    const user = req.user;
    req.session.regenerate((regenerateErr) => {
      if (regenerateErr) {
        logger.error('Session regeneration failed', { userId: user?.id, error: regenerateErr });
        return res.status(500).send('Authentication failed...');
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          logger.error('Login failed', { userId: user?.id, error: loginErr });
          return res.status(500).send('Authentication failed...');
        }
        logger.info('User authenticated', { userId: user.id });
        res.redirect('/dashboard');
      });
    });
  }
);
```

**Benefits:**
- Prevents session fixation attacks
- Follows OWASP security best practices
- Properly handles errors during authentication
- Audit trail for login events

---

### 6. Production-Ready Web Server
**File:** `web/server.js`

**What was fixed:**

#### 6.1 Security Headers (Helmet)
- Added Helmet middleware with strict CSP
- HSTS enabled with 1-year max-age
- XSS protection, frameguard, nosniff enabled

#### 6.2 Rate Limiting
- 100 requests per 15 minutes per IP for API routes
- Automatically disabled in development
- Standards-compliant rate limit headers

#### 6.3 CORS Configuration
- Environment-aware CORS
- Whitelist in production (via `ALLOWED_ORIGINS`)
- Credentials support for authentication

#### 6.4 Secure Session Configuration
- **Removed hardcoded secret fallback** - now required in env
- **Redis session store** in production (via `REDIS_URL`)
- Memory store only in development (with warning)
- Secure cookies: `httpOnly`, `secure` (prod), `sameSite: 'lax'`
- Custom session cookie name
- Trust proxy setting for production

#### 6.5 OAuth Callback Validation
- **Requires `CALLBACK_URL` in production** - fails fast if missing
- Validates environment variables at startup
- Localhost fallback only in development
- Clear error messages for misconfiguration

#### 6.6 Auth Middleware
- Uses `ensureAuthenticated` middleware for protected routes
- Removes duplicate inline auth checks
- DRY principle - single source of truth
- Consistent redirect behavior

#### 6.7 Error Handling
- Global error handler middleware
- Structured error logging
- Generic error messages to users (no stack traces)

**Benefits:**
- Production-ready security posture
- Fails fast on misconfiguration
- Scales with Redis session store
- Protection against common web vulnerabilities
- Environment-aware configuration

---

### 7. Updated Dependencies
**File:** `package.json`

**Added packages:**
- `helmet` - Security headers
- `express-rate-limit` - API rate limiting
- `cors` - CORS configuration
- `connect-redis` - Redis session store
- `redis` - Redis client

---

## Environment Variables

### Required for Development
```bash
CLIENT_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
SESSION_SECRET=your_random_secret (REQUIRED - no fallback)
CALLBACK_URL=http://localhost:3000/auth/callback
```

### Additional for Production
```bash
NODE_ENV=production
REDIS_URL=redis://localhost:6379 (required for session persistence)
ALLOWED_ORIGINS=https://yourdomain.com (for CORS)
CALLBACK_URL=https://yourdomain.com/auth/callback (required)
```

---

## Security Checklist

### ✅ Fixed
- [x] Session fixation vulnerability
- [x] Hardcoded secrets
- [x] Missing security headers
- [x] No rate limiting
- [x] Insecure cookie configuration
- [x] No CORS protection
- [x] In-memory session store in production
- [x] Missing input validation (domains)
- [x] Direct object mutation
- [x] Console logging instead of structured logs
- [x] Missing environment variable validation
- [x] Duplicate authentication logic

### 🔒 Security Features Now Enabled
- [x] Helmet with CSP, HSTS, XSS protection
- [x] Rate limiting on API routes
- [x] CORS with whitelist support
- [x] Redis session store (production)
- [x] Secure, httpOnly, sameSite cookies
- [x] Session regeneration on login
- [x] Environment validation at startup
- [x] Centralized, sanitized logging
- [x] Domain validation and normalization
- [x] Immutable configuration updates

---

## Deployment Checklist

### Before deploying to production:

1. **Set all required environment variables**
   - `SESSION_SECRET` (use strong random value)
   - `DISCORD_CLIENT_SECRET`
   - `CALLBACK_URL` (https URL)
   - `NODE_ENV=production`
   - `REDIS_URL` (if using Redis)

2. **Configure OAuth redirects in Discord Developer Portal**
   - Add production callback URL to allowed redirects

3. **Set up Redis** (recommended for production)
   - Install and configure Redis server
   - Set `REDIS_URL` environment variable

4. **Configure CORS** (if frontend on different domain)
   - Set `ALLOWED_ORIGINS` environment variable

5. **Enable HTTPS**
   - Use reverse proxy (nginx, Cloudflare, etc.)
   - Secure cookies require HTTPS

6. **Review logs**
   - Monitor `logs/` directory
   - Set up log rotation
   - Consider log aggregation service

---

## Testing

After deployment, verify:
- ✅ OAuth login works correctly
- ✅ Session persists across requests
- ✅ Rate limiting triggers after 100 requests
- ✅ CORS blocks unauthorized origins
- ✅ Security headers present (check browser devtools)
- ✅ Automod domain validation rejects invalid input
- ✅ Logs written to files with proper sanitization

---

## Additional Recommendations

### Future Improvements
1. **Add CSRF protection** - Use `csurf` package
2. **Add input sanitization** - For all user inputs (XSS prevention)
3. **Add SQL injection protection** - If moving to SQL database
4. **Add 2FA option** - For admin users
5. **Add webhook signatures** - For Discord webhooks
6. **Add API key rotation** - For long-running deployments
7. **Add monitoring** - Consider APM tools (DataDog, NewRelic)

### Security Audits
- Run `npm audit` regularly
- Update dependencies monthly
- Review logs for suspicious activity
- Test rate limits periodically

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet Documentation](https://helmetjs.github.io/)
- [Passport.js Session Management](http://www.passportjs.org/concepts/authentication/sessions/)
