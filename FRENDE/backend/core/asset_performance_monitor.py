"""
Asset performance monitoring for the Frende backend application.
Tracks asset loading performance, compression ratios, and CDN effectiveness.
"""

import time
import logging
from typing import Dict, List, Optional, Any
from collections import defaultdict, deque
from datetime import datetime, timedelta
import json
import asyncio

from core.config import settings

logger = logging.getLogger(__name__)

class AssetPerformanceMonitor:
    """Monitor asset loading performance and optimization metrics"""
    
    def __init__(self):
        self.asset_metrics = defaultdict(lambda: {
            'load_times': deque(maxlen=1000),
            'compression_ratios': deque(maxlen=1000),
            'cdn_hits': deque(maxlen=1000),
            'total_requests': 0,
            'total_size': 0,
            'compressed_size': 0
        })
        
        self.global_metrics = {
            'total_assets_served': 0,
            'total_bandwidth_saved': 0,
            'average_compression_ratio': 0.0,
            'cdn_hit_rate': 0.0,
            'average_load_time': 0.0
        }
        
        self.performance_thresholds = {
            'slow_load_time': 2.0,  # seconds
            'low_compression_ratio': 20.0,  # percentage
            'high_bandwidth_usage': 1024 * 1024  # 1MB
        }
        
        self.alerts = deque(maxlen=100)
        
    def track_asset_loading(self, asset_path: str, load_time: float, 
                          file_size: int, compressed_size: Optional[int] = None,
                          cdn_hit: bool = False) -> None:
        """Track asset loading performance"""
        try:
            metrics = self.asset_metrics[asset_path]
            
            # Update metrics
            metrics['load_times'].append(load_time)
            metrics['total_requests'] += 1
            metrics['total_size'] += file_size
            
            if compressed_size:
                compression_ratio = self._calculate_compression_ratio(file_size, compressed_size)
                metrics['compression_ratios'].append(compression_ratio)
                metrics['compressed_size'] += compressed_size
                self.global_metrics['total_bandwidth_saved'] += (file_size - compressed_size)
            
            if cdn_hit:
                metrics['cdn_hits'].append(True)
            
            # Update global metrics
            self.global_metrics['total_assets_served'] += 1
            
            # Check for performance issues
            self._check_performance_alerts(asset_path, load_time, file_size, compressed_size)
            
        except Exception as e:
            logger.error(f"Error tracking asset loading: {str(e)}")
    
    def track_compression_ratio(self, asset_path: str, original_size: int, 
                              compressed_size: int) -> float:
        """Track compression ratio for an asset"""
        try:
            compression_ratio = self._calculate_compression_ratio(original_size, compressed_size)
            
            metrics = self.asset_metrics[asset_path]
            metrics['compression_ratios'].append(compression_ratio)
            
            # Update global average
            self._update_global_compression_ratio()
            
            return compression_ratio
            
        except Exception as e:
            logger.error(f"Error tracking compression ratio: {str(e)}")
            return 0.0
    
    def track_cdn_performance(self, asset_path: str, cdn_hit: bool, 
                            response_time: float) -> None:
        """Track CDN performance metrics"""
        try:
            metrics = self.asset_metrics[asset_path]
            
            if cdn_hit:
                metrics['cdn_hits'].append(True)
            
            # Update global CDN hit rate
            self._update_global_cdn_hit_rate()
            
        except Exception as e:
            logger.error(f"Error tracking CDN performance: {str(e)}")
    
    def get_asset_metrics(self, asset_path: str) -> Dict[str, Any]:
        """Get performance metrics for a specific asset"""
        if asset_path not in self.asset_metrics:
            return {}
        
        metrics = self.asset_metrics[asset_path]
        
        return {
            'asset_path': asset_path,
            'total_requests': metrics['total_requests'],
            'average_load_time': self._calculate_average(metrics['load_times']),
            'average_compression_ratio': self._calculate_average(metrics['compression_ratios']),
            'cdn_hit_rate': self._calculate_cdn_hit_rate(metrics['cdn_hits']),
            'total_size': metrics['total_size'],
            'compressed_size': metrics['compressed_size'],
            'bandwidth_saved': metrics['total_size'] - metrics['compressed_size']
        }
    
    def get_global_metrics(self) -> Dict[str, Any]:
        """Get global performance metrics"""
        return {
            'total_assets_served': self.global_metrics['total_assets_served'],
            'total_bandwidth_saved': self.global_metrics['total_bandwidth_saved'],
            'average_compression_ratio': self.global_metrics['average_compression_ratio'],
            'cdn_hit_rate': self.global_metrics['cdn_hit_rate'],
            'average_load_time': self.global_metrics['average_load_time'],
            'performance_alerts': len(self.alerts)
        }
    
    def get_performance_alerts(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent performance alerts"""
        return list(self.alerts)[-limit:]
    
    def get_optimization_suggestions(self) -> List[str]:
        """Generate optimization suggestions based on metrics"""
        suggestions = []
        
        # Check for slow loading assets
        slow_assets = [
            path for path, metrics in self.asset_metrics.items()
            if self._calculate_average(metrics['load_times']) > self.performance_thresholds['slow_load_time']
        ]
        
        if slow_assets:
            suggestions.append(f"Consider optimizing {len(slow_assets)} slow-loading assets")
        
        # Check for low compression ratios
        low_compression_assets = [
            path for path, metrics in self.asset_metrics.items()
            if self._calculate_average(metrics['compression_ratios']) < self.performance_thresholds['low_compression_ratio']
        ]
        
        if low_compression_assets:
            suggestions.append(f"Review compression settings for {len(low_compression_assets)} assets")
        
        # Check CDN hit rate
        if self.global_metrics['cdn_hit_rate'] < 0.8:
            suggestions.append("CDN hit rate is low - consider cache configuration")
        
        return suggestions
    
    def _calculate_compression_ratio(self, original_size: int, compressed_size: int) -> float:
        """Calculate compression ratio percentage"""
        if original_size == 0:
            return 0.0
        return (original_size - compressed_size) / original_size * 100
    
    def _calculate_average(self, values: deque) -> float:
        """Calculate average of values in deque"""
        if not values:
            return 0.0
        return sum(values) / len(values)
    
    def _calculate_cdn_hit_rate(self, cdn_hits: deque) -> float:
        """Calculate CDN hit rate"""
        if not cdn_hits:
            return 0.0
        return sum(cdn_hits) / len(cdn_hits) * 100
    
    def _update_global_compression_ratio(self) -> None:
        """Update global average compression ratio"""
        all_ratios = []
        for metrics in self.asset_metrics.values():
            all_ratios.extend(metrics['compression_ratios'])
        
        if all_ratios:
            self.global_metrics['average_compression_ratio'] = sum(all_ratios) / len(all_ratios)
    
    def _update_global_cdn_hit_rate(self) -> None:
        """Update global CDN hit rate"""
        total_hits = 0
        total_requests = 0
        
        for metrics in self.asset_metrics.values():
            total_hits += sum(metrics['cdn_hits'])
            total_requests += len(metrics['cdn_hits'])
        
        if total_requests > 0:
            self.global_metrics['cdn_hit_rate'] = (total_hits / total_requests) * 100
    
    def _check_performance_alerts(self, asset_path: str, load_time: float, 
                                file_size: int, compressed_size: Optional[int]) -> None:
        """Check for performance issues and create alerts"""
        alert = None
        
        # Check for slow loading
        if load_time > self.performance_thresholds['slow_load_time']:
            alert = {
                'timestamp': datetime.utcnow().isoformat(),
                'type': 'slow_loading',
                'asset_path': asset_path,
                'load_time': load_time,
                'threshold': self.performance_thresholds['slow_load_time']
            }
        
        # Check for low compression
        if compressed_size:
            compression_ratio = self._calculate_compression_ratio(file_size, compressed_size)
            if compression_ratio < self.performance_thresholds['low_compression_ratio']:
                alert = {
                    'timestamp': datetime.utcnow().isoformat(),
                    'type': 'low_compression',
                    'asset_path': asset_path,
                    'compression_ratio': compression_ratio,
                    'threshold': self.performance_thresholds['low_compression_ratio']
                }
        
        # Check for large file size
        if file_size > self.performance_thresholds['high_bandwidth_usage']:
            alert = {
                'timestamp': datetime.utcnow().isoformat(),
                'type': 'large_file',
                'asset_path': asset_path,
                'file_size': file_size,
                'threshold': self.performance_thresholds['high_bandwidth_usage']
            }
        
        if alert:
            self.alerts.append(alert)
            logger.warning(f"Performance alert: {alert}")

# Global instance
asset_performance_monitor = AssetPerformanceMonitor()
