const { app, ipcMain, Tray, BrowserWindow } = require('electron')
const { attach, detach, refresh } = require("electron-as-wallpaper");
const { getDocumentsFolder } = require('platform-folders');
const trayWindow = require("electron-tray-window");
const app_package = require('./package.json');
const ffmpeg = require('fluent-ffmpeg');
const path = require("path");
const fs = require("fs");

const WallpaperDir = `${getDocumentsFolder()}\\PickWallpaper`;
console.log(WallpaperDir);

if (!fs.existsSync(`${WallpaperDir}\\wallpapers`)) {
    fs.mkdirSync(`${WallpaperDir}\\wallpapers`, { recursive: true });

    if (app.isPackaged) {
        app.setLoginItemSettings({
            openAtLogin: true,
            args: ["--openAsHidden"],
        });
    }
}

const express = require('express');
let expressApp = express();

expressApp.use(express.static(`${WallpaperDir}\\wallpapers`));

expressApp.listen(5438);

let appName = "PickWallPaper"

let MainWindow
let TrayBrowser
let WallpaperBrowser

let WallPaperStatus = { 'type': null }

function createMainWindow() {
    if (!MainWindow) {
        MainWindow = new BrowserWindow({
            width: 1280,
            height: 720,
            resizable: false,
            transparent: true,
            frame: false,
            show: false,
            autoHideMenuBar: true,
            icon: "icons/icon_white.png",

            webPreferences: {
                preload: path.join(__dirname, 'window/main/index.js')
            }
        })
        MainWindow.loadFile('window/main/index.html').then(() => {
        })
        MainWindow.on("closed", () => {
            MainWindow = undefined;
        });
        MainWindow.on("ready-to-show", () => {
            MainWindow.show();
        });
    }
}

function createTray() {
    TrayBrowser = new BrowserWindow({
        width: 250,
        height: 250,
        resizable: false,
        transparent: true,
        frame: false,
        show: false,
        autoHideMenuBar: true,
        skipTaskbar: true,

        webPreferences: {
            preload: path.join(__dirname, 'window/tray/index.js')
        }
    })
    TrayBrowser.loadFile('window/tray/index.html').then(() => {
    })
    TrayBrowser.on("ready-to-show", () => {
        TrayBrowser.show();
    });

    let tray = new Tray(path.join(__dirname, 'icons/icon_white.png'));
    tray.setToolTip(appName)
    trayWindow.setOptions({ tray: tray, window: TrayBrowser })
}

function createWallpaper() {
    WallpaperBrowser = new BrowserWindow({
        transparent: true,
        enableLargerThanScreen: true,
        autoHideMenuBar: true,
        show: false,
        frame: false,
        webPreferences: {
            webSecurity: false,
            nodeIntegration: true,
            allowRunningInsecureContent: false,
            webviewTag: true,
            contextIsolation: false,
            backgroundThrottling: false,

            preload: path.join(__dirname, 'window/wallpaper/index.js')
        },
    })
    WallpaperBrowser.on("closed", () => {
        WallpaperBrowser = undefined;
    });
    WallpaperBrowser.on("ready-to-show", () => {
        WallpaperBrowser.show()
    });
    WallpaperBrowser.setFullScreen(true);
    WallpaperBrowser.setSimpleFullScreen(true);
    // WallpaperBrowser.webContents.openDevTools();
    console.log(WallpaperBrowser)
    attach(WallpaperBrowser)
}

function setWallpaper(type, title, path, extname, options) {
    if (!WallpaperBrowser) {
        createWallpaper();
    }
    ipcMain.once('wallpaper-type', event => {
        event.returnValue = WallPaperStatus['type']
        MainWindow.webContents.send('wallpaper', ['ready'])
    })
    const src = `${path}/wallpaper.${extname}`
    console.log(src)
    switch (type) {
        // 影片
        case "video":
            WallpaperBrowser.loadURL(src).then(() => {
            })
            WallPaperStatus['type'] = 'video'
            WallPaperStatus['paused'] = false
            WallPaperStatus['volume'] = load_config()['wallpaper']['volume'] || 1
            break
        // 音樂
        case "audio":
            WallpaperBrowser.loadURL(src).then(() => {
            })
            WallPaperStatus['type'] = 'audio'
            WallPaperStatus['paused'] = false
            WallPaperStatus['volume'] = load_config()['wallpaper']['volume'] || 1
            break
        // 圖片
        case "image":
            WallpaperBrowser.loadURL(src).then(() => {
            })
            WallPaperStatus['type'] = 'image'
            break
        // // 網址
        // case "url":
        //     WallpaperBrowser.loadURL(src).then(() => {
        //     })
        //     break
        // // 文字
        // case "text":
        //     WallpaperBrowser.loadFile('window/wallpaper/index.html').then(() => {
        //     })
        //     break
    }
    WallPaperStatus['title'] = title
    WallPaperStatus['src'] = src
    WallPaperStatus['attached'] = true
    WallPaperStatus['options'] = options
    status_changed()
    change_config((config) => {
        config['wallpaper']['on_start'] = path
        return config
    })
}

