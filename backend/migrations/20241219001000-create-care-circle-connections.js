'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Enable uuid-ossp extension if not already enabled
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // Create ENUM types
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE care_circle_sharing_tier AS ENUM ('full', 'data_only');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE care_circle_status AS ENUM ('pending', 'active', 'declined', 'revoked');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE care_circle_revoked_by AS ENUM ('patient', 'trusted_person');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create care_circle_connections table
    await queryInterface.createTable('care_circle_connections', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
        allowNull: false
      },
      patient_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      trusted_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      trusted_email: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      trusted_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      sharing_tier: {
        type: 'care_circle_sharing_tier',
        defaultValue: 'data_only',
        allowNull: false
      },
      status: {
        type: 'care_circle_status',
        defaultValue: 'pending',
        allowNull: false
      },
      invite_token: {
        type: Sequelize.STRING(128),
        unique: true,
        allowNull: false
      },
      invite_token_expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      invited_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
        allowNull: false
      },
      accepted_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      revoked_by: {
        type: 'care_circle_revoked_by',
        allowNull: true
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
      }
    });

    // Add indexes
    await queryInterface.addIndex('care_circle_connections', ['patient_user_id'], {
      name: 'idx_care_circle_patient_user_id'
    });

    await queryInterface.addIndex('care_circle_connections', ['trusted_user_id'], {
      name: 'idx_care_circle_trusted_user_id'
    });

    await queryInterface.addIndex('care_circle_connections', ['trusted_email'], {
      name: 'idx_care_circle_trusted_email'
    });

    await queryInterface.addIndex('care_circle_connections', ['invite_token'], {
      name: 'idx_care_circle_invite_token',
      unique: true
    });

    await queryInterface.addIndex('care_circle_connections', ['status'], {
      name: 'idx_care_circle_status'
    });

    // Composite index for common query pattern
    await queryInterface.addIndex('care_circle_connections', ['patient_user_id', 'status'], {
      name: 'idx_care_circle_patient_status'
    });

    await queryInterface.addIndex('care_circle_connections', ['trusted_user_id', 'status'], {
      name: 'idx_care_circle_trusted_status'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('care_circle_connections');

    // Drop ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS care_circle_revoked_by;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS care_circle_status;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS care_circle_sharing_tier;');
  }
};
