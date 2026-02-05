import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import './UploadDropzone.css';

// Define a type that includes the path property (common in Electron/Node environments)
interface FileWithPath extends File {
    path?: string;
}

interface UploadDropzoneProps {
    onFilesSelected?: (files: FileWithPath[]) => void;
    onFileRemoved?: () => void;
    onReset?: () => void;
    isProcessing?: boolean;
}

export function UploadDropzone({
    onFilesSelected,
    onFileRemoved,
    onReset,
    isProcessing = false
}: UploadDropzoneProps) {
    const [selectedFile, setSelectedFile] = useState<FileWithPath | null>(null);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop: (acceptedFiles) => {
            if (acceptedFiles.length > 0) {
                const file = acceptedFiles[0] as FileWithPath;
                setSelectedFile(file);
                onFilesSelected?.(acceptedFiles as FileWithPath[]);
            }
        },
        accept: {
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'text/csv': ['.csv']
        },
        multiple: false,
        disabled: isProcessing
    });

    const handleRemoveFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedFile(null);
        onFileRemoved?.();
    };

    const handleReset = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedFile(null);
        onReset?.();
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Show processing state with reset button
    if (isProcessing) {
        return (
            <div className="upload-dropzone dropzone-processing">
                <div className="dropzone-content">
                    <div className="dropzone-icon dropzone-icon-processing">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>

                    <h3 className="dropzone-title">Processing in Progress</h3>
                    <p className="dropzone-description">
                        {selectedFile?.name || 'Your file'} is being processed
                    </p>

                    <button
                        className="btn btn-secondary dropzone-button"
                        type="button"
                        onClick={handleReset}
                    >
                        Process Another File
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            {...getRootProps()}
            className={`upload-dropzone ${isDragActive ? 'dropzone-dragover' : ''} ${selectedFile ? 'dropzone-has-file' : ''}`}
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
                        aria-label="Remove file"
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

                    <h3 className="dropzone-title">Drag and Drop Excel Files Here</h3>
                    <p className="dropzone-description">
                        Or click to browse your computer. Supported formats: .xls, .xlsx, .csv
                    </p>

                    <button
                        className="btn btn-primary dropzone-button"
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            open();
                        }}
                    >
                        Browse Files
                    </button>
                </div>
            )}
        </div>
    );
}

