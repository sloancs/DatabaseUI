let isMaximized = false;
let isCollapsed = false;
window.ipcRenderer.receive('maximized', (state) => {isMaximized = state});

// Override confirm to use the custom dialog
window.confirm = async function(message) {
  const isConfirmed = await ipcRenderer.invoke('show-confirmation-dialog', message);
  return isConfirmed; // true if yes, false if cancel
};

// Display success or error message on app
function statusMessage(message, status) {
  const statusElement = document.getElementById('status-message');
  statusElement.textContent = message;
  statusElement.style.color = status ? '#61fa8a' : '#fa6171'; // green or red
  statusElement.style.marginLeft = '0.5em';
  statusElement.style.fontSize = '12px';
}
window.ipcRenderer.receive('display-status', (message, status) => {
  statusMessage(message, status);
})

// Change screens
function displayScreen(screenID) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));

    const selectedScreen = document.getElementById(screenID);
    if(selectedScreen) {
        selectedScreen.classList.add('active');
    }
}

// Refresh table values for updates/inserts with the new data
function refreshTable() {
  document.querySelector('.screen.active #tables').dispatchEvent(new Event('change'));
}

// Convert input text entries to correct data-type
function convertType(input) {
  let value = !input.value ? null : input.value;
  const columnType = input.dataset.type;

  let convertedValue = value;
  console.log(columnType);
  switch (columnType) {
    case 'integer':
      convertedValue = parseInt(value, 10);
      break;
    case 'boolean':
      convertedValue = value.toLowerCase() === 'true';
      break;
    case 'date':
      const date = new Date(value);
      convertedValue = isNaN(date.getTime()) ? false : date.toISOString().slice(0, 19).replace('T', ' ');
      break;
    case 'timestamp without time zone':
      const timestamp = new Date(value);
      convertedValue = isNaN(timestamp.getTime()) ? null : timestamp.toISOString().slice(0, 19).replace('T', ' ');
    default:
      break;
  }
  return convertedValue;
}

// Update table with input fields
function updateRow(row, tableName) {
  const updatedData = {};
  document.querySelectorAll('#form-fields input').forEach(input => {
    updatedData[input.dataset.column] = convertType(input);
  });

  // Get the primary key column name for the selected table
  window.ipcRenderer.invoke('get-primary-key', tableName)
    .then(primaryKey => {
      if (primaryKey) {
        const condition = `${primaryKey} = ${row[primaryKey]}`;

        window.ipcRenderer.invoke('update-row', tableName, updatedData, condition)
          .then(response => {
            if (response.success) {
              statusMessage(`Successfully updated row in ${tableName}`, true);
              refreshTable();
            }
          })
          .catch(err => {
            console.error('Error updating row:', err);
          });
      } 
      else {
        console.error('No primary key found for table:', tableName);
      }
    })
    .catch(err => {
      console.error('Error fetching primary key:', err);
    });
}

// Insert row into table based on inputs
function insertRow(tableName) {
  const formData = {};
  document.querySelectorAll('#form-fields input').forEach(input => {
    formData[input.dataset.column] = convertType(input);
  });
  
  const columnNames = Object.keys(formData);
  const values = Object.values(formData);
  window.ipcRenderer.invoke('insert-row', tableName, values, columnNames)
    .then(response => {
      if (response.success) {
        statusMessage(`Successfully inserted row into ${tableName}.`, true);
        document.querySelectorAll('#form-fields input').forEach(input => {
          input.value = '';
        });
        refreshTable();
      } 
      else {
        console.error(`Error inserting row into ${tableName}:`, err);
        statusMessage(`Error inserting row into ${tableName}: ${err.message}`, false);
      }
    })
    .catch(err => {
      console.error(`Error inserting row into ${tableName}:`, err);
    });
}

// Clear html for use with screen navigation
function clearPage() {
  const tableBody = document.querySelector('.screen.active #rows-table tbody');
  const tableHeaders = document.querySelector('.screen.active #rows-table thead tr');
  tableBody.innerHTML = ''; 
  tableHeaders.innerHTML = '';

  // Hide elements unique to CRUD operations screen
  const activeScreen = document.querySelector('.screen.active');
  if(activeScreen.id === 'crud-screen') {
    const formFields = document.querySelector('.screen.active #form-fields');
    formFields.innerHTML = '';
    const buttons = document.querySelectorAll('.screen.active #update-form button');
    buttons.forEach(btn => {
    btn.style.display = 'none';
  })
  }
  const dropdown = document.querySelectorAll('select');
  dropdown.forEach(dropdown => {
    dropdown.value = '';
  })
}

