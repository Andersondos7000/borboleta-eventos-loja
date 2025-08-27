import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useRealtimeContext } from '../../contexts/RealtimeContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useOfflineQueue } from '../../hooks/realtime/useOfflineQueue';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
  position?: 'top' | 'bottom' | 'inline';
}

export function OfflineIndicator({ 
  className = '', 
  showDetails = false, 
  position = 'top' 
}: OfflineIndicatorProps) {
  const { state } = useRealtimeContext();
  const { isOnline, connectionType, effectiveType } = useNetworkStatus();
  const { 
    queueSize, 
    isProcessing, 
    lastProcessedAt,
    getQueuedActionsByStatus 
  } = useOfflineQueue();
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  
  const pendingActions = getQueuedActionsByStatus('pending').length;
  const failedActions = getQueuedActionsByStatus('failed').length;
  
  // Controlar exibição do banner
  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
      setWasOffline(true);
    } else if (wasOffline && isOnline) {
      // Mostrar banner de reconexão por alguns segundos
      setShowBanner(true);
      const timer = setTimeout(() => {
        setShowBanner(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else if (pendingActions > 0 || failedActions > 0 || isProcessing) {
      // Mostrar quando há ações pendentes ou processando
      setShowBanner(true);
    } else {
      setShowBanner(false);
    }
  }, [isOnline, wasOffline, pendingActions, failedActions, isProcessing]);
  
  if (!showBanner) {
    return null;
  }
  
  const isOffline = !isOnline;
  const isReconnected = isOnline && wasOffline;
  
  const getStatusColor = () => {
    if (isOffline) return 'bg-red-500';
    if (pendingActions > 0) return 'bg-yellow-500';
    if (isProcessing) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (isOffline) return 'Offline';
    if (isProcessing) return 'Sincronizando...';
    if (pendingActions > 0) return `${pendingActions} pendente${pendingActions > 1 ? 's' : ''}`;
    if (isReconnected) return 'Reconectado';
    return 'Online';
  };

  const getStatusIcon = () => {
    if (isOffline) return <WifiOff className="w-4 h-4" />;
    if (isProcessing) return <Clock className="w-4 h-4 animate-spin" />;
    if (pendingActions > 0) return <AlertCircle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };
  
  // Banner inline
  if (position === 'inline') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        {getStatusIcon()}
        <span className={`text-sm font-medium ${
          isOffline ? 'text-red-600' : 
          pendingActions > 0 ? 'text-yellow-600' :
          isProcessing ? 'text-blue-600' : 'text-green-600'
        }`}>
            {getStatusText()}
        </span>
        {showDetails && (
          <OfflineDetails isOffline={isOffline} />
        )}
      </div>
    );
  }
  
  // Banner fixo
  const positionClasses = {
    top: 'fixed top-0 left-0 right-0 z-50',
    bottom: 'fixed bottom-0 left-0 right-0 z-50'
  };
  
  const getBannerColor = () => {
    if (isOffline) return 'bg-red-600';
    if (pendingActions > 0) return 'bg-yellow-600';
    if (isProcessing) return 'bg-blue-600';
    return 'bg-green-600';
  };

  const getBannerMessage = () => {
    if (isOffline) {
      return pendingActions > 0 
        ? `Você está offline. ${pendingActions} alteração${pendingActions > 1 ? 'ões' : ''} será${pendingActions > 1 ? 'ão' : ''} sincronizada${pendingActions > 1 ? 's' : ''} quando a conexão for restabelecida.`
        : 'Você está offline. Suas alterações serão sincronizadas quando a conexão for restabelecida.';
    }
    if (isProcessing) {
      return `Sincronizando ${queueSize} alteração${queueSize > 1 ? 'ões' : ''}...`;
    }
    if (pendingActions > 0) {
      return `${pendingActions} alteração${pendingActions > 1 ? 'ões' : ''} pendente${pendingActions > 1 ? 's' : ''} para sincronização.`;
    }
    return 'Conexão restabelecida! Dados sincronizados.';
  };

  return (
    <div className={`${positionClasses[position]} ${className}`}>
      <div className={`px-4 py-2 text-center text-white ${getBannerColor()}`}>
        <div className="flex items-center justify-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">
            {getBannerMessage()}
          </span>
          
          {/* Botão de fechar para banner de reconexão */}
          {isReconnected && (
            <button
              onClick={() => setShowBanner(false)}
              className="ml-2 text-white hover:text-gray-200"
              aria-label="Fechar"
            >
              ✕
            </button>
          )}
        </div>
        
        {showDetails && (
          <div className="mt-2">
            <OfflineDetails isOffline={isOffline} />
          </div>
        )}
      </div>
    </div>
  );
}

