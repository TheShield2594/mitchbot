# Security & Abuse Review Report
**Date:** 2026-01-12
**Reviewer:** Automated Security Audit
**Scope:** Discord Bot - Full Codebase Review

---

## Executive Summary

This report identifies **8 HIGH**, **6 MEDIUM**, and **4 LOW** severity security/abuse issues across the Discord bot codebase. The primary concerns are:

1. **Missing upper bounds on economy amounts** - allows integer overflow and resource exhaustion
2. **Missing per-command cooldowns** - gambling commands can be spammed rapidly
3. **Race conditions in economy system** - concurrent transactions can create exploits
4. **Massban lacks rate limiting** - can be abused for rapid actions
5. **Heist system exploits** - griefing and resource exhaustion

---

## 🔴 CRITICAL SEVERITY ISSUES

### 1. Missing Upper Bounds on Economy Transactions ⚠️ **CRITICAL**

**Location:** `commands/economy/*.js`, `web/routes/api.js`

**Issue:**
- Most gambling commands use `setMinValue(1)` but **NO `setMaxValue()`**
- Admin economy commands (`eco.js`) allow unlimited amounts
- Web API economy config allows up to 1,000,000 but lacks max validation on bet amounts
- Could lead to:
  - Integer overflow (values approaching Number.MAX_SAFE_INTEGER = 9,007,199,254,740,991)
  - Database bloat with enormous transaction logs
  - Economic manipulation at scale

**Evidence:**
```javascript
// commands/economy/heist.js:18-23
.addIntegerOption(option =>
    option
        .setName("amount")
        .setDescription("Amount to contribute to the heist")
        .setRequired(true)
        .setMinValue(1)  // ❌ No setMaxValue()
);
```

**Impact:** HIGH
- Users could bet MAX_SAFE_INTEGER in gambling commands
- Admin could set balances to absurd values
- Transaction logs could grow unbounded
- Memory exhaustion in large servers

**Exploitation Scenario:**
```
1. User creates heist with bet of 9007199254740991 coins
2. Multiple users join with similar bets
3. Transaction log explodes, bot crashes or slows
4. OR: User uses /eco set @user 9007199254740991 repeatedly
```

**Recommendation:**
```javascript
// Add to ALL gambling commands
.setMaxValue(1000000)  // or server-configurable max

// Add to eco.js admin commands
.setMaxValue(100000000)  // generous but bounded

// Add validation in economy.js
if (amount > MAX_ECONOMY_AMOUNT) {
    throw new Error(`Amount exceeds maximum of ${MAX_ECONOMY_AMOUNT}`);
}
```

---

### 2. Missing Command Cooldowns on Gambling Commands ⚠️ **CRITICAL**

**Location:** `commands/economy/*.js` (most gambling games)

**Issue:**
- Economy cooldowns are **only enforced in economy.js** (daily, work, beg, crime, rob, fishing, mining, hunting)
- **No cooldowns** on:
  - Blackjack, Slots, Dice, Coinflip, Crash, Roulette, High/Low, Double-or-Nothing
- Users can spam these commands as fast as Discord API allows (multiple per second)

**Evidence:**
```bash
# Checked for cooldown usage in economy commands
$ grep -r "checkCooldown\|setCooldown" commands/economy/
# Result: NO matches - cooldowns.js is NOT used by ANY economy command
```

**Impact:** HIGH
- Rapid wealth generation/loss (automated scripts)
- Bot command spam in public channels
- Unfair advantage via automation
- Server resource exhaustion

**Exploitation Scenario:**
```
1. User creates script to spam /blackjack 1 every 100ms
2. Plays 600 games/minute (10 games/second with API limits)
3. With 50% win rate, can grind currency far faster than intended
4. Multiplied across large public servers = massive abuse potential
```

**Recommendation:**
```javascript
// Add to EVERY gambling command's execute() function
const { checkCooldown, setCooldown } = require('../../utils/cooldowns');

// Before deducting bet:
const cooldown = checkCooldown(interaction.user.id, 'blackjack', 3000);
if (cooldown.onCooldown) {
    await interaction.reply({
        content: `Please wait ${cooldown.remainingTime}s before playing again.`,
        ephemeral: true
    });
    return;
}

// After deducting bet:
setCooldown(interaction.user.id, 'blackjack', 3000);
```

---

### 3. Race Conditions in Economy System ⚠️ **HIGH**

**Location:** `utils/economy.js`, `commands/economy/duel.js`, `commands/economy/heist.js`

**Issue:**
- File-based JSON storage with **write queue** but no read locking
- Multiple concurrent transactions can race:
  1. User A reads balance: 1000
  2. User B reads balance: 1000
  3. User A bets 500, writes balance: 500
  4. User B bets 500, writes balance: 500 (should be 0!)
  5. User has spent 1000 but balance shows 500

