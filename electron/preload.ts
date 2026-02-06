import { ipcRenderer, contextBridge, type IpcRendererEvent } from 'electron'

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const listeners = new Map<string, Map<Function, Function[]>>()

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
    on(...args: Parameters<typeof ipcRenderer.on>) {
        const [channel, listener] = args
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const wrappedListener = (event: IpcRendererEvent, ...args: any[]) => listener(event, ...args)

        if (!listeners.has(channel)) {
            listeners.set(channel, new Map())
        }
        const channelListeners = listeners.get(channel)!
        if (!channelListeners.has(listener)) {
            channelListeners.set(listener, [])
        }
        channelListeners.get(listener)!.push(wrappedListener)

        return ipcRenderer.on(channel, wrappedListener)
    },
    off(...args: Parameters<typeof ipcRenderer.off>) {
        const [channel, listener] = args

        const channelListeners = listeners.get(channel)
        if (channelListeners) {
            const wrappedListeners = channelListeners.get(listener)
            if (wrappedListeners && wrappedListeners.length > 0) {
                const wrappedListener = wrappedListeners.shift()
                if (wrappedListeners.length === 0) {
                    channelListeners.delete(listener)
                }
                if (channelListeners.size === 0) {
                    listeners.delete(channel)
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return ipcRenderer.off(channel, wrappedListener as any)
            }
        }

        return ipcRenderer.off(channel, listener)
    },
    send(...args: Parameters<typeof ipcRenderer.send>) {
        const [channel, ...omit] = args
        return ipcRenderer.send(channel, ...omit)
    },
    invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
        const [channel, ...omit] = args
        return ipcRenderer.invoke(channel, ...omit)
    },

    // You can expose other weird stuff too
})
