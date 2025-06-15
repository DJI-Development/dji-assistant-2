'use strict'

const electron = require('electron')
const log = require('electron-log')
const path = require('path')
const dialog = electron.dialog
const app = electron.app  // Module to control application life.
const BrowserWindow = electron.BrowserWindow  // Module to create native browser window.
const globalShortcut = electron.globalShortcut
const ipcMain = electron.ipcMain
const session = electron.session

let initLog = function () {
  // Log level
  // log.transports.console.level = 'warn'
  /**
   * Set output format template. Available variables:
   * Main: {level}, {text}
   * Date: {y},{m},{d},{h},{i},{s},{ms},{z}
   */
  log.transports.console.format = '[{y}-{m}-{d} {h}:{i}:{s}:{ms}][{level}] {text}\n'

  // Same as for console transport
  log.transports.file.level = 'info'
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}:{ms}][{level}] {text}\n'

  // Set approximate maximum log size in bytes. When it exceeds,
  // the archived log will be saved as the log.old.log file
  log.transports.file.maxSize = 10 * 1024 * 1024

  // Write to this file, must be set before first logging
  let pp = path.join(__dirname, '../ui_ass2.log')
  log.transports.file.file = pp
}

let ishttpURL = function(url){
  if(/(http|ftp|https|file):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?/.test(url)){
    return true
  }
  return false
}

// EG: 'file://xxx/index.html/#view/xxx' will return 'index.html/#view'
let getRouteURL = function(url){
  let tmp = /[^/]*\.html#\/[^/]*/.exec(url)
  return tmp ? tmp[0] : url
}

