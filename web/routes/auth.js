const express = require('express');
const passport = require('passport');
const logger = require('../../utils/logger');
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

        // Successfully authenticated and session secured
        logger.info('User authenticated successfully', {
          userId: user.id,
          username: user.username,
        });

        res.redirect('/dashboard');
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

  res.json({
    id: req.user.id,
    username: req.user.username,
    discriminator: req.user.discriminator,
    avatar: req.user.avatar,
    guilds: req.user.guilds,
  });
});

module.exports = router;
