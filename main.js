const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('node:path')
const db = require('./db');

let window;

function createWindow (htmlfile) {
  const win = new BrowserWindow({
    minWidth: 400,
    minHeight: 300,
    width: 1050,
    height: 600,
    frame: false,
    transparent: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile(htmlfile)
  return win;
}

app.whenReady().then(() => {
  window = createWindow('index.html')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow('index.html')
    }
  })
})
app.disableHardwareAcceleration();


// Title bar IPC handlers
ipcMain.on('minimize', (event) => {
  window.minimize();
})

ipcMain.on('maximize', (event) => {
  window.maximize();
  window.webContents.send('maximized', true);
})

ipcMain.on('unmaximize', (event) => {
  window.unmaximize();
  window.webContents.send('maximized', false);
})

ipcMain.on('close', (event) => {
  event.preventDefault();
  // Hide window instead of close on macOS since applications
  // stay active until user explicitly quits
  if (process.platform !== 'darwin') {
    window.close();
  }
  else {
    window.hide();
  }
})

// Mainly for macOS
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow('index.html');
  } 
  else {
    window.show();
  }
});

// Custom confirmation popup since confirm() breaks focus
// and make inputs non-editable
ipcMain.handle('show-confirmation-dialog', async (event, message) => {
  const response = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['Yes', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
    detail: message,
    message: '',
  });

  return response.response === 0; // true if yes, false if cancel
});

// Database
// Fetch all base tables from the database
ipcMain.handle('get-tables', async () => {
  try {
    const res = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'; 
    `);
    return res.rows;
  }

  catch (err) {
    console.error('Error fetching tables:', err);
    return [];
  }
});

// Fetch all views from the database
ipcMain.handle('get-views', async () => {
  try {
    const res = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'VIEW'; 
    `);
    return res.rows;
  }

  catch (err) {
    console.error('Error fetching tables:', err);
    return [];
  }
});

// Fetch all columns for a specific table
ipcMain.handle('get-columns', async (event, tableName) => {
  try {
    const res = await db.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1;
    `, [tableName]);
    return res.rows;
  }

  catch (err) {
    console.error(`Error fetching columns for ${tableName}:`, err);
    return [];
  }
});

// Fetch all rows for a specific table
ipcMain.handle('get-rows', async (event, tableName) => {
  try {
    const res = await db.query(`SELECT * FROM ${tableName}`);
    return res.rows;
  } 
  
  catch (err) {
    console.error(`Error fetching rows for ${tableName}:`, err);
    return [];
  }
});

// Fetch first row with PK matching input
ipcMain.handle('get-row-from-pk', async (event, tableName, input, columnPK) => {
  try {
    if(!input || !columnPK) {
      throw new Error('Invalid data received');
    }
    const res = await db.query(`SELECT * FROM ${tableName} WHERE ${columnPK} = $1;`, [input]);
    return res.rows.length > 0 ? res.rows[0] : null;
  }
  catch (err) {
    console.error(`Error fetching row for ${tableName} PK ${input}:`, err);
    return [];
  }
});

// Update a row in the table
ipcMain.handle('update-row', async (event, tableName, updatedData, condition) => {
  try {
    if (!updatedData || !condition) {
      throw new Error('Invalid input data');
    }

    let i = 1;
    const setClause = Object.keys(updatedData)
      .map(key => `${key} = $${i++}`)
      .join(', ');

    const values = Object.values(updatedData);

    const query = `
      UPDATE ${tableName}
      SET ${setClause}
      WHERE ${condition}
    `;

    await db.query(query, values);
    return { success: true };
  } 
  
  catch (err) {
    console.error(`Error updating row in ${tableName}:`, err);
    window.webContents.send('display-status', `Error updating row in ${tableName}: ${err.message}`, false);
    return { success: false, error: err.message };
  }
});

//Insert a row in the table
ipcMain.handle('insert-row', async (event, tableName, values, columnNames) => {
  try {
    if (!Array.isArray(values) || typeof tableName !== 'string' || !Array.isArray(columnNames)) {
      throw new Error('Invalid input data.');
    }

    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    const query = `
      INSERT INTO ${tableName} (${columnNames.join(', ')}) 
      VALUES (${placeholders})
      `;

    await db.query(query, values);

    return { success: true };
  } 
  catch (err) {
    console.error(`Error inserting row into ${tableName}:`, err);
    window.webContents.send('display-status', `Error inserting row into ${tableName}: ${err.message}`, false);
    return { success: false, error: err.message };
  }
});

// Delete a row in the table
ipcMain.handle('delete-row', async (event, tableName, condition) => {
  try {
    if (!condition) {
      throw new Error('Invalid data received');
    }

    const query = `DELETE FROM ${tableName} WHERE ${condition}`;
    await db.query(query);
    return {success : true};
  }
  catch (err) {
    console.error(`Error deleting row in ${tableName}:`, err);
    window.webContents.send('display-status', `Error deleting row in ${tableName}: ${err.message}`, false);
    return { success: false, error: err.message };
  }
});

// Fetch column name of primary key for a specific table
ipcMain.handle('get-primary-key', async (event, tableName) => {
  try {
    const res = await db.query(`
      SELECT column_name
      FROM information_schema.key_column_usage
      WHERE table_name = $1
        AND constraint_name = (
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_name = $1
            AND constraint_type = 'PRIMARY KEY'
        );
    `, [tableName]);

    if (res.rows.length > 0) {
      return res.rows[0].column_name;
    } 
    else {
      return null;
    }
  } 
  catch (err) {
    console.error('Error fetching primary key:', err);
    return null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})