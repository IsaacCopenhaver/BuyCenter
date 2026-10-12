import { Model, DataTypes } from 'sequelize'
import sequelize from '../db/database.js'

class Cart extends Model {}

Cart.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        customerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        status: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: 'Cart',
        tableName: 'carts',    
    },
)

export default Cart