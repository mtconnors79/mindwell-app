// MongoDB Models (Mongoose)
const CheckinResponse = require('./CheckinResponse');
const ActivityLog = require('./ActivityLog');

// PostgreSQL Models (Sequelize)
const User = require('./User');
const Profile = require('./Profile');
const MoodEntry = require('./MoodEntry');
const EmergencyContact = require('./EmergencyContact');
const ActivityCompletion = require('./ActivityCompletion');
const UserAchievement = require('./UserAchievement');
const CareCircleConnection = require('./CareCircleConnection');
const CareCircleAuditLog = require('./CareCircleAuditLog');

// Define Sequelize Associations

// User <-> Profile
User.hasOne(Profile, { foreignKey: 'user_id', as: 'profile' });
Profile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> MoodEntry
User.hasMany(MoodEntry, { foreignKey: 'user_id', as: 'moodEntries' });
MoodEntry.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> EmergencyContact
User.hasMany(EmergencyContact, { foreignKey: 'user_id', as: 'emergencyContacts' });
EmergencyContact.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> ActivityCompletion
User.hasMany(ActivityCompletion, { foreignKey: 'user_id', as: 'activityCompletions' });
ActivityCompletion.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> UserAchievement
User.hasMany(UserAchievement, { foreignKey: 'user_id', as: 'achievements' });
UserAchievement.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Care Circle Associations

// User as Patient <-> CareCircleConnection
User.hasMany(CareCircleConnection, { foreignKey: 'patient_user_id', as: 'careCircleAsPatient' });
CareCircleConnection.belongsTo(User, { foreignKey: 'patient_user_id', as: 'patient' });

// User as Trusted Person <-> CareCircleConnection
User.hasMany(CareCircleConnection, { foreignKey: 'trusted_user_id', as: 'careCircleAsTrusted' });
CareCircleConnection.belongsTo(User, { foreignKey: 'trusted_user_id', as: 'trustedUser' });

// CareCircleConnection <-> CareCircleAuditLog
CareCircleConnection.hasMany(CareCircleAuditLog, { foreignKey: 'connection_id', as: 'auditLogs' });
CareCircleAuditLog.belongsTo(CareCircleConnection, { foreignKey: 'connection_id', as: 'connection' });

// User <-> CareCircleAuditLog (actor)
User.hasMany(CareCircleAuditLog, { foreignKey: 'actor_user_id', as: 'careCircleAuditLogs' });
CareCircleAuditLog.belongsTo(User, { foreignKey: 'actor_user_id', as: 'actor' });

module.exports = {
  // MongoDB Models
  CheckinResponse,
  ActivityLog,
  // PostgreSQL Models
  User,
  Profile,
  MoodEntry,
  EmergencyContact,
  ActivityCompletion,
  UserAchievement,
  CareCircleConnection,
  CareCircleAuditLog
};
