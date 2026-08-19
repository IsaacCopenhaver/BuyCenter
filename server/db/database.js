import { Sequelize } from 'sequelize'  // Import the Sequelize class

// Create one shared PostgreSQL database instance
// Connection URL should come from the environment
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
})

export default sequelize // Reuse this instance across models