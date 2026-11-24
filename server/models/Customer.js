import { Model, DataTypes } from 'sequelize'
import sequelize from '../db/database.js'

class Customer extends Model {}

Customer.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        shopifyCustomerId: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
        },

        firstName: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        lastName: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        phoneNumber: {
            type: DataTypes.STRING,
        },

        email: {
            type: DataTypes.STRING,
        },
    },
    {
        sequelize,
        modelName: 'Customer',
        tableName: 'customers',
    }
)

// The customer fields API responses include -- the shape the client's
// store already uses.
export const CUSTOMER_ATTRIBUTES = [
    'id', 'shopifyCustomerId', 'firstName', 'lastName', 'phoneNumber', 'email',
]

export default Customer
