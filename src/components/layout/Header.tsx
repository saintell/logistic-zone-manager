import { NavLink, Link } from 'react-router-dom';
import './Header.css';

export function Header() {
    return (
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
            </div>
        </header>
    );
}

