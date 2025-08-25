import React from 'react';
import { useRealtimeContext } from '../../contexts/RealtimeContext';
import { ConnectionStatus } from '../../hooks/realtime';

interface SyncStatusProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

const connectionStatusConfig = {
  connecting: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: '🔄',
    label: 'Conectando',
    description: 'Estabelecendo conexão com o servidor'
  },
  connected: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: '✅',
    label: 'Conectado',
    description: 'Sincronização ativa'
  },
  reconnecting: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: '🔄',
    label: 'Reconectando',
    description: 'Tentando restabelecer conexão'
  },
  disconnected: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: '❌',
    label: 'Desconectado',
    description: 'Sem conexão com o servidor'
  },
  error: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: '⚠️',
    label: 'Erro',
    description: 'Erro na conexão'
  }
};

export function SyncStatus({ className = '', showDetails = false, compact = false }: SyncStatusProps) {
  const { state, hasUnresolvedConflicts, isFullyConnected, totalSyncCount } = useRealtimeContext();
  
  const config = connectionStatusConfig[state.connectionStatus];
  const hasConflicts = hasUnresolvedConflicts;
  
  // Formato compacto - apenas ícone
  if (compact) {
    return (
      <div 
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${config.bgColor} ${className}`}
        title={`${config.label} - ${config.description}${hasConflicts ? ' (Conflitos detectados)' : ''}`}
      >
        <span className="text-xs">
          {hasConflicts ? '⚠️' : config.icon}
        </span>
      </div>
    );
  }
  
  // Formato normal
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Indicador principal */}
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${config.bgColor}`}>
        <span className="text-sm">{config.icon}</span>
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
        
        {/* Indicador de conflitos */}
        {hasConflicts && (
          <span className="text-xs bg-red-500 text-white px-1 rounded-full" title="Conflitos detectados">
            {state.conflicts.filter(c => !c.resolved).length}
          </span>
        )}
        
        {/* Indicador offline */}
        {!state.isOnline && (
          <span className="text-xs bg-gray-500 text-white px-1 rounded-full" title="Modo offline">
            📱
          </span>
        )}
      </div>
      
      {/* Detalhes expandidos */}
      {showDetails && (
        <div className="text-xs text-gray-600 space-y-1">
          <div>Última sync: {state.lastSync ? formatRelativeTime(state.lastSync) : 'Nunca'}</div>
          <div>Total de atualizações: {totalSyncCount}</div>
          {state.metrics.averageLatency > 0 && (
            <div>Latência média: {Math.round(state.metrics.averageLatency)}ms</div>
          )}
          {state.metrics.errorCount > 0 && (
            <div className="text-red-600">Erros: {state.metrics.errorCount}</div>
          )}
        </div>
      )}
    </div>
  );
}

// Componente para mostrar detalhes de sincronização por domínio
export function SyncDetails({ className = '' }: { className?: string }) {
  const { state } = useRealtimeContext();
  
  const domains = [
    { key: 'cart', label: 'Carrinho', icon: '🛒' },
    { key: 'products', label: 'Produtos', icon: '📦' },
    { key: 'orders', label: 'Pedidos', icon: '📋' },
    { key: 'events', label: 'Eventos', icon: '🎫' },
    { key: 'stock', label: 'Estoque', icon: '📊' }
  ] as const;
  
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <h3 className="text-sm font-medium text-gray-900 mb-3">Status de Sincronização</h3>
      
      <div className="space-y-2">
        {domains.map(domain => (
          <div key={domain.key} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm">{domain.icon}</span>
              <span className="text-sm text-gray-700">{domain.label}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                {state.syncCounts[domain.key]} itens
              </span>
              <div className="w-2 h-2 bg-green-400 rounded-full" title="Sincronizado" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Métricas gerais */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-500">Reconexões:</span>
            <span className="ml-1 font-medium">{state.metrics.reconnectCount}</span>
          </div>
          <div>
            <span className="text-gray-500">Erros:</span>
            <span className="ml-1 font-medium text-red-600">{state.metrics.errorCount}</span>
          </div>
          <div>
            <span className="text-gray-500">Latência:</span>
            <span className="ml-1 font-medium">
              {state.metrics.averageLatency > 0 ? `${Math.round(state.metrics.averageLatency)}ms` : '-'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Atualizações:</span>
            <span className="ml-1 font-medium">{state.metrics.totalUpdates}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente de indicador de status na barra superior
export function TopBarSyncIndicator({ className = '' }: { className?: string }) {
  const { state, hasUnresolvedConflicts } = useRealtimeContext();
  
  const isHealthy = state.isOnline && state.connectionStatus === 'connected' && !hasUnresolvedConflicts;
  
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* Indicador principal */}
      <div className={`w-2 h-2 rounded-full ${
        isHealthy ? 'bg-green-400' : 
        state.connectionStatus === 'connecting' || state.connectionStatus === 'reconnecting' ? 'bg-yellow-400' :
        'bg-red-400'
      }`} />
      
      {/* Texto de status */}
      <span className="text-xs text-gray-600">
        {isHealthy ? 'Sincronizado' :
         state.connectionStatus === 'connecting' ? 'Conectando...' :
         state.connectionStatus === 'reconnecting' ? 'Reconectando...' :
         !state.isOnline ? 'Offline' :
         hasUnresolvedConflicts ? 'Conflitos' :
         'Erro'}
      </span>
      
      {/* Indicador de conflitos */}
      {hasUnresolvedConflicts && (
        <span className="text-xs bg-red-500 text-white px-1 rounded-full">
          {state.conflicts.filter(c => !c.resolved).length}
        </span>
      )}
    </div>
  );
}

// Utilitário para formatar tempo relativo
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  
  if (diffSeconds < 60) {
    return 'agora mesmo';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m atrás`;
  } else if (diffHours < 24) {
    return `${diffHours}h atrás`;
  } else {
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}

export default SyncStatus;