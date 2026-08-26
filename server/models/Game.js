import { Model, DataTypes } from 'sequelize'
import sequelize from '../db/database.js'

class Game extends Model {}

Game.init(
    {
        id: {
            type: DataTypes.STRING,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },

        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: 'Game',
        tableName: 'games',
    }
)

export default Game
