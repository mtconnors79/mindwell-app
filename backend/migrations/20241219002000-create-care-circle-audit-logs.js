'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create ENUM type for action_type
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE care_circle_action_type AS ENUM (
          'invited',
          'accepted',
          'declined',
          'revoked',
          'viewed_summary',
          'viewed_checkins',
          'viewed_moods',
          'exported_data',
          'tier_changed'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create care_circle_audit_logs table
    await queryInterface.createTable('care_circle_audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
        allowNull: false
      },
      connection_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'care_circle_connections',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      actor_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      action_type: {
        type: 'care_circle_action_type',
        allowNull: false
      },
      details: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      ip_address: {
        type: Sequelize.STRING(45), // Supports IPv6
        allowNull: true
      },
      user_agent: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
        allowNull: false
      }
    });

    // Add indexes
    await queryInterface.addIndex('care_circle_audit_logs', ['connection_id'], {
      name: 'idx_audit_connection_id'
    });

    await queryInterface.addIndex('care_circle_audit_logs', ['actor_user_id'], {
      name: 'idx_audit_actor_user_id'
    });

    await queryInterface.addIndex('care_circle_audit_logs', ['action_type'], {
      name: 'idx_audit_action_type'
    });

    await queryInterface.addIndex('care_circle_audit_logs', ['created_at'], {
      name: 'idx_audit_created_at'
    });

    // Composite index for querying connection history
    await queryInterface.addIndex('care_circle_audit_logs', ['connection_id', 'created_at'], {
      name: 'idx_audit_connection_time'
    });

    // Composite index for querying user activity
    await queryInterface.addIndex('care_circle_audit_logs', ['actor_user_id', 'action_type', 'created_at'], {
      name: 'idx_audit_user_action_time'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('care_circle_audit_logs');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS care_circle_action_type;');
  }
};
