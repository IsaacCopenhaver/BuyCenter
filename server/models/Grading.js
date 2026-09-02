import { Model, DataTypes } from 'sequelize'
import sequelize from '../db/database.js'

class Grading extends Model {}

Grading.init(
    {
        certNumber: {
            type: DataTypes.STRING,
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
    },
    {
        sequelize,
        modelName: 'Grading',
        tableName: 'gradings',
    }
)

export default Grading
