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
    // 關於app
    {
        let appInfo = ipcRenderer.sendSync('app-info')
        document.querySelectorAll("*[appname]").forEach(e => {
            e.innerHTML = appInfo.name
        })
        document.querySelectorAll("*[appversion]").forEach(e => {
            e.innerHTML = appInfo.version
        })
    }

    // 窗口的事件
    {
        document.querySelector("#close").addEventListener('click', () => {
            document.querySelector('body').style.animation = '.6s cubic-bezier(0, 1, .5, 1) 0s 1 opacityOutAndScaleDown'
            setTimeout(() => {
                ipcRenderer.send("mainWindow", "close")
            }, 500)
        })
        document.querySelector("#close").addEventListener('contextmenu', () => {
            document.querySelector('body').style.animation = '.6s cubic-bezier(0, 1, .5, 1) 0s 1 scaleYDown'
            setTimeout(() => {
                ipcRenderer.send("app", "leave");
            }, 500)
        })
        document.querySelector("#minisize").addEventListener('click', () => {
            document.querySelector('body').style.animation = '.6s cubic-bezier(0, 1, .5, 1) 0s 1 opacityOutAndScaleDownAndTranslateYDown'
            setTimeout(() => {
                ipcRenderer.send("mainWindow", "minimize")
                document.querySelector('body').style.animation = ''
            }, 500)
        })
        window.addEventListener("blur", (function () {
                document.querySelector('body').style.scale = '.99'
                document.querySelector('body').style.opacity = '.9'
            }
        ))
        window.addEventListener("focus", (function () {
                document.querySelector('body').style.scale = '1'
                document.querySelector('body').style.opacity = '1'
            }
        ))
    }

    {
        function isHidden(elem) {
            const styles = window.getComputedStyle(elem)
            return styles.display === 'none' || styles.visibility === 'hidden'
        }

        function setWidth(el, val) {
            if (typeof val === 'function') val = val();
            if (typeof val === 'string') el.style.width = val;
            else el.style.width = val + 'px';
        }

        function setHeight(el, val) {
            if (typeof val === 'function') val = val();
            if (typeof val === 'string') el.style.height = val;
            else el.style.height = val + 'px';
        }

        function loadTEXT(path, success, error) {
            const xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        success(xhr.responseText);
                    } else {
                        error(xhr);
                    }
                }
            };
            xhr.open('GET', path, true);
            xhr.send();
        }

        function resize_cards() {
            document.querySelectorAll('.wallpaper-card').forEach((e) => {
                setHeight(e, e.offsetWidth * 0.8)
                setHeight(e.querySelector('.wallpaper-card-image'), e.offsetHeight * 0.6)
                // $(e).find('.pvi-d-l').width($(e).width() * 0.1)
                // $(e).find('.pvi-d-l').height($(e).width() * 0.1)
                e.querySelector('.wallpaper-card-data-title').style.fontSize = `${e.offsetHeight * 0.08}px`
                e.querySelector('.wallpaper-card-data-owner').style.fontSize = `${e.offsetHeight * 0.05}px`
                e.querySelectorAll('.wallpaper-card-data-info').forEach((f) => {
                    f.style.fontSize = `${e.offsetHeight * 0.05}px`
                })

            })
        }

        function change_status(status) {
            let controls = [
                'to_wallpapers',
                'to_settings',
                'change_wallpaper',
                'to_add_wallpaper',
                'refresh_wallpapers',
                // 'next_wallpaper',
                // 'shuffle_wallpaper',

                // 'src',
            ]
            if (status['type']) {
                document.querySelectorAll("*[action_type=\"play_pause\"]").forEach((e) => {
                    const btn = e.querySelector('span.material-symbols-outlined');
                    if (status['paused']) {
                        btn.innerText = 'play_arrow'
                    } else {
                        btn.innerText = 'pause'
                    }
                })
                if (!status['options']['mute']) {
                    document.querySelectorAll("*[action_type=\"volume\"]").forEach(e => {
                        const btn = e.querySelector('a>span.material-symbols-outlined');
                        let volumeBar = e.querySelector('input[type="range"]')
                        if (status['muted']) {
                            btn.innerText = 'volume_off';
                            volumeBar.value = 0;
                            volumeBar.setAttribute('disabled', '')
                        } else {
                            btn.innerText = 'volume_up';
                            volumeBar.value = status['volume']
                            volumeBar.removeAttribute('disabled')
                        }
                    })
                }
                switch (status['type']) {
                    case 'video':
                        controls.push('play_pause')
                        controls.push('remove_wallpaper')
                        if (!status['options']['no_progress']) {
                            controls.push('wallpaper_progress')
                        }
                        if (!status['options']['mute']) {
                            controls.push('volume')
                        }
                        break
                    case 'audio':
                        controls.push('wallpaper_progress')
                        controls.push('play_pause')
                        controls.push('volume')
                        controls.push('remove_wallpaper')
                        controls.push('volume')
                        break
                    case 'image':
                        controls.push('remove_wallpaper')
                        break
                    case null:
                        break
                }
            }
            document.querySelectorAll('*[action_type]').forEach((e) => {
                    if (!controls.includes(e.getAttribute('action_type'))) {
                        e.style.display = 'none'
                    } else {
                        e.style.display = ''
                    }
                }
            )
        }

        function refresh_status() {
            const status = ipcRenderer.sendSync('wallpaper', ['status'])
            console.log(status)
            change_status(status)
        }

        refresh_status()
    }

    {
        ipcRenderer.on('wallpaper', (event, args) => {
            switch (args[0]) {
                case "ready":
                    closePopup()
                    refresh_status()
                    break
                case "progress":
                    document.querySelector('#video-progress > input').value = args[1]
                    break
                case "status":
                    change_status(args[1])
            }
        })

        function load_page(html) {
            const old_el = document.querySelector('#main-area>.main-area>.main-area');
            const new_el = document.createElement('div');
            new_el.classList.add('main-area')
            new_el.innerHTML = html
            document.querySelector('#main-area>.main-area').appendChild(new_el);
            if (old_el) {
                old_el.style.animation = '.6s cubic-bezier(0, 1, .5, 1) 0s 1 opacityOutAndScaleDown'
                setTimeout(() => {
                    old_el.remove()
                }, 500)
            }
        }
    }


    // 桌布控制區
    {
        {
            function load_wallpapers_page() {
                loadTEXT(
                    './local_wallpaper.html',
                    r => {
                        load_page(r)
                        document.querySelectorAll("*[action_type=\"to_add_wallpaper\"]").forEach(e => {
                            e.addEventListener('click', () => {
                                load_add_wallpaper_page()
                            })
                        })
                        document.querySelectorAll("*[action_type=\"refresh_wallpapers\"]").forEach(e => {
                            e.addEventListener('click', () => {
                                refresh_wallpapers()
                            })
                        })
                        refresh_wallpapers()
                    },
                    {}
                )
            }

            function load_settings_page() {
                loadTEXT(
                    './settings.html',
                    r => {
                        load_page(r)
                        document.querySelectorAll("*[setting=\"open_at_login_on\"]").forEach(e => {
                            e.addEventListener('click', () => {
                                ipcRenderer.send('system', ['set', 'open-at-login', true])
                            })
                        })
                        document.querySelectorAll("*[setting=\"open_at_login_off\"]").forEach(e => {
                            e.addEventListener('click', () => {
                                ipcRenderer.send('system', ['set', 'open-at-login', false])
                            })
                        })
                    },
                    {}
                )
            }

            function load_add_wallpaper_page() {
                loadTEXT(
                    './add_wallpaper.html',
                    r => {
                        load_page(r)
                        const form = document.querySelector('#upload_form');

                        form.onsubmit = () => {
                            return false
                        }
                        let file_contain = form.querySelector('*[upload_item=file]')
                        let file_contain2 = form.querySelector('*[upload_item=file2]')

                        let file_input = form.querySelector('*[upload_item=file] input[type=file]')
                        let file_input2 = form.querySelector('*[upload_item=file2] input[type=file]')
                        file_contain2.style.display = 'none';
                        document.querySelectorAll('*[options_item]').forEach((e) => {
                            e.style.display = 'none'
                        })
                        file_input.addEventListener('change', () => {
                            let options_items = []
                            if (file_input.files.length !== 0) {
                                file_contain2.style.display = 'none';
                                file_input2.required = false;
                                if (/^image|^video/.test(file_input.files[0].type)) {
                                    file_contain.querySelector('span.file-label').innerText = file_input.files[0].name;
                                    options_items.push('no_progress')
                                    options_items.push('mute')
                                    options_items.push('snow')
                                    options_items.push('vis_top')
                                    options_items.push('vis_bottom')
                                    options_items.push('background_scale')
                                } else if (/^audio/.test(file_input.files[0].type)) {
                                    file_contain.querySelector('span.file-label').innerText = file_input.files[0].name;
                                    file_contain2.style.display = '';
                                    file_input2.required = true;
                                    options_items.push('snow')
                                    options_items.push('vis_top')
                                    options_items.push('vis_bottom')
                                    options_items.push('background_scale')
                                } else {
                                    file_input.value = ''
                                    file_contain.querySelector('span.file-label').innerText = '文件類型不符'
                                }
                            } else {
                                file_contain.querySelector('span.file-label').innerText = '選擇檔案';
                            }
                            document.querySelectorAll('*[options_item]').forEach((e) => {
                                    if (!options_items.includes(e.getAttribute('options_item'))) {
                                        e.style.display = 'none'
                                    } else {
                                        e.style.display = ''
                                    }
                                }
                            )
                        })

                        file_input2.addEventListener('change', () => {
                            if (file_input2.files.length !== 0) {
                                if (/^image/.test(file_input2.files[0].type)) {
                                    file_contain2.querySelector('span.file-label').innerText = file_input2.files[0].name;
                                } else {
                                    file_input2.value = ''
                                    file_contain2.querySelector('span.file-label').innerText = '文件類型不符'
                                }
                            } else {
                                file_contain2.querySelector('span.file-label').innerText = '選擇檔案';
                            }
                        })

                        document.querySelectorAll('.accordion a').forEach((e) => {
                            e.parentNode.querySelector('.accordion_item_content').style.display = 'none';
                            e.addEventListener('click', () => {
                                const active = e.parentNode.querySelector('.accordion_item_title').classList.toggle('active');
                                e.parentNode.querySelector('.accordion_item_content').style.display = active ? '' : 'none';
                            })
                        })

                        form.querySelector('.save').addEventListener('click', () => {
                            let file;
                            let file2;
                            if (form.checkValidity()) {
                                showLoading('處理中')
                                file = file_input.files[0]
                                file2 = file_input2.files[0]
                                let data = {
                                    'type': file.type,
                                    'title': form.querySelector('input.wallpaper-title').value,
                                    'description': form.querySelector('textarea.wallpaper-description').value,
                                    'path': file.path,
                                    'extname': file.path.substring(file.path.lastIndexOf('.') + 1, file.path.length),
                                    'options': {
                                        'no_progress': form.querySelector('*[options_item=no_progress]').checked,
                                        'mute': form.querySelector('*[options_item=mute]').checked,
                                        'snow': form.querySelector('*[options_item=snow]').checked,
                                        'vis_top': form.querySelector('*[options_item=vis_top]').checked,
                                        'vis_bottom': form.querySelector('*[options_item=vis_bottom]').checked,
                                        'background_scale': form.querySelector('*[options_item=background_scale]').checked,
                                    }
                                }
                                if (file2) {
                                    data['background'] = {
                                        'type': file2.type,
                                        'path': file2.path,
                                        'extname': file2.path.substring(file2.path.lastIndexOf('.') + 1, file2.path.length),
                                    }
                                }
                                ipcRenderer.send('wallpaper', ['add', data])
                                ipcRenderer.once('wallpaper-add-reply', (event, args) => {
                                    console.log(args)
                                    closePopup()
                                    if (args['status'] === true) {
                                        load_wallpapers_page()
                                    }
                                })
                            }
                        })
                    },
                    {}
                )
            }

            load_wallpapers_page()

            function openPopup(html) {
                let popup_mask = document.getElementById('popup_mask');
                if (isHidden(popup_mask)) {
                    popup_mask.style.display = '';
                }
                popup_mask.innerHTML = html
                return popup_mask
            }

            function closePopup() {
                let popup_mask = document.getElementById('popup_mask');
                if (!isHidden(popup_mask)) {
                    popup_mask.style.animation = '.6s cubic-bezier(0, 1, .5, 1) 0s 1 opacityOut'
                    setTimeout(() => {
                        popup_mask.style.display = 'none';
                        popup_mask.style.animation = ''
                    }, 500)
                }
            }

            function showLoading(text) {
                openPopup(`
                    <div class="loading"></div>
                    <div class="loading-text">${text}...</div>`
                )
            }

            function create_card(info) {
                const wallpapers_el = document.getElementById('wallpapers')
                let wallpaper_el = document.createElement('div')
                const photo_url = `file:///${info['path']}/preview.jpg`
                const created = new Date(info['created'])

                wallpaper_el.setAttribute('class', 'column is-one-quarter wallpaper-card')
                wallpaper_el.setAttribute('action_type', 'change_wallpaper')
                wallpaper_el.innerHTML = `
                       <div class="wallpaper-card-image" style="background-image: url('${photo_url}')">
                            <div class="wallpaper-card-setting-bar">
                                <span class="material-symbols-outlined" wpcsb="setting" title="設定">settings</span>
                                <span class="material-symbols-outlined" wpcsb="open_folder" title="打開資料夾">folder_open</span>
                                <span class="material-symbols-outlined" wpcsb="delete" title="刪除">delete</span>
                            </div>
                       </div>
                       <div class="wallpaper-card-data">
                           <div class="wallpaper-card-data-title" title="${info['title']}">${info['title']}</div>
                           <div class="wallpaper-card-data-owner">${info['owner']}</div>
                           <div class="wallpaper-card-data-info">
                                ${created.getFullYear()}/${created.getMonth() + 1}/${created.getDate()}
                                <div class="wallpaper-card-data-type">${info['type']}/${info['extname']}</div>
                           </div>
                       </div>`
                wallpapers_el.appendChild(wallpaper_el)
                wallpaper_el.addEventListener('click', (event) => {
                    if (event.target.hasAttribute('wpcsb')) {
                        return
                    }
                    showLoading('套用')
                    ipcRenderer.send("wallpaper", ["set", info['path']])
                })
                wallpaper_el.querySelector('*[wpcsb="setting"]').addEventListener('click', () => {
                    const popup = openPopup(`
                        <div class="box">
                            設定
                            <label class="checkbox">下雪效果
                                <input type="checkbox" ${info['options']['snow'] ? 'checked' : ''} wpsit="snow">
                                <span class="checkmark"></span>
                            </label>
                            <label class="checkbox">可視化(上)
                                <input type="checkbox" ${info['options']['vis_top'] ? 'checked' : ''} wpsit="vis_top">
                                <span class="checkmark"></span>
                            </label>
                            <label class="checkbox">可視化(下)
                                <input type="checkbox" ${info['options']['vis_bottom'] ? 'checked' : ''} wpsit="vis_bottom">
                                <span class="checkmark"></span>
                            </label>
                            <label class="checkbox">背景縮放
                                <input type="checkbox" ${info['options']['background_scale'] ? 'checked' : ''} wpsit="background_scale">
                                <span class="checkmark"></span>
                            </label>
                            <div class="buttons">
                                <button class="continue button is-danger">保存</button>
                                <button class="cancel button is-dark">取消</button>
                            </div>
                        </div>`
                    )
                    popup.querySelector('.cancel').addEventListener('click', () => {
                        closePopup()
                    })
                    popup.querySelector('.continue').addEventListener('click', () => {
                        console.log(popup)
                        let options = info['options']
                        options['snow'] = popup.querySelector('*[wpsit="snow"]').checked
                        options['vis_top'] = popup.querySelector('*[wpsit="vis_top"]').checked
                        options['vis_bottom'] = popup.querySelector('*[wpsit="vis_bottom"]').checked
                        options['background_scale'] = popup.querySelector('*[wpsit="background_scale"]').checked
                        showLoading('處理中')
                        ipcRenderer.send('wallpaper', ['edit_options', info['path'], options])
                        ipcRenderer.once('wallpaper-edit-options-reply', (event, args) => {
                            console.log(args)
                            closePopup()
                        })
                    })
                })
                wallpaper_el.querySelector('*[wpcsb="open_folder"]').addEventListener('click', () => {
                    ipcRenderer.send('open-f-explorer', info['path'].replaceAll('/', '\\'))
                })
                wallpaper_el.querySelector('*[wpcsb="delete"]').addEventListener('click', () => {
                    const popup = openPopup(`
                        <div class="box">
                            確定刪除?
                            <div class="buttons">
                                <button class="continue button is-danger">確定</button>
                                <button class="cancel button is-dark">取消</button>
                            </div>
                        </div>`
                    )
                    popup.querySelector('.cancel').addEventListener('click', () => {
                        closePopup()
                    })
                    popup.querySelector('.continue').addEventListener('click', () => {
                        showLoading('刪除中...')
                        ipcRenderer.send('wallpaper', ['delete', info['path']])
                        ipcRenderer.once('wallpaper-delete-reply', (event, args) => {
                            console.log(args)
                            closePopup()
                            if (args['status'] === true) {
                                refresh_wallpapers()
                            }
                        })
                    })
                })
                resize_cards()
            }

            function refresh_wallpapers() {
                const wallpapers = ipcRenderer.sendSync("wallpaper", ["get-all"]);
                if (wallpapers.length !== 0) {
                    document.getElementById('wallpapers').style.animation = '.4s cubic-bezier(0, 1, .5, 1) 0s 1 opacityOutAndScaleDown'
                    setTimeout(() => {
                        document.getElementById('wallpapers').innerHTML = ''
                        document.getElementById('wallpapers').style.animation = '.6s cubic-bezier(0, 1, .5, 1) 0s 1 opacityIn'

                        wallpapers.forEach((v, i) => {
                            setTimeout(
                                () => {
                                    loadTEXT(`${v}/info.json`, (d) => {
                                        d = JSON.parse(d)
                                        d["path"] = v
                                        create_card(d)
                                    }, {});
                                }, i * 20
                            )
                        })
                    }, 300)
                } else {
                    document.getElementById('wallpapers').innerHTML = '<div class="empty-wallpapers" style="animation: 0.5s cubic-bezier(0, 1, .5, 1) 0s 1 slideInFromBottom;">空空如也</div>'
                }
            }
        }

        document.querySelector('#video-progress > input').addEventListener('change', () => {
            ipcRenderer.send("wallpaper", ["set-progress", document.querySelector('#video-progress > input').value]);
        })

        // 控制桌布暫停和撥放
        document.querySelectorAll("*[action_type=\"play_pause\"]").forEach(e => {
            e.addEventListener('click', () => {
                ipcRenderer.send("wallpaper", ["play-pause"]);
            })
        })

        document.querySelectorAll("*[action_type=\"to_wallpapers\"]").forEach(e => {
            e.addEventListener('click', () => {
                load_wallpapers_page()
            })
        })

        document.querySelectorAll("*[action_type=\"to_settings\"]").forEach(e => {
            e.addEventListener('click', () => {
                load_settings_page()
            })
        })

        document.querySelectorAll("*[action_type=\"remove_wallpaper\"]").forEach(e => {
            e.addEventListener('click', () => {
                ipcRenderer.send("wallpaper", ["remove"])
            })
        })

        document.querySelectorAll("*[action_type=\"attach_detach\"]").forEach(e => {
            e.addEventListener('click', () => {
                ipcRenderer.send("wallpaper", ["attach-detach"])
            })
        })

        // 這個暫時留著，測試用
        document.querySelectorAll("*[action_type=\"src\"]").forEach(e => {
            e.querySelector('a').addEventListener('click', () => {
                ipcRenderer.send("wallpaper", ["set", "video", e.querySelector('input').value])
            })
        })

        // 控制桌布的音量
        document.querySelectorAll("*[action_type=\"volume\"]").forEach(e => {
            // 更改音量
            e.querySelector('input[type="range"]').addEventListener('change', () => {
                let volume = e.querySelector('input[type="range"]').value
                console.log(volume)
                ipcRenderer.send('wallpaper', ['volume', volume])
            })
            // 改變靜音，音量
            e.querySelector('a').addEventListener('click', () => {
                ipcRenderer.send("wallpaper", ["mute"])
            })
        })

        // 如果有點到連結就調用這個
        document.querySelectorAll('a[href^="http"]').forEach(e => {
            e.addEventListener('click', function (event) {
                event.preventDefault();
                ipcRenderer.send("open-web", this.href);
            });
        })
    }
});