function setWallpaperByPath(path) {
    if (fs.existsSync(path)) {
        const info = JSON.parse(fs.readFileSync(`${path}/info.json`).toString())
        setWallpaper(info['type'], info['title'], path, info['extname'], info['options'])
    }
}

function load_config() {
    let path = `${WallpaperDir}\\config.json`
    let data
    if (!fs.existsSync(path)) {
        let default_config = {
            'wallpaper': {
                'on_start': null,
                'volume': 1
            }
        }
        fs.writeFile(path, JSON.stringify(default_config), (err) => {
            if (err) throw err;
            console.log('File is created successfully.');
        });
        data = default_config
    } else {
        data = JSON.parse(fs.readFileSync(path).toString())
    }
    return data
}

function change_config(change) {
    fs.writeFileSync(`${WallpaperDir}\\config.json`, JSON.stringify(change(load_config())));
}

function status_changed() {
    MainWindow.webContents.send('wallpaper', ['status', WallPaperStatus])
}

app.whenReady().then(function () {
    createTray();
    if (process.argv.indexOf("--openAsHidden") < 0) {
        createMainWindow();
    }
    // new Notification('PickWallpaper準備就緒!', {
    //     body: '要開啟PickWallpaper，請從您的系統托盤打開它',
    // })
    const config = load_config()
    if (config['wallpaper']['on_start']) {
        setWallpaperByPath(config['wallpaper']['on_start'])
    }
})

ipcMain.on("system", (event, args) => {
    switch (args[0]) {
        case 'set':
            switch (args[1]) {
                case 'open-at-login':
                    if (app.isPackaged) {
                        app.setLoginItemSettings({
                            openAtLogin: args[2],
                            args: ["--openAsHidden"],
                        });
                    }
                    break
            }
            break
        case 'get':
            switch (args[1]) {

            }
            break
    }
})

ipcMain.on("app-info", (event) => {
    event.returnValue = { 'name': appName, version: app_package.version }
})

ipcMain.on("get-static", (event, name) => {
    let file_path = path.join(__dirname, 'files', name)
    if (fs.existsSync(file_path)) {
        event.returnValue = fs.readFileSync(file_path).toString()
    } else {
        event.returnValue = undefined
    }
})

ipcMain.on("get-static-path", (event, name) => {
    let file_path = path.join(__dirname, 'files', name)
    if (fs.existsSync(file_path)) {
        event.returnValue = file_path.replaceAll('\\', '\\\\')
    } else {
        event.returnValue = undefined
    }
})

ipcMain.on("get-wallpapers-path", (event) => {
    if (!fs.existsSync(`${WallpaperDir}\\wallpapers`)) {
        fs.mkdirSync(`${WallpaperDir}\\wallpapers`, { recursive: true });
    }
    event.returnValue = `${WallpaperDir}\\wallpapers`
})

ipcMain.on("mainWindow", function (_event, args) {
    const _window = BrowserWindow.getFocusedWindow();
    switch (args) {
        case "minimize":
            _window.minimize();
            break
        case "close":
            _window.close();
            break
        case "show":
            createMainWindow()
            break
    }
});

