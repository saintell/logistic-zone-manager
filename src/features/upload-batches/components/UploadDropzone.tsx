import { useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import './UploadDropzone.css';

// Define a type that includes the path property (common in Electron/Node environments)
interface FileWithPath extends File {
    path?: string;
}

interface UploadDropzoneProps {
    file?: File | null;
    onFilesSelected?: (files: FileWithPath[]) => void;
    onFileRemoved?: () => void;
    onReset?: () => void;
    isProcessing?: boolean;
    isCompleted?: boolean;
    hasFailed?: boolean;
}

export function UploadDropzone({
    file,
    onFilesSelected,
    onFileRemoved,
    onReset,
    isProcessing = false,
    isCompleted = false,
    hasFailed = false
}: UploadDropzoneProps) {
    const [selectedFile, setSelectedFile] = useState<FileWithPath | null>((file as FileWithPath) || null);

    useEffect(() => {
        if (file !== undefined) {
            setSelectedFile((file as FileWithPath) || null);
        }
    }, [file]);

    const [error, setError] = useState<string | null>(null);
    const dropzoneRef = useRef<HTMLDivElement>(null);

    const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100 MiB
    const MAX_SIZE_LABEL = '100 MB';

    const { getRootProps, getInputProps, isDragActive, open, isDragReject } = useDropzone({
        useFsAccessApi: false, // Critical for Electron to get full path
        maxSize: MAX_SIZE_BYTES,
        maxFiles: 1,
        // We handle drop manually for robustness to guarantee file path, 
        // but useDropzone handles click/input change and visual states
        onDrop: (acceptedFiles) => {
            // This handler is primarily for when files are selected via CLICK (Browser Dialog)
            // For drag and drop, the native handler below takes precedence usually
            setError(null);
            if (acceptedFiles.length > 0) {
                const file = acceptedFiles[0] as FileWithPath;
                setSelectedFile(file);
                onFilesSelected?.([file]);
            }
        },
        onDropRejected: (rejectedFiles) => {
            handleRejections(rejectedFiles);
        },
        accept: {
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        },
        multiple: false,
        disabled: isProcessing,
        noDrag: true // Disable React Dropzone's drag listeners so our native one has full control
    });

    const handleRejections = (rejectedFiles: any[]) => {
        let message = '';
        if (rejectedFiles.length > 0) {
            const isMaxFilesRejected = rejectedFiles.some((file: any) => file.errors && file.errors[0]?.code === 'too-many-files');
            const isMaxSizeRejected = rejectedFiles.some((file: any) => file.errors && file.errors[0]?.code === 'file-too-large');
            const isFileInvalidType = rejectedFiles.some((file: any) => file.errors && file.errors[0]?.code === 'file-invalid-type');

            if (isMaxFilesRejected) {
                message = `Solo se permite un archivo a la vez`;
            } else if (isMaxSizeRejected) {
                message = `El archivo excede el tamaño máximo de ${MAX_SIZE_LABEL}`;
            } else if (isFileInvalidType) {
                message = `Tipo de archivo no válido. Solo .xls, .xlsx`;
            } else {
                // Fallback for generic errors
                message = rejectedFiles[0].errors?.[0]?.message || 'Archivo no válido';
            }
        }
        setError(message);
    };

    // Native Drop Handler to bypass React Synthetic Events and ensure we get the Electron File object (with path)
    useEffect(() => {
        const dropzone = dropzoneRef.current;
        if (!dropzone) return;

        const handleNativeDrop = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();

            if (isProcessing) return;

            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                setError(null);

                // Manual Validation implementation since we bypassed useDropzone
                // 1. Check Max Files
                if (files.length > 1) {
                    handleRejections([{ errors: [{ code: 'too-many-files', message: 'Too many files' }] }]);
                    return;
                }

                const file = files[0];

                // 2. Check Size
                if (file.size > MAX_SIZE_BYTES) {
                    handleRejections([{ errors: [{ code: 'file-too-large', message: 'File too large' }] }]);
                    return;
                }

                // 3. Check Extension
                const ext = file.name.split('.').pop()?.toLowerCase();
                const validExtensions = ['xls', 'xlsx'];
                if (!validExtensions.includes(ext || '')) {
                    handleRejections([{ errors: [{ code: 'file-invalid-type', message: 'Invalid type' }] }]);
                    return;
                }

                // Valid file!
                console.log('Native Drop File:', file);
                const fileWithPath = file as FileWithPath;
                setSelectedFile(fileWithPath);
                onFilesSelected?.([fileWithPath]);
            }
        };

        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = isProcessing ? 'none' : 'copy';
            }
            // Note: We rely on useDropzone for the 'isDragActive' visual state via onDragEnter/Leave which fire on bubbling? 
            // Actually noDrag: true disables that. 
            // We might lose the 'active' style with noDrag: true.
            // But we need the path.
            // Let's rely on CSS :hover or :active if React Dropzone doesn't update.
            // Or remove noDrag: true if we accept double events, but preventDefault here.
        };

        dropzone.addEventListener('drop', handleNativeDrop);
        dropzone.addEventListener('dragover', handleDragOver);

        return () => {
            dropzone.removeEventListener('drop', handleNativeDrop);
            dropzone.removeEventListener('dragover', handleDragOver);
        };
    }, [isProcessing, onFilesSelected]); // Dependencies

    const handleRemoveFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedFile(null);
        setError(null);
        onFileRemoved?.();
    };

    const handleReset = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedFile(null);
        setError(null);
        onReset?.();
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Extract ref from getRootProps to merge
    const { ref: dropzoneReactRef, ...rootProps } = getRootProps();

    // Show processing state with reset button
    if (isProcessing) {
        const canReset = isCompleted || hasFailed;
        const showError = hasFailed && !isCompleted;

        return (
            <div
                ref={dropzoneRef}
                className={`upload-dropzone dropzone-processing ${isCompleted ? 'dropzone-completed' : ''} ${showError ? 'dropzone-error' : ''}`}
            >
                <div className="dropzone-content">
                    <div className={`dropzone-icon ${isCompleted ? 'dropzone-icon-success' : showError ? 'dropzone-icon-error' : 'dropzone-icon-processing'}`}>
                        {isCompleted ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
                                <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        ) : showError ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </div>

                    <h3 className="dropzone-title">
                        {isCompleted ? 'Procesamiento Completado' : showError ? 'Error en el Procesamiento' : 'Procesamiento en Progreso'}
                    </h3>
                    <p className="dropzone-description">
                        {selectedFile?.name || 'Tu archivo'} {isCompleted ? 'ha sido procesado exitosamente' : showError ? 'no pudo ser procesado' : 'está siendo procesado'}
                    </p>

                    <button
                        className={`btn ${isCompleted ? 'btn-primary' : 'btn-secondary'} dropzone-button`}
                        type="button"
                        onClick={handleReset}
                        disabled={!canReset}
                        style={{ opacity: !canReset ? 0.5 : 1, cursor: !canReset ? 'not-allowed' : 'pointer' }}
                    >
                        Procesar Otro Archivo
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            {...rootProps}
            ref={(node) => {
                // Merge refs
                dropzoneRef.current = node;
                if (typeof dropzoneReactRef === 'function') dropzoneReactRef(node);
                else if (dropzoneReactRef) (dropzoneReactRef as any).current = node;
            }}
            className={`upload-dropzone ${isDragActive ? 'dropzone-dragover' : ''} ${isDragReject ? 'dropzone-reject' : ''} ${selectedFile ? 'dropzone-has-file' : ''} ${error ? 'dropzone-error' : ''}`}
        >
            <input {...getInputProps()} className="dropzone-input" />

            {selectedFile ? (
                <div className="dropzone-file-info">
                    <div className="dropzone-file-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                            <polyline points="14,2 14,8 20,8" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round" strokeLinejoin="round" />
                            <polyline points="10,9 9,9 8,9" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div className="dropzone-file-details">
                        <span className="dropzone-file-name">{selectedFile.name}</span>
                        <span className="dropzone-file-size">{formatFileSize(selectedFile.size)}</span>
                    </div>
                    <button
                        type="button"
                        className="dropzone-remove-btn"
                        onClick={handleRemoveFile}
                        aria-label="Eliminar archivo"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            ) : (
                <div className="dropzone-content">
                    <div className="dropzone-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                            <polyline points="17,8 12,3 7,8" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>

                    <h3 className="dropzone-title">Arrastra y Suelta Archivos Excel Aquí</h3>
                    <p className="dropzone-description">
                        O haz clic para buscar en tu computadora. Formatos soportados: .xls, .xlsx
                    </p>

                    {error && (
                        <div className="dropzone-error-message" style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" strokeLinejoin="round"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" strokeLinejoin="round"></line>
                                </svg>
                                {error}
                            </span>
                        </div>
                    )}

                    <button
                        className="btn btn-primary dropzone-button"
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            open();
                        }}
                    >
                        Buscar Archivos
                    </button>
                </div>
            )}
        </div>
    );
}
