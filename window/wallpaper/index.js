const {ipcRenderer} = require("electron");

function average(nums) {
    return nums.reduce((a, b) => a + b) / nums.length;
}

function effect(info, player) {
    let background
    switch (info['type']) {
        case "audio":
            background = document.createElement("background");
            background.style.width = '100%'
            background.style.height = '100%'
            background.style.position = 'absolute'
            background.style.zIndex = '-1'
            background.style.backgroundImage = `url(file:///${info['src'].match(/^([A-Z]:\/[^.\n]*)?(?:\/([^\/]+\.[^\/]+))?$/)[1]}/background.${info['options']['background']['extname']})`
            background.style.backgroundPosition = 'center center'
            background.style.backgroundSize = 'cover'
            background.style.backgroundRepeat = 'no-repeat'
            document.querySelector('body').appendChild(background)
            break
        case "video":
            background = player
    }

    if (info['options']['snow']||info['options']['background_scale']||info['options']['vis_top']||info['options']['vis_bottom']) {
        const context = new AudioContext();
        const src = context.createMediaElementSource(player);
        const analyser = context.createAnalyser();

        src.connect(analyser);
        analyser.connect(context.destination);

        analyser.fftSize = 256;

        const bufferLength = analyser.frequencyBinCount;

        const dataArray = new Uint8Array(bufferLength);

        const points = 64

        const WIDTH = window.innerWidth;
        const HEIGHT = window.innerHeight*0.3;

        const barWidth = WIDTH / points;
        let barHeight;
        let x = 0;

        function renderFrame() {
            requestAnimationFrame(renderFrame);
            analyser.getByteFrequencyData(dataArray);
        }

        if (info['options']['background_scale']) {
            function scaleBackground() {
                requestAnimationFrame(scaleBackground);
                background.style.transform = `scale(${(average(dataArray) * 0.2) / 250 + 1})`
            }

            scaleBackground()
        }

        if (info['options']['vis_top']) {
            const canvas = document.createElement("canvas");
            canvas.width = WIDTH;
            canvas.height = HEIGHT;
            canvas.style.position = 'fixed'
            canvas.style.top = '0'
            document.querySelector('body').appendChild(canvas)
            const ctx = canvas.getContext("2d");
            function renderTopVis() {
                requestAnimationFrame(renderTopVis);
                x = 0;

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                ctx.lineWidth = 10;
                ctx.strokeStyle = "#fff";
                ctx.moveTo(HEIGHT, 0);
                ctx.beginPath();

                for (let i = 0; i < points - 1; i++) {
                    barHeight = HEIGHT / 255 * dataArray[i] > HEIGHT - 5 ? HEIGHT - 5 : HEIGHT / 255 * dataArray[i];

                    const xc = (x + x + barWidth) / 2;
                    const yc = HEIGHT / 255 * ((dataArray[i] + dataArray[i + 1]) / 2) > HEIGHT - 5 ? HEIGHT - 5 : HEIGHT / 255 * ((dataArray[i] + dataArray[i + 1]) / 2);

                    ctx.quadraticCurveTo(x, barHeight, xc, yc);
                    x += barWidth;
                }
                ctx.quadraticCurveTo(WIDTH - barWidth, HEIGHT / 255 * dataArray[points - 1], WIDTH, HEIGHT / 255 * dataArray[points]);
                ctx.stroke();
            }

            renderTopVis()
        }

        if (info['options']['vis_bottom']) {
            const canvas_bottom = document.createElement("canvas");
            canvas_bottom.width = WIDTH;
            canvas_bottom.height = HEIGHT;
            canvas_bottom.style.position = 'fixed'
            canvas_bottom.style.bottom = '0'
            document.querySelector('body').appendChild(canvas_bottom)
            const ctx_bottom = canvas_bottom.getContext("2d");
            function renderBottomVis() {
                requestAnimationFrame(renderBottomVis);
                x = 0;

                ctx_bottom.clearRect(0, 0, WIDTH, HEIGHT);

                ctx_bottom.lineWidth = 10;
                ctx_bottom.strokeStyle = "#fff";
                ctx_bottom.moveTo(HEIGHT, 0);
                ctx_bottom.beginPath();

                for (let i = 0; i < points - 1; i++) {
                    barHeight = HEIGHT / 255 * dataArray[i] > HEIGHT - 5 ? HEIGHT - 5 : HEIGHT / 255 * dataArray[i];

                    const xc = (x + x + barWidth) / 2;
                    const yc = HEIGHT / 255 * ((dataArray[i] + dataArray[i + 1]) / 2) > HEIGHT - 5 ? HEIGHT - 5 : HEIGHT / 255 * ((dataArray[i] + dataArray[i + 1]) / 2);

                    ctx_bottom.quadraticCurveTo(WIDTH - x, HEIGHT - barHeight, WIDTH - xc, HEIGHT - yc);
                    x += barWidth;
                }
                ctx_bottom.quadraticCurveTo(barWidth, HEIGHT - HEIGHT / 255 * dataArray[points - 1], 0, HEIGHT - HEIGHT / 255 * dataArray[points]);
                ctx_bottom.stroke();
            }

            renderBottomVis()
        }
        renderFrame();

        if (info['options']['snow']) {
            const snow = document.createElement("canvas");
            snow.width = window.innerWidth;
            snow.height = window.innerHeight;
            snow.style.position = 'fixed'
            snow.style.top = '0'
            document.querySelector('body').appendChild(snow)
            const snow_ctx = snow.getContext("2d");

            function random(min, max) {
                return parseInt((Math.random() * (max - min)).toString()) + min;
            }

            function Vector(x, y) {
                this.x = x || 0;
                this.y = y || 0;
            }

            Vector.prototype = {
                set: function (x, y) {
                    this.x = x;
                    this.y = y;
                    return this;
                },
                add: function (v) {
                    this.x += v.x;
                    this.y += v.y;
                    return this;
                },
                // getLength: function () {
                //     return Math.sqrt(this.x * this.x + this.y * this.y);
                // },
                // //斜率
                // slope: function () {
                //     return this.y / this.x;
                // },
                // //算一条直线的斜率  v 终点
                // slopeV: function (v) {
                //     return (v.y - this.y) / (v.x - this.x);
                // }
            };

            //舞台
            function Stage(ctx) {
                this.ctx = ctx;
                this.width = snow.width;
                this.height = snow.height;
                this.power = new Vector(0, 0);
                this.childs = [];
            }

            Stage.prototype = {
                setPower: function (x, y) {
                    this.power.set(x, y);
                    const child = this.childs;
                    for (let i = 0; i < child.length; i++) {
                        child[i].setVelocity(x, y)
                    }
                    return this;
                },
                add: function (p) {
                    this.childs.push(p);
                    //把舞台的力交给舞台对象
                    p.setVelocity(this.power.x, this.power.y);
                    return this;
                },
                render: function () {
                    const child = this.childs;
                    const width = this.width;
                    const height = this.height;

                    snow_ctx.clearRect(0, 0, this.width, this.height);

                    for (let i = 0; i < child.length; i++) {
                        //删除不在舞台中的对象
                        if (!child[i].isInStage(width, height)) {
                            child.splice(i, 1);
                            i--;
                            continue;
                        }
                        this.childs[i].render(this.ctx);
                    }
                }
            };

            //雪花
            function Snow(x, y, radius) {
                this.position = new Vector(x, y);
                this.velocity = new Vector(0, 0);
                this.radius = radius || 10;
                this.t = parseInt((Math.random() * 100).toString());
            }

            Snow.prototype = {
                setVelocity: function (x, y) {
                    //雪花颗粒大，降落速度快

                    this.velocity.set(x, y * this.radius * 0.5);
                    return this;
                },
                isInStage: function (width, height) {
                    const p = this.position;
                    return p.x > 0 && p.x < width && p.y > 0 && p.y < height
                }
            };

            Snow.prototype.render = function (ctx) {
                //ctx.fillStyle = "#fff";
                let x = this.position.x;
                const y = this.position.y;

                //位置
                this.position.add(this.velocity);

                // t控制雪花sin函数飘落
                this.t += 0.03;

                ctx.beginPath();
                // Math.sin(this.t) 可构建一个左右摇摆的幅度
                // * this.radius * 10 雪花越大幅度越大，并扩大5倍
                //ctx.arc(x+(Math.sin(this.t)*this.radius*5), y, this.radius, 0, Math.PI*2, false);
                x = x + (Math.sin(this.t) * this.radius * 5);

                const gr = ctx.createRadialGradient(x, y, 0, x, y, this.radius);
                gr.addColorStop(0, 'rgba(255, 255, 255, 1)');
                gr.addColorStop(1, 'rgba(255, 255, 255, 0)');
                //console.log( gr )
                ctx.fillStyle = gr;
                ctx.arc(x, y, this.radius, 0, Math.PI * 2, false);
                ctx.fill();
            };

            const stage = new Stage(snow_ctx);
            stage.setPower(0, .2);

            function render() {
                if (stage.childs.length < 500) {
                    const _snow = new Snow(random(0, snow.width), random(0, 20), random(2, 7));
                    stage.add(_snow);
                }
                requestAnimationFrame(function () {
                    stage.setPower(0, (average(dataArray) * 5) / 250 + .2);
                    stage.render();
                    render();
                });
            }

            render();
        }
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    const body = document.querySelector('body')
    body.style.width = '100vw'
    body.style.height = '100vh'
    body.style.overflow = 'hidden'
    body.style.transform = 'scale(.8)'
    body.style.opacity = '0'
    body.style.margin = '0'
    {
        switch (ipcRenderer.sendSync('wallpaper-type')) {
            case 'video':
                document.querySelector('video').remove();

                const video_info = ipcRenderer.sendSync('wallpaper', ['status'])
                let video = document.createElement('video');
                video.src = `http://localhost:5438/${video_info['src'].replace(`${ipcRenderer.sendSync('get-wallpapers-path').replaceAll('\\', '/')}/`, '')}`;
                video.loop = true;
                video.volume = video_info['options']['mute'] ? "0" : video_info['volume'];
                video.controls = false;
                video.style.width = '100%'
                video.style.height = '100%'

                document.querySelector('body').appendChild(video)
                await video.play()
                console.log(video_info['src'])

                effect(video_info, video)

                if (!video_info['options']['no_progress']) {
                    let video_old_percent
                    setInterval(function () {
                        const percent = (video.currentTime / video.duration * 100).toFixed(2);
                        if (percent !== video_old_percent) {
                            video_old_percent = percent
                            ipcRenderer.send('wallpaper', ['progress', percent])
                        }
                    }, 1000);
                }

                ipcRenderer.on('play-pause', (event, paused) => {
                    if (paused) {
                        video.pause();
                    } else {
                        video.play();
                    }
                    ipcRenderer.send('play-pause-reply', video.paused)
                })

                ipcRenderer.on('volume', (event, args) => {
                    console.log(args)
                    video.volume = args
                })

                ipcRenderer.on('muted', (event, args) => {
                    console.log(args)
                    video.muted = args
                })

                ipcRenderer.on('set-progress', (event, args) => {
                    console.log(args)
                    video.currentTime = Math.floor(args * video.duration / 100);
                })

                navigator.mediaSession.metadata = new MediaMetadata({
                    title: video_info['title'],
                    artist: "PickWallpaper",
                    album: "PickWallpaper",
                });
                break
            case 'audio':
                document.querySelector('video').remove();

                const audio_info = ipcRenderer.sendSync('wallpaper', ['status'])
                let audio = document.createElement('audio');
                audio.src = `http://localhost:5438/${audio_info['src'].replace(`${ipcRenderer.sendSync('get-wallpapers-path').replaceAll('\\', '/')}/`, '')}`;
                audio.loop = true;
                audio.volume = audio_info['volume'];
                audio.controls = false;
                document.querySelector('body').appendChild(audio)
                await audio.play()
                console.log(audio_info['src'])

                effect(audio_info, audio)

                let audio_old_percent
                setInterval(function () {
                    const percent = (audio.currentTime / audio.duration * 100).toFixed(2);
                    if (percent !== audio_old_percent) {
                        audio_old_percent = percent
                        ipcRenderer.send('wallpaper', ['progress', percent])
                    }
                }, 1000);

                // audio.addEventListener('progress', () => {
                //     console.log(audio.currentTime)
                // })

                ipcRenderer.on('play-pause', (event, paused) => {
                    if (paused) {
                        audio.pause();
                    } else {
                        audio.play();
                    }
                    ipcRenderer.send('play-pause-reply', audio.paused)
                })

                ipcRenderer.on('volume', (event, args) => {
                    console.log(args)
                    audio.volume = args
                })

                ipcRenderer.on('muted', (event, args) => {
                    console.log(args)
                    audio.muted = args
                })

                ipcRenderer.on('set-progress', (event, args) => {
                    console.log(args)
                    audio.currentTime = Math.floor(args * audio.duration / 100);
                })

                navigator.mediaSession.metadata = new MediaMetadata({
                    title: audio_info['title'],
                    artist: "PickWallpaper",
                    album: "PickWallpaper"
                });

                break
            case "image":
                let image = document.querySelector('img');
                let div = document.createElement('div');
                div.style.width = '100%'
                div.style.height = '100%'
                div.style.backgroundSize = 'contain'
                div.style.backgroundRepeat = 'no-repeat'
                div.style.backgroundPosition = 'center'
                div.style.backgroundImage = `url(${image.src})`
                image.remove()
                document.querySelector('body').appendChild(div);
                break
        }
    }

    {
        document.querySelectorAll("*[appname]").forEach(e => {
            e.innerHTML = ipcRenderer.sendSync('app-info').name
        })
        document.querySelectorAll("*[appversion]").forEach(e => {
            e.innerHTML = ipcRenderer.sendSync('app-info').version
        })
    }

    setTimeout(() => {
        body.style.transition = '2s cubic-bezier(0,1,0,1)'
        body.style.transform = 'scale(1)'
        body.style.opacity = '1'
    }, 50)
});