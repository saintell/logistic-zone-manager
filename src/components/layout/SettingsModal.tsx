import { useState, useEffect } from 'react';
import './SettingsModal.css';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface CacheStats {
    success: boolean;
    totalRecords: number;
    lastUpdated: string | null;
    fileSize: number;
    filePath: string;
}

interface CacheRecord {
    original_address: string;
    normalized_address: string;
    lat: number | null;
    lng: number | null;
    zone: string;
    updated_at: string;
}

interface PaginatedResponse {
    success: boolean;
    records: CacheRecord[];
    total: number;
    page: number;
    pageSize: number;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [stats, setStats] = useState<CacheStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Records state
    const [records, setRecords] = useState<CacheRecord[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingRecord, setEditingRecord] = useState<CacheRecord | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<CacheRecord>>({});

    // Fetch stats when modal opens
    useEffect(() => {
        if (isOpen) {
            setMessage(null);
            fetchStats(() => fetchRecords(1, ''));
        }
    }, [isOpen]);

    // Auto-dismiss message
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const runIpcAction = async (
        action: string,
        payload: any,
        onSuccess: (response: any) => void,
        onError?: () => void
    ) => {
        try {
            const result = await window.ipcRenderer.invoke('execute-python', JSON.stringify({
                process: 'address_cache',
                action,
                ...payload
            }));

            let response;
            try {
                response = JSON.parse(result as string);
            } catch (e) {
                console.error('JSON Parse Error:', result);
                throw new Error('Invalid JSON response');
            }

            onSuccess(response);
        } catch (e: any) {
            console.error('IPC Error:', e);
            setMessage({ type: 'error', text: 'Error: ' + (e.message || e) });
            if (onError) onError();
        }
    };

    const fetchStats = (onComplete?: () => void) => {
        setIsLoading(true);
        runIpcAction('get_stats', {}, (response) => {
            setIsLoading(false);
            if (response.success) {
                setStats(response);
            }
            if (onComplete) onComplete();
        }, () => {
            setIsLoading(false);
        });
    };

    const fetchRecords = (pageNum: number, search: string) => {
        setIsLoading(true);
        runIpcAction('get_records', { page: pageNum, pageSize: 20, search }, (response: PaginatedResponse) => {
            setIsLoading(false);
            if (response.success && Array.isArray(response.records)) {
                setRecords(response.records);
                setTotalRecords(response.total || 0);
                setPage(response.page || 1);
            } else {
                setRecords([]);
                setTotalRecords(0);
            }
        }, () => {
            setIsLoading(false);
            setRecords([]);
            setTotalRecords(0);
        });
    };

