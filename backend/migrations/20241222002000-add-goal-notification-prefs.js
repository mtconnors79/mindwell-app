'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add goal notification preference columns to users table
    await queryInterface.addColumn('users', 'goal_notify_achieved', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    });

    await queryInterface.addColumn('users', 'goal_notify_expiring', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    });

    await queryInterface.addColumn('users', 'goal_notify_incomplete', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    });

    await queryInterface.addColumn('users', 'goal_history_retention_days', {
      type: Sequelize.INTEGER,
      defaultValue: 90,
      allowNull: false
    });

    // Add CHECK constraint for goal_history_retention_days
    await queryInterface.sequelize.query(`
      ALTER TABLE users
      ADD CONSTRAINT chk_goal_history_retention_days
      CHECK (goal_history_retention_days >= 0 AND goal_history_retention_days <= 365);
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove CHECK constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE users
      DROP CONSTRAINT IF EXISTS chk_goal_history_retention_days;
    `);

    // Remove columns
    await queryInterface.removeColumn('users', 'goal_notify_achieved');
    await queryInterface.removeColumn('users', 'goal_notify_expiring');
    await queryInterface.removeColumn('users', 'goal_notify_incomplete');
    await queryInterface.removeColumn('users', 'goal_history_retention_days');
  }
};
