import type { ReactNode } from 'react';
import { Header } from './Header';
import './Layout.css';

interface LayoutProps {
    children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
    return (
        <div className="layout">
            <Header />
            <main className="layout-main">
                {children}
            </main>
        </div>
    );
}