**Evidence:**
```javascript
// utils/economy.js:174-188
function getBalance(guildId, userId) {
  const guildData = getGuildEconomy(guildId);  // ❌ No lock
  // ...
  return Number(guildData.balances[userId] || 0);
}

// utils/economy.js:211-228
function addBalance(guildId, userId, amount, details = {}) {
  const current = getBalance(guildId, userId);  // ❌ Read without lock
  const updated = current + amount;
  setBalance(guildId, userId, updated);  // ❌ Write without lock
  // ...
}
```

**Impact:** HIGH
- Double-spending exploits
- Negative balances possible
- Corrupted transaction logs
- Especially problematic in:
  - Duel (deducts from both users)
  - Heist (deducts from N users)
  - Rob (transfers between users)

**Exploitation Scenario:**
```
1. User has 1000 coins
2. User sends /blackjack 900 in Channel A
3. User immediately sends /coinflip 900 in Channel B
4. Both commands read balance=1000 before either deducts
5. Both succeed, user has bet 1800 but only had 1000
```

**Recommendation:**
```javascript
// Option 1: Per-user transaction locks
const userLocks = new Map();  // userId -> Promise

async function withUserLock(guildId, userId, fn) {
    const key = `${guildId}-${userId}`;
    while (userLocks.has(key)) {
        await userLocks.get(key);
    }
    const promise = fn();
    userLocks.set(key, promise);
    try {
        return await promise;
    } finally {
        userLocks.delete(key);
    }
}

// Option 2: Switch to a proper database (SQLite) with transactions
```

---

## 🟠 HIGH SEVERITY ISSUES

### 4. Massban Command Lacks Per-User Rate Limiting ⚠️ **HIGH**

**Location:** `commands/moderation/massban.js:68-72`

**Issue:**
- Limited to 10 users per command invocation
- **No cooldown** between invocations
- Moderator with BanMembers permission could spam:
  - `/massban ID1 ID2 ... ID10` (10 bans)
  - `/massban ID11 ID12 ... ID20` (10 more)
  - Repeat unlimited times

**Impact:** HIGH (in hostile takeover scenarios)
- Compromised moderator account could mass-ban hundreds
- No rate limit = faster than manual /ban spam
- Does check for bot/self/owner (good)

**Exploitation Scenario:**
```
1. Moderator account compromised or rogue mod
2. Scripts /massban with 10 IDs, loops 100 times
3. 1000 members banned in seconds
4. Could target specific role (raid defense becomes raid tool)
```

**Recommendation:**
```javascript
// Add per-moderator cooldown
const { checkCooldown, setCooldown } = require('../../utils/cooldowns');

const cooldown = checkCooldown(interaction.user.id, 'massban', 10000); // 10s
if (cooldown.onCooldown) {
    await interaction.editReply(`Mass ban on cooldown. Wait ${cooldown.remainingTime}s.`);
    return;
}

// After successful massban
setCooldown(interaction.user.id, 'massban', 10000);
```

---

### 5. Heist System Griefing Vector ⚠️ **HIGH**

**Location:** `commands/economy/heist.js`

**Issue:**
- Heist organizer can:
  1. Start heist with 1 coin
  2. Wait for others to join with large amounts
  3. Immediately cancel (line 312-336)
  4. Everyone gets refunds, but wastes 30 seconds
- OR:
  1. Start heist with MAX_SAFE_INTEGER coins
  2. Let others join
  3. Causes memory issues with large pot calculations

**Impact:** MEDIUM-HIGH
- Griefing: waste users' time
- Resource exhaustion with massive heist pots
- activeHeists Map in memory can grow unbounded

**Evidence:**
```javascript
// heist.js:139-143 - 30 second auto-start
heist.timeoutId = setTimeout(async () => {
    if (activeHeists.has(heistId)) {
        await executeHeist(heistId, interaction);
    }
}, 30000);

// heist.js:312-336 - Organizer can cancel anytime and refund everyone
```

**Recommendation:**
```javascript
// 1. Add penalty for cancelling (lose 10% of bet)
// 2. Limit heist pot to reasonable maximum
if (heist.totalPot > 10000000) {
    await interaction.reply({
        content: "Heist pot too large! Maximum 10M coins.",
        ephemeral: true
    });
    return;
}

// 3. Prevent users from joining multiple heists
// 4. Add cleanup: auto-delete heists older than 5 minutes
```

---

### 6. XSS Risk in Web Dashboard (Low Probability) ⚠️ **MEDIUM**

