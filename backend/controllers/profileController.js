const { Profile } = require('../models');

const getProfile = async (req, res) => {
  try {
    const user_id = req.user.dbId;

    let profile = await Profile.findOne({
      where: { user_id }
    });

    if (!profile) {
      // Create empty profile if doesn't exist
      profile = await Profile.create({
        user_id,
        name: null,
        age: null,
        preferences: {}
      });
    }

    res.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch profile'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user_id = req.user.dbId;
    const { name, age, preferences } = req.body;

    let profile = await Profile.findOne({
      where: { user_id }
    });

    if (!profile) {
      profile = await Profile.create({
        user_id,
        name: name || null,
        age: age || null,
        preferences: preferences || {}
      });
    } else {
      await profile.update({
        name: name !== undefined ? name : profile.name,
        age: age !== undefined ? age : profile.age,
        preferences: preferences !== undefined ? preferences : profile.preferences
      });
    }

    res.json({
      message: 'Profile updated successfully',
      profile
    });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update profile'
    });
  }
};

const updatePreferences = async (req, res) => {
  try {
    const user_id = req.user.dbId;
    const newPreferences = req.body;

    if (!newPreferences || typeof newPreferences !== 'object') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Preferences object is required'
      });
    }

    let profile = await Profile.findOne({
      where: { user_id }
    });

    if (!profile) {
      profile = await Profile.create({
        user_id,
        preferences: newPreferences
      });
    } else {
      // Merge with existing preferences
      const mergedPreferences = {
        ...profile.preferences,
        ...newPreferences
      };

      await profile.update({
        preferences: mergedPreferences
      });
    }

    res.json({
      message: 'Preferences updated successfully',
      preferences: profile.preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update preferences'
    });
  }
};

const getPreferences = async (req, res) => {
  try {
    const user_id = req.user.dbId;

    const profile = await Profile.findOne({
      where: { user_id },
      attributes: ['preferences']
    });

    res.json({
      preferences: profile?.preferences || {}
    });
  } catch (error) {
    console.error('Get preferences error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch preferences'
    });
  }
};

const deletePreference = async (req, res) => {
  try {
    const user_id = req.user.dbId;
    const { key } = req.params;

    const profile = await Profile.findOne({
      where: { user_id }
    });

    if (!profile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Profile not found'
      });
    }

    const updatedPreferences = { ...profile.preferences };
    delete updatedPreferences[key];

    await profile.update({
      preferences: updatedPreferences
    });

    res.json({
      message: 'Preference deleted successfully',
      preferences: updatedPreferences
    });
  } catch (error) {
    console.error('Delete preference error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete preference'
    });
  }
};

const resetProfile = async (req, res) => {
  try {
    const user_id = req.user.dbId;

    const profile = await Profile.findOne({
      where: { user_id }
    });

    if (!profile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Profile not found'
      });
    }

    await profile.update({
      name: null,
      age: null,
      preferences: {}
    });

    res.json({
      message: 'Profile reset successfully',
      profile
    });
  } catch (error) {
    console.error('Reset profile error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reset profile'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updatePreferences,
  getPreferences,
  deletePreference,
  resetProfile
};
