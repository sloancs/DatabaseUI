# DatabaseUI

This project is an Electron-based desktop application for connecting to and interacting with a PostgreSQL database. The logic of this UI, though, is specifically catered toward how our group set up our Video Streaming Database.

## Features

- Insert data
- Update data
- Delete data
- Retrieve tables and views

## Dependencies

[Electron](https://www.electronjs.org/)  
[Node.js](https://nodejs.org/en)  
[node-postgres (pg)](https://node-postgres.com/)  
[dotenv](https://www.npmjs.com/package/dotenv)
[PostgreSQL](https://www.postgresql.org/download/)

## Setup

The application connects to the database based on the information provided in the `config.env` file in the `resources` folder. Prepare the file like in this example, with `DB_USER` and `DB_HOST` required. The necessity of the other variables is dependent on your system.

```
DB_USER="youruser"
DB_HOST="yourhost"
DB_NAME=""
DB_PASSWORD=""
DB_PORT=""
```

Make sure the PostgreSQL server is already running before starting the application. Executable file/installer should be in the `dist` folder, but if you want to run the application manually follow these steps in the terminal. There is a different `config.env` for the packaged executable in `dist` and the one for the manual run.

1. Navigate to directory where you stored the files.

```bash
> cd your/directory
```

2. Install dependencies.

```bash
> npm install electron
> npm install dotenv
> npm install pg
```

3. Run the script to start the application.

```bash
> npm run start
or
> npm start
```
