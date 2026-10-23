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
            validate: {
                min: 1,
                isInt: true,
            },
        },

        printing: {
            type: DataTypes.STRING,
            allowNull: true,
        },

        condition: {
            type: DataTypes.STRING,
            allowNull: true,
        },

        grade: {
            type: DataTypes.STRING,
            allowNull: true,
        },

        shopifyVariantId: {
            type: DataTypes.STRING,
            allowNull: true,
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
        validate: {
            rawOrGraded() {
                const isRaw = this.printing != null && this.condition != null && this.grade == null
                const isGraded = this.grade != null && this.printing == null && this.condition == null

                if (!isRaw && !isGraded) {
                    throw new Error('A cart item needs printing + condition (raw) or grade only (graded).')
                }
            },
        },
    },
)

export default CartItem