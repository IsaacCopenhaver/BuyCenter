import { Model, DataTypes } from 'sequelize'
import sequelize from '../db/database.js'

class BuyTransaction extends Model {}

BuyTransaction.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        customerId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        totalPrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },

        // What the customer actually receives (e.g. with a store-credit
        // bonus); can differ from totalPrice. Both come from the client.
        payoutAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },

        paymentType: {
            type: DataTypes.ENUM('cash', 'check', 'store_credit'),
            allowNull: false,
        },

        completedAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },

        completedById: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        cartId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
        },
    },
    {
        sequelize,
        modelName: 'BuyTransaction',
        tableName: 'transactions',
    },
)

export default BuyTransaction
