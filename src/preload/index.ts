import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { Api } from './api'

const api: Api = {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  setApiKey: (key) => ipcRenderer.invoke('settings:setApiKey', key),

  listDecks: () => ipcRenderer.invoke('decks:list'),
  getDeck: (id) => ipcRenderer.invoke('decks:get', id),
  saveDeck: (deck) => ipcRenderer.invoke('decks:save', deck),
  deleteDeck: (id) => ipcRenderer.invoke('decks:delete', id),
  createDeck: (opts) => ipcRenderer.invoke('decks:create', opts),

  generate: (req) => ipcRenderer.invoke('ai:generate', req),
  cancel: (requestId) => ipcRenderer.invoke('ai:cancel', requestId),
  onGenerateEvent: (cb) => {
    const listener = (_e: IpcRendererEvent, ev: Parameters<typeof cb>[0]): void => cb(ev)
    ipcRenderer.on('ai:event', listener)
    return () => ipcRenderer.removeListener('ai:event', listener)
  },

  present: (id, startIndex) => ipcRenderer.invoke('deck:present', id, startIndex),
  openInBrowser: (id) => ipcRenderer.invoke('deck:openInBrowser', id),
  exportHtml: (id) => ipcRenderer.invoke('deck:exportHtml', id),
  exportPdf: (id) => ipcRenderer.invoke('deck:exportPdf', id),
  showFile: (path) => ipcRenderer.invoke('shell:showFile', path),

  onMenu: (cb) => {
    const listener = (_e: IpcRendererEvent, action: string): void => cb(action)
    ipcRenderer.on('menu', listener)
    return () => ipcRenderer.removeListener('menu', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
