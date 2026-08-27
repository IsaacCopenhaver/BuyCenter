import { Model, DataTypes } from 'sequelize'
import sequelize from '../db/database.js'

class CardSet extends Model {}

CardSet.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        gameId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: 'Set',
        tableName: 'sets',
    }
)

export default CardSet
