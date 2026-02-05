import type { CurrentBatch } from '../types';
import './BatchStatus.css';

interface BatchStatusProps {
    batch?: CurrentBatch | null;
    hasFile?: boolean;
    onStartProcessing?: () => void;
}

export function BatchStatus({ batch, hasFile = false, onStartProcessing }: BatchStatusProps) {
    const getStepIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <svg className="step-icon step-icon-completed" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="currentColor" />
                        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                );
            case 'in-progress':
                return <div className="step-icon step-icon-progress" />;
            default:
                return <div className="step-icon step-icon-pending" />;
        }
    };

    // Initial/ready state - show start button
    if (!batch || batch.status === 'ready') {
        return (
            <div className="batch-status card">
                <div className="batch-status-ready">
                    <div className={`batch-status-ready-icon ${!hasFile ? 'batch-status-ready-icon-disabled' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                            <polygon points="10,8 16,12 10,16 10,8" fill="currentColor" stroke="none" />
                        </svg>
                    </div>
                    <h3 className="batch-status-ready-title">
                        {hasFile ? 'Ready to Process' : 'Waiting for File'}
                    </h3>
                    <p className="batch-status-ready-description">
                        {hasFile
                            ? 'Click the button below to start processing the uploaded file'
                            : 'Upload an Excel file to enable processing'
                        }
                    </p>
                    <button
                        type="button"
                        className={`btn batch-status-start-btn ${hasFile ? 'btn-success' : 'btn-disabled'}`}
                        onClick={onStartProcessing}
                        disabled={!hasFile}
                    >
                        Start Processing
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="batch-status card">
            <div className="batch-status-header">
                <div>
                    <h3 className="batch-status-title">Current Batch Status</h3>
                    <p className="batch-status-id">Batch ID: {batch.batchId}</p>
                </div>
                <span className={`badge badge-${batch.status}`}>
                    {batch.status.toUpperCase()}
                </span>
            </div>

            <div className="batch-status-timeline">
                {batch.steps.map((step, index) => (
                    <div key={step.id} className={`timeline-step timeline-step-${step.status}`}>
                        <div className="timeline-indicator">
                            {getStepIcon(step.status)}
                            {index < batch.steps.length - 1 && <div className="timeline-line" />}
                        </div>
                        <div className="timeline-content">
                            <span className="timeline-step-name">{step.name}</span>
                            {step.status === 'completed' && step.completedAt && (
                                <span className="timeline-step-detail">Completed at {step.completedAt}</span>
                            )}
                            {step.status === 'in-progress' && (
                                <div className="timeline-progress">
                                    <span className="timeline-step-detail">{step.description}</span>
                                    {step.progress !== undefined && (
                                        <div className="progress-container">
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${step.progress}%` }}
                                                />
                                            </div>
                                            <span className="progress-value">{step.progress}%</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            {step.status === 'pending' && (
                                <span className="timeline-step-detail text-muted">Pending</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

