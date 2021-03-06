// eslint-disable-next-line import/no-extraneous-dependencies
import {
  app,
  BrowserWindow,
  ipcMain,
  nativeImage,
  systemPreferences,
  Menu as ElectronMenu,
} from 'electron'
import storage from 'electron-json-storage'
import contextMenu from 'electron-context-menu'
import windowStateKeeper from 'electron-window-state'
import { defineMessages } from 'react-intl'
import log from 'electron-log'
import path from 'path'
import updateElectronApp from 'update-electron-app'

import { isNotificationSupported, isWindows, isOSX } from './utils'
import env from './env'
import state from './state'
import loadApp from './loadApp'
import loadURL from './loadURL'
import { urls } from '../constants/pages'
import * as imagePaths from '../constants/images'
import { handle as handleProtocol } from './protocolHandler'

const messages = defineMessages({
  saveImageTo: {
    id: 'saveImageTo',
    defaultMessage: 'Save Image to…',
  },
  windowsBadgeIconTitle: {
    id: 'windowsBadgeIconTitle',
    defaultMessage:
      '{amount} unread {amount, plural, one {channel} other {channels}}',
  },
})

export default () => {
  // eslint-disable-next-line global-require
  const { formatMessage } = require('../i18n')
  contextMenu({
    append: params => [
      {
        label: formatMessage(messages.saveImageTo),
        visible: params.mediaType === 'image',
        click: () => {
          state.mainWindow.webContents.downloadURL(params.srcURL)
        },
      },
    ],
  })

  // Preserver of the window size and position between app launches.
  state.dimensions = windowStateKeeper({
    defaultWidth: 1075,
    defaultHeight: 1000,
  })

  // figure out if we start in background
  const autostart = process.argv.indexOf('--autostart') !== -1
  const startInBackground = autostart && env.startInBackgroundWhenAutostarted
  console.log(`autostart: ${autostart}`) // eslint-disable-line no-console
  console.log(`startInBackground: ${startInBackground}`) // eslint-disable-line no-console

  if (isWindows() || process.mas) {
    updateElectronApp({
      updateInterval: '5 minutes',
      logger: log,
    })
  }

  storage.get('lastUrl', (err, data) => {
    state.prefs = Object.assign({}, state.dimensions, {
      webPreferences: {
        nodeIntegration: false,
        nodeIntegrationInWorker: false,
        contextIsolation: false,
        allowDisplayingInsecureContent: true,
        preload: path.join(__dirname, './preload/preloadMain.js'),
      },
      show: !startInBackground,
      icon: imagePaths.icon,
    })

    // workaround to solve problem:
    // 1. move grape window to second screen
    // 2. quit grape -> x or y might be negative now in windw-state.json
    // 3. unplug monitor
    // 4. start Grape again
    // see GRAPE-14546
    if (state.dimensions.x < 0 || state.dimensions.y < 0) {
      state.prefs.x = 0
      state.prefs.y = 0
    }

    // set global to be accessible from webpage
    global.isNotificationSupported = isNotificationSupported()
    global.host = state.host
    global.grapeHost = env.host
    global.chooseDomainDisabled = env.chooseDomainDisabled

    state.mainWindow = new BrowserWindow(state.prefs)
    if (state.dimensions.isMaximized && state.prefs.show) {
      state.mainWindow.maximize()
    }

    // eslint-disable-next-line global-require
    const menu = require('./menu')

    const Menu = ElectronMenu
    state.Menu = ElectronMenu
    Menu.setApplicationMenu(Menu.buildFromTemplate(menu.main))

    const isProtocolHandled = handleProtocol()

    if (isProtocolHandled) return

    let lastUrl

    if (data) {
      // use host from storage only if env.chooseDomainDisabled is false
      // otherwise it overrides the one from graperc
      if (!env.chooseDomainDisabled && data.host) {
        state.host = data.host
        global.host = data.host
      }
      if (data.url) lastUrl = data.url
    }

    if (lastUrl) {
      loadApp(lastUrl)
    } else if (env.chooseDomainDisabled) {
      loadApp()
    } else {
      loadApp(urls[env.name === 'test' ? 'test' : 'domain'])
    }
  })

  app.on('will-finish-launching', () => {
    log.info('will-finish-launching')
  })

  app.on('window-all-closed', () => {
    log.info('window-all-closed')
  })

  app.on('before-quit', () => {
    log.info('before-quit')
    state.preventClose = false
  })

  app.on('quit', (e, exitCode) => {
    log.info('quit', exitCode)
  })

  app.on('open-file', (e, path) => {
    log.info('open-file', path)
  })

  app.on('continue-activity', (e, type, userInfo) => {
    log.info('continue-activity', type, userInfo)
  })

  app.on('will-continue-activity', (e, type) => {
    log.info('will-continue-activity', type)
  })

  app.on('continue-activity-error', (e, type, error) => {
    log.info('continue-activity-error', type, error)
  })

  app.on('activity-was-continued', (e, type, userInfo) => {
    log.info('activity-was-continued', type, userInfo)
  })

  app.on('update-activity-state', (e, type, userInfo) => {
    log.info('update-activity-state', type, userInfo)
  })

  app.on('new-window-for-tab', () => {
    log.info('new-window-for-tab')
  })

  app.on('browser-window-created', () => {
    log.info('browser-window-created')
  })

  app.on('web-contents-created', () => {
    log.info('web-contents-created')
  })

  app.on(
    'select-client-certificate',
    (e, webContents, url, certificateList, callback) => {
      log.info('select-client-certificate', url, certificateList, callback)
    },
  )

  app.on('login', (e, webContents, request, authInfo, callback) => {
    log.info('login', request, authInfo, callback)
  })

  app.on('gpu-process-crashed', (e, killed) => {
    log.info('gpu-process-crashed', killed)
  })

  app.on('accessibility-support-changed', (e, accessibilitySupportEnabled) => {
    log.info('accessibility-support-changed', accessibilitySupportEnabled)
  })

  app.on('session-created', session => {
    log.info('session-created', session)
  })

  app.on('remote-require', (e, webContents, moduleName) => {
    log.info('remote-require', moduleName)
  })

  app.on('remote-get-global', (e, webContents, globalName) => {
    log.info('remote-get-global', globalName)
  })

  app.on('remote-get-builtin', (e, webContents, moduleName) => {
    log.info('remote-get-global', moduleName)
  })

  app.on('remote-get-current-window', () => {
    log.info('remote-get-current-window')
  })

  app.on('remote-get-current-web-contents', () => {
    log.info('remote-get-current-web-contents')
  })

  app.on('remote-get-guest-web-contents', () => {
    log.info('remote-get-guest-web-contents')
  })

  if (isOSX()) {
    systemPreferences.subscribeNotification(
      'AppleInterfaceThemeChangedNotification',
      () => {
        const icon =
          imagePaths[
            systemPreferences.isDarkMode() ? 'trayWhiteIcon' : 'trayIcon'
          ]
        state.trayIcon.setImage(icon)
      },
    )
  }

  ipcMain.on('onConnectionEvent', (e, name, text) => {
    log.warn('on-connection-event', name, text || '')
  })

  ipcMain.on('addBadge', (e, badge) => {
    if (isWindows()) {
      state.mainWindow.setOverlayIcon(
        imagePaths.statusBarOverlay,
        formatMessage(messages.windowsBadgeIconTitle, {
          amount: parseInt(badge, 10),
        }),
      )
    } else {
      state.trayIcon.setImage(imagePaths.trayBlueIcon)
      if (app.dock) app.dock.setBadge(String(badge))
    }
  })

  ipcMain.on('removeBadge', () => {
    const { trayIcon, mainWindow } = state
    if (isWindows()) {
      mainWindow.setOverlayIcon(nativeImage.createEmpty(), '')
    }

    if (isOSX()) {
      const icon =
        imagePaths[
          systemPreferences.isDarkMode() ? 'trayWhiteIcon' : 'trayIcon'
        ]
      trayIcon.setImage(icon)
      if (app.dock) app.dock.setBadge('')
    }
  })

  ipcMain.on('showNotification', (e, notification) => {
    const { trayIcon, mainWindow } = state
    trayIcon.displayBalloon({
      icon: imagePaths.icon,
      title: notification.title,
      content: notification.message,
    })
    trayIcon.once('balloon-click', () => {
      if (notification.event) {
        e.sender.send(String(notification.event))
        return
      }
      e.sender.send(String(notification.events.onClick))
    })
    trayIcon.once('balloon-closed', () => {
      if (notification.event) return
      e.sender.send(String(notification.events.onClose))
    })

    mainWindow.once('focus', () => {
      mainWindow.flashFrame(false)
    })
    mainWindow.flashFrame(true)
  })

  ipcMain.on('domainChange', (e, domain) => {
    state.host.domain = domain
    global.host.domain = domain
    loadApp()
  })

  ipcMain.on('loadChat', () => {
    loadURL(state.getUrl())
  })
}
