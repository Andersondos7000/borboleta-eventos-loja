import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import AbacatePayButton from '../../components/abacatepay/AbacatePayButton';
import { useAbacatePayment } from '../../hooks/abacatepay/useAbacatePayment';
import { useAuth } from '../../hooks/useAuth';

// Mock dependencies
jest.mock('sonner');
jest.mock('../../hooks/abacatepay/useAbacatePayment');
jest.mock('../../hooks/useAuth');

const mockToast = toast as jest.MockedFunction<typeof toast>;
const mockUseAbacatePayment = useAbacatePayment as jest.MockedFunction<typeof useAbacatePayment>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('AbacatePayButton', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  };

  const mockPaymentOrder = {
    amount: 1000,
    description: 'Test payment',
    customer: {
      name: 'João Silva',
      email: 'joao@example.com',
      phone: '11999999999',
      document: '12345678901'
    }
  };

  const mockCreatePayment = jest.fn();
  const mockReset = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn()
    });

    mockUseAbacatePayment.mockReturnValue({
      loading: false,
      error: null,
      paymentData: null,
      createPayment: mockCreatePayment,
      reset: mockReset
    });
  });

  it('should render button with default text', () => {
    render(
      <AbacatePayButton 
        paymentOrder={mockPaymentOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByRole('button')).toHaveTextContent('Pagar com AbacatePay');
  });

  it('should render button with custom text', () => {
    render(
      <AbacatePayButton 
        paymentOrder={mockPaymentOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        buttonText="Finalizar Pagamento"
      />
    );

    expect(screen.getByRole('button')).toHaveTextContent('Finalizar Pagamento');
  });

  it('should show loading state when payment is being created', () => {
    mockUseAbacatePayment.mockReturnValue({
      loading: true,
      error: null,
      paymentData: null,
      createPayment: mockCreatePayment,
      reset: mockReset
    });

    render(
      <AbacatePayButton 
        paymentOrder={mockPaymentOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Processando...');
  });

  it('should be disabled when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn()
    });

    render(
      <AbacatePayButton 
        paymentOrder={mockPaymentOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Faça login para pagar');
  });

  it('should be disabled when explicitly disabled', () => {
    render(
      <AbacatePayButton 
        paymentOrder={mockPaymentOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        disabled={true}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should create payment when clicked', async () => {
    const mockPaymentData = {
      id: 'payment-123',
      status: 'pending' as const,
      amount: 1000,
      pixCode: 'pix-code-123',
      pixQrCode: 'data:image/png;base64,qrcode'
    };

    mockCreatePayment.mockResolvedValue(mockPaymentData);

    render(
      <AbacatePayButton 
        paymentOrder={mockPaymentOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockCreatePayment).toHaveBeenCalledWith(mockPaymentOrder);
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(mockPaymentData);
    });
  });

  it('should handle payment creation error', async () => {
    const errorMessage = 'Payment failed';
    mockCreatePayment.mockRejectedValue(new Error(errorMessage));

    render(
      <AbacatePayButton 
        paymentOrder={mockPaymentOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockCreatePayment).toHaveBeenCalledWith(mockPaymentOrder);
    });

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(new Error(errorMessage));
    });
  });

  it('should apply custom className', () => {
    render(
      <AbacatePayButton 
        paymentOrder={mockPaymentOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        className="custom-class"
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('should show error state when there is an error', () => {
    mockUseAbacatePayment.mockReturnValue({
      loading: false,
      error: 'Payment failed',
      paymentData: null,
      createPayment: mockCreatePayment,
      reset: mockReset
    });

    render(
      <AbacatePayButton 
        paymentOrder={mockPaymentOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Tentar novamente');
  });

  it('should reset error state when clicked after error', async () => {
    mockUseAbacatePayment.mockReturnValue({
      loading: false,
      error: 'Payment failed',
      paymentData: null,
      createPayment: mockCreatePayment,
      reset: mockReset
    });

    render(
      <AbacatePayButton 
        paymentOrder={mockPaymentOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockReset).toHaveBeenCalled();
  });

  it('should validate payment order before creating payment', async () => {
    const invalidPaymentOrder = {
      amount: 0, // Invalid amount
      description: '',
      customer: {
        name: '',
        email: 'invalid-email',
        phone: '',
        document: ''
      }
    };

    render(
      <AbacatePayButton 
        paymentOrder={invalidPaymentOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Dados de pagamento inválidos')
        })
      );
    });

    expect(mockCreatePayment).not.toHaveBeenCalled();
  });

  it('should handle successful payment with custom success message', async () => {
    const mockPaymentData = {
      id: 'payment-123',
      status: 'pending' as const,
      amount: 1000,
      pixCode: 'pix-code-123',
      pixQrCode: 'data:image/png;base64,qrcode'
    };

    mockCreatePayment.mockResolvedValue(mockPaymentData);

    render(
      <AbacatePayButton 
        paymentOrder={mockPaymentOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        successMessage="Pagamento criado com sucesso!"
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(mockPaymentData);
    });
  });

  it('should prevent double clicks during payment creation', async () => {
    mockUseAbacatePayment.mockReturnValue({
      loading: true,
      error: null,
      paymentData: null,
      createPayment: mockCreatePayment,
      reset: mockReset
    });

    render(
      <AbacatePayButton 
        paymentOrder={mockPaymentOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const button = screen.getByRole('button');
    
    // Try to click multiple times
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    // Should only be called once due to loading state
    expect(mockCreatePayment).toHaveBeenCalledTimes(0); // Button is disabled when loading
  });
});