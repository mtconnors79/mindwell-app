'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Enable uuid-ossp extension if not already enabled
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // Create ENUM types for goal activity_type and time_frame
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE goal_activity_type AS ENUM ('check_in', 'quick_mood', 'mindfulness', 'breathing', 'journaling');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE goal_time_frame AS ENUM ('daily', 'weekly', 'monthly');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create user_goals table
    await queryInterface.createTable('user_goals', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      activity_type: {
        type: 'goal_activity_type',
        allowNull: false
      },
      target_count: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      time_frame: {
        type: 'goal_time_frame',
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
        allowNull: false
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add CHECK constraint for target_count
    await queryInterface.sequelize.query(`
      ALTER TABLE user_goals
      ADD CONSTRAINT chk_target_count
      CHECK (target_count >= 1 AND target_count <= 100);
    `);

    // Add indexes
    await queryInterface.addIndex('user_goals', ['user_id'], {
      name: 'idx_user_goals_user_id'
    });

    await queryInterface.addIndex('user_goals', ['user_id', 'is_active'], {
      name: 'idx_user_goals_user_active'
    });

    await queryInterface.addIndex('user_goals', ['activity_type'], {
      name: 'idx_user_goals_activity_type'
    });

    await queryInterface.addIndex('user_goals', ['completed_at'], {
      name: 'idx_user_goals_completed_at'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_goals');

    // Drop ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS goal_time_frame;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS goal_activity_type;');
  }
};
