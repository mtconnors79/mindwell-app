const { Sequelize } = require('sequelize');

// Support both DATABASE_URL (production) and individual env vars (development)
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000
      },
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      }
    })
  : new Sequelize({
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'soulbloom_db',
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
