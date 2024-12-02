const { contextBridge, ipcRenderer } = require('electron');

const ipc = {
  channels: {
    // From render to main
    send: ['minimize', 'maximize', 'unmaximize', 'close'],
    // From main to render
    receive: ['maximized', 'display-status'],
    // From main to render (once)
    receiveOnce: ['fetched'],
    // From render to main and back again
    sendReceive: [
      'get-tables',
      'get-views',
      'get-columns', 
      'get-rows', 
      'update-row', 
      'get-primary-key', 
      'delete-row',
      'show-confirmation-dialog',
      'get-row-from-pk',
      'insert-row'
    ]
  }
};

contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (channel, args) => {
    if (ipc.channels.send.includes(channel)) {
      ipcRenderer.send(channel, args);
    }
  },
  receive: (channel, listener) => {
    if (ipc.channels.receive.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => listener(...args));
    }
  },
  receiveOnce: (channel, listener) => {
    if (ipc.channels.receiveOnce.includes(channel)) {
      ipcRenderer.once(channel, (event, ...args) => listener(...args));
    }
  },
  invoke: (channel, ...args) => {
    if (ipc.channels.sendReceive.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
  }
});

