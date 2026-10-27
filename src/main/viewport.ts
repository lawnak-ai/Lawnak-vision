import type { BrowserWindow } from 'electron'

/**
 * Gives a hidden window's page an exact viewport, in CSS pixels, whatever the screen size.
 * A window can't be larger than the screen, so a 720x1280 slide or a 1920x1080 video frame
 * would be cut off on a small or scaled screen; the DevTools device emulation lifts that limit.
 * Call it after the page has loaded (and again after each load).
 */
export async function setViewport(win: BrowserWindow, width: number, height: number): Promise<void> {
  const dbg = win.webContents.debugger
  if (!dbg.isAttached()) dbg.attach('1.3')
  // deviceScaleFactor 0 keeps the screen's own scale, so text stays sharp.
  await dbg.sendCommand('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 0, mobile: false })
}
