// Type declarations for Electron IPC in the renderer process

export interface PythonScriptResult {
    success: boolean;
    message?: string;
    error?: string;
    data?: {
        fileName: string;
        filePath: string;
        fileSize: number;
        fileExtension: string;
    };
    rawOutput?: string;
}

export interface ElectronAPI {
    on: (channel: string, listener: (...args: unknown[]) => void) => void;
    off: (channel: string, listener: (...args: unknown[]) => void) => void;
    send: (channel: string, ...args: unknown[]) => void;
    invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;
    getFilePath: (file: File) => string;
}

declare global {
    interface Window {
        ipcRenderer: ElectronAPI;
    }
}

export { };