// Ícone animado para status offline/online
function OfflineIcon({ isOffline }: { isOffline: boolean }) {
  return (
    <div className="relative">
      {isOffline ? (
        <div className="flex items-center">
          <span className="text-lg">📱</span>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        </div>
      ) : (
        <div className="flex items-center">
          <span className="text-lg">📶</span>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
}

// Detalhes do status offline
function OfflineDetails({ isOffline }: { isOffline: boolean }) {
  const { state, totalSyncCount } = useRealtimeContext();
  const { isOnline, connectionType, effectiveType } = useNetworkStatus();
  const { 
    queueSize, 
    isProcessing, 
    lastProcessedAt,
    getQueuedActionsByStatus,
    getProcessingStats 
  } = useOfflineQueue();
  
  const pendingActions = getQueuedActionsByStatus('pending').length;
  const failedActions = getQueuedActionsByStatus('failed').length;
  const completedActions = getQueuedActionsByStatus('completed').length;
  const stats = getProcessingStats();
  
  if (isOffline) {
    return (
      <div className="text-xs opacity-90 space-y-1">
        <div>• Fila offline: {queueSize} ações</div>
        <div>• Pendentes: {pendingActions} | Falharam: {failedActions}</div>
        <div>• Última sincronização: {state.lastSync ? formatTime(state.lastSync) : 'Nunca'}</div>
        <div>• Alterações serão enviadas automaticamente</div>
        {stats.totalProcessed > 0 && (
          <div>• Taxa de sucesso: {Math.round((stats.successCount / stats.totalProcessed) * 100)}%</div>
        )}
      </div>
    );
  }
  
  return (
    <div className="text-xs opacity-90 space-y-1">
      {isProcessing && (
        <div>• Sincronizando {queueSize} alteração{queueSize > 1 ? 'ões' : ''}...</div>
      )}
      {pendingActions > 0 && (
        <div>• Pendentes: {pendingActions} | Concluídas: {completedActions}</div>
      )}
      <div>• Conexão: {connectionType} ({effectiveType})</div>
      <div>• Status: {state.connectionStatus}</div>
      {lastProcessedAt && (
        <div>• Última ação: {formatTime(lastProcessedAt)}</div>
      )}
      {stats.totalProcessed > 0 && (
        <div>• Taxa de sucesso: {Math.round((stats.successCount / stats.totalProcessed) * 100)}%</div>
      )}
    </div>
  );
}

// Componente para mostrar indicador de dados pendentes
export function PendingChangesIndicator({ className = '' }: { className?: string }) {
  const { state } = useRealtimeContext();
  const [pendingCount, setPendingCount] = useState(0);
  
  // Simular contagem de alterações pendentes
  // Em uma implementação real, isso viria do estado de sincronização
  useEffect(() => {
    if (!state.isOnline) {
      // Incrementar contador quando offline (simulação)
      const interval = setInterval(() => {
        setPendingCount(prev => prev + Math.floor(Math.random() * 3));
      }, 5000);
      return () => clearInterval(interval);
    } else {
      // Reset quando online
      setPendingCount(0);
    }
  }, [state.isOnline]);
  
  if (pendingCount === 0) {
    return null;
  }
  
  return (
    <div className={`inline-flex items-center space-x-1 bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs ${className}`}>
      <span className="animate-pulse">⏳</span>
      <span>{pendingCount} alterações pendentes</span>
    </div>
  );
}

// Hook para detectar mudanças de conectividade
export function useConnectivityDetection() {
  const { state, dispatch } = useRealtimeContext();
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');
  
  useEffect(() => {
    let pingInterval: NodeJS.Timeout;
    
    const checkConnection = async () => {
      if (!navigator.onLine) {
        setConnectionQuality('offline');
        return;
      }
      
      try {
        const start = Date.now();
        const response = await fetch('/api/ping', { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        const latency = Date.now() - start;
        
        if (response.ok) {
          setConnectionQuality(latency > 1000 ? 'poor' : 'good');
        } else {
          setConnectionQuality('poor');
        }
      } catch {
        setConnectionQuality('offline');
      }
    };
    
    // Verificar conexão a cada 30 segundos
    pingInterval = setInterval(checkConnection, 30000);
    checkConnection(); // Verificação inicial
    
    return () => {
      if (pingInterval) clearInterval(pingInterval);
    };
  }, []);
  
  return {
    isOnline: state.isOnline,
    connectionQuality,
    connectionStatus: state.connectionStatus
  };
}

// Componente de qualidade de conexão
export function ConnectionQualityIndicator({ className = '' }: { className?: string }) {
  const { connectionQuality } = useConnectivityDetection();
  
  const qualityConfig = {
    good: { color: 'text-green-600', icon: '📶', label: 'Boa' },
    poor: { color: 'text-yellow-600', icon: '📶', label: 'Lenta' },
    offline: { color: 'text-red-600', icon: '📵', label: 'Offline' }
  };
  
  const config = qualityConfig[connectionQuality];
  
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <span className="text-sm">{config.icon}</span>
      <span className={`text-xs ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
}

// Componente de toast para mudanças de conectividade
export function ConnectivityToast() {
  const { state } = useRealtimeContext();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'warning' | 'error'>('success');
  
  useEffect(() => {
    if (!state.isOnline) {
      setToastMessage('Conexão perdida. Trabalhando offline.');
      setToastType('warning');
      setShowToast(true);
    } else if (state.connectionStatus === 'connected') {
      setToastMessage('Conexão restabelecida!');
      setToastType('success');
      setShowToast(true);
      
      // Auto-hide após 3 segundos
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [state.isOnline, state.connectionStatus]);
  
  if (!showToast) {
    return null;
  }
  
  const typeConfig = {
    success: { bg: 'bg-green-600', icon: '✅' },
    warning: { bg: 'bg-yellow-600', icon: '⚠️' },
    error: { bg: 'bg-red-600', icon: '❌' }
  };
  
  const config = typeConfig[toastType];
  
  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className={`${config.bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2`}>
        <span>{config.icon}</span>
        <span className="text-sm font-medium">{toastMessage}</span>
        <button
          onClick={() => setShowToast(false)}
          className="ml-2 text-white hover:text-gray-200"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// Utilitário para formatar tempo
function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default OfflineIndicator;