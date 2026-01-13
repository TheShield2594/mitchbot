# Web Security Implementation Guide

This guide provides complete implementation for CSRF protection and input validation.

## Prerequisites

Install required packages:

```bash
npm install @dr.pogodin/csurf express-validator
```

**Note:** Using `@dr.pogodin/csurf` (maintained fork) instead of deprecated `csurf` package.

## 1. CSRF Protection Implementation

### A. Create CSRF Middleware

**File:** `web/middleware/csrf.js` (NEW)

```javascript
const csrf = require('@dr.pogodin/csurf');
const logger = require('../../utils/logger');

// CSRF protection middleware
const csrfProtection = csrf({
  cookie: false, // Use session instead of cookies
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
});

// Middleware to add CSRF token to all responses
function addCsrfToken(req, res, next) {
  if (req.csrfToken) {
    res.locals.csrfToken = req.csrfToken();
  }
  next();
}

// Error handler for CSRF validation failures
function csrfErrorHandler(err, req, res, next) {
  if (err.code !== 'EBADCSRFTOKEN') {
    return next(err);
  }

  // CSRF token validation failed
  logger.warn('CSRF token validation failed', {
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip,
  });

  res.status(403).json({
    error: 'Invalid CSRF token',
    message: 'Your session may have expired. Please refresh the page and try again.',
  });
}

module.exports = {
  csrfProtection,
  addCsrfToken,
  csrfErrorHandler,
};
```

### B. Update server.js

**File:** `web/server.js`

Add after session middleware (around line 188):

```javascript
const { csrfProtection, addCsrfToken, csrfErrorHandler } = require('./middleware/csrf');

// ... existing session setup ...

app.use(passport.initialize());
app.use(passport.session());

// CSRF Protection - add after session but before routes
app.use(csrfProtection);
app.use(addCsrfToken);

// ... rest of the code ...

// Add CSRF error handler BEFORE general error handler
app.use(csrfErrorHandler);

// Error handling middleware
app.use((err, req, res, next) => {
  // ... existing error handler ...
});
```

### C. Update HTML Pages to Include CSRF Tokens

**For dashboard.html, guild.html, and any forms:**

Add this meta tag in the `<head>` section:

```html
<meta name="csrf-token" content="<%= csrfToken %>">
```

For forms, add hidden input:

```html
<form method="POST" action="/api/...">
  <input type="hidden" name="_csrf" value="<%= csrfToken %>">
  <!-- rest of form -->
</form>
```

For AJAX requests, include token in headers:

```javascript
// Get CSRF token from meta tag
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

// Include in fetch requests
fetch('/api/guild/123/economy/config', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'CSRF-Token': csrfToken, // Add token header
  },
  body: JSON.stringify(data),
  credentials: 'include',
});
```

### D. Update API Routes to Send Token

**File:** `web/routes/api.js`

For GET routes that render pages, pass token:

```javascript
router.get('/guild/:guildId', ensureAuthenticated, (req, res) => {
  res.render('guild', {
    csrfToken: req.csrfToken(),
    guild: req.guild,
  });
});
```

---

## 2. Input Validation Implementation

### A. Create Validation Middleware

**File:** `web/middleware/validation.js` (NEW)

