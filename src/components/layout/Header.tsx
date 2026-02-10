import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { SettingsModal } from './SettingsModal';
import { TrackingSearchModal } from './TrackingSearchModal';
import './Header.css';

export function Header() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isTrackingSearchOpen, setIsTrackingSearchOpen] = useState(false);

    return (
        <>
            <header className="header">
                <div className="header-container">
                    <div className="header-left">
                        <Link to="/" className="header-logo">
                            <svg className="header-logo-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round" />
                            </svg>
                            <span className="header-logo-text">Procesador de Datos Logísticos</span>
                        </Link>
                    </div>

                    <nav className="header-nav">
                        <NavLink
                            to="/"
                            className={({ isActive }) => `header-nav-link ${isActive ? 'active' : ''}`}
                            end
                        >
                            Procesar
                        </NavLink>
                        <NavLink
                            to="/zones"
                            className={({ isActive }) => `header-nav-link ${isActive ? 'active' : ''}`}
                        >
                            Zonas
                        </NavLink>
                    </nav>
                    <div className="header-right">
                        <button
                            className="header-icon-btn"
                            onClick={() => setIsTrackingSearchOpen(true)}
                            data-tooltip="Buscar por Tracking"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="m21 21-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <button
                            className="header-icon-btn"
                            onClick={() => setIsSettingsOpen(true)}
                            data-tooltip="Gestionar Caché"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <TrackingSearchModal
                isOpen={isTrackingSearchOpen}
                onClose={() => setIsTrackingSearchOpen(false)}
            />
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </>
    );
}

