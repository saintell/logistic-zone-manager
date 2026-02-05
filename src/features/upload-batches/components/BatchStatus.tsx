import type { CurrentBatch } from '../types';
import './BatchStatus.css';

interface BatchStatusProps {
    batch?: CurrentBatch | null;
    hasFile?: boolean;
    onStartProcessing?: () => void;
    outputFolder?: string | null;
    onSelectOutputFolder?: () => void;
}

export function BatchStatus({ batch, hasFile = false, onStartProcessing, outputFolder, onSelectOutputFolder }: BatchStatusProps) {
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
                        {hasFile ? 'Listo para Procesar' : 'Esperando Archivo'}
                    </h3>

                    <div className="output-folder-section" style={{ margin: '1.5rem 0 1rem', width: '100%', maxWidth: '400px', textAlign: 'left' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#4b5563', marginBottom: '0.5rem' }}>
                            Carpeta de Destino:
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                readOnly
                                value={outputFolder || 'Seleccionar carpeta...'}
                                className="form-control"
                                style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    fontSize: '0.85rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    backgroundColor: '#f3f4f6',
                                    color: outputFolder ? '#111827' : '#9ca3af',
                                    textOverflow: 'ellipsis'
                                }}
                            />
                            <button
                                className="btn btn-secondary"
                                onClick={onSelectOutputFolder}
                                type="button"
                                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                            >
                                Seleccionar
                            </button>
                        </div>
                        {!outputFolder && hasFile && (
                            <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.5rem' }}>
                                * Selecciona una carpeta de destino para continuar.
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        className={`btn batch-status-start-btn ${hasFile && outputFolder ? 'btn-success' : 'btn-disabled'}`}
                        onClick={onStartProcessing}
                        disabled={!hasFile || !outputFolder}
                    >
                        Iniciar Procesamiento
                    </button>

                    {!hasFile && (
                        <p className="batch-status-ready-description" style={{ marginTop: '1rem' }}>
                            Carga un archivo Excel para comenzar.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="batch-status card">
            <div className="batch-status-header">
                <div>
                    <h3 className="batch-status-title">Estado del Lote Actual</h3>
                    <p className="batch-status-id">ID del Lote: {batch.batchId}</p>
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
                                <span className="timeline-step-detail">Completado a las {step.completedAt}</span>
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
                                <span className="timeline-step-detail text-muted">Pendiente</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

