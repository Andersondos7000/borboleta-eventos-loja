import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, CreditCard, Smartphone, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMercadoPago, usePaymentMonitor } from '@/hooks/useMercadoPago';
import { PaymentData, PreferenceData } from '@/services/mercadopago';

export interface MercadoPagoCheckoutProps {
  orderData: {
    customer: {
      name: string;
      email: string;
      phone: string;
      document: string;
    };
    amount: number;
    description: string;
    items: Array<{
      title: string;
      quantity: number;
      unit_price: number;
    }>;
  };
  onPaymentSuccess?: (paymentData: any) => void;
  onPaymentError?: (error: { message: string }) => void;
  onPaymentPending?: (paymentData: any) => void;
}

export function MercadoPagoCheckout({
  orderData,
  onPaymentSuccess,
  onPaymentError,
  onPaymentPending
}: MercadoPagoCheckoutProps) {
  const { customer, amount, description, items } = orderData;
  const [copiedPix, setCopiedPix] = useState(false);
  const [activeTab, setActiveTab] = useState('pix');
  
  const {
    isLoading,
    error,
    paymentData,
    preferenceData,
    createPix,
    createPreference,
    clearError
  } = useMercadoPago();

  const { status, isMonitoring, startMonitoring, stopMonitoring } = usePaymentMonitor(
    paymentData?.id || null,
    3000
  );

  // Criar pagamento PIX automaticamente
  useEffect(() => {
    if (activeTab === 'pix' && !paymentData && !isLoading) {
      const pixData: PaymentData = {
        amount,
        description,
        customerEmail: customer.email,
        customerName: customer.name,
        customerPhone: customer.phone,
        orderId: undefined
      };
      createPix(pixData);
    }
  }, [activeTab, amount, description, customer.email, customer.name, customer.phone]);

  // Monitorar status do pagamento
  useEffect(() => {
    if (paymentData?.id && !isMonitoring) {
      startMonitoring();
    }
    return () => stopMonitoring();
  }, [paymentData?.id]);

  // Callbacks baseados no status
  useEffect(() => {
    if (status === 'approved' && onPaymentSuccess) {
      onPaymentSuccess(paymentData);
      stopMonitoring();
    } else if (status === 'rejected' && onPaymentError) {
      onPaymentError({ message: 'Pagamento rejeitado' });
      stopMonitoring();
    } else if (status === 'pending' && onPaymentPending) {
      onPaymentPending(paymentData);
    }
  }, [status]);

  const handleCreatePreference = async () => {
    const preferenceData: PreferenceData = {
      items: items.map(item => ({
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: 'BRL'
      })),
      payer: {
        email: customer.email,
        name: customer.name?.split(' ')[0],
        surname: customer.name?.split(' ').slice(1).join(' ')
      },
      external_reference: undefined,
      back_urls: {
        success: `${window.location.origin}/payment/success`,
        failure: `${window.location.origin}/payment/failure`,
        pending: `${window.location.origin}/payment/pending`
      },
      auto_return: 'approved'
    };

    const preference = await createPreference(preferenceData);
    if (preference?.init_point) {
      window.open(preference.init_point, '_blank');
    }
  };

  const copyPixCode = async () => {
    if (paymentData?.qr_code) {
      await navigator.clipboard.writeText(paymentData.qr_code);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2000);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value / 100);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendente', variant: 'secondary' as const },
      approved: { label: 'Aprovado', variant: 'default' as const },
      rejected: { label: 'Rejeitado', variant: 'destructive' as const },
      cancelled: { label: 'Cancelado', variant: 'outline' as const },
      processing: { label: 'Processando', variant: 'secondary' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, variant: 'outline' as const };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao processar pagamento: {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2"
            onClick={clearError}
          >
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pagamento - {formatCurrency(amount)}
          </CardTitle>
          <CardDescription>
            Escolha a forma de pagamento de sua preferência
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pix" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                PIX
              </TabsTrigger>
              <TabsTrigger value="card" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Cartão
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pix" className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Gerando código PIX...</span>
                </div>
              ) : paymentData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Pagamento PIX</h3>
                    {status && getStatusBadge(status)}
                  </div>
                  
                  <div className="flex flex-col items-center space-y-4">
                    <div className="bg-white p-4 rounded-lg border">
                      <QRCodeSVG 
                        value={paymentData.qr_code || ''} 
                        size={200}
                        level="M"
                      />
                    </div>
                    
                    <div className="w-full space-y-2">
                      <label className="text-sm font-medium">Código PIX:</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={paymentData.qr_code || ''} 
                          readOnly 
                          className="flex-1 p-2 border rounded text-sm font-mono"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={copyPixCode}
                        >
                          {copiedPix ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      O código PIX expira em 30 minutos. Após o pagamento, 
                      a confirmação pode levar até 2 minutos.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Erro ao gerar código PIX. Tente novamente.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="card" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pagamento com Cartão</h3>
                <p className="text-sm text-muted-foreground">
                  Você será redirecionado para o ambiente seguro do Mercado Pago
                </p>
                
                <Button 
                  onClick={handleCreatePreference}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pagar com Cartão
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default MercadoPagoCheckout;