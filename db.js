const { ipcMain } = require('electron');
const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: '1234',
    port: 5432
})

client.connect()
    .then(() => console.log('Successfully connected to the database'))
    .catch(err => console.log('Error connecting to the database:', err));

module.exports = client;