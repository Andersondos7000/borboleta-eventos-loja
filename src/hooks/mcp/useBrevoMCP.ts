import { useState, useCallback } from 'react';

// Tipos para o Brevo MCP
interface BrevoContact {
  id?: number;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  city?: string;
  attributes?: Record<string, any>;
  listIds?: number[];
}

interface BrevoDeal {
  id?: string;
  name: string;
  value: number;
  stage?: string;
  contactId?: number;
  attributes?: Record<string, any>;
}

interface BrevoEmailCampaign {
  id?: number;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  sender: {
    name: string;
    email: string;
  };
  replyTo?: string;
  recipients?: {
    listIds?: number[];
    exclusionListIds?: number[];
  };
}

interface UseBrevoMCPOptions {
  autoRetry?: boolean;
  retryAttempts?: number;
  debug?: boolean;
}

interface BrevoMCPResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export function useBrevoMCP(options: UseBrevoMCPOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<BrevoMCPResponse | null>(null);

  const { autoRetry = true, retryAttempts = 3, debug = false } = options;

  // Função auxiliar para fazer chamadas MCP
  const callBrevoMCP = useCallback(async (
    server: 'brevo_contacts' | 'brevo_deals' | 'brevo_campaigns' | 'brevo_unified',
    tool: string,
    args: Record<string, any> = {}
  ): Promise<BrevoMCPResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mcp/brevo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          server,
          tool,
          args,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: BrevoMCPResponse = await response.json();
      
      if (debug) {
        console.log('[Brevo MCP] Response:', result);
      }

      setLastResponse(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      
      if (debug) {
        console.error('[Brevo MCP] Error:', errorMessage);
      }

      const errorResponse: BrevoMCPResponse = {
        success: false,
        error: errorMessage,
      };
      
      setLastResponse(errorResponse);
      return errorResponse;
    } finally {
      setIsLoading(false);
    }
  }, [debug]);

  // === CONTACT MANAGEMENT ===
  const getContacts = useCallback(async (filters?: {
    limit?: number;
    offset?: number;
    country?: string;
    city?: string;
    listIds?: number[];
  }) => {
    return callBrevoMCP('brevo_contacts', 'get_contacts', { filters });
  }, [callBrevoMCP]);

  const getContactInfo = useCallback(async (contactId: number) => {
    return callBrevoMCP('brevo_contacts', 'get_contact_info', { contactId });
  }, [callBrevoMCP]);

  const createContact = useCallback(async (contact: BrevoContact) => {
    return callBrevoMCP('brevo_contacts', 'create_contact', contact);
  }, [callBrevoMCP]);

  const updateContact = useCallback(async (contactId: number, updates: Partial<BrevoContact>) => {
    return callBrevoMCP('brevo_contacts', 'update_contact', { contactId, ...updates });
  }, [callBrevoMCP]);

  const deleteContact = useCallback(async (contactId: number) => {
    return callBrevoMCP('brevo_contacts', 'delete_contact', { contactId });
  }, [callBrevoMCP]);

  // === DEAL MANAGEMENT ===
  const getDeals = useCallback(async (filters?: {
    limit?: number;
    offset?: number;
    stage?: string;
    contactId?: number;
  }) => {
    return callBrevoMCP('brevo_deals', 'get_deals', { filters });
  }, [callBrevoMCP]);

  const getDeal = useCallback(async (dealId: string) => {
    return callBrevoMCP('brevo_deals', 'get_deal', { dealId });
  }, [callBrevoMCP]);

  const createDeal = useCallback(async (deal: BrevoDeal) => {
    return callBrevoMCP('brevo_deals', 'create_deal', deal);
  }, [callBrevoMCP]);

  const updateDeal = useCallback(async (dealId: string, updates: Partial<BrevoDeal>) => {
    return callBrevoMCP('brevo_deals', 'update_deal', { dealId, ...updates });
  }, [callBrevoMCP]);

  const deleteDeal = useCallback(async (dealId: string) => {
    return callBrevoMCP('brevo_deals', 'delete_deal', { dealId });
  }, [callBrevoMCP]);

  // === EMAIL CAMPAIGN MANAGEMENT ===
  const getEmailCampaigns = useCallback(async (filters?: {
    limit?: number;
    offset?: number;
    status?: string;
  }) => {
    return callBrevoMCP('brevo_campaigns', 'get_email_campaigns', { filters });
  }, [callBrevoMCP]);

  const createEmailCampaign = useCallback(async (campaign: BrevoEmailCampaign) => {
    return callBrevoMCP('brevo_campaigns', 'create_email_campaign', campaign);
  }, [callBrevoMCP]);

  const sendEmailCampaignNow = useCallback(async (campaignId: number) => {
    return callBrevoMCP('brevo_campaigns', 'send_email_campaign_now', { campaignId });
  }, [callBrevoMCP]);

  const sendTestEmailCampaign = useCallback(async (campaignId: number, testEmail: string) => {
    return callBrevoMCP('brevo_campaigns', 'send_test_email_campaign', { campaignId, testEmail });
  }, [callBrevoMCP]);

  const getCampaignDetails = useCallback(async (campaignId: number) => {
    return callBrevoMCP('brevo_campaigns', 'get_campaign_details', { campaignId });
  }, [callBrevoMCP]);

  // === ANALYTICS ===
  const getEmailCampaignStatistics = useCallback(async (campaignId: number) => {
    return callBrevoMCP('brevo_campaigns', 'get_email_campaign_statistics', { campaignId });
  }, [callBrevoMCP]);

  const getAccountSendingStatistics = useCallback(async (startDate?: string, endDate?: string) => {
    return callBrevoMCP('brevo_unified', 'get_account_sending_statistics', { startDate, endDate });
  }, [callBrevoMCP]);

  // === WORKFLOW HELPERS ===
  const createContactAndDeal = useCallback(async (contact: BrevoContact, deal: BrevoDeal) => {
    try {
      // 1. Criar contato
      const contactResponse = await createContact(contact);
      if (!contactResponse.success) {
        return contactResponse;
      }

      // 2. Criar deal associado
      const dealWithContact = {
        ...deal,
        contactId: contactResponse.data?.id,
      };
      
      const dealResponse = await createDeal(dealWithContact);
      
      return {
        success: dealResponse.success,
        data: {
          contact: contactResponse.data,
          deal: dealResponse.data,
        },
        error: dealResponse.error,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro no workflow';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [createContact, createDeal]);

  const sendWelcomeEmail = useCallback(async (contactEmail: string, contactName?: string) => {
    const welcomeCampaign: BrevoEmailCampaign = {
      name: `Boas-vindas - ${contactEmail}`,
      subject: 'Bem-vindo(a) à Queren E-commerce!',
      htmlContent: `
        <h1>Olá${contactName ? ` ${contactName}` : ''}!</h1>
        <p>Bem-vindo(a) à nossa loja online. Estamos muito felizes em tê-lo(a) conosco!</p>
        <p>Explore nossos produtos e aproveite ofertas exclusivas.</p>
        <p>Atenciosamente,<br>Equipe Queren</p>
      `,
      sender: {
        name: 'Queren E-commerce',
        email: 'noreply@queren.com.br',
      },
      replyTo: 'contato@queren.com.br',
    };

    const campaignResponse = await createEmailCampaign(welcomeCampaign);
    if (!campaignResponse.success) {
      return campaignResponse;
    }

    // Enviar teste para o contato
    return sendTestEmailCampaign(campaignResponse.data?.id, contactEmail);
  }, [createEmailCampaign, sendTestEmailCampaign]);

  return {
    // Estados
    isLoading,
    error,
    lastResponse,

    // Contact Management
    getContacts,
    getContactInfo,
    createContact,
    updateContact,
    deleteContact,

    // Deal Management
    getDeals,
    getDeal,
    createDeal,
    updateDeal,
    deleteDeal,

    // Email Campaign Management
    getEmailCampaigns,
    createEmailCampaign,
    sendEmailCampaignNow,
    sendTestEmailCampaign,
    getCampaignDetails,

    // Analytics
    getEmailCampaignStatistics,
    getAccountSendingStatistics,

    // Workflow Helpers
    createContactAndDeal,
    sendWelcomeEmail,

    // Utility
    callBrevoMCP,
  };
}

export type { BrevoContact, BrevoDeal, BrevoEmailCampaign, BrevoMCPResponse };