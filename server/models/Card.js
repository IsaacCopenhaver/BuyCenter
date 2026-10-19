import { Model, DataTypes } from 'sequelize'
import sequelize from '../db/database.js'

class Card extends Model {}

Card.init(
    {
        shopifyProductId: {
            type: DataTypes.STRING,
            primaryKey: true,
        },

        setId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        collectorNumber: {
            type: DataTypes.STRING,
        },

        rarity: {
            type: DataTypes.STRING,
        },

        tcgProductId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },

        sellPrice: {
            type: DataTypes.JSONB,
        },

        buyPrice: {
            type: DataTypes.JSONB,
        },

        buying: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },

        marketPrice: {
            type: DataTypes.JSONB,
        },
    },
    {
        sequelize,
        modelName: 'Card',
        tableName: 'cards',
    },
)

export default Card
