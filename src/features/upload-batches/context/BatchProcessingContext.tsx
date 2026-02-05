import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { CurrentBatch, ProcessingStep } from '../types';

// Initial steps configuration
const createInitialSteps = (): ProcessingStep[] => [
    {
        id: '1',
        name: 'Carga',
        status: 'pending',
    },
    {
        id: '2',
        name: 'Normalizando Direcciones',
        status: 'pending',
    },
    {
        id: '3',
        name: 'Geocodificación',
        status: 'pending',
    },
    {
        id: '4',
        name: 'Asignando Zonas',
        status: 'pending',
    },
];

// Map Python status to step updates
const getStepUpdates = (pythonStatus: string, data: Record<string, unknown>): Partial<Record<string, Partial<ProcessingStep>>> => {
    const now = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    switch (pythonStatus) {
        case 'checking_cache':
            return {
                '1': { status: 'completed', completedAt: now },
                '2': { status: 'in-progress', description: `Verificando caché (${data.count} registros)...` },
            };
        case 'cache_lookup_complete':
            return {
                '2': {
                    status: 'in-progress',
                    description: `Caché: ${data.hits} encontrados, ${data.misses} por procesar`
                },
            };
        case 'normalizing':
            return {
                '2': {
                    status: 'in-progress',
                    description: `Normalizando ${data.count} direcciones...`
                },
            };
        case 'geocoding':
            return {
                '2': { status: 'completed', completedAt: now, description: undefined },
                '3': {
                    status: 'in-progress',
                    description: `Geocodificando ${data.count} direcciones...`
                },
            };
        case 'assigning_zones':
            return {
                '3': { status: 'completed', completedAt: now, description: undefined },
                '4': {
                    status: 'in-progress',
                    description: `Asignando zonas a ${data.count} registros...`
                },
            };
        case 'cache_updated':
            return {
                '4': {
                    status: 'in-progress',
                    description: `${data.new_records} registros guardados en caché`
                },
            };
        default:
            return {};
    }
};

interface BatchProcessingContextType {
    selectedFile: File | null;
    selectedFilePath: string | null;
    isProcessing: boolean;
    currentBatch: CurrentBatch | null;
    processedFilePath: string | null;
    outputFolder: string | null;
    handleFilesSelected: (files: File[]) => void;
    handleFileRemoved: () => void;
    handleStartProcessing: () => Promise<void>;
    handleReset: () => void;
    handleSelectOutputFolder: () => Promise<void>;
}

const BatchProcessingContext = createContext<BatchProcessingContextType | undefined>(undefined);

