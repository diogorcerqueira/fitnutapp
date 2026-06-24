const express = require('express');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const authRoutes = require('./presentation/routes/auth.routes');
const userRoutes = require('./presentation/routes/user.routes');
const userRepo = require('./infrastructure/repositories/user.repository');
const { publishUserRegistered } = require('./infrastructure/messaging/event-publisher');

const app = express();
app.use(express.json());
app.use(passport.initialize());

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const googleId = profile.id;

        let user = await userRepo.findByGoogleId(googleId);
        if (user) return done(null, user);

        user = await userRepo.findByEmail(email);
        if (user) {
          await userRepo.linkGoogleId(user.id, googleId);
          return done(null, user);
        }

        user = await userRepo.create({ name, email, googleId });
        await publishUserRegistered({ userId: user.id, email: user.email, name: user.name });
        return done(null, user);
      } catch (err) {
        done(err);
      }
    }
  ));
}

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Auth Service', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/presentation/routes/*.js'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'auth-service' }));

module.exports = app;
