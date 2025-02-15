const {ipcRenderer} = require("electron");

window.addEventListener("DOMContentLoaded", async () => {
    //先把css導進去
    {
        let googleFontIconStyle = document.createElement('style')
        console.log(ipcRenderer.sendSync('get-static-path', 'googleFontIcon.woff2'))
        googleFontIconStyle.innerHTML = `
@font-face {
  font-family: 'Material Symbols Outlined';
  font-style: normal;
  font-weight: 400;
  src: url(file:///${ipcRenderer.sendSync('get-static-path', 'googleFontIcon.woff2')}) format('woff2');}
.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
}`
        document.querySelector('body').appendChild(googleFontIconStyle)
    }
    {
        document.querySelector("#open-main-window").addEventListener('click', () => {
            ipcRenderer.send("mainWindow", "show")
        })
        document.querySelector("#play-pause").addEventListener('click', () => {
            ipcRenderer.send("wallpaper", ["play-pause"]);
        })
        document.querySelector("#refresh").addEventListener('click', () => {
            ipcRenderer.send("wallpaper", ["refresh"]);
        })
        document.querySelector("#info").addEventListener('click', () => {
            ipcRenderer.send("mainWindow", "to", "info");
        })
        document.querySelector("#leave").addEventListener('click', () => {
            ipcRenderer.send("app", "leave");
        })

        document.querySelectorAll('a[href^="http"]').forEach(e => {
            e.addEventListener('click', function (event) {
                event.preventDefault();
                ipcRenderer.send("open-web", this.href);
            });
        })
    }

    {
        document.querySelectorAll("*[appname]").forEach(e => {
            e.innerHTML = ipcRenderer.sendSync('app-info').name
        })
        document.querySelectorAll("*[appversion]").forEach(e => {
            e.innerHTML = ipcRenderer.sendSync('app-info').version
        })
    }
    {
        ipcRenderer.send('trayResize', document.querySelector('body').offsetHeight)
    }
});