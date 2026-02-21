import { useState, useEffect } from 'react';
import './TrackingSearchModal.css';

interface TrackingSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SearchResult {
    original_address: string;
    normalized_address: string;
    lat: number | null;
    lng: number | null;
    zone: string;
    tracking_number: string;
    cliente: string;
    updated_at: string;
}

interface SearchResponse {
    success: boolean;
    results: SearchResult[];
    count: number;
    error?: string;
}

export function TrackingSearchModal({ isOpen, onClose }: TrackingSearchModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
            setResults([]);
            setError(null);
            setHasSearched(false);
        }
    }, [isOpen]);

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            setError('Por favor ingresa un número de tracking');
            return;
        }

        setIsSearching(true);
        setError(null);
        setHasSearched(true);

        try {
            const result = await window.ipcRenderer.invoke('execute-python', JSON.stringify({
                process: 'address_cache',
                action: 'search_by_tracking',
                tracking_number: searchTerm.trim()
            }));

            let response: SearchResponse;
            try {
                response = JSON.parse(result as string);
            } catch (e) {
                console.error('JSON Parse Error:', result);
                throw new Error('Respuesta inválida del servidor');
            }

            if (response.success) {
                setResults(response.results || []);
            } else {
                setError(response.error || 'Error al buscar');
            }
        } catch (e: any) {
            console.error('Search Error:', e);
            setError('Error al buscar: ' + (e.message || e));
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="tracking-modal-overlay" onClick={handleOverlayClick}>
            <div className="tracking-modal-container">
                <div className="tracking-modal-header">
                    <h2 className="tracking-modal-title">Buscar por Tracking Number</h2>
                    <button className="tracking-modal-close-btn" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <div className="tracking-modal-body">
                    {/* Search Input */}
                    <div className="tracking-search-section">
                        <div className="tracking-search-input-group">
                            <input
                                type="text"
                                className="tracking-search-input"
                                placeholder="Ingresa el tracking number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus
                            />
                            <button
                                className="btn btn-primary tracking-search-btn"
                                onClick={handleSearch}
                                disabled={isSearching}
                            >
                                {isSearching ? (
                                    <>
                                        <span className="spinner-small"></span>
                                        Buscando...
                                    </>
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" style={{ marginRight: '8px' }}>
                                            <circle cx="11" cy="11" r="8" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="m21 21-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Buscar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="tracking-error-message">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* Results */}
                    {hasSearched && !error && (
                        <div className="tracking-results-section">
                            <div className="tracking-results-header">
                                <h3>Resultados de Búsqueda</h3>
                                <span className="tracking-results-count">{results.length} encontrado(s)</span>
                            </div>

                            {results.length === 0 ? (
                                <div className="tracking-no-results">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                                        <circle cx="11" cy="11" r="8" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="m21 21-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <p>No se encontraron registros con ese tracking number</p>
                                </div>
                            ) : (
                                <div className="tracking-results-list">
                                    {results.map((result, index) => (
                                        <div key={index} className="tracking-result-card">
                                            <div className="tracking-result-row">
                                                <span className="tracking-result-label">Tracking Number:</span>
                                                <span className="tracking-result-value tracking-highlight">{result.tracking_number}</span>
                                            </div>
                                            <div className="tracking-result-row">
                                                <span className="tracking-result-label">Cliente:</span>
                                                <span className="tracking-result-value">{result.cliente || 'N/A'}</span>
                                            </div>
                                            <div className="tracking-result-row">
                                                <span className="tracking-result-label">Dirección:</span>
                                                <span className="tracking-result-value">{result.normalized_address || result.original_address}</span>
                                            </div>
                                            <div className="tracking-result-row">
                                                <span className="tracking-result-label">Zona:</span>
                                                <span className="tracking-result-value tracking-zone">{result.zone || 'Sin asignar'}</span>
                                            </div>
                                            {result.lat && result.lng && (
                                                <div className="tracking-result-row">
                                                    <span className="tracking-result-label">Coordenadas:</span>
                                                    <span className="tracking-result-value tracking-coords">
                                                        {result.lat.toFixed(6)}, {result.lng.toFixed(6)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
