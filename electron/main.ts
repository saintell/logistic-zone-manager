import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { configObject } from '../config/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const isPackaged = app.isPackaged;

const pythonScriptsPath = isPackaged
    ? path.join(process.resourcesPath, 'python-scripts')
    : path.join(__dirname, '..', 'python-scripts');

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

    if (isPackaged) {
        win.removeMenu()
    }

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
        const scriptName = findObject.fileName;
        const exeFile = path.join(pythonScriptsPath, scriptName + '.exe');
        const pyFile = path.join(pythonScriptsPath, scriptName + '.py');

        let pythonProcess;

        // In development, prioritize python script (so changes are reflected immediately)
        // In production (packaged), prioritize executable
        const useExe = isPackaged && fs.existsSync(exeFile);
        const usePy = !useExe && fs.existsSync(pyFile);

        if (useExe) {
            pythonProcess = spawn(exeFile, [arg], {
                env: { ...process.env },
                cwd: pythonScriptsPath
            });
        } else if (usePy) {
            pythonProcess = spawn('python', [pyFile, arg], {
                env: { ...process.env },
                cwd: pythonScriptsPath
            });
        } else {
            dialog.showErrorBox('Error', `No se pudo encontrar el script o ejecutable para: ${scriptName}\nBuscado en: ${pythonScriptsPath}`);
            return;
        }

        let outputBuffer = '';

        pythonProcess.stdout.on('data', (data) => {
            const dataStr = data.toString();
            outputBuffer += dataStr;

            // Stream progress updates to renderer immediately
            // Check if it looks like a JSON object or just forward everything
            try {
                // Try to parse to see if it's valid JSON, or just send raw strings
                // The renderer handles splitting by newlines
                event.reply(findObject.process_name, dataStr);
            } catch (e) {
                // If distinct chunks are partial JSON, the renderer buffering might handle it,
                // or we can just emit. 
                event.reply(findObject.process_name, dataStr);
            }
        });

        pythonProcess.on('close', (code) => {
            console.log(`Python process exited with code ${code}`);
            if (code !== 0) {
                console.error('Python process finished with errors');
                // Optionally send an error message to the frontend if needed
            }
            // We don't need to send the full buffer at the end if we streamed it,
            // UNLESS the frontend expects a specific "complete" message that wasn't sent.
            // But usually the script sends a "success": true message at the end.
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`stderr: ${data.toString()}`);
            // Do not reply with stderr, as it may contain logs
            // Do not show error box for logs
        });
    }

})

ipcMain.handle('execute-python', async (_event, arg) => {
    return new Promise((resolve, reject) => {
        let arg_parsed;
        try {
            arg_parsed = JSON.parse(arg);
        } catch (e) {
            return reject('Invalid JSON argument');
        }

        const findObject = configObject.find(item => item.process_name === arg_parsed.process);
        if (!findObject) {
            return reject(`Process not found: ${arg_parsed.process}`);
        }

        const scriptName = findObject.fileName;
        const exeFile = path.join(pythonScriptsPath, scriptName + '.exe');
        const pyFile = path.join(pythonScriptsPath, scriptName + '.py');

        // In development, prioritize python script
        const useExe = isPackaged && fs.existsSync(exeFile);
        const usePy = !useExe && fs.existsSync(pyFile);

        let pythonProcess;

        if (useExe) {
            pythonProcess = spawn(exeFile, [arg], {
                env: { ...process.env },
                cwd: pythonScriptsPath
            });
        } else if (usePy) {
            pythonProcess = spawn('python', [pyFile, arg], {
                env: { ...process.env },
                cwd: pythonScriptsPath
            });
        } else {
            return reject(`Script not found for: ${scriptName}`);
        }

        let outputBuffer = '';
        let errorBuffer = '';

        pythonProcess.stdout.on('data', (data) => {
            outputBuffer += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            const output = data.toString();
            console.error(`[Python stderr]: ${output}`);
            errorBuffer += output;
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                resolve(outputBuffer);
            } else {
                reject(`Process exited with code ${code}. Error: ${errorBuffer}`);
            }
        });

        pythonProcess.on('error', (err) => {
            reject(`Failed to start process: ${err.message}`);
        });
    });
});

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