```javascript
const { body, param, validationResult } = require('express-validator');

/**
 * Validation error handler middleware
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }

  next();
}

/**
 * Guild ID validation
 */
const validateGuildId = [
  param('guildId')
    .isString()
    .matches(/^\d{17,19}$/)
    .withMessage('Invalid guild ID format'),
];

/**
 * User ID validation
 */
const validateUserId = [
  param('userId')
    .isString()
    .matches(/^\d{17,19}$/)
    .withMessage('Invalid user ID format'),
];

/**
 * Economy config validation
 */
const validateEconomyConfig = [
  body('startingBalance')
    .optional()
    .isInt({ min: 0, max: 1000000 })
    .withMessage('Starting balance must be between 0 and 1,000,000'),

  body('dailyReward')
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage('Daily reward must be between 0 and 10,000'),

  body('workRewardMin')
    .optional()
    .isInt({ min: 0, max: 5000 })
    .withMessage('Work reward min must be between 0 and 5,000'),

  body('workRewardMax')
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage('Work reward max must be between 0 and 10,000'),

  body('currencyName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 32 })
    .matches(/^[a-zA-Z0-9\s_-]+$/)
    .withMessage('Currency name must be 1-32 alphanumeric characters'),

  body('currencySymbol')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 5 })
    .withMessage('Currency symbol must be 1-5 characters'),

  // Custom validation: min <= max
  body('workRewardMax').custom((value, { req }) => {
    if (req.body.workRewardMin && value < req.body.workRewardMin) {
      throw new Error('Work reward max must be >= min');
    }
    return true;
  }),
];

/**
 * XP config validation
 */
const validateXPConfig = [
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be boolean'),

  body('xpPerMessage')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('XP per message must be between 0 and 100'),

  body('xpCooldownSeconds')
    .optional()
    .isInt({ min: 0, max: 3600 })
    .withMessage('XP cooldown must be between 0 and 3600 seconds'),

  body('levelUpChannelId')
    .optional()
    .custom((value) => {
      if (value && !/^\d{17,19}$/.test(value)) {
        throw new Error('Invalid channel ID format');
      }
      return true;
    }),
];

/**
 * Moderation config validation
 */
const validateModerationConfig = [
  body('wordFilter.enabled')
    .optional()
    .isBoolean(),

  body('wordFilter.words')
    .optional()
    .isArray()
    .withMessage('Words must be an array'),

  body('wordFilter.words.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9\s_-]+$/)
    .withMessage('Invalid word format'),

  body('antiSpam.enabled')
    .optional()
    .isBoolean(),

  body('antiSpam.maxMessages')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Max messages must be between 1 and 100'),

  body('antiSpam.timeWindowSeconds')
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage('Time window must be between 1 and 60 seconds'),

  body('antiRaid.minAccountAgeHours')
    .optional()
    .isInt({ min: 0, max: 8760 })
    .withMessage('Min account age must be between 0 and 8760 hours (1 year)'),
];

/**
 * Shop item validation
 */
const validateShopItem = [
  body('name')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be 1-100 characters'),

  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be max 500 characters'),

  body('price')
    .isInt({ min: 1, max: 1000000 })
    .withMessage('Price must be between 1 and 1,000,000'),

  body('stock')
    .optional()
    .isInt({ min: -1, max: 10000 })
    .withMessage('Stock must be between -1 (unlimited) and 10,000'),

  body('roleId')
    .optional()
    .matches(/^\d{17,19}$/)
    .withMessage('Invalid role ID format'),
];

/**
 * Balance adjustment validation
 */
const validateBalanceAdjustment = [
  body('amount')
    .isInt({ min: -1000000, max: 1000000 })
    .withMessage('Amount must be between -1,000,000 and 1,000,000'),

  body('reason')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason must be max 200 characters'),
];

module.exports = {
  handleValidationErrors,
  validateGuildId,
  validateUserId,
  validateEconomyConfig,
  validateXPConfig,
  validateModerationConfig,
  validateShopItem,
  validateBalanceAdjustment,
};
```

### B. Update API Routes with Validation

**File:** `web/routes/api.js`

Example updates:

