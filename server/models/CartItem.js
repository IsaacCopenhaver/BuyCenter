import { Model, DataTypes } from 'sequelize'
import sequelize from '../db/database.js'

class CartItem extends Model {}

CartItem.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        cartId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        cardId: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        condition: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        offerPrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: 'CartItem',
        tableName: 'cart_items',
    },
)

export default CartItem