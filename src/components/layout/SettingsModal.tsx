import { useState, useEffect, useRef } from 'react';
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Records state
    const [records, setRecords] = useState<CacheRecord[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingRecord, setEditingRecord] = useState<CacheRecord | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<CacheRecord>>({});

    // Tabs state
    const [activeTab, setActiveTab] = useState<'cache' | 'geocoding'>('cache');

    // Geocoding Settings State
    const [geocodeCountry, setGeocodeCountry] = useState(
        localStorage.getItem('geocodeCountry') || 'Colombia'
    );
    const [geocodeCity, setGeocodeCity] = useState(
        localStorage.getItem('geocodeCity') || 'Bogotá'
    );

    // Persist geocoding settings on change
    useEffect(() => {
        localStorage.setItem('geocodeCountry', geocodeCountry);
        localStorage.setItem('geocodeCity', geocodeCity);
    }, [geocodeCountry, geocodeCity]);

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

    const handleExport = async () => {
        try {
            const folder = await window.ipcRenderer.invoke('select-directory') as string | null;
            if (folder) {
                setIsLoading(true);
                runIpcAction('export_excel', { output_dir: folder }, (response) => {
                    setIsLoading(false);
                    if (response.success) {
                        setMessage({ type: 'success', text: response.message });
                    } else {
                        setMessage({ type: 'error', text: 'Error al exportar: ' + response.error });
                    }
                }, () => {
                    setIsLoading(false);
                });
            }
        } catch (error) {
            console.error('Error selecting folder:', error);
        }
    };

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Reset input so the same file can be selected again if needed
        event.target.value = '';

        let filePath = window.ipcRenderer.getFilePath(file);
        if (!filePath && 'path' in file) {
            filePath = (file as any).path;
        }

        if (filePath) {
            setIsLoading(true);
            runIpcAction('import_excel', { file_path: filePath }, (response) => {
                setIsLoading(false);
                if (response.success) {
                    setMessage({ type: 'success', text: response.message });
                    fetchStats(() => fetchRecords(1, ''));
                } else {
                    setMessage({ type: 'error', text: 'Error al importar: ' + response.error });
                }
            }, () => {
                setIsLoading(false);
            });
        } else {
            setMessage({ type: 'error', text: 'No se pudo obtener la ruta del archivo.' });
        }
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
                    <h2 className="settings-modal-title">Configuración</h2>
                    <button className="settings-modal-close-btn" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <div className="settings-tabs">
                    <button
                        className={`settings-tab ${activeTab === 'cache' ? 'active' : ''}`}
                        onClick={() => setActiveTab('cache')}
                    >
                        Gestión de Caché
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'geocoding' ? 'active' : ''}`}
                        onClick={() => setActiveTab('geocoding')}
                    >
                        Geocodificación
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

                        {activeTab === 'cache' && !showForm && (
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
                                        <button className="btn btn-primary" onClick={startCreate} title="Nuevo Registro">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                                <line x1="12" y1="5" x2="12" y2="19" />
                                                <line x1="5" y1="12" x2="19" y2="12" />
                                            </svg> Nuevo
                                        </button>
                                        <button className="btn btn-secondary" onClick={handleExport} title="Exportar a Excel">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="7 10 12 15 17 10" />
                                                <line x1="12" y1="15" x2="12" y2="3" />
                                            </svg> Exportar
                                        </button>
                                        <input
                                            type="file"
                                            accept=".xlsx,.xls"
                                            style={{ display: 'none' }}
                                            ref={fileInputRef}
                                            onChange={handleFileSelected}
                                        />
                                        <button className="btn btn-secondary" onClick={handleImportClick} title="Importar desde Excel">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="17 8 12 3 7 8" />
                                                <line x1="12" y1="3" x2="12" y2="15" />
                                            </svg> Importar
                                        </button>
                                        <button
                                            className="btn btn-destructive"
                                            onClick={handleClearCache}
                                            disabled={isClearing}
                                            title="Vaciar Todo"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                <line x1="10" y1="11" x2="10" y2="17" />
                                                <line x1="14" y1="11" x2="14" y2="17" />
                                            </svg> Vaciar
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
                        )}

                        {activeTab === 'cache' && showForm && (
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

                        {activeTab === 'geocoding' && (
                            <div className="geocoding-settings animate-fade-in">
                                <div className="settings-section">
                                    <h3 className="settings-section-title">Parámetros de Geocodificación</h3>
                                    <p className="settings-section-desc" style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                        Configura el contexto geográfico que el algoritmo utilizará durante el enriquecimiento de direcciones. Esto mejora drásticamente la precisión.
                                    </p>

                                    <div className="form-group">
                                        <label className="form-label">País Central</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={geocodeCountry}
                                            onChange={(e) => setGeocodeCountry(e.target.value)}
                                            placeholder="Ej: Colombia"
                                        />
                                        <span className="form-hint" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                                            Limita la búsqueda a un país específico (Obligatorio).
                                        </span>
                                    </div>

                                    <div className="form-group" style={{ marginTop: '1rem' }}>
                                        <label className="form-label">Ciudad o Localidad (Opcional)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={geocodeCity}
                                            onChange={(e) => setGeocodeCity(e.target.value)}
                                            placeholder="Ej: Bogotá"
                                        />
                                        <span className="form-hint" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                                            Priorizará resultados dentro de esta región, reduciendo falsos positivos de barrios homónimos en otras ciudades.
                                        </span>
                                    </div>

                                    <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ color: 'var(--color-info, #3b82f6)' }}>
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="12" y1="16" x2="12" y2="12" />
                                                <line x1="12" y1="8" x2="12.01" y2="8" />
                                            </svg>
                                            Guardado Automático
                                        </h4>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                                            Estos valores se guardan en tiempo real y se aplicarán al siguiente archivo que proceses en el Panel de Extracción. Las direcciones que ya están en caché no se verán afectadas.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
