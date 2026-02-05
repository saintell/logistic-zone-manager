// Batch record types
export interface BatchRecord {
    id: string;
    name: string;
    batchId: string;
    dateProcessed: string;
    records: number;
    status: BatchRecordStatus;
    fileType: 'xlsx' | 'xls' | 'csv';
}

export type BatchRecordStatus = 'completed' | 'failed' | 'processing';

// Processing step types
export interface ProcessingStep {
    id: string;
    name: string;
    status: ProcessingStepStatus;
    description?: string;
    progress?: number;
    completedAt?: string;
}

export type ProcessingStepStatus = 'completed' | 'in-progress' | 'pending';

// Current batch status
export interface CurrentBatch {
    batchId: string;
    status: 'ready' | 'processing' | 'completed' | 'failed';
    steps: ProcessingStep[];
}

// Stats types
export interface StatCard {
    id: string;
    title: string;
    value: string;
    change?: string;
    changeType?: 'positive' | 'negative';
    subtitle?: string;
    icon: 'chart' | 'zone' | 'clock';
}
