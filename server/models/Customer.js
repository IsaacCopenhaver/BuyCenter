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
            allowNull: false,
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

export default Customer
