import './Header.css';

export function Header() {
    return (
        <header className="header">
            <div className="header-container">
                <div className="header-left">
                    <a href="/" className="header-logo">
                        <svg className="header-logo-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round" />
                        </svg>
                        <span className="header-logo-text">Procesador de Datos Logísticos</span>
                    </a>
                </div>

                <nav className="header-nav">
                    <a href="/" className="header-nav-link active">Procesar</a>
                    {/* <a href="/history" className="header-nav-link">History</a> */}
                    <a href="/settings" className="header-nav-link">Zonas</a>
                </nav>
            </div>
        </header>
    );
}
