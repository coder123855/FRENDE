from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class SocketAnalytics:
    def __init__(self):
        self.connection_stats = {}
        self.message_stats = {}
        self.error_stats = {}
        self.performance_stats = {}
    
    def record_connection(self, user_id: int, connection_type: str):
        """Record a new connection"""
        timestamp = datetime.utcnow()
        if user_id not in self.connection_stats:
            self.connection_stats[user_id] = []
        
        self.connection_stats[user_id].append({
            'type': connection_type,
            'timestamp': timestamp,
            'duration': None
        })
    
    def record_disconnection(self, user_id: int):
        """Record a disconnection"""
        if user_id in self.connection_stats and self.connection_stats[user_id]:
            last_connection = self.connection_stats[user_id][-1]
            if last_connection['duration'] is None:
                last_connection['duration'] = (datetime.utcnow() - last_connection['timestamp']).total_seconds()
    
    def record_message(self, user_id: int, message_type: str, size: int, latency: float):
        """Record a message"""
        if user_id not in self.message_stats:
            self.message_stats[user_id] = []
        
        self.message_stats[user_id].append({
            'type': message_type,
            'size': size,
            'latency': latency,
            'timestamp': datetime.utcnow()
        })
    
    def record_error(self, user_id: int, error_type: str, error_message: str):
        """Record an error"""
        if user_id not in self.error_stats:
            self.error_stats[user_id] = []
        
        self.error_stats[user_id].append({
            'type': error_type,
            'message': error_message,
            'timestamp': datetime.utcnow()
        })
    
    def record_performance(self, user_id: int, metric: str, value: float):
        """Record a performance metric"""
        if user_id not in self.performance_stats:
            self.performance_stats[user_id] = {}
        
        if metric not in self.performance_stats[user_id]:
            self.performance_stats[user_id][metric] = []
        
        self.performance_stats[user_id][metric].append({
            'value': value,
            'timestamp': datetime.utcnow()
        })
    
    def get_user_analytics(self, user_id: int) -> Dict:
        """Get analytics for a specific user"""
        connections = self.connection_stats.get(user_id, [])
        messages = self.message_stats.get(user_id, [])
        errors = self.error_stats.get(user_id, [])
        performance = self.performance_stats.get(user_id, {})
        
        return {
            'total_connections': len(connections),
            'total_messages': len(messages),
            'total_errors': len(errors),
            'avg_connection_duration': self._calculate_avg_duration(connections),
            'avg_message_latency': self._calculate_avg_latency(messages),
            'message_types': self._count_message_types(messages),
            'error_types': self._count_error_types(errors),
            'performance_metrics': self._get_performance_summary(performance),
            'connection_history': self._get_recent_connections(connections, 10),
            'message_history': self._get_recent_messages(messages, 10)
        }
    
    def get_system_analytics(self) -> Dict:
        """Get system-wide analytics"""
        total_users = len(self.connection_stats)
        total_messages = sum(len(messages) for messages in self.message_stats.values())
        total_errors = sum(len(errors) for errors in self.error_stats.values())
        
        return {
            'active_users': total_users,
            'total_messages': total_messages,
            'total_errors': total_errors,
            'avg_messages_per_user': total_messages / total_users if total_users > 0 else 0,
            'avg_errors_per_user': total_errors / total_users if total_users > 0 else 0,
            'error_rate': total_errors / (total_messages + total_errors) if (total_messages + total_errors) > 0 else 0
        }
    
    def get_performance_metrics(self, user_id: Optional[int] = None) -> Dict:
        """Get performance metrics for a user or system-wide"""
        if user_id:
            performance = self.performance_stats.get(user_id, {})
            return self._get_performance_summary(performance)
        else:
            # System-wide performance
            all_performance = {}
            for user_perf in self.performance_stats.values():
                for metric, values in user_perf.items():
                    if metric not in all_performance:
                        all_performance[metric] = []
                    all_performance[metric].extend(values)
            
            return self._get_performance_summary(all_performance)
    
    def _calculate_avg_duration(self, connections: List[Dict]) -> float:
        """Calculate average connection duration"""
        durations = [c['duration'] for c in connections if c['duration'] is not None]
        return sum(durations) / len(durations) if durations else 0
    
    def _calculate_avg_latency(self, messages: List[Dict]) -> float:
        """Calculate average message latency"""
        latencies = [m['latency'] for m in messages]
        return sum(latencies) / len(latencies) if latencies else 0
    
    def _count_message_types(self, messages: List[Dict]) -> Dict[str, int]:
        """Count messages by type"""
        types = {}
        for message in messages:
            msg_type = message['type']
            types[msg_type] = types.get(msg_type, 0) + 1
        return types
    
    def _count_error_types(self, errors: List[Dict]) -> Dict[str, int]:
        """Count errors by type"""
        types = {}
        for error in errors:
            error_type = error['type']
            types[error_type] = types.get(error_type, 0) + 1
        return types
    
    def _get_performance_summary(self, performance: Dict) -> Dict:
        """Get performance summary for metrics"""
        summary = {}
        for metric, values in performance.items():
            if values:
                values_list = [v['value'] for v in values]
                summary[metric] = {
                    'avg': sum(values_list) / len(values_list),
                    'min': min(values_list),
                    'max': max(values_list),
                    'count': len(values_list)
                }
        return summary
    
    def _get_recent_connections(self, connections: List[Dict], limit: int) -> List[Dict]:
        """Get recent connections"""
        sorted_connections = sorted(connections, key=lambda x: x['timestamp'], reverse=True)
        return sorted_connections[:limit]
    
    def _get_recent_messages(self, messages: List[Dict], limit: int) -> List[Dict]:
        """Get recent messages"""
        sorted_messages = sorted(messages, key=lambda x: x['timestamp'], reverse=True)
        return sorted_messages[:limit]
    
    def cleanup_old_data(self, days: int = 7):
        """Clean up data older than specified days"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Clean up connection stats
        for user_id in list(self.connection_stats.keys()):
            self.connection_stats[user_id] = [
                conn for conn in self.connection_stats[user_id]
                if conn['timestamp'] > cutoff_date
            ]
            if not self.connection_stats[user_id]:
                del self.connection_stats[user_id]
        
        # Clean up message stats
        for user_id in list(self.message_stats.keys()):
            self.message_stats[user_id] = [
                msg for msg in self.message_stats[user_id]
                if msg['timestamp'] > cutoff_date
            ]
            if not self.message_stats[user_id]:
                del self.message_stats[user_id]
        
        # Clean up error stats
        for user_id in list(self.error_stats.keys()):
            self.error_stats[user_id] = [
                error for error in self.error_stats[user_id]
                if error['timestamp'] > cutoff_date
            ]
            if not self.error_stats[user_id]:
                del self.error_stats[user_id]
        
        # Clean up performance stats
        for user_id in list(self.performance_stats.keys()):
            for metric in list(self.performance_stats[user_id].keys()):
                self.performance_stats[user_id][metric] = [
                    perf for perf in self.performance_stats[user_id][metric]
                    if perf['timestamp'] > cutoff_date
                ]
                if not self.performance_stats[user_id][metric]:
                    del self.performance_stats[user_id][metric]
            if not self.performance_stats[user_id]:
                del self.performance_stats[user_id]

# Global analytics instance
socket_analytics = SocketAnalytics()