// Function to display rows in a table
function displayRows(rows, tableName) {
  const tableBody = document.querySelector('.screen.active #rows-table tbody');
  const tableHeaders = document.querySelector('.screen.active #rows-table thead tr');
  tableBody.innerHTML = '';
  tableHeaders.innerHTML = '';

  // Add headers to table
  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      tableHeaders.appendChild(th);
    });
  }
  

  const activeScreen = document.querySelector('.screen.active');

  // Buttons unique to CRUD screen
  if (activeScreen.id === 'crud-screen') {
    const th = document.createElement('th');
    th.textContent = 'actions';
    tableHeaders.appendChild(th);
    initFormFields(tableName);
    document.getElementById('update-button').style.display = 'inline-block';
    document.getElementById('insert-button').style.display = 'inline-block';
  }

  // Add data from selected table from database to rows of table on screen
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    Object.values(row).forEach(value => {
      const td = document.createElement('td');
      td.textContent = value;
      tr.appendChild(td);
    });

    // Add buttons for editing and deleting on CRUD screen
    if (activeScreen.id === 'crud-screen') {
      editButton = document.createElement('button');
      editButton.textContent = 'Edit';
      editButton.className = 'edit-button';
      editButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M16.293 3.293a1 1 0 0 1 1.414 0l3 3a1 1 0 0 1 0 1.414l-9 9A1 1 0 0 1 11 17H8a1 1 0 0 1-1-1v-3a1 1 0 0 1 .293-.707zM9 13.414V15h1.586l8-8L17 5.414zM3 7a2 2 0 0 1 2-2h5a1 1 0 1 1 0 2H5v12h12v-5a1 1 0 1 1 2 0v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';

      deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.className = 'delete-button';
      deleteButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32"><path d="M13.5 6.5V7h5v-.5a2.5 2.5 0 0 0-5 0m-2 .5v-.5a4.5 4.5 0 1 1 9 0V7H28a1 1 0 1 1 0 2h-1.508L24.6 25.568A5 5 0 0 1 19.63 30h-7.26a5 5 0 0 1-4.97-4.432L5.508 9H4a1 1 0 0 1 0-2zM9.388 25.34a3 3 0 0 0 2.98 2.66h7.263a3 3 0 0 0 2.98-2.66L24.48 9H7.521zM13 12.5a1 1 0 0 1 1 1v10a1 1 0 1 1-2 0v-10a1 1 0 0 1 1-1m7 1a1 1 0 1 0-2 0v10a1 1 0 1 0 2 0z"/></svg>';

      const tdAction = document.createElement('td');
      tdAction.classList.add('td-action');
      tdAction.appendChild(editButton);
      tdAction.appendChild(deleteButton);
      tr.appendChild(tdAction);

      editButton.onclick = () => fillFormFields(row);
      deleteButton.onclick = () => deleteRow(row, tableName);
    }
    tableBody.appendChild(tr);
  });
}

// Delete row in table
function deleteRow(row, tableName) {
  // Fetch primary key to query which row to delete
  window.ipcRenderer.invoke('get-primary-key', tableName)
    .then(primaryKey => {
      if(primaryKey) {
        const condition = `${primaryKey} = ${row[primaryKey]}`;

        window.confirm('Are you sure you want to delete this row?')
          .then(isConfirmed => {
            if (isConfirmed) {
              window.ipcRenderer.invoke('delete-row', tableName, condition)
                .then(response => {
                  if (response.success) {
                    statusMessage('Successfully deleted row.', true);
                    refreshTable();
                  } 
                  else {
                    console.error('Error deleting row:', response.error);
                  }
                })
                .catch(err => {
                  console.error('Error invoking delete-row:', err);
                });
            }
          })
          .catch(err => {
            console.error('Error showing confirmation dialog:', err);
          });
      }
    });
}

// Initialize form fields for update screen
function initFormFields(tableName) {
  const formFields = document.getElementById('form-fields');
  formFields.innerHTML = '';

  window.ipcRenderer.invoke('get-columns', tableName)
    .then(columns => {
      if (columns) {
        const columnTypes = columns.reduce((acc, col) => {
          acc[col.column_name] = col.data_type;
          return acc;
        }, {});

        Object.keys(columnTypes).forEach(key => {
          const div = document.createElement('div');
          const label = document.createElement('label');
          label.textContent = key;
          const input = document.createElement('input');
          input.dataset.column = key;
          input.dataset.type = columnTypes[key];
          div.appendChild(label);
          div.appendChild(input);
          formFields.appendChild(div);
        });
      }
    })
    .catch(err => {
      console.error('Error fetching columns:', err);
    });
}

// Fill the form fields once a row is selected to edit
function fillFormFields(row) {
  Object.keys(row).forEach(key => {
    document.querySelectorAll('#form-fields input').forEach(input => {
      if (input.dataset.column === key) {
        input.value = row[key];
      }
    })
  });
}

