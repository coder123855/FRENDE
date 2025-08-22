import React from 'react';
import { useOffline } from '../../hooks/useOffline';

const OfflineStatus = () => {
  const {
    isOnline,
    isServiceWorkerReady,
    syncStatus,
    offlineActions,
    storageStats,
    performSync,
    updateServiceWorker,
    skipWaiting,
    clearAllOfflineData
  } = useOffline();

  const handleSync = async () => {
    try {
      await performSync();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handleUpdate = async () => {
    try {
      await updateServiceWorker();
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const handleSkipWaiting = async () => {
    try {
      await skipWaiting();
    } catch (error) {
      console.error('Skip waiting failed:', error);
    }
  };

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear all offline data? This cannot be undone.')) {
      try {
        await clearAllOfflineData();
      } catch (error) {
        console.error('Clear data failed:', error);
      }
    }
  };

  return (
    <div className="offline-status">
      {/* Connection Status */}
      <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
        <div className="status-dot"></div>
        <span className="status-text">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Service Worker Status */}
      <div className="sw-status">
        <span className="sw-indicator">
          {isServiceWorkerReady ? '🟢' : '🔴'} SW
        </span>
      </div>

      {/* Sync Status */}
      {syncStatus !== 'idle' && (
        <div className={`sync-status ${syncStatus}`}>
          <span className="sync-text">
            {syncStatus === 'syncing' && '🔄 Syncing...'}
            {syncStatus === 'completed' && '✅ Sync Complete'}
            {syncStatus === 'failed' && '❌ Sync Failed'}
          </span>
        </div>
      )}

      {/* Offline Actions Count */}
      {offlineActions.length > 0 && (
        <div className="offline-actions-count">
          <span className="count-badge">
            {offlineActions.length} pending
          </span>
        </div>
      )}

      {/* Storage Stats */}
      {storageStats && (
        <div className="storage-stats">
          <span className="stats-text">
            {storageStats.totalEntries || 0} cached items
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="offline-actions">
        {!isOnline && offlineActions.length > 0 && (
          <button
            onClick={handleSync}
            disabled={syncStatus === 'syncing'}
            className="sync-btn"
            title="Sync offline actions when online"
          >
            🔄 Sync
          </button>
        )}

        <button
          onClick={handleUpdate}
          className="update-btn"
          title="Check for updates"
        >
          🔄 Update
        </button>

        <button
          onClick={handleSkipWaiting}
          className="skip-btn"
          title="Apply service worker update"
        >
          ⚡ Skip
        </button>

        <button
          onClick={handleClearData}
          className="clear-btn"
          title="Clear all offline data"
        >
          🗑️ Clear
        </button>
      </div>

      <style jsx>{`
        .offline-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          font-size: 12px;
          font-weight: 500;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .status-indicator.online .status-dot {
          background: #10b981;
        }

        .status-indicator.offline .status-dot {
          background: #ef4444;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .status-text {
          color: #374151;
        }

        .sw-status {
          display: flex;
          align-items: center;
        }

        .sw-indicator {
          font-size: 10px;
          color: #6b7280;
        }

        .sync-status {
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
        }

        .sync-status.syncing {
          background: #fef3c7;
          color: #92400e;
        }

        .sync-status.completed {
          background: #d1fae5;
          color: #065f46;
        }

        .sync-status.failed {
          background: #fee2e2;
          color: #991b1b;
        }

        .offline-actions-count {
          display: flex;
          align-items: center;
        }

        .count-badge {
          background: #ef4444;
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 600;
        }

        .storage-stats {
          display: flex;
          align-items: center;
        }

        .stats-text {
          color: #6b7280;
          font-size: 10px;
        }

        .offline-actions {
          display: flex;
          gap: 4px;
        }

        .sync-btn,
        .update-btn,
        .skip-btn,
        .clear-btn {
          background: none;
          border: none;
          padding: 4px 6px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 10px;
          transition: background-color 0.2s;
        }

        .sync-btn:hover,
        .update-btn:hover,
        .skip-btn:hover {
          background: #f3f4f6;
        }

        .clear-btn:hover {
          background: #fee2e2;
        }

        .sync-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .offline-status {
            flex-wrap: wrap;
            gap: 4px;
            padding: 6px 8px;
          }

          .offline-actions {
            order: 2;
            width: 100%;
            justify-content: center;
            margin-top: 4px;
          }
        }
      `}</style>
    </div>
  );
};

export default OfflineStatus;
