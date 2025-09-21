const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 10000;

// Connect to MongoDB
if (!process.env.MONGODB_URI) {
  console.warn('No MONGODB_URI environment variable set. Submissions will not be saved.');
} else {
  mongoose
    .connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));
}

// Define the submission schema
const submissionSchema = new mongoose.Schema({
  name: String,
  email: String,
  company: String,
  type: String,
  budget: String,
  timeline: String,
  message: String,
  links: String,
  consent: Boolean,
  createdAt: { type: Date, default: Date.now }
});
const Submission = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('tiny'));
app.use(express.json());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',').map((o) => o.trim())
  : ['*'];
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf('*') !== -1 || allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      return callback(new Error('CORS not allowed'), false);
    }
  })
);

// Rate limiting for API routes
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30 // limit each IP to 30 requests per minute
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

// POST /api/contact endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const data = req.body;

    // Save to DB if connection is established
    let saved;
    if (mongoose.connection.readyState === 1) {
      saved = await Submission.create(data);
    }

    // Send notification email if SMTP envs are provided
    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.MAIL_FROM &&
      process.env.MAIL_TO
    ) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: process.env.MAIL_TO,
        subject: `New InstantCanvas inquiry from ${data.name}`,
        text: `A new inquiry has been submitted:\n\n${JSON.stringify(data, null, 2)}`
      });
    }

    res.json({ ok: true, id: saved ? saved.id : undefined });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Serve static files from root directory (repo root)
const publicPath = path.resolve(__dirname, '..');
app.use(express.static(publicPath));

// Fallback to index.html for all other routes (for SPA behavior)
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`InstantCanvas server listening on port ${PORT}`);
});
