'use client';

import { useState } from 'react';
import { useAppStore, ChatSession } from '@/lib/state-machine';
import { ConfirmModal } from '@/components/ConfirmModal';
import styles from './Sidebar.module.css';

// Icons
const PlusIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const MessageIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);

const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

const CloseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const SparkleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
);

function formatDate(date: Date): string {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

function SessionItem({ 
    session, 
    isActive, 
    onSelect, 
    onDelete 
}: { 
    session: ChatSession; 
    isActive: boolean; 
    onSelect: () => void; 
    onDelete: () => void;
}) {
    const [showDelete, setShowDelete] = useState(false);

    return (
        <div 
            className={`${styles.sessionItem} ${isActive ? styles.active : ''}`}
            onClick={onSelect}
            onMouseEnter={() => setShowDelete(true)}
            onMouseLeave={() => setShowDelete(false)}
        >
            <div className={styles.sessionIcon}>
                <MessageIcon />
            </div>
            <div className={styles.sessionContent}>
                <span className={styles.sessionTitle}>{session.title}</span>
                <span className={styles.sessionMeta}>
                    {formatDate(session.updatedAt)}
                    {session.state === 'PRESENTING' && (
                        <span className={styles.completeBadge}>
                            <CheckIcon /> Complete
                        </span>
                    )}
                </span>
            </div>
            {showDelete && (
                <button 
                    className={styles.deleteButton}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    title="Delete chat"
                >
                    <TrashIcon />
                </button>
            )}
        </div>
    );
}

export function Sidebar() {
    const { 
        sessions, 
        currentSessionId, 
        isSidebarOpen,
        createNewSession, 
        switchSession, 
        deleteSession,
        toggleSidebar 
    } = useAppStore();
    
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

    const handleNewChat = () => {
        createNewSession();
        // On mobile, close sidebar after creating new chat
        if (window.innerWidth < 768) {
            toggleSidebar();
        }
    };

    const handleSelectSession = (sessionId: string) => {
        switchSession(sessionId);
        // On mobile, close sidebar after selecting
        if (window.innerWidth < 768) {
            toggleSidebar();
        }
    };

    const handleDeleteClick = (sessionId: string) => {
        setSessionToDelete(sessionId);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (sessionToDelete) {
            deleteSession(sessionToDelete);
        }
        setDeleteModalOpen(false);
        setSessionToDelete(null);
    };

    const handleCancelDelete = () => {
        setDeleteModalOpen(false);
        setSessionToDelete(null);
    };

    // Group sessions by date
    const groupedSessions = sessions.reduce((groups, session) => {
        const date = formatDate(session.updatedAt);
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(session);
        return groups;
    }, {} as Record<string, ChatSession[]>);

    return (
        <>
            {/* Overlay for mobile */}
            {isSidebarOpen && (
                <div className={styles.overlay} onClick={toggleSidebar} />
            )}
            
            <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
                {/* Header */}
                <div className={styles.sidebarHeader}>
                    <div className={styles.logoMini}>
                        <SparkleIcon />
                        <span>ResearchAI</span>
                    </div>
                    <button className={styles.closeButton} onClick={toggleSidebar}>
                        <CloseIcon />
                    </button>
                </div>

                {/* New Chat Button */}
                <button className={styles.newChatButton} onClick={handleNewChat}>
                    <PlusIcon />
                    <span>New Research</span>
                </button>

                {/* Sessions List */}
                <div className={styles.sessionsList}>
                    {Object.entries(groupedSessions).map(([dateGroup, groupSessions]) => (
                        <div key={dateGroup} className={styles.dateGroup}>
                            <div className={styles.dateLabel}>{dateGroup}</div>
                            {groupSessions.map((session) => (
                                <SessionItem
                                    key={session.id}
                                    session={session}
                                    isActive={session.id === currentSessionId}
                                    onSelect={() => handleSelectSession(session.id)}
                                    onDelete={() => handleDeleteClick(session.id)}
                                />
                            ))}
                        </div>
                    ))}

                    {sessions.length === 0 && (
                        <div className={styles.emptyState}>
                            <p>No research history yet</p>
                            <p className={styles.emptyHint}>Start a new research to see it here</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={styles.sidebarFooter}>
                    <span className={styles.footerText}>
                        {sessions.length} research{sessions.length !== 1 ? 'es' : ''} saved
                    </span>
                </div>
            </aside>
            
            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                title="Delete Research"
                message="Are you sure you want to delete this research? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                onConfirm={handleConfirmDelete}
                onCancel={handleCancelDelete}
            />
        </>
    );
}

export default Sidebar;