export function BatchProcessingProvider({ children }: { children: ReactNode }) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentBatch, setCurrentBatch] = useState<CurrentBatch | null>(null);
    const [processedFilePath, setProcessedFilePath] = useState<string | null>(null);
    const [outputFolder, setOutputFolder] = useState<string | null>(localStorage.getItem('outputFolder'));

    // Handle IPC messages from Python script
    const handleProcessMessage = useCallback((data: string) => {
        // Python may send multiple messages in one chunk, split by newlines
        const lines = data.trim().split('\n');

        for (const line of lines) {
            if (!line.trim()) continue;

            try {
                // Try to parse the line as JSON status update
                const parsed = JSON.parse(line);
                console.log('Python status:', parsed);

                // Check if processing is complete
                if (parsed.success !== undefined) {
                    if (parsed.success) {
                        // Processing completed successfully
                        const now = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

                        // Capture output file path
                        if (parsed.processedFile) setProcessedFilePath(parsed.processedFile);
                        else if (parsed.output_file) setProcessedFilePath(parsed.output_file);
                        else if (parsed.output_path) setProcessedFilePath(parsed.output_path);

                        setCurrentBatch(prev => {
                            if (!prev) return null;
                            return {
                                ...prev,
                                status: 'completed',
                                steps: prev.steps.map(step => ({
                                    ...step,
                                    status: 'completed',
                                    completedAt: step.completedAt || now,
                                    description: undefined,
                                })),
                            };
                        });
                    } else {
                        // Processing failed
                        setCurrentBatch(prev => {
                            if (!prev) return null;
                            return {
                                ...prev,
                                status: 'failed',
                            };
                        });
                    }
                    continue; // Done with this line
                }

                // Update steps based on status
                if (parsed.status) {
                    const updates = getStepUpdates(parsed.status, parsed);

                    setCurrentBatch(prev => {
                        if (!prev) return null;

                        const newSteps = prev.steps.map(step => {
                            const update = updates[step.id];
                            if (update) {
                                return { ...step, ...update };
                            }
                            return step;
                        });

                        return {
                            ...prev,
                            steps: newSteps,
                        };
                    });
                }
            } catch (e) {
                // If it's not JSON, it's likely a standard log message from Python
                console.log('Python Log:', line);
            }
        }
    }, []);

    // Set up IPC listener
    useEffect(() => {
        const listener = (_event: unknown, ...args: unknown[]) => {
            const data = args[0] as string;
            handleProcessMessage(data);
        };

        window.ipcRenderer.on('process_file', listener);

        return () => {
            window.ipcRenderer.off('process_file', listener);
        };
    }, [handleProcessMessage]);

    const handleFilesSelected = (files: File[]) => {
        if (files.length > 0) {
            const file = files[0];
            setSelectedFile(file);
            console.log('File selected:', file.name, file);

            // Try webUtils first, then fallback to direct path property (Electron specific)
            let filePath = window.ipcRenderer.getFilePath(file);

            // Fallback: check for 'path' property directly on the file object
            if (!filePath && 'path' in file) {
                filePath = (file as any).path;
            }

            if (filePath) {
                setSelectedFilePath(filePath);
                console.log('File path found:', filePath);
            } else {
                console.error('Could not resolve file path. Properties:', Object.keys(file));
            }
        }
    };

    const handleFileRemoved = () => {
        setSelectedFile(null);
        setSelectedFilePath(null);
        console.log('File removed');
    };

    const handleSelectOutputFolder = async () => {
        try {
            const folder = await window.ipcRenderer.invoke('select-directory') as string | null;
            if (folder) {
                setOutputFolder(folder);
                localStorage.setItem('outputFolder', folder);
            }
        } catch (error) {
            console.error('Error selecting folder:', error);
        }
    };

    const handleStartProcessing = async () => {
        const filePath = selectedFilePath;

        if (!filePath) {
            console.error('No file path available');
            return;
        }

        if (!outputFolder) {
            console.error('No output folder selected');
            return;
        }

        console.log('Starting processing for:', selectedFile?.name || filePath);
        setIsProcessing(true);

        // Initialize batch with pending steps
        const batchId = `#${Date.now().toString(36).toUpperCase()}`;
        setCurrentBatch({
            batchId,
            status: 'processing',
            steps: createInitialSteps(),
        });

        try {
            const payload = JSON.stringify({
                process: 'process_file',
                filePath: filePath,
                outputDir: outputFolder
            });
            window.ipcRenderer.send('dinamic_method', payload);
        } catch (error) {
            console.error('Error running Python script:', error);
        }
    };

    const handleReset = () => {
        setSelectedFile(null);
        setSelectedFilePath(null);
        setProcessedFilePath(null);
        setIsProcessing(false);
        setCurrentBatch(null);
        console.log('Reset - ready for new file');
    };

    return (
        <BatchProcessingContext.Provider value={{
            selectedFile,
            selectedFilePath,
            isProcessing,
            currentBatch,
            processedFilePath,
            outputFolder,
            handleFilesSelected,
            handleFileRemoved,
            handleStartProcessing,
            handleReset,
            handleSelectOutputFolder
        }}>
            {children}
        </BatchProcessingContext.Provider>
    );
}

export function useBatchProcessing() {
    const context = useContext(BatchProcessingContext);
    if (context === undefined) {
        throw new Error('useBatchProcessing must be used within a BatchProcessingProvider');
    }
    return context;
}