**Location:** `web-dashboard/src/pages/Dashboard/Guild.tsx`

**Issue:**
- Uses `innerHTML` with hardcoded strings (currently safe)
- If future code passes user-controlled data to innerHTML, XSS possible

**Evidence:**
```typescript
// Guild.tsx - innerHTML used but with hardcoded safe string
// Currently safe, but fragile
```

**Impact:** MEDIUM
- XSS if user-controlled data reaches innerHTML
- Could steal session cookies (though httpOnly mitigates)
- Could exfiltrate guild configs or user data

**Recommendation:**
```typescript
// Replace innerHTML with textContent or React components
// Add CSP headers (already have some in server.js)
// Audit all user-controlled data flows
```

---

### 7. No Maximum Transaction Log Size Enforcement ⚠️ **MEDIUM**

**Location:** `utils/economy.js:195-209`

**Issue:**
- Transactions limited to `MAX_TRANSACTIONS = 1000` per guild
- But with many gambling commands, can fill quickly
- Old transactions spliced but never archived
- In very active servers, constant churn = potential memory issues

**Impact:** MEDIUM
- Memory growth in very active servers
- Loss of audit trail (only keep last 1000)
- `economy.json` rewrites frequent (I/O churn)

**Recommendation:**
```javascript
// Add transaction archiving
// Increase MAX_TRANSACTIONS to 10,000 or use rolling window
// Consider SQLite for transactions (better querying + indexing)
```

---

## 🟡 MEDIUM SEVERITY ISSUES

### 8. Missing Input Validation in Web API Endpoints ⚠️ **MEDIUM**

**Location:** `web/routes/api.js` (multiple endpoints)

**Issue:**
- Some endpoints validate, others don't
- Examples:
  - `POST /guild/:guildId/automod` (line 294): accepts arbitrary nested objects
  - `POST /guild/:guildId/config` (line 375): accepts arbitrary config updates
  - Missing length limits on string inputs in some places

**Evidence:**
```javascript
// api.js:294-349 - automod endpoint
// Accepts req.body.wordFilter without validating array length
// Could send 1 million word filter entries -> DoS
```

**Impact:** MEDIUM
- Resource exhaustion (massive config objects)
- Unexpected behavior from malformed input
- Requires MANAGE_GUILD permission (mitigates)

**Recommendation:**
```javascript
// Add validation middleware
function validateAutomodUpdate(req, res, next) {
    const { wordFilter } = req.body;
    if (wordFilter?.words?.length > 500) {
        return res.status(400).json({ error: 'Too many filtered words (max 500)' });
    }
    // ... validate other fields
    next();
}
```

---

### 9. Rob Command Target Cooldown Bypass ⚠️ **MEDIUM**

**Location:** `utils/economy.js:501-514`

**Issue:**
- Can't rob same person for 24 hours
- But can rob different people every 3 hours (robCooldownMinutes = 180)
- In large server, user could rob 100 different people in sequence

**Impact:** MEDIUM
- Wealth concentration via targeted robberies
- Harassment potential (rob all members of a role)

**Recommendation:**
```javascript
// Increase global rob cooldown to 6-12 hours
// OR: Limit robs per day (e.g., max 5 rob attempts/24h)
```

---

### 10. Duel Negative Balance Race Condition (Partially Mitigated) ⚠️ **MEDIUM**

**Location:** `commands/economy/duel.js:297-331`

**Issue:**
- Duel checks for negative balance AFTER deducting (line 298-300)
- Refunds if negative detected (good!)
- But race condition still possible if two operations overlap:
  1. Duel A and Duel B both read balance=1000
  2. Both deduct 900
  3. Balance becomes negative before check

**Impact:** MEDIUM
- Mitigated by refund logic
- But could still cause temporary inconsistencies
- Relies on read-after-write consistency

