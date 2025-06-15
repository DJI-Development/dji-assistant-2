'use strict';

var electron = require('electron');
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var dialog = electron.dialog;
var ipcMain = electron.ipcMain;
var path = require('path');

var mainWindow = null;
var isAPPQuiting = false;
var debug = process.argv[2] === 'debug';

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
      plugins: true,
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  var url = 'file://' + __dirname + '/index.html#/debug/' + (debug ? '1' : '0');
  mainWindow.loadURL(url);

  if (debug) {
    console.log('[Main] Debug mode enabled – opening DevTools');
    setTimeout(function () {
      mainWindow.webContents.openDevTools({ detach: true });
    }, 1000); // Give time for renderer to settle
  }

  mainWindow.on('close', function (event) {
    if (isAPPQuiting) return;

    var choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: ['Yes', 'No'],
      defaultId: 1,
      cancelId: 1,
      title: 'Confirm Exit',
      message: 'Are you sure you want to quit?'
    });

    if (choice !== 0) {
      event.preventDefault();
    } else {
      isAPPQuiting = true;
    }
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  createMenu();
}

function createMenu() {
  var Menu = electron.Menu;
  var template = [
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
            if (!mainWindow) return;
            var wc = mainWindow.webContents;
            if (wc.isDevToolsOpened()) {
              wc.closeDevTools();
            } else {
              wc.openDevTools({ detach: true });
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

  var menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function openUploadWindow() {
  var win = new BrowserWindow({
    width: 600,
    height: 400,
    title: 'Firmware Upload',
    parent: mainWindow,
    modal: false,
    autoHideMenuBar: true,
    webPreferences: {
      plugins: true,
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadURL('file://' + __dirname + '/fileupload.html');

  win.on('closed', function () {
    // no-op
  });
}

app.on('ready', createMainWindow);
app.on('window-all-closed', function () {
  app.quit();
});
ipcMain.on('close_win', function () {
  app.exit(0);
});
