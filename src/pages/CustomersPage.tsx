import React, { useState } from 'react';
import { CustomerForm } from '../components/customers/CustomerForm';
import { CustomerList } from '../components/customers/CustomerList';
import { OfflineIndicator } from '../components/realtime/OfflineIndicator';
import type { Customer } from '../types/customer';

type ViewMode = 'list' | 'create' | 'edit';

export const CustomersPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleCreateCustomer = () => {
    setSelectedCustomer(null);
    setViewMode('create');
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewMode('edit');
  };

  const handleCustomerSuccess = (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewMode('list');
    // Mostrar notificação de sucesso
    console.log('Cliente salvo com sucesso:', customer);
  };

  const handleCancel = () => {
    setSelectedCustomer(null);
    setViewMode('list');
  };

  const handleDeleteCustomer = (customer: Customer) => {
    // Se o cliente deletado estava sendo editado, voltar para lista
    if (selectedCustomer?.id === customer.id) {
      setSelectedCustomer(null);
      setViewMode('list');
    }
  };

  const getPageTitle = () => {
    switch (viewMode) {
      case 'create':
        return 'Novo Cliente';
      case 'edit':
        return `Editar Cliente: ${selectedCustomer?.name || ''}`;
      default:
        return 'Gerenciar Clientes';
    }
  };

  const getBreadcrumb = () => {
    const items = [{ label: 'Clientes', href: '#', current: viewMode === 'list' }];
    
    if (viewMode === 'create') {
      items.push({ label: 'Novo Cliente', href: '#', current: true });
    } else if (viewMode === 'edit' && selectedCustomer) {
      items.push({ label: selectedCustomer.name, href: '#', current: true });
    }
    
    return items;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Título e breadcrumb */}
            <div className="flex items-center space-x-4">
              <div>
                <nav className="flex" aria-label="Breadcrumb">
                  <ol className="flex items-center space-x-2">
                    {getBreadcrumb().map((item, index) => (
                      <li key={index} className="flex items-center">
                        {index > 0 && (
                          <svg className="w-4 h-4 text-gray-400 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                        <button
                          onClick={() => {
                            if (index === 0) {
                              setViewMode('list');
                              setSelectedCustomer(null);
                            }
                          }}
                          className={`text-sm font-medium ${
                            item.current 
                              ? 'text-gray-900' 
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ol>
                </nav>
                <h1 className="text-2xl font-bold text-gray-900 mt-1">
                  {getPageTitle()}
                </h1>
              </div>
            </div>

            {/* Ações do header */}
            <div className="flex items-center space-x-4">
              <OfflineIndicator />
              
              {/* Menu mobile */}
              <div className="md:hidden">
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>

              {/* Ações desktop */}
              <div className="hidden md:flex items-center space-x-3">
                {viewMode === 'list' && (
                  <>
                    <button
                      onClick={handleCreateCustomer}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Novo Cliente
                    </button>
                    
                    <button
                      onClick={() => {
                        // Implementar importação de clientes
                        console.log('Importar clientes');
                      }}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      Importar
                    </button>
                  </>
                )}
                
                {(viewMode === 'create' || viewMode === 'edit') && (
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Voltar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Menu mobile expandido */}
          {showMobileMenu && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <div className="space-y-2">
                {viewMode === 'list' ? (
                  <>
                    <button
                      onClick={() => {
                        handleCreateCustomer();
                        setShowMobileMenu(false);
                      }}
                      className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Novo Cliente
                    </button>
                    
                    <button
                      onClick={() => {
                        console.log('Importar clientes');
                        setShowMobileMenu(false);
                      }}
                      className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      Importar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      handleCancel();
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Voltar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'list' && (
          <CustomerList
            onEditCustomer={handleEditCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            selectable={false}
          />
        )}
        
        {(viewMode === 'create' || viewMode === 'edit') && (
          <div className="max-w-4xl mx-auto">
            <CustomerForm
              customerId={selectedCustomer?.id}
              onSuccess={handleCustomerSuccess}
              onCancel={handleCancel}
            />
          </div>
        )}
      </div>

      {/* Atalhos de teclado (oculto, apenas para acessibilidade) */}
      <div className="sr-only">
        <p>Atalhos de teclado:</p>
        <ul>
          <li>Ctrl + N: Novo cliente</li>
          <li>Escape: Voltar/Cancelar</li>
          <li>Ctrl + S: Salvar (quando em formulário)</li>
        </ul>
      </div>

      {/* Event listeners para atalhos de teclado */}
      <div
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === 'n' && viewMode === 'list') {
            e.preventDefault();
            handleCreateCustomer();
          } else if (e.key === 'Escape' && viewMode !== 'list') {
            e.preventDefault();
            handleCancel();
          }
        }}
        tabIndex={-1}
        className="fixed inset-0 pointer-events-none"
      />
    </div>
  );
};