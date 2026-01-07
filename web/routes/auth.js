const express = require('express');
const passport = require('passport');
const logger = require('../../utils/logger');
const { MANAGE_GUILD } = require('../constants/permissions');
const router = express.Router();

// Login route
router.get('/login', passport.authenticate('discord'));

// Callback route
router.get('/callback',
  passport.authenticate('discord', { failureRedirect: '/auth/login' }),
  (req, res) => {
    // Regenerate session to prevent session fixation attacks
    const user = req.user;

    req.session.regenerate((regenerateErr) => {
      if (regenerateErr) {
        logger.error('Session regeneration failed', {
          userId: user?.id,
          error: regenerateErr,
        });
        return res.status(500).send('Authentication failed. Please try again.');
      }

      // Re-establish the authenticated user after regeneration
      req.login(user, (loginErr) => {
        if (loginErr) {
          logger.error('Login after session regeneration failed', {
            userId: user?.id,
            error: loginErr,
          });
          return res.status(500).send('Authentication failed. Please try again.');
        }

        // Save session before redirect to ensure it's persisted to Redis
        req.session.save((saveErr) => {
          if (saveErr) {
            logger.error('Session save failed after login', {
              userId: user.id,
              error: saveErr,
            });
            return res.status(500).send('Authentication failed. Please try again.');
          }

          // Successfully authenticated and session secured
          logger.info('User authenticated successfully', {
            userId: user.id,
            username: user.username,
          });

          res.redirect('/dashboard');
        });
      });
    });
  }
);

// Logout route
router.get('/logout', (req, res) => {
  const userId = req.user?.id;

  req.logout((err) => {
    if (err) {
      logger.error('Logout error', { userId, error: err });
    } else {
      logger.info('User logged out', { userId });
    }
    res.redirect('/');
  });
});

// Current user endpoint
router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Log if guilds data is missing
  if (!req.user.guilds) {
    logger.warn('User guilds data is missing from session', {
      userId: req.user.id,
      username: req.user.username,
    });
  }

  // Filter guilds to only show those where user has MANAGE_GUILD permission
  // MANAGE_GUILD permission bit is 0x00000020 (32)
  const manageableGuilds = req.user.guilds ? req.user.guilds.filter(guild => {
    // Check if user has MANAGE_GUILD permission
    return guild.permissions && (BigInt(guild.permissions) & BigInt(MANAGE_GUILD)) === BigInt(MANAGE_GUILD);
  }) : [];

  logger.info('User info requested', {
    userId: req.user.id,
    totalGuilds: req.user.guilds?.length || 0,
    manageableGuilds: manageableGuilds.length,
  });

  res.json({
    id: req.user.id,
    username: req.user.username,
    discriminator: req.user.discriminator,
    avatar: req.user.avatar,
    guilds: manageableGuilds,
    debugInfo: {
      totalGuilds: req.user.guilds?.length || 0,
      hasGuildsData: !!req.user.guilds,
      manageableCount: manageableGuilds.length,
    },
  });
});

// Guild refresh endpoint - allows users to refresh their guild list without re-login
router.post('/refresh-guilds', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    logger.info('Guild refresh requested', {
      userId: req.user.id,
      username: req.user.username,
    });

    // Get the Discord access token from session
    // Note: This requires storing the access token in the session during OAuth
    if (!req.user.accessToken) {
      logger.error('Access token not available for guild refresh', {
        userId: req.user.id,
      });
      return res.status(400).json({
        error: 'Cannot refresh guilds - please log out and log back in',
        reason: 'missing_token',
      });
    }

    // Fetch fresh guilds data from Discord API with timeout and retry
    const GUILD_FETCH_TIMEOUT = parseInt(process.env.GUILD_FETCH_TIMEOUT_MS, 10) || 10000; // Increase to 10s for refresh
    const MAX_RETRIES = 3;

    let guilds = null;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), GUILD_FETCH_TIMEOUT);

        logger.info('Fetching guilds from Discord API', {
          userId: req.user.id,
          attempt,
          timeout: GUILD_FETCH_TIMEOUT,
        });

        const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
          headers: {
            Authorization: `Bearer ${req.user.accessToken}`,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!guildsResponse.ok) {
          throw new Error(`Discord API returned ${guildsResponse.status}: ${guildsResponse.statusText}`);
        }

        guilds = await guildsResponse.json();
        logger.info('Successfully refreshed guilds', {
          userId: req.user.id,
          guildCount: guilds.length,
          attempt,
        });
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        logger.warn('Guild fetch attempt failed', {
          userId: req.user.id,
          attempt,
          error: error.message,
          isTimeout: error.name === 'AbortError',
        });

        if (attempt < MAX_RETRIES) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    if (!guilds) {
      logger.error('Failed to refresh guilds after all retries', {
        userId: req.user.id,
        lastError: lastError?.message,
      });
      return res.status(503).json({
        error: 'Failed to fetch guilds from Discord',
        reason: lastError?.name === 'AbortError' ? 'timeout' : 'api_error',
        details: lastError?.message,
      });
    }

    // Update user's guilds in session
    req.user.guilds = guilds;

    // Save the updated session
    req.session.save((err) => {
      if (err) {
        logger.error('Failed to save session after guild refresh', {
          userId: req.user.id,
          error: err,
        });
        return res.status(500).json({
          error: 'Failed to save updated guild data',
        });
      }

      // Filter and return manageable guilds
      const manageableGuilds = guilds.filter(guild => {
        return guild.permissions && (BigInt(guild.permissions) & BigInt(MANAGE_GUILD)) === BigInt(MANAGE_GUILD);
      });

      logger.info('Guilds refreshed successfully', {
        userId: req.user.id,
        totalGuilds: guilds.length,
        manageableGuilds: manageableGuilds.length,
      });

      res.json({
        success: true,
        totalGuilds: guilds.length,
        manageableGuilds: manageableGuilds.length,
        guilds: manageableGuilds,
      });
    });
  } catch (error) {
    logger.error('Error refreshing guilds', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
});

module.exports = router;
