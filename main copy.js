'use strict';

const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const dialog = electron.dialog;
const ipcMain = electron.ipcMain;
const path = require('path');
const session = electron.session;

let mainWindow = null;
let isAPPQuiting = false;
let debug = process.argv[2] === 'debug';

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 650,
    minWidth: 1080,
    minHeight: 650,
    useContentSize: true,
    title: 'DJI Assistant 2 (Consumer Drones Series)',
    backgroundColor: '#ffffff',
    autoHideMenuBar: false,
    webPreferences: {
      plugins: true
    }
  });

  let url = 'file://' + __dirname + '/index.html#/debug/0';
  if (debug) {
    url = 'file://' + __dirname + '/index.html#/debug/1';
  }
  mainWindow.loadURL(url);

  mainWindow.on('close', function (event) {
    if (isAPPQuiting) return;
    dialog.showMessageBox(
      mainWindow,
      {
        type: 'question',
        buttons: ['Yes', 'No'],
        defaultId: 1,
        cancelId: 1,
        title: 'Confirm Exit',
        message: 'Are you sure you want to quit?'
      },
      function (response) {
        if (response !== 0) {
          event.preventDefault();
        } else {
          isAPPQuiting = true;
          app.quit();
        }
      }
    );
    event.preventDefault();
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  createMenu();
}

function createMenu() {
  const Menu = electron.Menu;
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open File Upload Window',
          click: function () {
            openUploadWindow();
          }
        },
        {
          label: 'Exit',
          click: function () {
            if (mainWindow) {
              mainWindow.close();
            }
          }
        }
      ]
    },
    {
      label: 'Developer',
      submenu: [
        {
          label: 'Toggle DevTools',
          click: function () {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        },
        {
          label: 'Reload',
          role: 'reload'
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function openUploadWindow() {
  let win = new BrowserWindow({
    width: 600,
    height: 400,
    title: 'Firmware Upload',
    parent: mainWindow,
    modal: false,
    autoHideMenuBar: true,
    webPreferences: {
      plugins: true
    }
  });

  win.loadURL('file://' + __dirname + '/fileupload.html');

  win.on('closed', function () {
    win = null;
  });
}

app.on('ready', createMainWindow);

app.on('window-all-closed', function () {
  app.quit();
});

ipcMain.on('open-devtools', function () {
  if (mainWindow) {
    mainWindow.webContents.openDevTools();
  }
});

ipcMain.on('close_win', function () {
  app.exit(0);
});
