import type { StatCard } from '../types';
import './StatsCards.css';

interface StatsCardsProps {
    stats: StatCard[];
}

export function StatsCards({ stats }: StatsCardsProps) {
    const getIcon = (iconType: string) => {
        switch (iconType) {
            case 'chart':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                );
            case 'zone':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                );
            case 'clock':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className="stats-cards">
            {stats.map((stat) => (
                <div key={stat.id} className="stat-card card">
                    <div className="stat-header">
                        <span className={`stat-icon stat-icon-${stat.icon}`}>
                            {getIcon(stat.icon)}
                        </span>
                        <span className="stat-title">{stat.title}</span>
                    </div>
                    <div className="stat-value">{stat.value}</div>
                    {stat.change && (
                        <div className={`stat-change stat-change-${stat.changeType}`}>
                            {stat.change}
                        </div>
                    )}
                    {stat.subtitle && (
                        <div className="stat-subtitle">{stat.subtitle}</div>
                    )}
                </div>
            ))}
        </div>
    );
}
