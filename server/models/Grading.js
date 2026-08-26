import { Model, DataTypes } from 'sequelize'
import sequelize from '../db/database.js'

class Grading extends Model {}

Grading.init(
    {
        id: {
            type: DataTypes.STRING,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },

        grader: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        grade: {
            type: DataTypes.DECIMAL,
            allowNull: false,
        },

        certNumber: {
            type: DataTypes.STRING,
        },
    },
    {
        sequelize,
        modelName: 'Grading',
        tableName: 'gradings',
    }
)

export default Grading
