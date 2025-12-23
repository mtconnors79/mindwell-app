#!/usr/bin/env node
/**
 * Test Data Generator for SoulBloom
 *
 * Generates realistic test data for mood tracking, check-ins, activities, and goals.
 *
 * Usage:
 *   node scripts/generateTestData.js --email=user@example.com --days=120
 *   npm run generate-test-data -- --email=user@example.com --days=120
 */

require('dotenv').config();
const { sequelize } = require('../config/sequelize');
const { connectMongoDB } = require('../config/mongodb');
const User = require('../models/User');
const MoodEntry = require('../models/MoodEntry');
const UserGoal = require('../models/UserGoal');
const ActivityCompletion = require('../models/ActivityCompletion');
const CheckinResponse = require('../models/CheckinResponse');

// Parse command line arguments
function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      args[key] = value;
    }
  });
  return args;
}

// Configuration
const MOOD_RATINGS = ['great', 'good', 'okay', 'not_good', 'terrible'];
const EMOTIONS = ['anxious', 'calm', 'sad', 'happy', 'angry', 'tired', 'energetic', 'stressed'];
const TIME_BUCKETS = ['morning', 'afternoon', 'evening', 'night'];
const SENTIMENTS = ['positive', 'negative', 'neutral', 'mixed'];
const RISK_LEVELS = ['low', 'moderate', 'high'];

const ACTIVITY_IDS = [
  'breathing_box',
  'breathing_478',
  'breathing_deep_belly',
  'grounding_54321',
  'grounding_body_scan',
  'quick_1min_calm',
  'quick_tension_release',
  'sleep_breathing',
  'sleep_body_scan'
];

const JOURNAL_TEMPLATES = [
  "Today was {adjective}. I spent time {activity} and it made me feel {feeling}.",
  "Woke up feeling {feeling}. The weather was {weather} which {impact} my mood.",
  "Had a {adjective} day at work. Managed to {accomplishment} which felt {feeling}.",
  "Feeling {feeling} today. {reflection}",
  "Not my best day. {challenge} but trying to stay {attitude}.",
  "Great day! {positive_event} Really grateful for {gratitude}.",
  "Struggled with {challenge} today. Need to remember to {self_care}.",
  "Spent time with {people} today. It was {adjective} and I feel {feeling}.",
  "Quiet day. Did some {activity} and {reflection}",
  "Feeling overwhelmed by {stressor}. Taking it one step at a time."
];

const FILL_INS = {
  adjective: ['good', 'tough', 'productive', 'relaxing', 'challenging', 'busy', 'peaceful', 'stressful', 'wonderful', 'okay'],
  activity: ['reading', 'walking', 'meditation', 'cooking', 'exercise', 'gardening', 'cleaning', 'working on a project', 'journaling', 'yoga'],
  feeling: ['calm', 'content', 'anxious', 'happy', 'tired', 'energized', 'hopeful', 'grateful', 'stressed', 'peaceful'],
  weather: ['sunny', 'rainy', 'cloudy', 'cold', 'warm', 'stormy', 'beautiful', 'gloomy'],
  impact: ['helped', 'affected', 'improved', 'dampened', 'lifted'],
  accomplishment: ['finish a big project', 'have a good meeting', 'complete my tasks', 'help a colleague', 'learn something new'],
  reflection: ['Trying to focus on the positives.', 'Need more rest.', 'Grateful for small wins.', 'Working on being present.', 'Taking things slowly.'],
  challenge: ['anxiety', 'work stress', 'lack of sleep', 'difficult conversations', 'feeling overwhelmed', 'health concerns'],
  attitude: ['positive', 'hopeful', 'patient', 'focused', 'grounded'],
  positive_event: ['Got great news today.', 'Had a breakthrough moment.', 'Reconnected with an old friend.', 'Achieved a goal I set.'],
  gratitude: ['my health', 'my family', 'good friends', 'this moment', 'small victories', 'a warm home'],
  self_care: ['take breaks', 'breathe deeply', 'be kind to myself', 'ask for help', 'rest more'],
  people: ['family', 'friends', 'colleagues', 'my partner', 'loved ones'],
  stressor: ['deadlines', 'uncertainty', 'too many tasks', 'health worries', 'relationship issues']
};

// Utility functions
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomItems(arr, min, max) {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function generateJournalEntry() {
  let template = randomItem(JOURNAL_TEMPLATES);

  // Replace placeholders with random fill-ins
  Object.keys(FILL_INS).forEach(key => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    template = template.replace(regex, randomItem(FILL_INS[key]));
  });

  return template;
}

