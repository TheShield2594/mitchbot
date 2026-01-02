const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { fetch } = require('undici');
const logger = require('../utils/logger');
const { ensureAuthenticated } = require('./middleware/auth');

// Determine callback URL based on environment
function determineCallbackURL(port, isProduction) {
  // Use explicit CALLBACK_URL if set
  if (process.env.CALLBACK_URL) {
    return process.env.CALLBACK_URL;
  }

  // Production: try to auto-detect Railway deployment
  if (isProduction) {
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      const url = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/auth/callback`;
      logger.info('CALLBACK_URL not set, using Railway public domain', { callbackURL: url });
      return url;
    }
    const error = 'CALLBACK_URL must be explicitly set in production (or deploy to Railway with RAILWAY_PUBLIC_DOMAIN)';
    logger.error(error);
    throw new Error(error);
  }

  // Development: use localhost
  logger.warn('CALLBACK_URL not set, using localhost default (development only)');
  return `http://localhost:${port}/auth/callback`;
}

// Validate required environment variables
function validateEnvironment(port, isProduction) {
  const required = ['CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'SESSION_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    const error = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(error);
    throw new Error(error);
  }

  // Validate CALLBACK_URL (will throw if invalid in production)
  determineCallbackURL(port, isProduction);
}

// Configure session store
function getSessionStore() {
  if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
    try {
      const RedisStore = require('connect-redis').default;
      const { createClient } = require('redis');

      const redisClient = createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis connection failed after 10 retries');
              return new Error('Redis connection failed');
            }
            return retries * 500; // Exponential backoff
          },
        },
      });

      redisClient.on('error', (err) => {
        logger.error('Redis client error', { error: err });
      });

      redisClient.on('connect', () => {
        logger.info('Redis client connected');
      });

      redisClient.connect().catch((err) => {
        logger.error('Redis connection failed', { error: err });
        throw err;
      });

      return new RedisStore({ client: redisClient });
    } catch (error) {
      logger.error('Failed to initialize Redis store', { error });
      throw error;
    }
  }

  // Development: use default memory store
  if (process.env.NODE_ENV !== 'production') {
    logger.warn('Using in-memory session store (not suitable for production)');
  }

  return undefined; // Use default memory store
}

module.exports = function startWebServer(client) {
  const app = express();
  const PORT = process.env.PORT || process.env.WEB_PORT || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Validate environment before starting
  validateEnvironment(PORT, isProduction);

  // Store client for API routes
  app.set('client', client);

  // Trust proxy if behind load balancer
  if (isProduction) {
    app.set('trust proxy', 1);
  }

  // Security middleware - Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // For inline scripts in HTML
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], // For inline styles and Google Fonts
        imgSrc: ["'self'", 'data:', 'https://cdn.discordapp.com'], // Discord avatars
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'], // Google Fonts
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // CORS configuration
  const corsOptions = {
    origin: isProduction
      ? process.env.ALLOWED_ORIGINS?.split(',') || false
      : true, // Allow all origins in development
    credentials: true,
  };
  app.use(cors(corsOptions));

  // Rate limiting for API routes
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting in development
      return !isProduction;
    },
  });

  // Apply rate limiting to API routes
  app.use('/api', apiLimiter);

  // Body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static files
  app.use(express.static(path.join(__dirname, 'public')));

  // Session configuration
  const sessionConfig = {
    store: getSessionStore(),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'sessionId', // Custom name instead of default 'connect.sid'
    cookie: {
      httpOnly: true,
      secure: isProduction, // HTTPS only in production
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  };

  app.use(session(sessionConfig));

  // Passport configuration
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((obj, done) => {
    done(null, obj);
  });

  // Discord OAuth2 Strategy
  const callbackURL = determineCallbackURL(PORT, isProduction);

  passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL,
    scope: ['identify', 'guilds'],
  }, async (accessToken, refreshToken, profile, done) => {
    // Read timeout from env var GUILD_FETCH_TIMEOUT_MS, default to 5000ms (5 seconds)
    const timeoutValue = parseInt(process.env.GUILD_FETCH_TIMEOUT_MS, 10);
    const GUILD_FETCH_TIMEOUT = !isNaN(timeoutValue) && timeoutValue > 0 ? timeoutValue : 5000;
    const controller = new AbortController();
    let timeoutId = null;

    try {
      logger.info('Discord OAuth callback received', { userId: profile.id });

      // Set timeout for guilds fetch
      timeoutId = setTimeout(() => controller.abort(), GUILD_FETCH_TIMEOUT);

      // Fetch guilds data from Discord API
      const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      });

      // Clear timeout on successful fetch
      clearTimeout(timeoutId);
      timeoutId = null;

      if (!guildsResponse.ok) {
        logger.error('Failed to fetch guilds from Discord API', {
          userId: profile.id,
          status: guildsResponse.status,
          statusText: guildsResponse.statusText,
        });
        // Continue without guilds data rather than failing auth
        profile.guilds = [];
      } else {
        const guilds = await guildsResponse.json();
        profile.guilds = guilds;
        logger.info('Successfully fetched guilds for user', {
          userId: profile.id,
          guildCount: guilds.length,
        });
      }

      return done(null, profile);
    } catch (error) {
      // Clear timeout if it's still set
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      // Check if error is due to timeout
      if (error.name === 'AbortError') {
        logger.warn('Discord guilds fetch timed out', {
          userId: profile.id,
          timeout: GUILD_FETCH_TIMEOUT,
        });
      } else {
        logger.error('Error in Discord OAuth callback', {
          userId: profile.id,
          error: error.message,
        });
      }

      // Continue with auth even if guild fetch fails
      profile.guilds = [];
      return done(null, profile);
    }
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

  // Serve dashboard - use auth middleware
  app.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  });

  // Serve guild management page - use auth middleware
  app.get('/guild/:guildId', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'guild.html'));
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
      error: err,
      path: req.path,
      method: req.method,
    });
    res.status(500).send('Internal server error');
  });

  // Start server
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Web dashboard started`, {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      callbackURL,
    });
    console.log(`🌐 Web dashboard running on port ${PORT}`);
  });

  return app;
};