// 预留用于main.js用来调试的方法
let showMsg = function(text){
  dialog.showMessageBox({
    buttons: ['hello'],
    type: 'question',
    title: 'test',
    message: text
  })
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null
let locale = 'en'
let debug = process.argv[2]=='debug'?true:false
let isAPPQuiting = false

// win的close事件触发时
let onWinClose = function(event){

  let self = this

  self.webContents.send('close-confirm', '')

  let msg = {
    'quit': {
      'en': 'Quit Now?',
      'zh-cn': '确定退出么？',
      'jp': '終了しますか？'
    },
    'ok': {
      'en': ' Yes ',
      'zh-cn': '是',
      'jp': 'はい'
    },
    'cancel': {
      'en': ' No ',
      'zh-cn': '否',
      'jp': 'いいえ'
    }
  }

  let choice = dialog.showMessageBox(self, {
    type: 'question',
    buttons: [
      msg['ok'][locale]?msg['ok'][locale]:msg['ok']['en'],
      msg['cancel'][locale]?msg['cancel'][locale]:msg['cancel']['en']
    ],
    title: 'DJI Assistant 2 (Consumer Drones Series)',
    message: msg['quit'][locale]?msg['quit'][locale]:msg['quit']['en'],
    noLink: true,
    cancelId: 2
  })

  if(choice !== 0){
    event.preventDefault()
    return false
  }

  mainWindow.webContents.executeJavaScript('localStorage.removeItem("ignore_camera_calibration");', true)
  mainWindow.webContents.send('close', '')
  isAPPQuiting = true
  let windowset = BrowserWindow.getAllWindows()
  windowset.forEach(function(ele, idx){
    if(ele && ele.close && ele != mainWindow) ele.close()
  })
}

initLog();

// Quit when all windows are closed.
app.on('window-all-closed', function(){
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  app.quit()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function(){

  mainWindow = new BrowserWindow({
    width: 1080, height: 650, minWidth: 1080, minHeight: 650, useContentSize: true, title: 'DJI Assistant 2 (Consumer Drones Series)', backgroundColor: '#fff', autoHideMenuBar: true,
    'web-preferences': {
      'plugins': true
    }
  })
  if(!debug) mainWindow.setMenu(null)


  /* 解决mac上快捷键不能使用问题 [[ */
  const Menu = require("menu");
  let ua = mainWindow.webContents.getUserAgent();
  if(ua.indexOf('Mac OS')!=-1) {
    // 注册菜单
    let template = [{
      role: "edit",
      submenu: [
        { label:"undo", role: "undo", accelerator: "CmdOrCtrl+Z", visible: false},
        { label:"redo", role: "redo", accelerator: "Shift+CmdOrCtrl+Z", visible: false },
        { label:"cut", role: "cut", accelerator: "CmdOrCtrl+X", visible: false },
        { label:"copy", role: "copy", accelerator: "CmdOrCtrl+C", visible: false },
        { label:"cut", role: "paste", accelerator: "CmdOrCtrl+V", visible: false },
        { label:"select all", role: "selectall", accelerator: "CmdOrCtrl+A", visible: false },
      ]}
    ];
    let template_dev = [{
      role: "edit",
      submenu: [
        { label:"undo", role: "undo", accelerator: "CmdOrCtrl+Z", visible: false},
        { label:"redo", role: "redo", accelerator: "Shift+CmdOrCtrl+Z", visible: false },
        { label:"cut", role: "cut", accelerator: "CmdOrCtrl+X", visible: false },
        { label:"copy", role: "copy", accelerator: "CmdOrCtrl+C", visible: false },
        { label:"cut", role: "paste", accelerator: "CmdOrCtrl+V", visible: false },
        { label:"select all", role: "selectall", accelerator: "CmdOrCtrl+A", visible: false },
        { label:"reload", role: "reload", accelerator: "CmdOrCtrl+R", enabled:true, visible: false },
        { label:"dev tools", role: "toggledevtools", accelerator: "Shift+CmdOrCtrl+I", enabled:true, visible: false }
      ]}];
    let tmpl = debug?template_dev:template;
    Menu.setApplicationMenu(Menu.buildFromTemplate(tmpl));
  }
  /* 解决mac上快捷键不能使用问题 ]] */


  mainWindow.setMenuBarVisibility(false)
  if(debug) {
    mainWindow.loadURL('file://' + __dirname + '/index.html#/debug/1')
  } else {
    mainWindow.loadURL('file://' + __dirname + '/index.html#/debug/0')
  }



  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  mainWindow.on('close', onWinClose)


  // Emitted when the window is closed.
  mainWindow.on('closed', function(){
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  });

  mainWindow.webContents.on('crashed', function(events, killed){
    log.error('[main-process]render process crashed', killed)
    app.exit(0)
  })
  mainWindow.webContents.on('plugin-crashed', function(event, name, version) {
    log.error('[main-process]plugin process crashed', name, version)
  })
})

app.on('gpu-process-crashed', function(event, killed) {
  log.error('[main-process]gpu process crashed', killed)
})

ipcMain.on('asynchronous-message', function(event, arg){

  if(arg.type == 'openWindow') {
    let opts = arg.options
    let cookies = arg.cookies || [];
    let url

    opts.title = 'DJI Assistant 2 (Consumer Drones Series)'

    // Check whether window already exist
    let already_exist = false
    let windowset = BrowserWindow.getAllWindows()

    for(let i = windowset.length - 1; i >= 0; i--){
      let ele = windowset[i]
      if(ele && ele.webContents){

        let cur_url = ele.webContents.getURL()
        let go_url = ishttpURL(arg.url) ? arg.url : getRouteURL(arg.url)
        cur_url = ishttpURL(cur_url) ? cur_url : getRouteURL(cur_url)
        console.log('go_url',go_url)
        console.log('cur_url',cur_url)
        if (go_url == "fileupload.html"){
          if (cur_url.includes(go_url)){
            already_exist = true
            if (!ele.isVisible()){
              ele.show()
            }
            ele.focus()
            break
          }
        }

        if(cur_url == go_url){
          already_exist = true
          ele.focus()
          break
        }

      }
    }

    if(already_exist) return false

    if(ishttpURL(arg.url)){
      url = arg.url
      opts['node-integration'] = false
    }else{
      url = 'file://' + __dirname + '/' + arg.url
    }

    opts['web-preferences'] = {'plugins': true}

    console.log('opts:', opts)
    let win = new BrowserWindow(opts)

    win.webContents.on('crashed', function(events, killed){
      log.error('[main-process]render process crashed 2', killed)
      if(win && win.close) win.close()
    })

    win.webContents.on('plugin-crashed', function(event, name, version) {
      log.error('[main-process]plugin process crashed', name, version)
    })

    if(opts['needCloseConfirm']) win.on('close', onWinClose)

    if (arg.url == "fileupload.html"){
      win.on('close', function (evt) {
        if (!isAPPQuiting){
          evt.preventDefault()
          win.hide()
        }
        else{
          // 如果APP已经退出了，需要响应
        }
      })
    } else {
      win.on('closed', function(){
        win = null
      })
    }

    if(!debug) win.setMenu(null)
    win.setMenuBarVisibility(false)
    cookies.forEach(function (cookie) {
      session.defaultSession.cookies.set(cookie, (error, json) => {})
    });

    win.loadURL(url)
    win.show()
  }



  event.sender.send('asynchronous-reply', 'success')
})


ipcMain.on('set-locale', function(event, arg){
  locale = arg
});

ipcMain.on('open-devtools', function(event, arg){
  console.log('receive open-devtools event:',arg);
  if(!!arg){
    mainWindow.webContents.closeDevTools();
  }
});

ipcMain.on('close_win', function(event){
  console.log('close_win event');
  app.exit(0)
});
