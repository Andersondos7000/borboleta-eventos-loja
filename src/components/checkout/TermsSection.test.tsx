import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { BrowserRouter } from 'react-router-dom';
import TermsSection from './TermsSection';
import { useToast } from '@/hooks/use-toast';

// Mock do hook useToast
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn()
  }))
}));

// Mock do PixPaymentModal
jest.mock('@/components/PixPaymentModal', () => {
  return function MockPixPaymentModal({ isOpen, onClose, orderData, onPaymentSuccess, onPaymentError }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="pix-payment-modal">
        <h2>Modal PIX Aberto</h2>
        <p>Cliente: {orderData?.customer?.name}</p>
        <p>Total: R$ {(orderData?.amount / 100).toFixed(2)}</p>
        <button onClick={onClose} data-testid="close-modal">Fechar</button>
        <button 
          onClick={() => onPaymentSuccess({ id: 'test-payment' })} 
          data-testid="simulate-success"
        >
          Simular Sucesso
        </button>
        <button 
          onClick={() => onPaymentError({ message: 'Erro de teste' })} 
          data-testid="simulate-error"
        >
          Simular Erro
        </button>
      </div>
    );
  };
});

// Componente wrapper para usar o useForm
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

const TermsSectionWithForm: React.FC<{
  orderData?: any;
  total?: number;
  isProcessing?: boolean;
}> = ({ orderData, total = 100, isProcessing = false }) => {
  const form = useForm({
    defaultValues: {
      terms: false
    }
  });

  return (
    <TermsSection 
      form={form} 
      total={total} 
      isProcessing={isProcessing}
      orderData={orderData}
    />
  );
};

describe('TermsSection - Teste do Modal PIX', () => {
  const mockOrderData = {
    customer: {
      name: 'João Silva',
      email: 'joao@teste.com',
      phone: '11999999999',
      document: '12345678901'
    },
    amount: 5000, // R$ 50,00 em centavos
    description: 'Pedido de teste',
    items: [
      {
        title: 'Produto Teste',
        quantity: 1,
        unit_price: 5000
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve renderizar o botão "Fazer Pedido" corretamente', () => {
    render(
      <TestWrapper>
        <TermsSectionWithForm total={50} />
      </TestWrapper>
    );

    const button = screen.getByRole('button', { name: /fazer pedido r\$ 50,00/i });
    expect(button).toBeInTheDocument();
  });

  it('deve abrir o modal PIX quando o botão é clicado e há orderData', async () => {
    render(
      <TestWrapper>
        <TermsSectionWithForm 
          orderData={mockOrderData} 
          total={50}
        />
      </TestWrapper>
    );

    // Primeiro, aceitar os termos
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Clicar no botão "Fazer Pedido"
    const button = screen.getByRole('button', { name: /fazer pedido r\$ 50,00/i });
    fireEvent.click(button);

    // Verificar se o modal PIX foi aberto
    await waitFor(() => {
      expect(screen.getByTestId('pix-payment-modal')).toBeInTheDocument();
    });

    // Verificar se os dados do pedido estão sendo passados corretamente
    expect(screen.getByText('Cliente: João Silva')).toBeInTheDocument();
    expect(screen.getByText('Total: R$ 50.00')).toBeInTheDocument();
  });

  it('não deve abrir o modal PIX quando não há orderData', () => {
    render(
      <TestWrapper>
        <TermsSectionWithForm total={50} />
      </TestWrapper>
    );

    // Aceitar os termos
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Clicar no botão "Fazer Pedido"
    const button = screen.getByRole('button', { name: /fazer pedido r\$ 50,00/i });
    fireEvent.click(button);

    // Verificar que o modal PIX NÃO foi aberto
    expect(screen.queryByTestId('pix-payment-modal')).not.toBeInTheDocument();
  });

  it('deve fechar o modal PIX quando o botão fechar é clicado', async () => {
    render(
      <TestWrapper>
        <TermsSectionWithForm 
          orderData={mockOrderData} 
          total={50}
        />
      </TestWrapper>
    );

    // Aceitar termos e abrir modal
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    const button = screen.getByRole('button', { name: /fazer pedido r\$ 50,00/i });
    fireEvent.click(button);

    // Aguardar modal abrir
    await waitFor(() => {
      expect(screen.getByTestId('pix-payment-modal')).toBeInTheDocument();
    });

    // Fechar modal
    const closeButton = screen.getByTestId('close-modal');
    fireEvent.click(closeButton);

    // Verificar se modal foi fechado
    await waitFor(() => {
      expect(screen.queryByTestId('pix-payment-modal')).not.toBeInTheDocument();
    });
  });

  it('deve processar sucesso do pagamento PIX corretamente', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    render(
      <TestWrapper>
        <TermsSectionWithForm 
          orderData={mockOrderData} 
          total={50}
        />
      </TestWrapper>
    );

    // Abrir modal
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    const button = screen.getByRole('button', { name: /fazer pedido r\$ 50,00/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('pix-payment-modal')).toBeInTheDocument();
    });

    // Simular sucesso do pagamento
    const successButton = screen.getByTestId('simulate-success');
    fireEvent.click(successButton);

    // Verificar se o console.log foi chamado
    expect(consoleSpy).toHaveBeenCalledWith('Pagamento PIX aprovado:', { id: 'test-payment' });
    
    // Verificar se modal foi fechado
    await waitFor(() => {
      expect(screen.queryByTestId('pix-payment-modal')).not.toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('deve processar erro do pagamento PIX corretamente', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(
      <TestWrapper>
        <TermsSectionWithForm 
          orderData={mockOrderData} 
          total={50}
        />
      </TestWrapper>
    );

    // Abrir modal
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    const button = screen.getByRole('button', { name: /fazer pedido r\$ 50,00/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('pix-payment-modal')).toBeInTheDocument();
    });

    // Simular erro do pagamento
    const errorButton = screen.getByTestId('simulate-error');
    fireEvent.click(errorButton);

    // Verificar se o console.error foi chamado
    expect(consoleSpy).toHaveBeenCalledWith('Erro no pagamento PIX:', { message: 'Erro de teste' });
    
    // Verificar se modal foi fechado
    await waitFor(() => {
      expect(screen.queryByTestId('pix-payment-modal')).not.toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('deve desabilitar o botão quando isProcessing é true', () => {
    render(
      <TestWrapper>
        <TermsSectionWithForm 
          orderData={mockOrderData} 
          total={50}
          isProcessing={true}
        />
      </TestWrapper>
    );

    const button = screen.getByRole('button', { name: /processando.../i });
    expect(button).toBeDisabled();
  });

  it('deve mostrar texto "Processando..." quando isProcessing é true', () => {
    render(
      <TestWrapper>
        <TermsSectionWithForm 
          orderData={mockOrderData} 
          total={50}
          isProcessing={true}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Processando...')).toBeInTheDocument();
  });
});