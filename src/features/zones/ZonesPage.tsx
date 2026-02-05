import { useState, useEffect, useRef, useCallback } from 'react';
import { ZoneSelector, type Zone } from './components/ZoneSelector';
import { AddZoneModal, type ZoneData } from './components/AddZoneModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import './ZonesPage.css';

// Color options for zones
const zoneColors: Zone['indicatorColor'][] = ['north', 'south', 'downtown', 'west', 'default'];

// Interface for Python script response
interface ZonesResponse {
    success: boolean;
    zones?: ZoneData[];
    zone?: ZoneData;
    message?: string;
    error?: string;
}

export function ZonesPage() {
    const [zones, setZones] = useState<Zone[]>([]);
    const [zonesData, setZonesData] = useState<ZoneData[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingZone, setEditingZone] = useState<ZoneData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Confirmation Modal State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [zoneToDelete, setZoneToDelete] = useState<string | null>(null);

    // Track pending action to know which response we're waiting for
    const pendingAction = useRef<'get_zones' | 'save_zone' | 'delete_zone' | null>(null);

    // Process zones data and update state
    const processZonesData = useCallback((zonesData: ZoneData[]) => {
        setZonesData(zonesData);
        const displayZones: Zone[] = zonesData.map((zd, index) => ({
            id: zd.id,
            name: zd.name,
            stopsCount: zd.points?.length || 0,
            indicatorColor: zoneColors[index % zoneColors.length],
        }));
        setZones(displayZones);
    }, []);

    // Single IPC handler - set up once on mount
    useEffect(() => {
        const handleResponse = (...args: unknown[]) => {
            const data = args[1] as string;
            try {
                const response: ZonesResponse = JSON.parse(data);

                if (pendingAction.current === 'get_zones') {
                    if (response.success && response.zones) {
                        processZonesData(response.zones);
                    }
                    setIsLoading(false);
                } else if (pendingAction.current === 'save_zone') {
                    if (response.success) {
                        // Reload zones after saving
                        pendingAction.current = 'get_zones';
                        const payload = JSON.stringify({
                            process: 'zones_manager',
                            action: 'get_zones'
                        });
                        window.ipcRenderer.send('dinamic_method', payload);
                    } else {
                        console.error('Error saving zone:', response.error);
                    }
                } else if (pendingAction.current === 'delete_zone') {
                    if (response.success) {
                        // Reload zones after deleting
                        pendingAction.current = 'get_zones';
                        const payload = JSON.stringify({
                            process: 'zones_manager',
                            action: 'get_zones'
                        });
                        window.ipcRenderer.send('dinamic_method', payload);
                    } else {
                        console.error('Error deleting zone:', response.error);
                    }
                }
            } catch (e) {
                console.error('Error parsing zones response:', e);
                setIsLoading(false);
            }
        };

        // Add listener only once
        window.ipcRenderer.on('zones_manager', handleResponse);

        // Initial load
        pendingAction.current = 'get_zones';
        const payload = JSON.stringify({
            process: 'zones_manager',
            action: 'get_zones'
        });
        window.ipcRenderer.send('dinamic_method', payload);

        // Cleanup on unmount
        return () => {
            window.ipcRenderer.off('zones_manager', handleResponse);
        };
    }, [processZonesData]);

    const handleOpenModal = () => {
        setEditingZone(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingZone(null);
    };

    const handleZoneClick = (zoneId: string) => {
        const zoneData = zonesData.find(z => z.id === zoneId);
        if (zoneData) {
            setEditingZone(zoneData);
            setIsModalOpen(true);
        }
    };

    const handleSaveZone = (zoneData: ZoneData) => {
        pendingAction.current = 'save_zone';
        const payload = JSON.stringify({
            process: 'zones_manager',
            action: 'save_zone',
            zone: zoneData
        });
        window.ipcRenderer.send('dinamic_method', payload);
    };

    const handleDeleteClick = (zoneId: string) => {
        setZoneToDelete(zoneId);
        setIsConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (zoneToDelete) {
            pendingAction.current = 'delete_zone';
            const payload = JSON.stringify({
                process: 'zones_manager',
                action: 'delete_zone',
                zoneId: zoneToDelete
            });
            window.ipcRenderer.send('dinamic_method', payload);
        }
    };

    return (
        <div className="zones-page">
            <header className="zones-header">
                <h1 className="zones-title">Gestión de Zonas</h1>
                <p className="zones-description">
                    Administra las zonas de entrega. Selecciona una zona para ver detalles o puntos cardinales.
                </p>
            </header>

            <div className="zones-content">
                {isLoading ? (
                    <div className="zones-loading">Cargando zonas...</div>
                ) : (
                    <ZoneSelector
                        title="Zonas de Entrega"
                        region=""
                        zones={zones}
                        showCoordinates={true}
                        onAddZone={handleOpenModal}
                        onZoneClick={handleZoneClick}
                        onDeleteZone={handleDeleteClick}
                    />
                )}
            </div>

            {/* Add/Edit Zone Modal */}
            <AddZoneModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveZone}
                editingZone={editingZone}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDelete}
                title="Eliminar Zona"
                message="¿Estás seguro de que deseas eliminar esta zona? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                isDestructive={true}
            />
        </div>
    );
}
