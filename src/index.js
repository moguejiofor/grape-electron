// Modules to control application life and create native browser window
const electron = require('electron')
const path = require('path')

const {app, BrowserWindow} = electron

let mainWindow

const createWindow = () => {
  const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    'minHeight': 600,
    'minWidth': 800,
    width,
    height,
    webPreferences: {
      contextIsolation: true,
    }
  })

  mainWindow.loadURL('https://uebergrape.staging.chatgrape.com')

  if (process.env.NODE_ENV === 'development') mainWindow.webContents.openDevTools()

  mainWindow.on('close', e => {
    if (app.quitting) {
      mainWindow = null
    } else {
      e.preventDefault()
      mainWindow.hide()
    }
  });
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => app.quitting = true)

app.on('activate', () => {
  mainWindow.show()
})