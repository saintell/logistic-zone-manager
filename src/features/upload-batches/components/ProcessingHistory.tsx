import type { BatchRecord } from '../types';
import './ProcessingHistory.css';

interface ProcessingHistoryProps {
    batches: BatchRecord[];
    totalBatches: number;
}

export function ProcessingHistory({ batches, totalBatches }: ProcessingHistoryProps) {
    const getFileIcon = (fileType: string) => {
        const colors: Record<string, string> = {
            xlsx: '#22c55e',
            xls: '#ef4444',
            csv: '#3b82f6',
        };

        return (
            <div className="file-icon" style={{ backgroundColor: colors[fileType] || colors.csv }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        );
    };

    const getStatusBadge = (status: string) => {
        return (
            <span className={`badge badge-${status}`}>
                <span className={`status-dot status-${status}`}></span>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <div className="processing-history">
            <div className="processing-history-header">
                <h2 className="processing-history-title">Recent Processing History</h2>
                <a href="/history" className="view-all-link">View All History</a>
            </div>

            <div className="history-table-container">
                <table className="history-table">
                    <thead>
                        <tr>
                            <th>Batch Name</th>
                            <th>Date Processed</th>
                            <th>Records</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {batches.map((batch) => (
                            <tr key={batch.id}>
                                <td>
                                    <div className="batch-name-cell">
                                        {getFileIcon(batch.fileType)}
                                        <div className="batch-name-info">
                                            <span className="batch-name">{batch.name}</span>
                                            <span className="batch-id">ID: {batch.batchId}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="text-secondary">{batch.dateProcessed}</td>
                                <td>{batch.records.toLocaleString()}</td>
                                <td>{getStatusBadge(batch.status)}</td>
                                <td>
                                    <div className="actions-cell">
                                        {batch.status === 'completed' && (
                                            <button className="btn btn-secondary btn-sm">
                                                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                                                    <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
                                                    <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                Download Report
                                            </button>
                                        )}
                                        {batch.status === 'failed' && (
                                            <div className="failed-actions">
                                                <button className="icon-btn" title="View Details">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                                                        <line x1="12" y1="16" x2="12" y2="12" strokeLinecap="round" strokeLinejoin="round" />
                                                        <line x1="12" y1="8" x2="12.01" y2="8" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </button>
                                                <button className="icon-btn" title="Retry">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="23 4 23 10 17 10" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="history-footer">
                <span className="history-count">Showing {batches.length} of {totalBatches} batches</span>
                <div className="pagination">
                    <button className="pagination-btn" disabled>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <button className="pagination-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
