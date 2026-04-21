'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('courses', 'trademark', {
            type: Sequelize.SMALLINT,
            defaultValue: 1,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('courses', 'trademark');
    }
    
};