**Recommendation:**
- Use transaction locks (see Issue #3)
- Check balance BEFORE deducting, not after

---

### 11. Birthday Prototype Pollution Protection (Good, but Document) ⚠️ **INFO**

**Location:** `utils/birthdays.js:6-18`

**Status:** ✅ **PROTECTED**

**Notes:**
- Excellent prototype pollution defense
- Blocks `__proto__`, `constructor`, `prototype` keys
- Applied to both guildId and userId

**Evidence:**
```javascript
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

function isSafeKey(key) {
  if (!key || typeof key !== 'string') return false;
  return !DANGEROUS_KEYS.includes(key);
}
```

**Recommendation:**
- Document this pattern in security guidelines
- Apply to other user-controlled object keys

---

### 12. Moderation Hierarchy Checks ⚠️ **INFO**

**Location:** `utils/moderation.js:814-842`

**Status:** ✅ **SECURE**

**Notes:**
- `canModerate()` function properly checks:
  - ✅ Prevent self-moderation
  - ✅ Prevent moderating bot
  - ✅ Prevent moderating owner
  - ✅ Role hierarchy validation
  - ✅ Bot's role position vs target

**No issues found.**

---

### 13. Token Handling ⚠️ **INFO**

**Location:** `web/routes/auth.js`, `web/routes/api.js`, `web/server.js`

**Status:** ✅ **SECURE**

**Notes:**
- ✅ Access tokens in server-side session (not client)
- ✅ Tokens sanitized before sending to client (line 47-52)
- ✅ Session cookies: httpOnly, secure, sameSite=lax
- ✅ Token refresh with retry logic
- ✅ SESSION_SECRET, CLIENT_SECRET in env vars

**No issues found.**

---

## 🟢 LOW SEVERITY / INFORMATIONAL

### 14. Automod Domain Validation ⚠️ **LOW**

**Location:** `commands/moderation/automod.js:5-39`

**Issue:**
- Domain validation regex: `/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i`
- Does not validate against:
  - IDN homograph attacks (e.g., `gοοgle.com` with Greek omicron)
  - Overly long domains (but regex limits to 61 chars per label - good)

**Impact:** LOW
- Only affects link filtering accuracy
- Not a security vulnerability, just effectiveness

**Recommendation:**
- Consider punycode normalization for IDN domains

---

### 15. Economy Cooldowns Stored in Memory ⚠️ **LOW**

**Location:** `utils/cooldowns.js`, `utils/economy.js`

**Issue:**
- Economy cooldowns (daily, work, etc.) persist in `economy.json` ✅
- Command cooldowns (fun commands) in-memory, reset on bot restart ❌

**Impact:** LOW
- Command cooldowns reset on restart (user can spam after restart)
- Economy cooldowns persist correctly

**Recommendation:**
- Persist command cooldowns to disk if important

---

### 16. Web Dashboard Rate Limiting ⚠️ **LOW**

**Location:** `web/server.js:151-164`

**Status:** ✅ **ADEQUATE**

**Notes:**
- Rate limit: 100 requests per 15 minutes per IP
- Applied to all `/api` routes
- Disabled in development (good for testing)

**Recommendation:**
- Consider per-user rate limits (not just IP)
- Lower limit for expensive operations (e.g., reset guild XP)

---

### 17. File Write Atomicity ⚠️ **INFO**

**Location:** `utils/economy.js:111-124`, `utils/moderation.js`

**Status:** ✅ **SECURE**

**Notes:**
- Uses atomic write pattern: temp file + rename
- Write queue prevents concurrent writes to same file
- Proper error handling

**No issues found.**

---

## Summary of Findings

| Severity | Count | Issues |
|----------|-------|--------|
| 🔴 CRITICAL | 3 | Missing upper bounds, missing cooldowns, race conditions |
| 🟠 HIGH | 5 | Massban rate limit, heist griefing, XSS risk, transaction log, rob cooldown |
| 🟡 MEDIUM | 3 | Web API validation, duel race condition (mitigated), input validation |
| 🟢 LOW | 4 | Domain validation, memory cooldowns, rate limiting suggestions |
| ✅ SECURE | 3 | Birthday protection, moderation checks, token handling |

---

## Recommended Priority Actions

### Immediate (Critical):
1. **Add `setMaxValue()` to ALL economy commands** - Prevents integer overflow
2. **Implement per-command cooldowns** on gambling commands (3-5 seconds)
3. **Add transaction locks** to prevent race conditions in economy system

### Short-term (High):
4. **Add cooldown to massban** command (10-15 seconds)
5. **Limit heist pot size** and add cancellation penalties
6. **Audit web API input validation** - add length/size limits

### Medium-term (Medium/Low):
7. Consider migrating to SQLite for transactions (better concurrency)
8. Archive old transaction logs instead of deleting
9. Add per-user rate limits to web dashboard
10. Document security patterns for future development

---

## Assumptions & Limitations

- **Assumes hostile users** with automation capabilities
- **Assumes large public servers** (1000+ members)
- **Assumes compromised moderator** scenarios
- Did not perform dynamic testing or fuzzing
- Did not review Discord.js library vulnerabilities
- Did not test actual exploitation (only code review)

---

## Conclusion

The bot has **good security fundamentals** (permission checks, token handling, prototype pollution protection) but **critical gaps in economy system** that could be exploited at scale:

1. **No upper bounds** = integer overflow risk
2. **No gambling cooldowns** = automation abuse
3. **Race conditions** = double-spending possible

**Recommend addressing all CRITICAL issues before deploying to large public servers.**

---

**Report End**
