import React, { useState } from 'react';
import { useBrevoMCP, BrevoContact, BrevoDeal } from '../../hooks/mcp/useBrevoMCP';

interface BrevoMCPDemoProps {
  className?: string;
}

export function BrevoMCPDemo({ className = '' }: BrevoMCPDemoProps) {
  const {
    isLoading,
    error,
    lastResponse,
    getContacts,
    createContact,
    getDeals,
    createDeal,
    createContactAndDeal,
    sendWelcomeEmail,
    getEmailCampaigns,
    getAccountSendingStatistics,
  } = useBrevoMCP({ debug: true });

  const [activeTab, setActiveTab] = useState<'contacts' | 'deals' | 'campaigns' | 'analytics'>('contacts');
  const [results, setResults] = useState<any>(null);

  // Estados para formulários
  const [newContact, setNewContact] = useState<Partial<BrevoContact>>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    country: 'Brasil',
  });

  const [newDeal, setNewDeal] = useState<Partial<BrevoDeal>>({
    name: '',
    value: 0,
    stage: 'Novo Lead',
  });

  // Handlers para ações
  const handleGetContacts = async () => {
    const response = await getContacts({ limit: 10, country: 'Brasil' });
    setResults(response.data);
  };

  const handleCreateContact = async () => {
    if (!newContact.email) {
      alert('Email é obrigatório');
      return;
    }

    const response = await createContact(newContact as BrevoContact);
    if (response.success) {
      setResults(response.data);
      setNewContact({ email: '', firstName: '', lastName: '', phone: '', country: 'Brasil' });
      alert('Contato criado com sucesso!');
    }
  };

  const handleGetDeals = async () => {
    const response = await getDeals({ limit: 10 });
    setResults(response.data);
  };

  const handleCreateDeal = async () => {
    if (!newDeal.name || !newDeal.value) {
      alert('Nome e valor são obrigatórios');
      return;
    }

    const response = await createDeal(newDeal as BrevoDeal);
    if (response.success) {
      setResults(response.data);
      setNewDeal({ name: '', value: 0, stage: 'Novo Lead' });
      alert('Negócio criado com sucesso!');
    }
  };

  const handleCreateContactAndDeal = async () => {
    if (!newContact.email || !newDeal.name || !newDeal.value) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    const response = await createContactAndDeal(
      newContact as BrevoContact,
      newDeal as BrevoDeal
    );
    
    if (response.success) {
      setResults(response.data);
      setNewContact({ email: '', firstName: '', lastName: '', phone: '', country: 'Brasil' });
      setNewDeal({ name: '', value: 0, stage: 'Novo Lead' });
      alert('Contato e negócio criados com sucesso!');
    }
  };

  const handleSendWelcomeEmail = async () => {
    if (!newContact.email) {
      alert('Email é obrigatório');
      return;
    }

    const response = await sendWelcomeEmail(newContact.email, newContact.firstName);
    if (response.success) {
      setResults(response.data);
      alert('Email de boas-vindas enviado!');
    }
  };

  const handleGetCampaigns = async () => {
    const response = await getEmailCampaigns({ limit: 10 });
    setResults(response.data);
  };

  const handleGetStatistics = async () => {
    const response = await getAccountSendingStatistics();
    setResults(response.data);
  };

  return (
    <div className={`brevo-mcp-demo ${className}`}>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          🚀 Brevo MCP Integration Demo
        </h2>

        {/* Status */}
        <div className="mb-6">
          {isLoading && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
              ⏳ Processando...
            </div>
          )}
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              ❌ Erro: {error}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {[
            { key: 'contacts', label: '👥 Contatos' },
            { key: 'deals', label: '💼 Negócios' },
            { key: 'campaigns', label: '📧 Campanhas' },
            { key: 'analytics', label: '📊 Analytics' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
                activeTab === key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Gestão de Contatos</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="Email *"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Nome"
                    value={newContact.firstName}
                    onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Sobrenome"
                    value={newContact.lastName}
                    onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    placeholder="Telefone"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <button
                    onClick={handleGetContacts}
                    disabled={isLoading}
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                  >
                    📋 Listar Contatos
                  </button>
                  <button
                    onClick={handleCreateContact}
                    disabled={isLoading}
                    className="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50"
                  >
                    ➕ Criar Contato
                  </button>
                  <button
                    onClick={handleSendWelcomeEmail}
                    disabled={isLoading}
                    className="w-full bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 disabled:opacity-50"
                  >
                    📧 Enviar Boas-vindas
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Deals Tab */}
          {activeTab === 'deals' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Gestão de Negócios</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Nome do Negócio *"
                    value={newDeal.name}
                    onChange={(e) => setNewDeal({ ...newDeal, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Valor (R$) *"
                    value={newDeal.value}
                    onChange={(e) => setNewDeal({ ...newDeal, value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={newDeal.stage}
                    onChange={(e) => setNewDeal({ ...newDeal, stage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Novo Lead">Novo Lead</option>
                    <option value="Qualificado">Qualificado</option>
                    <option value="Proposta">Proposta</option>
                    <option value="Negociação">Negociação</option>
                    <option value="Fechado">Fechado</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <button
                    onClick={handleGetDeals}
                    disabled={isLoading}
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                  >
                    📋 Listar Negócios
                  </button>
                  <button
                    onClick={handleCreateDeal}
                    disabled={isLoading}
                    className="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50"
                  >
                    ➕ Criar Negócio
                  </button>
                  <button
                    onClick={handleCreateContactAndDeal}
                    disabled={isLoading}
                    className="w-full bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 disabled:opacity-50"
                  >
                    🚀 Criar Contato + Negócio
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Campanhas de Email</h3>
              
              <div className="space-y-2">
                <button
                  onClick={handleGetCampaigns}
                  disabled={isLoading}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  📧 Listar Campanhas
                </button>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Analytics e Estatísticas</h3>
              
              <div className="space-y-2">
                <button
                  onClick={handleGetStatistics}
                  disabled={isLoading}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  📊 Estatísticas da Conta
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {results && (
          <div className="mt-6">
            <h4 className="text-lg font-semibold mb-3">📋 Resultados:</h4>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-sm">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}

        {/* Last Response Debug */}
        {lastResponse && (
          <div className="mt-6">
            <details className="bg-gray-50 p-4 rounded-md">
              <summary className="cursor-pointer font-medium text-gray-700">
                🔍 Debug - Última Resposta MCP
              </summary>
              <pre className="mt-2 text-xs text-gray-600 overflow-auto">
                {JSON.stringify(lastResponse, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

export default BrevoMCPDemo;