ipcMain.on("wallpaper", function (_event, args) {
    console.log(args)
    switch (args[0]) {
        case "set":
            setWallpaperByPath(args[1])
            break
        case "add":
            console.log(args[1])
            try {
                if (args[1]['type'] === 'group') {

                } else {
                    if (fs.existsSync(args[1]['path'])) {
                        const new_path = `${WallpaperDir}\\wallpapers\\${Date.now()}`
                        fs.mkdirSync(new_path, { recursive: true });
                        fs.copyFileSync(args[1]['path'], `${new_path}\\wallpaper.${args[1]['extname']}`)

                        const data = {
                            "title": args[1]['title'],
                            "owner": "",
                            "created": Date.now(),
                            "type": args[1]['type'].split('/')[0],
                            "extname": args[1]['extname'],
                            'options': {
                                'no_progress': args[1]['options']['no_progress'],
                                'mute': args[1]['options']['mute'],
                                'snow': args[1]['options']['snow'],
                                'vis_top': args[1]['options']['vis_top'],
                                'vis_bottom': args[1]['options']['vis_bottom'],
                                'background_scale': args[1]['options']['background_scale'],
                            }
                        }
                        console.log(data)
                        let ffmpeg_progress = ffmpeg(args[1]['path'])
                        switch (args[1]['type'].split('/')[0]) {
                            case "image":
                                ffmpeg_progress.setFfmpegPath(path.join(__dirname, 'ffmpeg/ffmpeg.exe'))
                                ffmpeg_progress.size('576x?')
                                ffmpeg_progress.save(`${new_path}\\preview.jpg`)
                                ffmpeg_progress.on('end', () => {
                                    MainWindow.webContents.send('wallpaper-add-reply', { 'status': true })
                                });
                                break
                            case "video":
                                // ffmpeg(args[1]['path']).setFfmpegPath(path.join(__dirname, 'ffmpeg/ffmpeg.exe')).screenshots({
                                //     // Will take screens at 20%, 40%, 60% and 80% of the video
                                //     count: 8,
                                //     folder: `${new_path}\\previews`,
                                //     filename: '%i.jpg',
                                //     size: '576x?',
                                // }).on('end', () => {
                                //     MainWindow.webContents.send('wallpaper-add-reply', {'status': true})
                                // });
                                ffmpeg_progress.setFfmpegPath(path.join(__dirname, 'ffmpeg/ffmpeg.exe'))
                                ffmpeg_progress.screenshots({
                                    // Will take screens at 20%, 40%, 60% and 80% of the video
                                    count: 1,
                                    folder: `${new_path}`,
                                    filename: 'preview.jpg',
                                    size: '576x?',
                                })
                                ffmpeg_progress.on('end', () => {
                                    MainWindow.webContents.send('wallpaper-add-reply', { 'status': true })
                                });
                                break
                            case "audio":
                                data['options']['background'] = {
                                    'extname': args[1]['background']['extname']
                                }
                                fs.copyFile(args[1]['background']['path'], `${new_path}\\background.${args[1]['background']['extname']}`, (err) => {
                                    if (err) {
                                        console.log("Error Found:", err);
                                    }
                                    ffmpeg_progress = ffmpeg(args[1]['background']['path'])
                                    ffmpeg_progress.setFfmpegPath(path.join(__dirname, 'ffmpeg/ffmpeg.exe'))
                                    ffmpeg_progress.size('576x?')
                                    ffmpeg_progress.save(`${new_path}\\preview.jpg`)
                                    ffmpeg_progress.on('end', () => {
                                        MainWindow.webContents.send('wallpaper-add-reply', { 'status': true })
                                    })
                                })
                                break
                        }
                        fs.writeFile(`${new_path}\\info.json`, JSON.stringify(data), function (err) {
                            if (err) throw err;
                        });
                    }
                }
            } catch (err) {
                console.error(err)
            }
            break
        case "delete":
            fs.rmSync(args[1], { recursive: true, force: true });
            MainWindow.webContents.send('wallpaper-delete-reply', { 'status': true })
            break
        case "edit_options":
            let data = JSON.parse(fs.readFileSync(`${args[1]}\\info.json`).toString())
            data['options'] = args[2]
            fs.writeFileSync(`${args[1]}\\info.json`, JSON.stringify(data));
            console.log(data)
            MainWindow.webContents.send('wallpaper-edit-options-reply', { 'status': true })
            break
        case "play-pause":
            WallPaperStatus['paused'] = !WallPaperStatus['paused']
            status_changed()
            console.log(WallPaperStatus['paused'])
            WallpaperBrowser.webContents.send('play-pause', WallPaperStatus['paused']);
            break
        case "status":
            _event.returnValue = WallPaperStatus
            break
        case "progress":
            if (MainWindow) {
                MainWindow.webContents.send('wallpaper', ['progress', args[1]])
            }
            break
        case "set-progress":
            console.log(args[1])
            WallpaperBrowser.webContents.send('set-progress', args[1])
            break
        case "volume":
            change_config((config) => {
                config['wallpaper']['volume'] = args[1]
                return config
            })
            WallPaperStatus['volume'] = args[1]
            status_changed()
            WallpaperBrowser.webContents.send('volume', args[1])
            break
        case "mute":
            WallPaperStatus['muted'] = !WallPaperStatus['muted']
            status_changed()
            console.log(WallPaperStatus['muted'])
            WallpaperBrowser.webContents.send('muted', WallPaperStatus['muted'])
            break
        // 窗口動作
        case "refresh":
            refresh()
            break
        case "attach-detach":
            if (WallPaperStatus['attached']) {
                detach(WallpaperBrowser)
            } else {
                attach(WallpaperBrowser)
            }
            WallPaperStatus['attached'] = !WallPaperStatus['attached']
            status_changed()
            break
        case "remove":
            change_config((config) => {
                config['wallpaper']['on_start'] = null
                return config
            })
            WallPaperStatus = { 'type': null }
            status_changed()
            WallpaperBrowser.close()
            break
        case "get-all":
            fs.readdir(`${WallpaperDir}\\wallpapers`, { withFileTypes: true }, (error, files) => {
                _event.returnValue = files.filter((item) => item.isDirectory()).map((item) => `${WallpaperDir}\\wallpapers\\${item.name}`.replaceAll('\\', '/'))
            });
            break
    }
});

ipcMain.on("app", function (_event, args) {
    switch (args) {
        case "leave":
            // app.quit()
            app.exit()
            break
    }
});

ipcMain.on("open-f-explorer", (event, path) => {
    console.log(path)
    require('child_process').exec(`explorer "${path}"`);
})

app.on('web-contents-created', (event, webContents) => {
    webContents.on('select-bluetooth-device', (event, devices, callback) => {
        // Prevent default behavior
        event.preventDefault();
        // Cancel the request
        callback('');
    });
});
