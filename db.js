const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: './resources/config.env' });



// Initialize the PostgreSQL client with the config
const dbClient = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT, 10),
});

dbClient.connect()
    .then(() => console.log('Successfully connected to the database'))
    .catch(err => console.error('Error connecting to the database:', err));

module.exports = dbClient;