    const handleClearCache = () => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar toda la caché? Esto obligará a procesar y geocodificar todas las direcciones nuevamente.')) {
            return;
        }

        setIsClearing(true);
        setMessage(null);

        runIpcAction('clear_cache', {}, (response) => {
            setIsClearing(false);
            if (response.success) {
                setMessage({ type: 'success', text: 'Caché eliminada correctamente' });
                fetchStats(() => fetchRecords(1, ''));
            } else {
                setMessage({ type: 'error', text: 'Error al eliminar caché: ' + response.error });
            }
        }, () => {
            setIsClearing(false);
        });
    };

    const handleDeleteRecord = (key: string) => {
        if (!window.confirm('¿Eliminar este registro?')) return;

        runIpcAction('delete_record', { key }, (response) => {
            if (response.success) {
                setMessage({ type: 'success', text: 'Registro eliminado' });
                fetchStats(() => fetchRecords(page, searchTerm));
            } else {
                setMessage({ type: 'error', text: 'Error: ' + response.error });
            }
        });
    };

    const handleSaveRecord = () => {
        const action = editingRecord ? 'update_record' : 'add_record';
        const payload = editingRecord
            ? { key: editingRecord.original_address, updates: formData }
            : { record: formData };

        runIpcAction(action, payload, (response) => {
            if (response.success) {
                setMessage({ type: 'success', text: editingRecord ? 'Registro actualizado' : 'Registro creado' });
                setShowForm(false);
                setEditingRecord(null);
                setFormData({});
                fetchStats(() => fetchRecords(page, searchTerm));
            } else {
                setMessage({ type: 'error', text: 'Error: ' + response.error });
            }
        });
    };

    const startEdit = (record: CacheRecord) => {
        setEditingRecord(record);
        setFormData({ ...record });
        setShowForm(true);
        setMessage(null);
    };

    const startCreate = () => {
        setEditingRecord(null);
        setFormData({
            original_address: '',
            normalized_address: '',
            zone: '',
            lat: null,
            lng: null
        });
        setShowForm(true);
        setMessage(null);
    };

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const totalPages = Math.ceil(totalRecords / 20);

    return (
        <div className="settings-modal-overlay" onClick={handleOverlayClick}>
            <div className="settings-modal-container">
                <div className="settings-modal-header">
                    <h2 className="settings-modal-title">Gestión de Caché</h2>
                    <button className="settings-modal-close-btn" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <div className="settings-modal-body">
                    <div className="settings-content">
                        {message && (
                            <div className={`settings-message ${message.type}`}>
                                {message.text}
                            </div>
                        )}

                        {/* Loading Overlay */}
                        {isLoading && (
                            <div className="loading-overlay">
                                <div className="spinner"></div>
                                <span>Actualizando...</span>
                            </div>
                        )}

                        <div className="stats-card">
                            <div className="stat-item">
                                <span className="stat-label">Total Registros:</span>
                                <span className="stat-value">{stats?.totalRecords || 0}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Última Actualización:</span>
                                <span className="stat-value">
                                    {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : '-'}
                                </span>
                            </div>
                        </div>

                        {!showForm ? (
                            <>
                                <div className="top-actions">
                                    <input
                                        type="text"
                                        placeholder="Buscar dirección..."
                                        className="form-input search-input"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && fetchRecords(1, searchTerm)}
                                    />
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="btn btn-primary" onClick={startCreate}>
                                            + Nuevo Registro
                                        </button>
                                        <button
                                            className="btn btn-destructive"
                                            onClick={handleClearCache}
                                            disabled={isClearing}
                                        >
                                            Vaciar Todo
                                        </button>
                                    </div>
                                </div>

                                <div className="cache-table-container">
                                    <table className="cache-table">
                                        <thead>
                                            <tr>
                                                <th>Dirección Original</th>
                                                <th>Normalizada</th>
                                                <th>Zona</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {records.map((rec) => (
                                                <tr key={rec.original_address}>
                                                    <td title={rec.original_address}>
                                                        {rec.original_address.length > 30
                                                            ? rec.original_address.substring(0, 30) + '...'
                                                            : rec.original_address}
                                                    </td>
                                                    <td title={rec.normalized_address}>
                                                        {rec.normalized_address.length > 30
                                                            ? rec.normalized_address.substring(0, 30) + '...'
                                                            : rec.normalized_address}
                                                    </td>
                                                    <td>{rec.zone}</td>
                                                    <td>
                                                        <div className="cache-table-actions">
                                                            <button className="btn-icon" onClick={() => startEdit(rec)} title="Editar">
                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                                </svg>
                                                            </button>
                                                            <button className="btn-icon delete" onClick={() => handleDeleteRecord(rec.original_address)} title="Eliminar">
                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                                                    <polyline points="3 6 5 6 21 6" />
                                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {records.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                        No se encontraron registros
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="pagination">
                                    <div className="pagination-info">
                                        Mostrando {records.length} de {totalRecords}
                                    </div>
                                    <div className="pagination-controls">
                                        <button
                                            className="pagination-btn"
                                            disabled={page === 1}
                                            onClick={() => fetchRecords(page - 1, searchTerm)}
                                        >
                                            Anterior
                                        </button>
                                        <span className="pagination-info">
                                            Página {page} de {totalPages || 1}
                                        </span>
                                        <button
                                            className="pagination-btn"
                                            disabled={page >= totalPages}
                                            onClick={() => fetchRecords(page + 1, searchTerm)}
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="cache-form">
                                <h3 className="settings-section-title">
                                    {editingRecord ? 'Editar Registro' : 'Nuevo Registro'}
                                </h3>

                                <div className="form-group">
                                    <label className="form-label">Dirección Original (Clave)</label>
                                    <input
                                        className="form-input"
                                        value={formData.original_address || ''}
                                        onChange={(e) => setFormData({ ...formData, original_address: e.target.value })}
                                        disabled={!!editingRecord} // Key cannot be changed when editing
                                        placeholder="Dirección tal como aparece en el archivo..."
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Dirección Normalizada</label>
                                    <input
                                        className="form-input"
                                        value={formData.normalized_address || ''}
                                        onChange={(e) => setFormData({ ...formData, normalized_address: e.target.value })}
                                        placeholder="Dirección corregida..."
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Zona Asignada</label>
                                    <input
                                        className="form-input"
                                        value={formData.zone || ''}
                                        onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                                        placeholder="Ej: GOLFITOS"
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Latitud</label>
                                        <input
                                            type="number"
                                            step="any"
                                            className="form-input"
                                            value={formData.lat || ''}
                                            onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Longitud</label>
                                        <input
                                            type="number"
                                            step="any"
                                            className="form-input"
                                            value={formData.lng || ''}
                                            onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="form-actions">
                                    <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
                                        Cancelar
                                    </button>
                                    <button className="btn btn-primary" onClick={handleSaveRecord}>
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
