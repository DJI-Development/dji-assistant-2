'use strict';

const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const dialog = electron.dialog;
const ipcMain = electron.ipcMain;
const path = require('path');

let mainWindow = null;
let isAPPQuiting = false;
const debug = process.argv[2] === 'debug';

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
      nodeIntegration: true,
      contextIsolation: false,
      plugins: true
    }
  });

  const url = 'file://' + __dirname + '/index.html#/debug/' + (debug ? '1' : '0');
  mainWindow.loadURL(url);

  console.log('[Main] Application loaded:', url);

  if (debug) {
    setTimeout(() => {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.openDevTools({ mode: 'undocked' });
      }
    }, 1000);
  }

  mainWindow.on('close', (event) => {
    if (isAPPQuiting) return;

    const choice = dialog.showMessageBoxSync(mainWindow, {
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

  mainWindow.on('closed', () => {
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
          label: 'Exit',
          click: () => {
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
          accelerator: 'F12',
          click: () => {
            if (mainWindow && mainWindow.webContents) {
              const wc = mainWindow.webContents;
              if (wc.isDevToolsOpened()) {
                wc.closeDevTools();
              } else {
                wc.openDevTools({ mode: 'undocked' });
              }
            }
          }
        },
        {
          label: 'Firmware Tools',
          click: () => {
            const toolsWin = new BrowserWindow({
              width: 700,
              height: 600,
              title: 'Firmware Tools',
              autoHideMenuBar: true,
              webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
              }
            });

            toolsWin.loadURL('file://' + __dirname + '/tools/tools.html');

            toolsWin.on('closed', () => {
              // Cleanup
            });
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

app.on('ready', createMainWindow);

app.on('window-all-closed', () => {
  app.quit();
});

ipcMain.on('close_win', () => {
  app.exit(0);
});
