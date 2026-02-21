import { useState, useEffect } from 'react';
import './AddZoneModal.css';

export interface CardinalPoint {
    id: string;
    label: string;
    lat: string;
    lng: string;
}

export interface ZoneData {
    id: string;
    name: string;
    points: CardinalPoint[];
}

interface ZoneModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (zone: ZoneData) => void;
    editingZone?: ZoneData | null;
}

interface ValidationErrors {
    name?: string;
    points?: string;
    pointsData?: string;
}

const MIN_CARDINAL_POINTS = 4;

// Default cardinal points
const createDefaultPoints = (): CardinalPoint[] => [
    { id: 'north', label: 'N', lat: '', lng: '' },
    { id: 'east', label: 'E', lat: '', lng: '' },
    { id: 'south', label: 'S', lat: '', lng: '' },
    { id: 'west', label: 'W', lat: '', lng: '' },
];

export function AddZoneModal({ isOpen, onClose, onSave, editingZone }: ZoneModalProps) {
    const [zoneName, setZoneName] = useState('');
    const [cardinalPoints, setCardinalPoints] = useState<CardinalPoint[]>(createDefaultPoints());
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [touched, setTouched] = useState<{ name: boolean; points: boolean }>({ name: false, points: false });

    // Reset form when modal opens/closes or when editing zone changes
    useEffect(() => {
        if (isOpen) {
            if (editingZone) {
                setZoneName(editingZone.name);
                setCardinalPoints(editingZone.points.length >= MIN_CARDINAL_POINTS
                    ? editingZone.points
                    : createDefaultPoints());
            } else {
                setZoneName('');
                setCardinalPoints(createDefaultPoints());
            }
            setErrors({});
            setTouched({ name: false, points: false });
        }
    }, [isOpen, editingZone]);

    if (!isOpen) return null;

    const isEditing = !!editingZone;

    // Validation function
    const validate = (): ValidationErrors => {
        const newErrors: ValidationErrors = {};

        // Name validation
        if (!zoneName.trim()) {
            newErrors.name = 'El nombre de la zona es obligatorio';
        }

        // Points count validation
        if (cardinalPoints.length < MIN_CARDINAL_POINTS) {
            newErrors.points = `Se requieren mínimo ${MIN_CARDINAL_POINTS} puntos cardinales`;
        }

        // Points data validation - check if all points have lat and lng
        const incompletePoints = cardinalPoints.filter(p => !p.lat.trim() || !p.lng.trim());
        if (incompletePoints.length > 0) {
            newErrors.pointsData = `Todos los puntos deben tener latitud y longitud`;
        }

        return newErrors;
    };

    const isFormValid = (): boolean => {
        const validationErrors = validate();
        return Object.keys(validationErrors).length === 0;
    };

    const handleAddPoint = () => {
        const newPoint: CardinalPoint = {
            id: `point-${Date.now()}`,
            label: `P${cardinalPoints.length + 1}`,
            lat: '',
            lng: '',
        };
        setCardinalPoints([...cardinalPoints, newPoint]);
    };

    const handleRemovePoint = (id: string) => {
        // Don't allow removing if at minimum points
        if (cardinalPoints.length <= MIN_CARDINAL_POINTS) {
            setErrors(prev => ({
                ...prev,
                points: `No se pueden eliminar más puntos. Mínimo ${MIN_CARDINAL_POINTS} requeridos.`
            }));
            return;
        }
        setCardinalPoints(cardinalPoints.filter(p => p.id !== id));
        setErrors(prev => ({ ...prev, points: undefined }));
    };

    const handlePointChange = (id: string, field: 'lat' | 'lng', value: string) => {
        setCardinalPoints(cardinalPoints.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        ));
        // Clear points data error when user types
        if (errors.pointsData) {
            setErrors(prev => ({ ...prev, pointsData: undefined }));
        }
    };

    const handleNameChange = (value: string) => {
        setZoneName(value);
        if (touched.name && value.trim()) {
            setErrors(prev => ({ ...prev, name: undefined }));
        }
    };

    const handleNameBlur = () => {
        setTouched(prev => ({ ...prev, name: true }));
        if (!zoneName.trim()) {
            setErrors(prev => ({ ...prev, name: 'El nombre de la zona es obligatorio' }));
        }
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleSave = () => {
        // Mark all as touched
        setTouched({ name: true, points: true });

        const validationErrors = validate();
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            return;
        }

        const zone: ZoneData = {
            id: editingZone?.id || `zone-${Date.now()}`,
            name: zoneName.trim(),
            points: cardinalPoints,
        };

        onSave(zone);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container">
                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-title">
                        {isEditing ? 'Editar Zona' : 'Agregar Nueva Zona'}
                    </h2>
                    <button className="modal-close-btn" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Zone Name */}
                    <div className="form-group">
                        <label className="form-label">
                            Nombre de la Zona <span className="form-required">*</span>
                        </label>
                        <input
                            type="text"
                            className={`form-input ${errors.name ? 'form-input-error' : ''}`}
                            placeholder="Ej: Zona Norte, Centro Comercial..."
                            value={zoneName}
                            onChange={(e) => handleNameChange(e.target.value)}
                            onBlur={handleNameBlur}
                        />
                        {errors.name && <span className="form-error">{errors.name}</span>}
                    </div>

                    {/* Cardinal Points */}
                    <div className="cardinal-section">
                        <div className="cardinal-section-header">
                            <span className="cardinal-section-title">
                                Puntos Cardinales <span className="form-required">*</span>
                            </span>
                            <span className="cardinal-count">
                                {cardinalPoints.length} / mín. {MIN_CARDINAL_POINTS}
                            </span>
                        </div>

                        {(errors.points || errors.pointsData) && (
                            <div className="cardinal-error">
                                {errors.points || errors.pointsData}
                            </div>
                        )}

                        <div className="cardinal-list">
                            {cardinalPoints.map((point) => (
                                <div key={point.id} className="cardinal-item">
                                    <div className="cardinal-icon">
                                        {point.label}
                                    </div>
                                    <div className="cardinal-inputs">
                                        <input
                                            type="text"
                                            className={`cardinal-input ${touched.points && !point.lat.trim() ? 'cardinal-input-error' : ''}`}
                                            placeholder="Latitud"
                                            value={point.lat}
                                            onChange={(e) => handlePointChange(point.id, 'lat', e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            className={`cardinal-input ${touched.points && !point.lng.trim() ? 'cardinal-input-error' : ''}`}
                                            placeholder="Longitud"
                                            value={point.lng}
                                            onChange={(e) => handlePointChange(point.id, 'lng', e.target.value)}
                                        />
                                    </div>
                                    {cardinalPoints.length > MIN_CARDINAL_POINTS && (
                                        <button
                                            className="cardinal-remove-btn"
                                            onClick={() => handleRemovePoint(point.id)}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" strokeLinejoin="round" />
                                                <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Add Point Button */}
                        <button className="add-point-btn" onClick={handleAddPoint}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Agregar Punto Cardinal
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={!isFormValid()}
                    >
                        {isEditing ? 'Guardar Cambios' : 'Guardar Zona'}
                    </button>
                </div>
            </div>
        </div>
    );
}
