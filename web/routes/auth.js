const express = require('express');
const passport = require('passport');
const router = express.Router();

// Login route
router.get('/login', passport.authenticate('discord'));

// Callback route
router.get('/callback',
  passport.authenticate('discord', { failureRedirect: '/auth/login' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

// Logout route
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
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