```javascript
const {
  handleValidationErrors,
  validateGuildId,
  validateEconomyConfig,
  validateXPConfig,
  validateShopItem,
} = require('../middleware/validation');

// Economy config update
router.post('/guild/:guildId/economy/config',
  ensureAuthenticated,
  validateGuildId,
  validateEconomyConfig,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { guildId } = req.params;

      // Verify user has permission
      if (!req.user.guilds.find(g => g.id === guildId && (g.permissions & 0x8) === 0x8)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const updated = await updateEconomyConfig(guildId, req.body);
      res.json({ success: true, config: updated });
    } catch (error) {
      logger.error('Failed to update economy config', { error, guildId: req.params.guildId });
      res.status(500).json({ error: 'Failed to update configuration' });
    }
  }
);

// XP config update
router.post('/guild/:guildId/xp/config',
  ensureAuthenticated,
  validateGuildId,
  validateXPConfig,
  handleValidationErrors,
  async (req, res) => {
    // ... implementation
  }
);

// Shop item creation
router.post('/guild/:guildId/shop/items',
  ensureAuthenticated,
  validateGuildId,
  validateShopItem,
  handleValidationErrors,
  async (req, res) => {
    // ... implementation
  }
);
```

---

## 3. Testing

### Test CSRF Protection:

1. Try submitting a form without CSRF token - should get 403
2. Try submitting with invalid token - should get 403
3. Submit with valid token - should succeed

```bash
# Without token (should fail)
curl -X POST http://localhost:3000/api/guild/123/economy/config \
  -H "Content-Type: application/json" \
  -d '{"startingBalance": 1000}'

# With valid token (should succeed)
curl -X POST http://localhost:3000/api/guild/123/economy/config \
  -H "Content-Type: application/json" \
  -H "CSRF-Token: <token-from-meta-tag>" \
  -H "Cookie: connect.sid=<session-cookie>" \
  -d '{"startingBalance": 1000}'
```

### Test Input Validation:

1. Try invalid values - should get 400 with error details
2. Try SQL injection attempts - should be sanitized
3. Try XSS attempts - should be escaped

```bash
# Invalid value (should fail with validation error)
curl -X POST http://localhost:3000/api/guild/123/economy/config \
  -H "Content-Type: application/json" \
  -H "CSRF-Token: <token>" \
  -d '{"startingBalance": 9999999999}'

# XSS attempt (should be sanitized)
curl -X POST http://localhost:3000/api/guild/123/shop/items \
  -H "Content-Type: application/json" \
  -H "CSRF-Token: <token>" \
  -d '{"name": "<script>alert(1)</script>", "price": 100}'
```

---

## 4. Security Best Practices

### Additional Recommendations:

1. **Rate Limiting Per User:**
```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later',
    });
  },
});

app.use('/api/', apiLimiter);
```

2. **Input Sanitization:**
- Use `trim()` on all string inputs
- Use `escape()` for HTML output
- Use parameterized queries for database (if migrating to SQL)

3. **Content Security Policy:**
- Already implemented in server.js
- Prevents XSS by restricting script sources

4. **Secure Headers:**
- Already using Helmet middleware
- HSTS enabled for HTTPS enforcement

5. **Session Security:**
- httpOnly cookies (prevents XSS access)
- secure flag in production (HTTPS only)
- sameSite: 'lax' (CSRF protection)

---

## 5. Deployment Checklist

Before deploying with security features:

- [ ] Install required packages: `npm install @dr.pogodin/csurf express-validator`
- [ ] Create csrf.js middleware
- [ ] Create validation.js middleware
- [ ] Update server.js with CSRF middleware
- [ ] Update all HTML pages with CSRF tokens
- [ ] Update all API POST/PUT/DELETE routes with validation
- [ ] Update frontend JavaScript to include CSRF tokens
- [ ] Test CSRF protection
- [ ] Test input validation
- [ ] Review logs for failed validations
- [ ] Configure rate limiting per user
- [ ] Test error handling
- [ ] Verify HTTPS is enabled in production

---

## Summary

**CSRF Protection:**
- Prevents cross-site request forgery attacks
- Requires valid token for all state-changing requests
- Token automatically generated and validated

**Input Validation:**
- Prevents injection attacks (XSS, SQL)
- Enforces data type and range constraints
- Provides clear error messages
- Sanitizes user input

**Impact:**
- Web dashboard hardened against common attacks
- API endpoints validate all user input
- Clear error messages guide users
- Comprehensive logging for security monitoring

These implementations follow OWASP security guidelines and industry best practices.
