import { Model, DataTypes } from 'sequelize'
import sequelize from '../db/database.js'

class CardSet extends Model {}

CardSet.init(
    {
        id: {
            type: DataTypes.STRING,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },

        gameId: {
            type: DataTypes.STRING,
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
