
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Privacy = () => {
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
            
            <h1 className="text-3xl font-bold mb-2 text-butterfly-orange">Política de Privacidade</h1>
            <p className="text-gray-600">Última atualização: 1 de maio de 2025</p>
          </div>
          
          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introdução</h2>
              <p>
                A Borboleta Eventos está comprometida em proteger sua privacidade. Esta Política de Privacidade 
                explica como coletamos, usamos, divulgamos e salvaguardamos suas informações quando você usa nosso serviço.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">2. Informações Coletadas</h2>
              <p>Podemos coletar diversos tipos de informações para fornecer e melhorar nosso serviço, incluindo:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Informações pessoais (nome, endereço de e-mail, telefone, endereço, etc.)</li>
                <li>Informações de pagamento (processadas por nossos parceiros de pagamento)</li>
                <li>Informações de uso e preferências</li>
                <li>Informações do dispositivo e navegador</li>
                <li>Cookies e tecnologias similares</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">3. Como Usamos Suas Informações</h2>
              <p>Usamos as informações coletadas para:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Fornecer e manter nosso serviço</li>
                <li>Processar transações e enviar notificações relacionadas</li>
                <li>Melhorar e personalizar a experiência do usuário</li>
                <li>Comunicar novidades, atualizações e informações relevantes</li>
                <li>Analisar o uso do serviço e tendências</li>
                <li>Prevenir atividades fraudulentas e garantir a segurança</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">4. Compartilhamento de Informações</h2>
              <p>
                Não compartilhamos suas informações pessoais com terceiros, exceto nas seguintes circunstâncias:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Com parceiros que processam pagamentos</li>
                <li>Para cumprir obrigações legais</li>
                <li>Para proteger nossos direitos e propriedade</li>
                <li>Com seu consentimento expresso</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">5. Segurança dos Dados</h2>
              <p>
                Implementamos medidas de segurança adequadas para proteger contra acesso não autorizado, alteração, 
                divulgação ou destruição de suas informações pessoais. No entanto, nenhum método de transmissão pela 
                internet ou método de armazenamento eletrônico é 100% seguro.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">6. Seus Direitos</h2>
              <p>Você tem direito a:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Acessar, corrigir ou excluir suas informações pessoais</li>
                <li>Restringir ou opor-se ao processamento de seus dados</li>
                <li>Solicitar a portabilidade de seus dados</li>
                <li>Retirar o consentimento a qualquer momento</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">7. Cookies</h2>
              <p>
                Usamos cookies e tecnologias similares para melhorar sua experiência, analisar o tráfego e personalizar conteúdo. 
                Você pode controlar os cookies através das configurações do seu navegador.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">8. Alterações nesta Política</h2>
              <p>
                Podemos atualizar nossa Política de Privacidade periodicamente. Notificaremos você sobre quaisquer alterações 
                publicando a nova Política de Privacidade nesta página e atualizando a data da "última atualização".
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">9. Contato</h2>
              <p>
                Se você tiver dúvidas ou preocupações sobre esta Política de Privacidade, entre em contato conosco pelo e-mail: 
                <a href="mailto:privacidade@borboletaeventos.com" className="text-butterfly-orange hover:underline ml-1">
                  privacidade@borboletaeventos.com
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

export default Privacy;
