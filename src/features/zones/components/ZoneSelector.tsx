import './ZoneSelector.css';

// Type definitions for zones
export interface Zone {
    id: string;
    name: string;
    stopsCount: number;
    coordinates?: {
        lat: number;
        lng: number;
    };
    indicatorColor?: 'north' | 'south' | 'downtown' | 'west' | 'default';
}

interface ZoneSelectorProps {
    title?: string;
    subtitle?: string;
    region?: string;
    zones: Zone[];
    selectedZones?: string[];
    multiSelect?: boolean;
    showCoordinates?: boolean;
    onZoneSelect?: (zoneId: string) => void;
    onZoneDeselect?: (zoneId: string) => void;
    onZoneClick?: (zoneId: string) => void;
    onAddZone?: () => void;
}

export function ZoneSelector({
    title = 'Delivery Zones',
    subtitle,
    region = 'Austin, TX Region',
    zones,
    selectedZones = [],
    multiSelect = false,
    showCoordinates = false,
    onZoneClick,
    onAddZone,
}: ZoneSelectorProps) {
    // Helper to check if a zone is selected
    const isSelected = (zoneId: string) => selectedZones.includes(zoneId);

    // Helper to get indicator class
    const getIndicatorClass = (color?: Zone['indicatorColor']) => {
        switch (color) {
            case 'north':
                return 'zone-indicator-north';
            case 'south':
                return 'zone-indicator-south';
            case 'downtown':
                return 'zone-indicator-downtown';
            case 'west':
                return 'zone-indicator-west';
            default:
                return 'zone-indicator-default';
        }
    };

    // Format coordinates for display
    const formatCoordinates = (coords: Zone['coordinates']) => {
        if (!coords) return '';
        const latDir = coords.lat >= 0 ? 'N' : 'S';
        const lngDir = coords.lng >= 0 ? 'E' : 'W';
        return `${Math.abs(coords.lat).toFixed(4)}° ${latDir}, ${Math.abs(coords.lng).toFixed(4)}° ${lngDir}`;
    };

    return (
        <div className="zone-selector">
            {/* Header */}
            <div className="zone-selector-header">
                <div>
                    <h3 className="zone-selector-title">{title}</h3>
                    {subtitle && <p className="zone-selector-subtitle">{subtitle}</p>}
                </div>
                <div className="zone-selector-header-actions">
                    {region && (
                        <div className="zone-selector-region">
                            <svg className="zone-selector-region-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>{region}</span>
                        </div>
                    )}
                    {onAddZone && (
                        <button className="btn btn-primary zone-add-btn" onClick={onAddZone}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Agregar Zona
                        </button>
                    )}
                </div>
            </div>

            {/* Zone List */}
            <div className="zone-list">
                {zones.length === 0 ? (
                    <div className="zone-empty">
                        <svg className="zone-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="3,6 12,2 21,6 21,18 12,22 3,18" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="12" y1="22" x2="12" y2="10" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="12" y1="10" x2="3" y2="6" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="12" y1="10" x2="21" y2="6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="zone-empty-title">No zones available</p>
                        <p className="zone-empty-description">Create zones to start managing deliveries</p>
                    </div>
                ) : (
                    zones.map((zone) => (
                        <div
                            key={zone.id}
                            className={`zone-item ${isSelected(zone.id) ? 'zone-item-selected' : ''}`}
                            role="button"
                            tabIndex={0}
                            aria-pressed={isSelected(zone.id)}
                            onClick={() => onZoneClick?.(zone.id)}
                        >
                            {/* Multiselect checkbox */}
                            {multiSelect && (
                                <div className={`zone-checkbox ${isSelected(zone.id) ? 'zone-checkbox-checked' : ''}`}>
                                    <svg className="zone-checkbox-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <polyline points="20,6 9,17 4,12" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            )}

                            {/* Zone indicator */}
                            <div className={`zone-indicator ${getIndicatorClass(zone.indicatorColor)}`} />

                            {/* Zone content */}
                            <div className="zone-content">
                                <span className="zone-name">{zone.name}</span>
                                <div className="zone-meta">
                                    <span className="zone-stops">
                                        <span className="zone-stops-count">{zone.stopsCount}</span>
                                        {' active stops'}
                                    </span>
                                    {showCoordinates && zone.coordinates && (
                                        <span className="zone-coordinates">
                                            {formatCoordinates(zone.coordinates)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Chevron icon */}
                            <svg className="zone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9,18 15,12 9,6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
