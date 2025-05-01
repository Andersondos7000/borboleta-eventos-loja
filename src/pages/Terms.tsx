
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Terms = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <div className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Button variant="ghost" className="mb-4" asChild>
              <Link to="/" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Home
              </Link>
            </Button>
            
            <h1 className="text-3xl font-bold mb-2 text-butterfly-orange">Termos de Serviço</h1>
            <p className="text-gray-600">Última atualização: 1 de maio de 2025</p>
          </div>
          
          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Aceitação dos Termos</h2>
              <p>
                Ao acessar e usar o site Borboleta Eventos, você concorda em cumprir e estar vinculado a estes Termos de Serviço. 
                Se você não concordar com qualquer parte destes termos, não poderá acessar ou utilizar nossos serviços.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">2. Alterações nos Termos</h2>
              <p>
                Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entram em vigor imediatamente após 
                a publicação no site. Seu uso contínuo do serviço após tais modificações constitui sua aceitação dos novos termos.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">3. Descrição do Serviço</h2>
              <p>
                A Borboleta Eventos oferece uma plataforma para compra de ingressos para eventos e produtos relacionados. 
                Não garantimos que o serviço atenderá às suas necessidades específicas ou que será ininterrupto, seguro ou livre de erros.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">4. Política de Privacidade</h2>
              <p>
                Ao usar nossos serviços, você concorda com nossa Política de Privacidade, que descreve como coletamos, 
                usamos e compartilhamos suas informações pessoais.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">5. Registro e Segurança da Conta</h2>
              <p>
                Para utilizar determinados recursos do site, você pode precisar criar uma conta. 
                Você é responsável por manter a confidencialidade de sua senha e informações da conta e 
                por todas as atividades que ocorrem em sua conta.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">6. Regras de Conduta</h2>
              <p>
                Você concorda em não usar o serviço para qualquer finalidade ilegal ou proibida pelos termos. 
                Você não pode usar o serviço de qualquer maneira que possa danificar, desativar ou sobrecarregar 
                nosso site ou interferir no uso de terceiros.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">7. Pagamentos e Reembolsos</h2>
              <p>
                Todos os pagamentos são processados através de plataformas seguras. Consulte nossa política de reembolso 
                para informações sobre cancelamentos e devoluções. Para eventos, o reembolso só é possível até 7 dias antes 
                da data do evento.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">8. Direitos de Propriedade Intelectual</h2>
              <p>
                Todo o conteúdo presente no site, incluindo textos, gráficos, logotipos, ícones e imagens, 
                é propriedade da Borboleta Eventos ou de seus fornecedores de conteúdo e está protegido por leis de direitos autorais.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">9. Limitação de Responsabilidade</h2>
              <p>
                Em nenhum caso a Borboleta Eventos será responsável por quaisquer danos diretos, indiretos, incidentais, 
                especiais ou consequenciais resultantes do uso ou incapacidade de uso do serviço.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">10. Legislação Aplicável</h2>
              <p>
                Estes termos serão regidos e interpretados de acordo com as leis do Brasil, sem consideração 
                a quaisquer princípios de conflitos de leis.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">11. Contato</h2>
              <p>
                Se você tiver alguma dúvida sobre estes Termos de Serviço, entre em contato conosco pelo e-mail: 
                <a href="mailto:contato@borboletaeventos.com" className="text-butterfly-orange hover:underline ml-1">
                  contato@borboletaeventos.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Terms;
