import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Loader2, Database, CheckCircle, XCircle, Play, FileText } from 'lucide-react';
import { SupabaseIntegrationTest, TestResult } from '../utils/supabaseTest';

export const SupabaseTestPanel: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [showReport, setShowReport] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    setShowReport(false);

    try {
      const tester = new SupabaseIntegrationTest();
      const testResults = await tester.runAllTests();
      setResults(testResults);
    } catch (error) {
      console.error('Erro ao executar testes:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const generateReport = () => {
    const tester = new SupabaseIntegrationTest();
    tester['results'] = results; // Definir resultados diretamente
    return tester.generateReport();
  };

  const downloadReport = () => {
    const report = generateReport();
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supabase-test-report-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const successRate = results.length > 0 ? ((successCount / results.length) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Teste de Integração Supabase
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Verifique a conectividade e funcionalidade da integração com Supabase
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button 
              onClick={runTests} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isRunning ? 'Executando Testes...' : 'Executar Testes'}
            </Button>

            {results.length > 0 && (
              <Button 
                variant="outline" 
                onClick={downloadReport}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Download Relatório
              </Button>
            )}
          </div>

          {results.length > 0 && (
            <div className="space-y-4">
              {/* Resumo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumo dos Testes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{results.length}</div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{successCount}</div>
                      <div className="text-sm text-muted-foreground">Sucessos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                      <div className="text-sm text-muted-foreground">Erros</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{successRate}%</div>
                      <div className="text-sm text-muted-foreground">Taxa de Sucesso</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detalhes dos Testes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detalhes dos Testes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {results.map((result, index) => (
                      <div 
                        key={index} 
                        className="flex items-start gap-3 p-3 rounded-lg border"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {result.status === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{result.test}</h4>
                            <Badge 
                              variant={result.status === 'success' ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {result.status === 'success' ? 'Sucesso' : 'Erro'}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {result.message}
                          </p>
                          
                          {result.data && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                Mostrar dados
                              </summary>
                              <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recomendações */}
              {errorCount > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-orange-600">Recomendações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {results.filter(r => r.status === 'error').map((error, index) => (
                        <div key={index} className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                          <strong>{error.test}:</strong>
                          <ul className="list-disc list-inside mt-1 text-orange-800">
                            {error.test.includes('Conexão') && (
                              <>
                                <li>Verifique se as credenciais do Supabase estão corretas</li>
                                <li>Confirme se o projeto Supabase está ativo</li>
                                <li>Verifique sua conexão com a internet</li>
                              </>
                            )}
                            {error.test.includes('Tabela') && (
                              <>
                                <li>Execute as migrações do banco de dados</li>
                                <li>Verifique se a tabela foi criada corretamente</li>
                                <li>Confirme as permissões de acesso</li>
                              </>
                            )}
                            {error.test.includes('Dados') && (
                              <>
                                <li>Execute os seeds para popular as tabelas</li>
                                <li>Verifique se há dados inseridos na tabela</li>
                              </>
                            )}
                            {error.test.includes('Edge Function') && (
                              <>
                                <li>Deploy das Edge Functions necessário</li>
                                <li>Verifique se as funções estão ativas no painel Supabase</li>
                              </>
                            )}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {isRunning && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Executando testes de integração...
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupabaseTestPanel;
