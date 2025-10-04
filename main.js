// main.js
const isDev = require("electron-is-dev");
const path = require("path");
const url = require("url");
const checkForUpdatesAndNotify = require("./src/node/updates.js");
const interceptStreamProtocol = require("./src/node/protocol.js");
const {
  app,
  protocol,
  screen,
  ipcMain,
  shell,
  BrowserWindow,
} = require("electron");

// ----- scale knob (CSS zoom) -----
let SCALE = Number(process.env.WEBAMP_SCALE || 2); // 1, 1.5, 2, 3...

if (isDev) {
  require("electron-debug")({ devToolsMode: "detach" });
}

let mainWindow;
let logicalSize = { width: 0, height: 0 }; // CSS px (from preload)
let firstResizeDone = false;

const DRAG_CSS = `
  /* ===== Global drag surface ===== */
html, body { height: 100%; }
body {
  margin: 0;
  background: transparent;
  -webkit-app-region: drag;          /* default = drag */
  -webkit-user-select: none;
}

/* ===== Each window container can drag ===== */
#main-window,
#equalizer-window,
#playlist-window,
#title-bar,
.equalizer-top.title-bar,
.playlist-top,
.playlist-top-left,
.playlist-top-left-spacer,
.playlist-top-left-fill,
.playlist-top-title,
.playlist-top-right-spacer,
.playlist-top-right-fill,
.playlist-top-right,
.playlist-middle,
.playlist-middle-left,
.playlist-bottom,
.playlist-bottom-left,
.playlist-bottom-center,
.playlist-bottom-right {
  -webkit-app-region: drag;
}

/* ===== Everything interactive must NOT drag ===== */
/* generic interactive elements */
button, a, input, textarea, select, canvas, video, audio,
[role="button"], [contenteditable],
/* anything with a title is probably a control in this UI */
div[title], a[title], input[title], canvas[title],
/* transport + main window controls */
#option, #minimize, #shade, #close,
#button-o, #button-a, #button-i, #button-d, #button-v,
#play-pause, #work-indicator,
#position, #volume, #balance, #visualizer,
#previous, #play, #pause, #stop, #next, #eject,
#shuffle, #repeat, #about,
/* “windows” toggles */
#windows, #equalizer-button, #playlist-button,
/* equalizer controls */
#equalizer-close, #equalizer-shade, #on, #auto,
#eqGraph, .band, .rc-slider, .rc-slider-rail, .rc-slider-track,
.rc-slider-step, .rc-slider-handle, .rc-slider-mark,
/* playlist: list area, scrollbar, action buttons, menus, resize target */
#playlist-window .playlist-tracks,
#playlist-window .playlist-track-titles,
#playlist-window .playlist-track-durations,
#playlist-window .playlist-scrollbar,
#playlist-window .playlist-scrollbar-handle,
#playlist-window .playlist-action-buttons,
#playlist-window .playlist-previous-button,
#playlist-window .playlist-play-button,
#playlist-window .playlist-pause-button,
#playlist-window .playlist-stop-button,
#playlist-window .playlist-next-button,
#playlist-window .playlist-eject-button,
#playlist-window #playlist-shade-button,
#playlist-window #playlist-close-button,
#playlist-window #playlist-list-menu,
#playlist-window #playlist-scroll-up-button,
#playlist-window #playlist-scroll-down-button,
#playlist-window #playlist-resize-target,
#playlist-window .track-cell,
#playlist-window .mini-time,
#playlist-add-menu, #playlist-remove-menu,
#playlist-selection-menu, #playlist-misc-menu,
.no-drag {
  -webkit-app-region: no-drag !important;
  pointer-events: auto !important;
}

/* ===== Safety: ensure the actual click-zones are not transparent to hit-tests ===== */
/* if you find “empty” areas aren’t draggable on Windows, give a hairline alpha background */
#main-window, #equalizer-window, #playlist-window {
  background-color: rgba(0,0,0,0.01); /* harmless; keeps hit-testing alive on fully transparent skins */
}
`;

function applyZoom() {
  if (!mainWindow) return;
  mainWindow.webContents.setZoomFactor(SCALE);
  // lock pinch-zoom so UI scale stays consistent
  mainWindow.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {});
}

