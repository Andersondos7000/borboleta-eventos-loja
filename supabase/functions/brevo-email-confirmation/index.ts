import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BrevoEmailRequest {
  to: string
  templateId?: number
  params?: Record<string, any>
  subject?: string
  htmlContent?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { record, type, table } = await req.json()
    
    // Só processar eventos de signup
    if (type !== 'INSERT' || table !== 'auth.users') {
      return new Response(
        JSON.stringify({ message: 'Event ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const user = record
    const userEmail = user.email
    const confirmationToken = user.confirmation_token
    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000'
    const confirmationUrl = `${siteUrl}/auth/confirm?token=${confirmationToken}&type=signup&redirect_to=${siteUrl}/dashboard`

    // Configuração da Brevo
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')
    if (!brevoApiKey) {
      throw new Error('BREVO_API_KEY não configurada')
    }

    // Template HTML personalizado para confirmação
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirme seu cadastro - Borboleta Eventos</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🦋 Borboleta Eventos</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Bem-vindo à nossa plataforma!</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
                <h2 style="color: #1a202c; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Confirme seu cadastro</h2>
                
                <p style="color: #4a5568; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                    Olá! Obrigado por se cadastrar na <strong>Borboleta Eventos</strong>. 
                    Para ativar sua conta e começar a usar nossa plataforma, clique no botão abaixo:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${confirmationUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease;">
                        ✨ Confirmar Email
                    </a>
                </div>
                
                <div style="background-color: #f7fafc; border-left: 4px solid #667eea; padding: 15px; margin: 25px 0; border-radius: 4px;">
                    <p style="color: #2d3748; margin: 0; font-size: 14px;">
                        <strong>💡 Dica:</strong> Se o botão não funcionar, copie e cole este link no seu navegador:
                    </p>
                    <p style="color: #667eea; margin: 5px 0 0 0; font-size: 14px; word-break: break-all;">
                        ${confirmationUrl}
                    </p>
                </div>
                
                <p style="color: #718096; font-size: 14px; line-height: 1.5; margin: 25px 0 0 0;">
                    Este link expira em 24 horas por segurança. Se você não solicitou este cadastro, 
                    pode ignorar este email com segurança.
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #edf2f7; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #718096; margin: 0; font-size: 14px;">
                    © 2025 Borboleta Eventos. Todos os direitos reservados.
                </p>
                <p style="color: #a0aec0; margin: 5px 0 0 0; font-size: 12px;">
                    Este é um email automático, não responda.
                </p>
            </div>
        </div>
    </body>
    </html>
    `

    // Enviar email via Brevo
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': brevoApiKey
      },
      body: JSON.stringify({
        sender: {
          name: 'Borboleta Eventos',
          email: 'noreply@borboletaeventos.com.br'
        },
        to: [{
          email: userEmail,
          name: user.user_metadata?.full_name || userEmail.split('@')[0]
        }],
        subject: '🦋 Confirme seu cadastro - Borboleta Eventos',
        htmlContent: htmlContent,
        textContent: `Bem-vindo à Borboleta Eventos!\n\nPara confirmar seu cadastro, acesse: ${confirmationUrl}\n\nEste link expira em 24 horas.\n\nSe você não solicitou este cadastro, ignore este email.\n\n© 2025 Borboleta Eventos`,
        tags: ['signup-confirmation', 'auth']
      })
    })

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.text()
      console.error('Erro na Brevo:', errorData)
      throw new Error(`Erro ao enviar email via Brevo: ${brevoResponse.status}`)
    }

    const brevoResult = await brevoResponse.json()
    console.log('Email enviado via Brevo:', brevoResult)

    // Log da atividade no Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      await supabase.from('email_logs').insert({
        user_id: user.id,
        email: userEmail,
        type: 'signup_confirmation',
        provider: 'brevo',
        message_id: brevoResult.messageId,
        status: 'sent',
        sent_at: new Date().toISOString()
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email de confirmação enviado via Brevo',
        messageId: brevoResult.messageId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro na Edge Function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})