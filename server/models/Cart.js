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
            allowNull: true,
        },

        status: {
            type: DataTypes.ENUM('open', 'completed', 'abandoned'),
            defaultValue: 'open',
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