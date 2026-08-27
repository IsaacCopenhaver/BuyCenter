import { Model, DataTypes } from 'sequelize'
import sequelize from '../db/database.js'

class Grading extends Model {}

Grading.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
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