function getTimeBucket(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function generateTimestampForDay(date, bucket) {
  const d = new Date(date);
  let hour;

  switch (bucket) {
    case 'morning':
      hour = randomInt(6, 11);
      break;
    case 'afternoon':
      hour = randomInt(12, 16);
      break;
    case 'evening':
      hour = randomInt(17, 20);
      break;
    case 'night':
      hour = randomInt(21, 23);
      break;
    default:
      hour = randomInt(8, 20);
  }

  d.setHours(hour, randomInt(0, 59), randomInt(0, 59), 0);
  return d;
}

function getMoodSentiment(moodRating) {
  switch (moodRating) {
    case 'great':
    case 'good':
      return { sentiment: 'positive', score: randomFloat(0.3, 1.0) };
    case 'okay':
      return { sentiment: randomItem(['neutral', 'mixed']), score: randomFloat(-0.2, 0.3) };
    case 'not_good':
      return { sentiment: randomItem(['negative', 'mixed']), score: randomFloat(-0.6, -0.1) };
    case 'terrible':
      return { sentiment: 'negative', score: randomFloat(-1.0, -0.4) };
    default:
      return { sentiment: 'neutral', score: 0 };
  }
}

function getStressForMood(moodRating) {
  switch (moodRating) {
    case 'great':
      return randomInt(1, 3);
    case 'good':
      return randomInt(2, 4);
    case 'okay':
      return randomInt(3, 6);
    case 'not_good':
      return randomInt(5, 8);
    case 'terrible':
      return randomInt(7, 10);
    default:
      return randomInt(3, 6);
  }
}

function getEmotionsForMood(moodRating) {
  const positiveEmotions = ['calm', 'happy', 'energetic'];
  const negativeEmotions = ['anxious', 'sad', 'angry', 'tired', 'stressed'];

  switch (moodRating) {
    case 'great':
      return randomItems(positiveEmotions, 2, 3);
    case 'good':
      return randomItems([...positiveEmotions, 'tired'], 1, 2);
    case 'okay':
      return randomItems(EMOTIONS, 1, 2);
    case 'not_good':
      return randomItems([...negativeEmotions, 'calm'], 1, 3);
    case 'terrible':
      return randomItems(negativeEmotions, 2, 4);
    default:
      return randomItems(EMOTIONS, 1, 2);
  }
}

// Main generation functions
async function generateCheckin(userId, timestamp, moodRating) {
  const stressLevel = getStressForMood(moodRating);
  const emotions = getEmotionsForMood(moodRating);
  const { sentiment } = getMoodSentiment(moodRating);
  const hour = timestamp.getHours();
  const timeBucket = getTimeBucket(hour);

  // 70% chance of having journal text
  const hasJournal = Math.random() < 0.7;
  const journalText = hasJournal ? generateJournalEntry() : '';

  const checkin = new CheckinResponse({
    user_id: userId,
    mood_rating: moodRating,
    stress_level: stressLevel,
    selected_emotions: emotions,
    check_in_text: journalText,
    time_bucket: timeBucket,
    ai_analysis: hasJournal ? {
      sentiment: sentiment,
      keywords: randomItems(emotions, 1, 3),
      suggestions: [
        'Consider taking a short break',
        'Try a breathing exercise',
        'Reach out to a friend'
      ].slice(0, randomInt(1, 3)),
      risk_level: moodRating === 'terrible' ? randomItem(['moderate', 'low']) : 'low'
    } : null,
    created_at: timestamp
  });

  await checkin.save();
  return checkin;
}

async function generateQuickMood(userId, timestamp, moodRating) {
  const { sentiment, score } = getMoodSentiment(moodRating);
  const dateOnly = timestamp.toISOString().split('T')[0];

  const moodEntry = await MoodEntry.create({
    user_id: userId,
    sentiment_score: score,
    sentiment_label: sentiment,
    check_in_date: dateOnly,
    created_at: timestamp
  });

  return moodEntry;
}

async function generateActivityCompletion(userId, timestamp) {
  const activityId = randomItem(ACTIVITY_IDS);

  const completion = await ActivityCompletion.create({
    user_id: userId,
    activity_id: activityId,
    completed_at: timestamp
  });

  return completion;
}

async function generateGoals(userId, startDate) {
  const goals = [];

  const goalTemplates = [
    { title: 'Daily Check-in', activity_type: 'check_in', target_count: 1, time_frame: 'daily' },
    { title: 'Weekly Mindfulness', activity_type: 'mindfulness', target_count: 5, time_frame: 'weekly' },
    { title: 'Breathing Practice', activity_type: 'breathing', target_count: 3, time_frame: 'weekly' },
    { title: 'Mood Awareness', activity_type: 'quick_mood', target_count: 7, time_frame: 'weekly' },
    { title: 'Journaling Journey', activity_type: 'journaling', target_count: 3, time_frame: 'weekly' },
    { title: 'Monthly Meditation', activity_type: 'mindfulness', target_count: 20, time_frame: 'monthly' }
  ];

  // Create 3-4 goals with varying statuses
  const selectedGoals = randomItems(goalTemplates, 3, 4);

  for (const template of selectedGoals) {
    const isActive = Math.random() < 0.6;
    const isCompleted = !isActive && Math.random() < 0.5;

    const goal = await UserGoal.create({
      user_id: userId,
      title: template.title,
      activity_type: template.activity_type,
      target_count: template.target_count,
      time_frame: template.time_frame,
      is_active: isActive,
      completed_at: isCompleted ? new Date(startDate.getTime() + randomInt(1, 30) * 24 * 60 * 60 * 1000) : null,
      created_at: startDate
    });

    goals.push(goal);
  }

  return goals;
}

// Main execution
async function main() {
  const args = parseArgs();

  if (!args.email) {
    console.error('Error: --email is required');
    console.log('Usage: node scripts/generateTestData.js --email=user@example.com --days=120');
    process.exit(1);
  }

  const email = args.email;
  const days = parseInt(args.days) || 120;

  console.log('\n🌱 SoulBloom Test Data Generator\n');
  console.log(`Email: ${email}`);
  console.log(`Days: ${days}`);
  console.log('─'.repeat(40));

  try {
    // Connect to databases
    console.log('\n📡 Connecting to databases...');
    await sequelize.authenticate();
    console.log('   PostgreSQL connected');
    await connectMongoDB();
    console.log('   MongoDB connected');

    // Find or create user
    console.log('\n👤 Looking up user...');
    let [user, created] = await User.findOrCreate({
      where: { email },
      defaults: {
        email,
        password_hash: '$2b$10$placeholder_hash_for_test_data_generation'
      }
    });

    if (created) {
      console.log(`   Created new user with ID: ${user.id}`);
    } else {
      console.log(`   Found existing user with ID: ${user.id}`);
    }

    // Initialize counters
    const stats = {
      checkins: 0,
      quickMoods: 0,
      activities: 0,
      goals: 0
    };

    console.log('\n📊 Generating test data...\n');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Generate goals first
    process.stdout.write('   Goals: ');
    const goals = await generateGoals(user.id, startDate);
    stats.goals = goals.length;
    console.log(`${stats.goals} created`);

    // Generate daily data
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      // Progress indicator
      if (i % 10 === 0) {
        const progress = Math.round((i / days) * 100);
        process.stdout.write(`\r   Day ${i + 1}/${days} (${progress}%)`);
      }

      // Determine mood pattern for the day (some days better than others)
      const dayMoodBias = Math.random();
      let baseMood;
      if (dayMoodBias < 0.15) {
        baseMood = randomItem(['terrible', 'not_good']); // Bad day
      } else if (dayMoodBias < 0.35) {
        baseMood = 'not_good'; // Tough day
      } else if (dayMoodBias < 0.55) {
        baseMood = 'okay'; // Average day
      } else if (dayMoodBias < 0.85) {
        baseMood = 'good'; // Good day
      } else {
        baseMood = 'great'; // Great day
      }

      // Detailed check-in (60% of days)
      if (Math.random() < 0.6) {
        const bucket = randomItem(['morning', 'afternoon', 'evening']);
        const timestamp = generateTimestampForDay(currentDate, bucket);
        await generateCheckin(user.id, timestamp, baseMood);
        stats.checkins++;
      }

      // Quick mood logs (80% of days, sometimes multiple)
      if (Math.random() < 0.8) {
        const moodCount = Math.random() < 0.3 ? randomInt(2, 3) : 1;
        const usedBuckets = [];

        for (let m = 0; m < moodCount; m++) {
          let bucket;
          do {
            bucket = randomItem(TIME_BUCKETS);
          } while (usedBuckets.includes(bucket) && usedBuckets.length < 4);
          usedBuckets.push(bucket);

          const timestamp = generateTimestampForDay(currentDate, bucket);
          // Vary mood slightly from base
          const moodVariation = Math.random();
          let moodRating = baseMood;
          if (moodVariation < 0.2) {
            const moodIndex = MOOD_RATINGS.indexOf(baseMood);
            moodRating = MOOD_RATINGS[Math.max(0, moodIndex - 1)];
          } else if (moodVariation > 0.8) {
            const moodIndex = MOOD_RATINGS.indexOf(baseMood);
            moodRating = MOOD_RATINGS[Math.min(MOOD_RATINGS.length - 1, moodIndex + 1)];
          }

          await generateQuickMood(user.id, timestamp, moodRating);
          stats.quickMoods++;
        }
      }

      // Activity completions (40% of days)
      if (Math.random() < 0.4) {
        const activityCount = Math.random() < 0.2 ? 2 : 1;
        for (let a = 0; a < activityCount; a++) {
          const bucket = randomItem(['morning', 'evening']);
          const timestamp = generateTimestampForDay(currentDate, bucket);
          await generateActivityCompletion(user.id, timestamp);
          stats.activities++;
        }
      }
    }

    console.log(`\r   Day ${days}/${days} (100%)    `);

    // Print summary
    console.log('\n' + '─'.repeat(40));
    console.log('✅ Generation Complete!\n');
    console.log('📈 Summary:');
    console.log(`   • Check-ins:        ${stats.checkins}`);
    console.log(`   • Quick moods:      ${stats.quickMoods}`);
    console.log(`   • Activities:       ${stats.activities}`);
    console.log(`   • Goals:            ${stats.goals}`);
    console.log(`   • Total entries:    ${stats.checkins + stats.quickMoods + stats.activities + stats.goals}`);
    console.log(`   • Date range:       ${startDate.toLocaleDateString()} - ${new Date().toLocaleDateString()}`);
    console.log('\n🌱 Happy testing!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

main();