// Listener for when form-fields are clicked for update/insert
const form = document.getElementById('update-form');
form.onsubmit = (event) => {
  event.preventDefault();
  const buttonClicked = event.submitter;

  if (buttonClicked && buttonClicked.id === 'update-button') {
    const selectedTable = document.getElementById('tables').value;
    window.ipcRenderer.invoke('get-primary-key', selectedTable)
      .then(primaryKey => {
        if(primaryKey) {
          let inputVal;
          document.querySelectorAll('#form-fields input').forEach(input => {
            if (input.getAttribute('data-column') === primaryKey) {
              inputVal = input.value;
            }
          })
          if (!inputVal) {
            statusMessage('Primary key value is required.', false);
            return;
          }
          window.ipcRenderer.invoke('get-row-from-pk', selectedTable, inputVal, primaryKey)
            .then(row => {
              if(row) {
                console.log(row);
                updateRow(row, selectedTable);
              }
              else {
                statusMessage('No row found with the provided primary key.', false);
              }
            })
            .catch(err => {
              console.error('Error fetching row:', err);
              statusMessage('Error fetching row from the database.', false);
            });
        }
      })
      .catch(err => {
        console.error('Error fetching primary key:', err);
      });
  }

  if (buttonClicked && buttonClicked.id === 'insert-button') {
    const selectedTable = document.getElementById('tables').value;
    insertRow(selectedTable);
  }
}

// Resize event listener, changes transition to none
let resizeTimer; // debounce
window.addEventListener('resize', () => {
  const ele = document.querySelector('.main-content-container');
  
  if (ele) {
    ele.style.transition = 'none';
    
    clearTimeout(resizeTimer);
    
    resizeTimer = setTimeout(() => {
      ele.style.transition = '';
    }, 200);
  }
});

// Title bar listeners
document.getElementById('titlebar-minimize').addEventListener('click', () => {
    window.ipcRenderer.send('minimize');
})

document.getElementById('titlebar-maximize').addEventListener('click', () => {
    if (isMaximized) {
        window.ipcRenderer.send('unmaximize');
    }
    else {
        window.ipcRenderer.send('maximize');
    }
});

document.getElementById('titlebar-close').addEventListener('click', () => {
    window.ipcRenderer.send('close');
});

// Sidebar listeners
document.getElementById('sidebar-toggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
})

document.getElementById('sidebar-crud-button').addEventListener('click', function() {
    displayScreen('crud-screen');
    clearPage();
})

document.getElementById('sidebar-query-button').addEventListener('click', function() {
    displayScreen('query-screen');
    document.getElementById('query-table-display').style.height = '100%';
    clearPage();
})

document.getElementById('sidebar-report-button').addEventListener('click', function() {
    displayScreen('report-screen');
    document.getElementById('report-table-display').style.height = '100%';
    clearPage();
})

// Dark/light mode toggle
const toggle = document.querySelector('.toggle-switch');
toggle.addEventListener('click', () => {
  const curTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = curTheme === 'light' ? 'dark' : 'light';
  const modeIcons = document.querySelectorAll('.mode-icon');

  document.documentElement.setAttribute('data-theme', newTheme);
  toggle.classList.toggle('active');
  modeIcons.forEach(icon => {
    icon.classList.toggle('active');
  });
})

// Fetch all tables in database and display in dropdown
window.ipcRenderer.invoke('get-tables')
  .then(tables => {
    const tableDropdowns = document.querySelectorAll('#tables');
    tableDropdowns.forEach(dropdown => {
      tables.forEach(table => {
        const option = document.createElement('option');
        option.value = table.table_name;
        option.textContent = table.table_name;
        dropdown.appendChild(option);
      });
    })
  })
  .catch(err => console.error('Error fetching tables:', err));

  // Fetch all views in database and display in dropdown on report screen
window.ipcRenderer.invoke('get-views')
.then(views => {
  const tableDropdowns = document.querySelectorAll('#views');
  tableDropdowns.forEach(dropdown => {
    views.forEach(view => {
      const option = document.createElement('option');
      option.value = view.table_name;
      option.textContent = view.table_name;
      dropdown.appendChild(option);
    });
  })
})
.catch(err => console.error('Error fetching tables:', err));


// Handle table selection and display rows
document.querySelectorAll('#tables').forEach(dropdown => {
  dropdown.addEventListener('change', (event) => {
    const selectedTable = event.target.value;
    if (selectedTable) {
      window.ipcRenderer.invoke('get-rows', selectedTable)
        .then(rows => {
          displayRows(rows, selectedTable);
        })
        .catch(err => console.error('Error fetching rows:', err));
    }
  });
})

// Handle view selection and display rows
document.getElementById('views').addEventListener('change', (event) => {
  const selectedTable = event.target.value;
  if (selectedTable) {
    window.ipcRenderer.invoke('get-rows', selectedTable)
      .then(rows => {
        displayRows(rows, selectedTable);
      })
      .catch(err => console.error('Error fetching rows:', err));
  }
});


