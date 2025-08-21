
// src/server/server.js

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chariot-arena';

// Middleware
app.use(cors());
app.use(express.json());

// Score Schema
const scoreSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  score: {
    type: Number,
    required: true,
    min: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create index for better query performance
scoreSchema.index({ score: -1 });

const Score = mongoose.model('Score', scoreSchema);

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB successfully');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Handle MongoDB connection events
mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// GET /highscores - Return top 10 scores sorted by score descending
app.get('/highscores', async (req, res) => {
  try {
    const topScores = await Score.find()
      .sort({ score: -1 })
      .limit(10)
      .select('name score timestamp')
      .lean();

    const totalCount = await Score.countDocuments();

    res.json({
      success: true,
      scores: topScores,
      total: totalCount
    });
  } catch (error) {
    console.error('Error fetching high scores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch high scores'
    });
  }
});

// POST /highscores - Accept new score submission
app.post('/highscores', async (req, res) => {
  try {
    const { name, score } = req.body;
    
    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Name is required and must be a non-empty string'
      });
    }
    
    // Corrected validation to allow a score of 0
    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({
        success: false,
        error: 'Score is required and must be a non-negative number'
      });
    }

    // Additional validation
    if (name.trim().length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Name must be 50 characters or less'
      });
    }

    if (!Number.isInteger(score)) {
      return res.status(400).json({
        success: false,
        error: 'Score must be an integer'
      });
    }

    const trimmedName = name.trim();
    const finalScore = Math.floor(score);

    // Check for recent duplicates to prevent multiple submissions while server is waking up
    let scoreToReturn = await Score.findOne({
      name: trimmedName,
      score: finalScore,
      timestamp: { $gte: new Date(Date.now() - 30 * 1000) } // 30-second window for duplicates
    });

    let httpStatus = 200; // OK for duplicate
    let message = 'Duplicate score detected. Returning existing entry.';

    if (!scoreToReturn) {
      // No duplicate found, create a new one
      const newScore = new Score({
        name: trimmedName,
        score: finalScore,
        timestamp: new Date()
      });

      scoreToReturn = await newScore.save();
      httpStatus = 201; // Created
      message = 'Score submitted successfully';
      console.log(`New high score added: ${scoreToReturn.name} - ${scoreToReturn.score}`);
    } else {
      console.log(`Duplicate score submission detected for ${trimmedName} - ${finalScore}. Returning existing entry.`);
    }

    // Calculate ranking for the score (either new or duplicate), handling ties correctly
    const higherScoresCount = await Score.countDocuments({
      score: { $gt: scoreToReturn.score }
    });
    const tiedScoresCount = await Score.countDocuments({
      score: scoreToReturn.score,
      _id: { $lt: scoreToReturn._id } // Older entries with same score rank higher
    });

    const ranking = higherScoresCount + tiedScoresCount + 1;
    const isTopTen = ranking <= 10;
    
    console.log(`Returning rank ${ranking} for ${scoreToReturn.name}`);

    res.status(httpStatus).json({
      success: true,
      message: message,
      score: {
        name: scoreToReturn.name,
        score: scoreToReturn.score,
        timestamp: scoreToReturn.timestamp,
        id: scoreToReturn._id
      },
      ranking: ranking,
      isTopTen: isTopTen
    });

  } catch (error) {
    console.error('Error submitting score:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: `Validation error: ${validationErrors.join(', ')}`
      });
    }
    
    // Handle duplicate key errors (if we add unique constraints later)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate entry detected'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to submit score'
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Get basic stats
    const totalScores = await Score.countDocuments();
    
    res.json({
      success: true,
      message: 'Chariot Arena API Server is running',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        totalScores: totalScores
      },
      version: '2.0.0'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(isDevelopment && { details: error.message })
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Chariot Arena API Server running on port ${PORT}`);
  console.log(`📊 High scores endpoint: http://localhost:${PORT}/highscores`);
  console.log(`💾 Database: ${MONGODB_URI}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});