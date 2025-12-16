const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const ANALYSIS_PROMPT = `You are a mental health analysis assistant for a wellness app called MindWell. Analyze the following check-in text from a user and provide a structured assessment.

Your analysis must be compassionate, non-judgmental, and focused on supporting the user's mental wellbeing.

Analyze the text and return a JSON object with the following structure:
{
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "sentiment_score": <number between -1 and 1, where -1 is most negative and 1 is most positive>,
  "emotions": [<array of detected emotions, e.g., "happy", "anxious", "calm", "frustrated">],
  "keywords": [<array of significant words or phrases from the text>],
  "themes": [<array of identified themes, e.g., "work stress", "relationships", "self-care">],
  "suggestions": [<array of 2-4 personalized mindfulness suggestions based on the mood>],
  "risk_level": "low" | "moderate" | "high" | "critical",
  "risk_indicators": [<array of any concerning phrases or patterns detected, empty if none>],
  "supportive_message": "<a brief, compassionate message acknowledging their feelings>"
}

Risk Level Guidelines:
- "low": Normal daily emotions, no concerning content
- "moderate": Signs of stress, anxiety, or mild depression that could benefit from attention
- "high": Significant distress, isolation, hopelessness, but no immediate danger
- "critical": Any mention of self-harm, suicide, or harming others - requires immediate attention

For suggestions, consider:
- Breathing exercises for anxiety/stress
- Gratitude practices for negative thinking
- Mindful movement for low energy
- Journaling prompts for processing emotions
- Grounding techniques for overwhelming feelings
- Social connection activities for loneliness

IMPORTANT:
- Always respond with valid JSON only, no additional text
- Be sensitive to cultural contexts
- If risk_level is "critical", include crisis resources in suggestions
- Keep suggestions actionable and specific

User's check-in text:
`;

const CRISIS_RESOURCES = [
  "Please reach out to a crisis helpline: National Suicide Prevention Lifeline: 988 (US)",
  "Text HOME to 741741 to reach the Crisis Text Line",
  "Contact a trusted friend, family member, or mental health professional",
  "If you're in immediate danger, please call emergency services (911)"
];

const analyzeCheckIn = async (text) => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Check-in text is required');
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
    console.warn('ANTHROPIC_API_KEY not configured, using fallback analysis');
    return getFallbackAnalysis(text);
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: ANALYSIS_PROMPT + text
        }
      ]
    });

    const responseText = message.content[0].text;
    let analysis;

    try {
      analysis = JSON.parse(responseText);
    } catch (parseError) {
      // Try to extract JSON from response if wrapped in other text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response');
      }
    }

    // Validate and sanitize the response
    analysis = validateAndSanitizeAnalysis(analysis);

    // Add crisis resources if critical
    if (analysis.risk_level === 'critical') {
      analysis.suggestions = [...CRISIS_RESOURCES, ...analysis.suggestions];
      analysis.requires_immediate_attention = true;
    }

    return analysis;
  } catch (error) {
    console.error('Sentiment analysis error:', error.message);

    // Return fallback analysis on error
    if (error.status === 401) {
      throw new Error('Invalid Anthropic API key');
    }

    if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // For other errors, return a basic fallback
    return getFallbackAnalysis(text);
  }
};

const validateAndSanitizeAnalysis = (analysis) => {
  const validSentiments = ['positive', 'negative', 'neutral', 'mixed'];
  const validRiskLevels = ['low', 'moderate', 'high', 'critical'];

  return {
    sentiment: validSentiments.includes(analysis.sentiment) ? analysis.sentiment : 'neutral',
    sentiment_score: typeof analysis.sentiment_score === 'number'
      ? Math.max(-1, Math.min(1, analysis.sentiment_score))
      : 0,
    emotions: Array.isArray(analysis.emotions) ? analysis.emotions.slice(0, 10) : [],
    keywords: Array.isArray(analysis.keywords) ? analysis.keywords.slice(0, 10) : [],
    themes: Array.isArray(analysis.themes) ? analysis.themes.slice(0, 5) : [],
    suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions.slice(0, 6) : [],
    risk_level: validRiskLevels.includes(analysis.risk_level) ? analysis.risk_level : 'low',
    risk_indicators: Array.isArray(analysis.risk_indicators) ? analysis.risk_indicators : [],
    supportive_message: typeof analysis.supportive_message === 'string'
      ? analysis.supportive_message
      : 'Thank you for sharing. Your feelings are valid.'
  };
};

