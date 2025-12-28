const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');

module.exports = function startWebServer(client) {
  const app = express();
  const PORT = process.env.WEB_PORT || 3000;

  // Store client for API routes
  app.set('client', client);

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, 'public')));

  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'mitchbot-secret-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  }));

  // Passport configuration
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((obj, done) => {
    done(null, obj);
  });

  // Discord OAuth2 Strategy
  passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL || `http://localhost:${PORT}/auth/callback`,
    scope: ['identify', 'guilds'],
  }, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Routes
  app.use('/auth', require('./routes/auth'));
  app.use('/api', require('./routes/api'));

  // Serve main page
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Serve dashboard
  app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.redirect('/auth/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  });

  // Serve guild management page
  app.get('/guild/:guildId', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.redirect('/auth/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'guild.html'));
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`🌐 Web dashboard running on http://localhost:${PORT}`);
  });

  return app;
};
