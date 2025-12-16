const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mindwell_db',
  username: process.env.DB_USER || 'mikeconnors',
  password: process.env.DB_PASSWORD || '',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const connectSequelize = async () => {
  try {
    await sequelize.authenticate();
    console.log('Sequelize connected to PostgreSQL successfully');
    return sequelize;
  } catch (error) {
    console.error('Failed to connect Sequelize to PostgreSQL:', error.message);
    throw error;
  }
};

const disconnectSequelize = async () => {
  try {
    await sequelize.close();
    console.log('Sequelize connection closed');
  } catch (error) {
    console.error('Error closing Sequelize connection:', error.message);
  }
};

module.exports = {
  sequelize,
  connectSequelize,
  disconnectSequelize,
  Sequelize
};