const getFallbackAnalysis = (text) => {
  // Basic keyword-based fallback when API is unavailable
  const lowerText = text.toLowerCase();

  // Crisis detection keywords
  const crisisKeywords = ['suicide', 'kill myself', 'end my life', 'want to die', 'self-harm', 'hurt myself'];
  const hasCrisisIndicators = crisisKeywords.some(keyword => lowerText.includes(keyword));

  if (hasCrisisIndicators) {
    return {
      sentiment: 'negative',
      sentiment_score: -0.9,
      emotions: ['distressed'],
      keywords: [],
      themes: ['crisis'],
      suggestions: CRISIS_RESOURCES,
      risk_level: 'critical',
      risk_indicators: ['Crisis-related content detected'],
      supportive_message: 'I\'m concerned about what you\'ve shared. Please reach out to a crisis helpline or trusted person immediately. You matter and help is available.',
      requires_immediate_attention: true,
      is_fallback: true
    };
  }

  // Basic sentiment keywords
  const positiveKeywords = ['happy', 'good', 'great', 'wonderful', 'amazing', 'grateful', 'thankful', 'excited', 'peaceful', 'calm', 'better', 'love', 'joy'];
  const negativeKeywords = ['sad', 'angry', 'frustrated', 'anxious', 'worried', 'stressed', 'tired', 'exhausted', 'lonely', 'depressed', 'hopeless', 'overwhelmed', 'scared'];

  const positiveCount = positiveKeywords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeKeywords.filter(word => lowerText.includes(word)).length;

  let sentiment = 'neutral';
  let sentiment_score = 0;
  let risk_level = 'low';

  if (positiveCount > negativeCount) {
    sentiment = 'positive';
    sentiment_score = Math.min(0.8, positiveCount * 0.2);
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative';
    sentiment_score = Math.max(-0.8, negativeCount * -0.2);
    risk_level = negativeCount >= 3 ? 'moderate' : 'low';
  } else if (positiveCount > 0 && negativeCount > 0) {
    sentiment = 'mixed';
    sentiment_score = (positiveCount - negativeCount) * 0.1;
  }

  // Extract keywords (simple word extraction)
  const words = text.match(/\b[a-zA-Z]{4,}\b/g) || [];
  const keywords = [...new Set(words)].slice(0, 5);

  // Basic suggestions based on sentiment
  const suggestions = getSuggestionsForSentiment(sentiment);

  return {
    sentiment,
    sentiment_score,
    emotions: [],
    keywords,
    themes: [],
    suggestions,
    risk_level,
    risk_indicators: [],
    supportive_message: getSupportiveMessage(sentiment),
    is_fallback: true
  };
};

const getSuggestionsForSentiment = (sentiment) => {
  const suggestionMap = {
    positive: [
      'Continue your positive momentum with a gratitude journal entry',
      'Share your good feelings with someone you care about',
      'Take a moment to appreciate what\'s going well'
    ],
    negative: [
      'Try a 5-minute breathing exercise: breathe in for 4 counts, hold for 4, exhale for 6',
      'Write down three things, no matter how small, that you\'re grateful for',
      'Consider reaching out to a friend or loved one for support',
      'Take a short walk outside if possible - nature can help shift your mood'
    ],
    neutral: [
      'Check in with your body - are you holding any tension?',
      'Set an intention for the rest of your day',
      'Take a mindful moment to notice five things around you'
    ],
    mixed: [
      'Acknowledge that it\'s okay to feel multiple emotions at once',
      'Try journaling about what\'s causing these mixed feelings',
      'Practice self-compassion - you\'re doing your best'
    ]
  };

  return suggestionMap[sentiment] || suggestionMap.neutral;
};

const getSupportiveMessage = (sentiment) => {
  const messageMap = {
    positive: 'It\'s wonderful to hear you\'re doing well! Keep nurturing these positive feelings.',
    negative: 'I hear that things are difficult right now. Remember, it\'s okay to not be okay, and these feelings will pass.',
    neutral: 'Thank you for checking in today. Taking time to reflect on your feelings is an important step.',
    mixed: 'It sounds like you\'re experiencing a range of emotions. That\'s completely normal and valid.'
  };

  return messageMap[sentiment] || messageMap.neutral;
};

const analyzeBatch = async (texts) => {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('Array of texts is required');
  }

  const results = await Promise.all(
    texts.map(async (text, index) => {
      try {
        const analysis = await analyzeCheckIn(text);
        return { index, success: true, analysis };
      } catch (error) {
        return { index, success: false, error: error.message };
      }
    })
  );

  return results;
};

const getAggregateAnalysis = (analyses) => {
  if (!Array.isArray(analyses) || analyses.length === 0) {
    return null;
  }

  const validAnalyses = analyses.filter(a => a && a.sentiment_score !== undefined);

  if (validAnalyses.length === 0) {
    return null;
  }

  const avgScore = validAnalyses.reduce((sum, a) => sum + a.sentiment_score, 0) / validAnalyses.length;

  const sentimentCounts = validAnalyses.reduce((acc, a) => {
    acc[a.sentiment] = (acc[a.sentiment] || 0) + 1;
    return acc;
  }, {});

  const allEmotions = validAnalyses.flatMap(a => a.emotions || []);
  const emotionCounts = allEmotions.reduce((acc, e) => {
    acc[e] = (acc[e] || 0) + 1;
    return acc;
  }, {});

  const topEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emotion]) => emotion);

  const riskLevels = validAnalyses.map(a => a.risk_level);
  const hasHighRisk = riskLevels.includes('high') || riskLevels.includes('critical');

  return {
    average_sentiment_score: Math.round(avgScore * 100) / 100,
    sentiment_distribution: sentimentCounts,
    top_emotions: topEmotions,
    total_entries: validAnalyses.length,
    has_high_risk_entries: hasHighRisk,
    trend: avgScore > 0.2 ? 'positive' : avgScore < -0.2 ? 'negative' : 'stable'
  };
};

module.exports = {
  analyzeCheckIn,
  analyzeBatch,
  getAggregateAnalysis,
  validateAndSanitizeAnalysis
};