function applyScaledSize() {
  if (!mainWindow || !logicalSize.width || !logicalSize.height) return;
  const w = Math.max(1, Math.round(logicalSize.width * SCALE));
  const h = Math.max(1, Math.round(logicalSize.height * SCALE));
  const wasResizable = mainWindow.isResizable();
  mainWindow.setResizable(true); // nudge some WMs to accept the change
  mainWindow.setContentSize(w, h);
  mainWindow.setResizable(wasResizable);
  if (!firstResizeDone) {
    firstResizeDone = true;
    mainWindow.show(); // show only after correct size is applied
    checkForUpdatesAndNotify();
  }
}

function createWindow() {
  protocol.interceptStreamProtocol("file", interceptStreamProtocol(), (err) => {
    if (err) console.error("Failed to register protocol");
  });

  // Start tiny & hidden; content-size is what counts because of useContentSize
  mainWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    transparent: true,
    frame: false,
    hasShadow: true,
    show: false,
    resizable: false,
    movable: true,
    fullscreenable: false,
    useContentSize: true,
    backgroundColor: "#00000000",
    icon: path.join(__dirname, "res/icon.png"),
    webPreferences: {
      nodeIntegration: false,
      preload: path.join(__dirname, "src/preload/index.js"),
      // don't set zoomFactor here; we control it via applyZoom()
    },
  });

  // Apply zoom ASAP (before navigation) so first paint uses desired scale
  applyZoom();

  // Helpful: pipe renderer console to main for quick debugging
  mainWindow.webContents.on(
    "console-message",
    (_e, level, message, line, sourceId) => {
      console.log(`[renderer][${level}] ${message} (${sourceId}:${line})`);
    }
  );

  // Inject drag CSS early
  mainWindow.webContents.on("dom-ready", () => {
    mainWindow.webContents.insertCSS(DRAG_CSS);
  });

  // Some platforms reset zoom on load; reassert and (if we know size) re-apply
  mainWindow.webContents.on("did-finish-load", () => {
    applyZoom();
    if (logicalSize.width && logicalSize.height) applyScaledSize();
  });

  // We deliberately do NOT show in ready-to-show; we show after first resize
  mainWindow.once("ready-to-show", () => {
    // updater still runs; window will be shown from applyScaledSize()
    checkForUpdatesAndNotify();
  });

  // Size updates from preload (CSS px)
  ipcMain.on("resize-to-webamp", (_evt, { width, height }) => {
    logicalSize = { width, height };
    applyScaledSize();
    // console.log("resize-to-webamp (CSS):", logicalSize, "SCALE:", SCALE);
  });

  // (Optional) allow runtime scale change (e.g., via menu/shortcut)
  ipcMain.handle("set-scale", (_evt, nextScale) => {
    const s = Number(nextScale);
    if (!Number.isFinite(s) || s <= 0) return { ok: false };
    SCALE = s;
    applyZoom();
    applyScaledSize();
    return { ok: true, scale: SCALE };
  });

  // IPC you already had
  ipcMain.on("minimize", () => mainWindow.minimize());
  ipcMain.on("close", () => mainWindow.close());
  ipcMain.on("setThumbnailClip", (_e, clip) =>
    mainWindow.setThumbnailClip(clip)
  );
  ipcMain.handle("getBounds", () => mainWindow.getBounds());
  ipcMain.handle("getCursorScreenPoint", () => screen.getCursorScreenPoint());

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.loadURL(
    url.format({
      pathname: "./dist/index.html",
      protocol: "file:",
      slashes: true,
    })
  );
}

// Linux transparency quirk handling unchanged
if (process.platform === "linux") {
  app.disableHardwareAcceleration();
  app.on("ready", () => setTimeout(createWindow, 100));
} else {
  app.on("ready", createWindow);
}

// Security: block in-app nav & popups
app.on("web-contents-created", (_event, contents) => {
  contents.on("will-navigate", (e) => e.preventDefault());
  contents.on("new-window", (e, navigationUrl) => {
    const parsed = url.parse(navigationUrl);
    if (parsed.protocol === "file:" || parsed.protocol === "chrome-devtools:")
      return;
    e.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (mainWindow === null) createWindow();
});
