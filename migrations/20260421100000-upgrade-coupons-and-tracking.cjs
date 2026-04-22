'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const coupons = await queryInterface.describeTable('coupons');
    const payments = await queryInterface.describeTable('payments');

    if (!coupons.startsAt) {
      await queryInterface.addColumn('coupons', 'startsAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!coupons.status) {
      await queryInterface.addColumn('coupons', 'status', {
        type: Sequelize.ENUM('active', 'paused', 'deleted'),
        allowNull: false,
        defaultValue: 'active',
      });
    }

    if (!coupons.usageLimitPerCustomer) {
      await queryInterface.addColumn('coupons', 'usageLimitPerCustomer', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      });
    }

    if (!coupons.audienceType) {
      await queryInterface.addColumn('coupons', 'audienceType', {
        type: Sequelize.ENUM('all', 'business_domains', 'specific_users', 'mixed'),
        allowNull: false,
        defaultValue: 'all',
      });
    }

    if (!coupons.allowedDomains) {
      await queryInterface.addColumn('coupons', 'allowedDomains', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!coupons.allowedUserIds) {
      await queryInterface.addColumn('coupons', 'allowedUserIds', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!payments.promo_code) {
      await queryInterface.addColumn('payments', 'promo_code', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!payments.promo_discount_percentage) {
      await queryInterface.addColumn('payments', 'promo_discount_percentage', {
        type: Sequelize.FLOAT,
        allowNull: true,
      });
    }

    if (!payments.promo_coupon_id) {
      await queryInterface.addColumn('payments', 'promo_coupon_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'coupons',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    await queryInterface.createTable('coupon_redemptions', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      coupon_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'coupons',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      payment_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'payments',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      payment_reference: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      discount_percentage: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM('succeeded', 'reverted'),
        allowNull: false,
        defaultValue: 'succeeded',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('coupon_redemptions', ['coupon_id'], { name: 'idx_coupon_redemptions_coupon_id' });
    await queryInterface.addIndex('coupon_redemptions', ['user_id'], { name: 'idx_coupon_redemptions_user_id' });
    await queryInterface.addIndex('coupon_redemptions', ['payment_reference'], {
      name: 'idx_coupon_redemptions_payment_reference',
      unique: true,
    });

    await queryInterface.createTable('coupon_attempts', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      coupon_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'coupons',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('success', 'failed'),
        allowNull: false,
        defaultValue: 'failed',
      },
      reason: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      meta: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('coupon_attempts', ['coupon_id'], { name: 'idx_coupon_attempts_coupon_id' });
    await queryInterface.addIndex('coupon_attempts', ['user_id'], { name: 'idx_coupon_attempts_user_id' });
    await queryInterface.addIndex('coupon_attempts', ['status'], { name: 'idx_coupon_attempts_status' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('coupon_attempts');
    await queryInterface.dropTable('coupon_redemptions');

    await queryInterface.removeColumn('payments', 'promo_coupon_id');
    await queryInterface.removeColumn('payments', 'promo_discount_percentage');
    await queryInterface.removeColumn('payments', 'promo_code');

    await queryInterface.removeColumn('coupons', 'allowedUserIds');
    await queryInterface.removeColumn('coupons', 'allowedDomains');
    await queryInterface.removeColumn('coupons', 'audienceType');
    await queryInterface.removeColumn('coupons', 'usageLimitPerCustomer');
    await queryInterface.removeColumn('coupons', 'status');
    await queryInterface.removeColumn('coupons', 'startsAt');
  },
};
