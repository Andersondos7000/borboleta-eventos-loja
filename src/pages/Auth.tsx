
import React, { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ButterflyLogo from "@/components/ButterflyLogo";
import { Loader2, Eye, EyeOff, Bug, CheckCircle, AlertTriangle } from "lucide-react";
import ForgotPasswordModal from "@/components/ForgotPasswordModal";
import RoleSelectionModal from "@/components/RoleSelectionModal";
import { useFormDiagnostics } from "@/hooks/monitoring";
import { Alert, AlertDescription } from "@/components/ui/alert";



// Login form schema
const loginSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
});

// Signup form schema
const signupSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  username: z.string().min(3, { message: "Nome de usuário deve ter pelo menos 3 caracteres" }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
  confirmPassword: z.string().min(6, { message: "Confirme sua senha" }),
  role: z.enum(["user", "admin", "organizer"], {
    required_error: "Selecione um tipo de usuário",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

const Auth = () => {
  const { user, signIn, signUp, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("login");
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showRoleSelectionModal, setShowRoleSelectionModal] = useState(false);
  const [pendingGoogleAuth, setPendingGoogleAuth] = useState(false);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Signup form
  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      role: "user",
    },
  });

  // Form diagnostics for signup form
  const {
    diagnostics,
    issues,
    isMonitoring,
    startDiagnostics,
    stopDiagnostics,
    diagnoseField,
    diagnoseAllFields,
    fixFieldSync,
    fixAllFieldSync,
    generateReport
  } = useFormDiagnostics({
    form: signupForm,
    config: {
      enableRealTimeValidation: true,
      enableDOMSync: true,
      enableConsoleLogging: true,
      trackFieldChanges: true,
      alertOnValidationErrors: true
    },
    onIssueDetected: (issue) => {
      console.warn('[Auth] Problema detectado no formulário:', issue);
    },
    onFieldMismatch: (diagnostic) => {
      console.warn('[Auth] Dessincronia de campo detectada:', diagnostic);
    }
  });

  // Auto-start diagnostics when component mounts
  useEffect(() => {
    if (activeTab === 'signup') {
      startDiagnostics();
    } else {
      stopDiagnostics();
    }
    
    return () => {
      stopDiagnostics();
    };
  }, [activeTab, startDiagnostics, stopDiagnostics]);

  // Monitor for form issues and auto-fix
  useEffect(() => {
    if (issues.length > 0) {
      console.log('[Auth] Problemas detectados:', issues);
      // Auto-fix sync issues
      const syncIssues = issues.filter(issue => 
        issue.type === 'field_sync_error' || issue.type === 'validation_mismatch'
      );
      if (syncIssues.length > 0) {
        console.log('[Auth] Tentando corrigir problemas de sincronização...');
        fixAllFieldSync();
      }
    }
  }, [issues, fixAllFieldSync]);



  // Handle login submission
  const onLoginSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      await signIn(values.email, values.password);
      navigate("/perfil");
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle signup submission
  const onSignupSubmit = async (values: SignupFormValues) => {
    setIsSubmitting(true);
    try {
      await signUp(values.email, values.password, values.username, values.role);
      setActiveTab("login");
    } catch (error) {
      console.error("Signup error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Google login
  const handleGoogleLogin = async () => {
    try {
      // Para novos usuários, mostrar modal de seleção de role
      if (activeTab === 'signup') {
        setShowRoleSelectionModal(true);
        setPendingGoogleAuth(true);
      } else {
        // Para login, usar Google OAuth diretamente
        await signInWithGoogle();
      }
    } catch (error) {
      console.error('Erro no login com Google:', error);
    }
  };

  const handleRoleSelection = async (role: string) => {
    try {
      await signInWithGoogle(role);
      setShowRoleSelectionModal(false);
      setPendingGoogleAuth(false);
    } catch (error) {
      console.error('Erro no cadastro com Google:', error);
      setShowRoleSelectionModal(false);
      setPendingGoogleAuth(false);
    }
  };

  // If user is already logged in, redirect to profile
  if (user && !loading) {
    return <Navigate to="/perfil" />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="flex-1 container max-w-md py-12">
        <div className="text-center mb-8">
          <ButterflyLogo className="w-16 h-16 mx-auto" />
          <h1 className="text-2xl font-bold mt-4 text-butterfly-orange">Borboleta Eventos</h1>
          <p className="text-gray-600 mt-2">Entre ou crie uma conta para continuar</p>
        </div>
        


        <Card>
          <CardHeader>
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Cadastro</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-4">
                <CardTitle>Bem-vindo de volta</CardTitle>
                <CardDescription>
                  Entre com seu email e senha para acessar sua conta
                </CardDescription>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-4">
                <CardTitle>Crie sua conta</CardTitle>
                <CardDescription>
                  Preencha as informações abaixo para se cadastrar
                </CardDescription>
              </TabsContent>
            </Tabs>
          </CardHeader>

          <CardContent>
            {activeTab === "login" ? (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="seu-email@exemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showLoginPassword ? "text" : "password"} 
                              placeholder="******" 
                              className="pr-10"
                              {...field} 
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              onClick={() => setShowLoginPassword(!showLoginPassword)}
                            >
                              {showLoginPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="text-right">
                     <button
                       type="button"
                       className="text-sm text-blue-600 hover:text-blue-800 underline"
                       onClick={() => setShowForgotPasswordModal(true)}
                     >
                       Esqueci minha senha
                     </button>
                   </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-butterfly-orange hover:bg-butterfly-orange/90"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">ou</span>
                    </div>
                  </div>

                  <Button 
                    type="button" 
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleLogin}
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 mr-2" />
                    Entrar com Google
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...signupForm}>
                
                <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                  <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="seu-email@exemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome de usuário</FormLabel>
                        <FormControl>
                          <Input placeholder="seunome" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de usuário</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo de usuário" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="user">Usuário Comum</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="organizer">Organizador</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showSignupPassword ? "text" : "password"} 
                              placeholder="******" 
                              className="pr-10"
                              {...field} 
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              onClick={() => setShowSignupPassword(!showSignupPassword)}
                            >
                              {showSignupPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showConfirmPassword ? "text" : "password"} 
                              placeholder="******" 
                              className="pr-10"
                              {...field} 
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Painel de Diagnóstico */}
                  {(showDiagnostics || issues.length > 0) && (
                    <div className="space-y-2 p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bug className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">Diagnóstico do Formulário</span>
                          {isMonitoring && (
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDiagnostics(!showDiagnostics)}
                        >
                          {showDiagnostics ? 'Ocultar' : 'Mostrar'}
                        </Button>
                      </div>
                      
                      {showDiagnostics && (
                        <div className="space-y-2">
                          {issues.length > 0 && (
                            <Alert>
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                <div className="space-y-1">
                                  <p className="font-medium">Problemas detectados:</p>
                                  {issues.map((issue, index) => (
                                    <div key={index} className="text-xs text-gray-600">
                                      • {issue.field}: {issue.message}
                                    </div>
                                  ))}
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => diagnoseAllFields()}
                            >
                              <Bug className="h-3 w-3 mr-1" />
                              Diagnosticar Tudo
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fixAllFieldSync()}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Corrigir Sync
                            </Button>
                          </div>
                          
                          {diagnostics.length > 0 && (
                            <div className="text-xs text-gray-500">
                              <p>Última verificação: {diagnostics[0]?.timestamp ? new Date(diagnostics[0].timestamp).toLocaleTimeString() : 'N/A'}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Button 
                      type="submit" 
                      className="w-full bg-butterfly-orange hover:bg-butterfly-orange/90"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cadastrando...
                        </>
                      ) : (
                        "Cadastrar"
                      )}
                    </Button>
                    
                    {/* Botão para mostrar/ocultar diagnósticos */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setShowDiagnostics(!showDiagnostics)}
                    >
                      <Bug className="h-3 w-3 mr-1" />
                      {showDiagnostics ? 'Ocultar' : 'Mostrar'} Diagnóstico
                    </Button>
                  </div>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">ou</span>
                    </div>
                  </div>

                  <Button 
                    type="button" 
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleLogin}
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 mr-2" />
                    Cadastrar com Google
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>

          <CardFooter className="flex flex-col">
            <Separator className="my-4" />
            <p className="text-xs text-gray-500 text-center">
              Ao entrar ou se cadastrar, você concorda com nossos{" "}
              <a href="/termos" className="text-butterfly-orange hover:underline">
                Termos de Uso
              </a>{" "}
              e{" "}
              <a href="/privacidade" className="text-butterfly-orange hover:underline">
                Política de Privacidade
              </a>
              .
            </p>
          </CardFooter>
        </Card>
      </div>
      <Footer />
      
      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
      />
      
      <RoleSelectionModal
        isOpen={showRoleSelectionModal}
        onClose={() => {
          setShowRoleSelectionModal(false);
          setPendingGoogleAuth(false);
        }}
        onRoleSelect={handleRoleSelection}
      />
    </div>
  );
};

export default Auth;
