import { UploadDropzone } from './components/UploadDropzone';
import { BatchStatus } from './components/BatchStatus';
import './UploadBatchesPage.css';
import { useBatchProcessing } from './context/BatchProcessingContext';

export function UploadBatchesPage() {
    const {
        selectedFile,
        isProcessing,
        currentBatch,
        outputFolder,
        handleFilesSelected,
        handleFileRemoved,
        handleStartProcessing,
        handleReset,
        handleSelectOutputFolder
    } = useBatchProcessing();

    return (
        <div className="upload-batches-page">
            <header className="page-header">
                <h1 className="page-title">Cargar y Procesar Lotes</h1>
                <p className="page-description">
                    Importa tus listas de direcciones para normalizar datos y asignar zonas de entrega automáticamente.
                </p>
            </header>

            <div className="upload-section">
                <div className="upload-section-grid">
                    <UploadDropzone
                        file={selectedFile}
                        onFilesSelected={handleFilesSelected}
                        onFileRemoved={handleFileRemoved}
                        onReset={handleReset}
                        isProcessing={isProcessing}
                        isCompleted={currentBatch?.status === 'completed'}
                    />
                    <BatchStatus
                        batch={currentBatch}
                        hasFile={selectedFile !== null}
                        onStartProcessing={handleStartProcessing}
                        outputFolder={outputFolder}
                        onSelectOutputFolder={handleSelectOutputFolder}
                    />
                </div>
            </div>
        </div>
    );
}


