import log from 'electron-log'

import loadApp from './loadApp'
import { urls } from '../constants/pages'

const responseTimeout = 10000

export default function handleOffline(url, win) {
  function offline(e, code) {
    if (code === -3) return // Redirect
    loadApp(urls.connectionError)
  }
  let response = false
  const { webContents } = win

  webContents.once('did-fail-load', (e, code) => {
    log.info('did-fail-load', e, code)
    offline(e, code)
  })

  webContents.once('did-finish-load', () => {
    log.info('did-finish-load')
    response = true
  })

  if (url) win.loadURL(url)

  setTimeout(() => {
    if (!response) {
      log.warn('setTimeout 10000 offline')
      offline()
    }
    response = false
  }, responseTimeout)
}
