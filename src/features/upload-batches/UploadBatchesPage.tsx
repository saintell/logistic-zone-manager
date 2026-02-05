import { useState } from 'react';
import { UploadDropzone } from './components/UploadDropzone';
import { BatchStatus } from './components/BatchStatus';
import { ProcessingHistory } from './components/ProcessingHistory';
import { StatsCards } from './components/StatsCards';
import type { CurrentBatch, BatchRecord, StatCard } from './types';
import './UploadBatchesPage.css';

// Mock data for demonstration
const mockCurrentBatch: CurrentBatch = {
    batchId: '#8492-AX',
    status: 'processing',
    steps: [
        {
            id: '1',
            name: 'Upload',
            status: 'completed',
            completedAt: '10:42 AM',
        },
        {
            id: '2',
            name: 'Normalizing Addresses',
            status: 'in-progress',
            description: 'Standardizing street names...',
            progress: 64,
        },
        {
            id: '3',
            name: 'Geocoding',
            status: 'pending',
        },
        {
            id: '4',
            name: 'Assigning Zones',
            status: 'pending',
        },
    ],
};

const mockBatches: BatchRecord[] = [
    {
        id: '1',
        name: 'imports_north_region.xlsx',
        batchId: '#8491-NR',
        dateProcessed: 'Oct 24, 2023 14:30',
        records: 12450,
        status: 'completed',
        fileType: 'xlsx',
    },
    {
        id: '2',
        name: 'warehouse_b_daily.csv',
        batchId: '#8490-WB',
        dateProcessed: 'Oct 24, 2023 09:15',
        records: 8320,
        status: 'completed',
        fileType: 'csv',
    },
    {
        id: '3',
        name: 'err_logistics_manifest.xls',
        batchId: '#8489-EM',
        dateProcessed: 'Oct 23, 2023 18:45',
        records: 450,
        status: 'failed',
        fileType: 'xls',
    },
];

const mockStats: StatCard[] = [
    {
        id: '1',
        title: 'Total Records Processed',
        value: '1.2M',
        change: '+12% from last month',
        changeType: 'positive',
        icon: 'chart',
    },
    {
        id: '2',
        title: 'Zones Assigned',
        value: '8',
        subtitle: 'Active delivery regions',
        icon: 'zone',
    },
    {
        id: '3',
        title: 'Avg. Processing Time',
        value: '42s',
        change: '-5s improvement',
        changeType: 'positive',
        icon: 'clock',
    },
];

export function UploadBatchesPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFilesSelected = (files: File[]) => {
        if (files.length > 0) {
            const file = files[0];
            setSelectedFile(file);
            console.log('File selected:', file.name);
            // Use webUtils via preload to get absolute path
            const filePath = window.ipcRenderer.getFilePath(file);

            if (filePath) {
                setSelectedFilePath(filePath);
                console.log('File path:', filePath);
            }
        }
    };

    const handleFileRemoved = () => {
        setSelectedFile(null);
        setSelectedFilePath(null);
        console.log('File removed');
    };

    const handleStartProcessing = async () => {
        const filePath = selectedFilePath;

        if (!filePath) {
            console.error('No file path available');
            return;
        }

        console.log('Starting processing for:', selectedFile?.name || filePath);
        console.log('File path:', filePath);
        setIsProcessing(true);

        try {
            const payload = JSON.stringify({
                process: 'process_file',
                filePath: filePath
            });
            const result = window.ipcRenderer.send('dinamic_method', payload);
            console.log('Python script result:', result);
        } catch (error) {
            console.error('Error running Python script:', error);
        }
    };

    const handleReset = () => {
        setSelectedFile(null);
        setIsProcessing(false);
        console.log('Reset - ready for new file');
    };

    return (
        <div className="upload-batches-page">
            <header className="page-header">
                <h1 className="page-title">Upload & Process Batches</h1>
                <p className="page-description">
                    Import your address lists to normalize data and assign delivery zones automatically.
                    Our system supports all standard logistics formats.
                </p>
            </header>

            <div className="upload-section">
                <div className="upload-section-grid">
                    <UploadDropzone
                        onFilesSelected={handleFilesSelected}
                        onFileRemoved={handleFileRemoved}
                        onReset={handleReset}
                        isProcessing={isProcessing}
                    />
                    <BatchStatus
                        batch={isProcessing ? mockCurrentBatch : null}
                        hasFile={selectedFile !== null}
                        onStartProcessing={handleStartProcessing}
                    />
                </div>
            </div>

            {/* <ProcessingHistory batches={mockBatches} totalBatches={128} /> */}

            {/* <StatsCards stats={mockStats} /> */}
        </div>
    );
}

