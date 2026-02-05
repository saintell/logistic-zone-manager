import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { configObject } from '../config/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const developMode = true;
const exe_test = false;
let extension = exe_test ? ".exe" : ".py";
let exePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'python-scripts') + path.sep;

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
    win = new BrowserWindow({
        width: 900,
        height: 600,
        minWidth: 900,
        minHeight: 600,
        icon: path.join(process.env.VITE_PUBLIC as string, 'icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            sandbox: false,
        },
    })

    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString())
    })

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        win.loadFile(path.join(RENDERER_DIST, 'index.html'))
    }
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
        win = null
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

app.whenReady().then(createWindow)

ipcMain.on('dinamic_method', (event, arg) => {
    let arg_parsed = JSON.parse(arg);
    const findObject = configObject.find(item => item.process_name === arg_parsed.process);
    if (findObject) {
        let pythonProcess = developMode ? spawn('python', [exePath + findObject.fileName + extension, arg]) : spawn(exePath + findObject.fileName + '.exe', [arg]);
        if (exe_test && developMode) {
            pythonProcess = spawn(exePath + findObject.fileName + '.exe', [arg])
        }

        pythonProcess.stdout.on('data', (data) => {
            console.log(`stdout: ${data.toString()}`);
            if (findObject?.messageBox) {
                const options = {
                    type: 'error' as const,
                    buttons: ['Ok'],
                    title: findObject?.title,
                    message: findObject?.message,
                    detail: data.toString()
                };
                dialog.showMessageBox(null!, options).then(result => {
                    console.log(result.response);
                }).catch(err => {
                    console.log(err);
                });
            }

            event.reply(findObject.process_name, data.toString());

        });

        pythonProcess.stderr.on('data', (data) => {
            dialog.showErrorBox('Error', `No se pudo obtener la información \n ${data.toString()}`);

            console.error(`stderr: ${data.toString()}`);

            event.reply(findObject.process_name, data.toString());

        });
    }

})

ipcMain.handle('select-directory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory', 'promptToCreate']
    });
    if (canceled) {
        return null;
    } else {
        return filePaths[0];
    }
});
