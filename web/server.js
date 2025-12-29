const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const logger = require('../utils/logger');
const { ensureAuthenticated } = require('./middleware/auth');

// Validate required environment variables
function validateEnvironment() {
  const required = ['CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'SESSION_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    const error = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(error);
    throw new Error(error);
  }

  // Validate CALLBACK_URL
  if (!process.env.CALLBACK_URL) {
    if (process.env.NODE_ENV === 'production') {
      const error = 'CALLBACK_URL must be explicitly set in production';
      logger.error(error);
      throw new Error(error);
    }
    logger.warn('CALLBACK_URL not set, using localhost default (development only)');
  }
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
  // Validate environment before starting
  validateEnvironment();

  const app = express();
  const PORT = process.env.WEB_PORT || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

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
        styleSrc: ["'self'", "'unsafe-inline'"], // For inline styles
        imgSrc: ["'self'", 'data:', 'https://cdn.discordapp.com'], // Discord avatars
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
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
  const callbackURL = process.env.CALLBACK_URL ||
    (isProduction ? undefined : `http://localhost:${PORT}/auth/callback`);

  if (!callbackURL) {
    throw new Error('CALLBACK_URL must be set in production');
  }

  passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL,
    scope: ['identify', 'guilds'],
  }, (accessToken, refreshToken, profile, done) => {
    logger.info('Discord OAuth callback received', { userId: profile.id });
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
  app.listen(PORT, () => {
    logger.info(`Web dashboard started`, {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      callbackURL,
    });
    console.log(`🌐 Web dashboard running on http://localhost:${PORT}`);
  });

  return app;
};
