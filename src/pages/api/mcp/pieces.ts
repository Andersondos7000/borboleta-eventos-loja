import type { NextApiRequest, NextApiResponse } from 'next';

type PiecesResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

/**
 * API endpoint para integração com o Pieces MCP
 * 
 * Permite acessar as funcionalidades do Pieces MCP a partir do frontend
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PiecesResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const { tool, params } = req.body;

    if (!tool) {
      return res.status(400).json({ success: false, error: 'Ferramenta não especificada' });
    }

    // URL do servidor MCP do Pieces configurado no .trae/mcp.json
    const PIECES_MCP_URL = 'http://localhost:39300/model_context_protocol/2024-11-05';

    // Chamada para o servidor MCP do Pieces
    const response = await fetch(`${PIECES_MCP_URL}/tools`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        server_name: 'Pieces',
        tool_name: tool,
        args: params || {}
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na requisição ao Pieces MCP: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Erro ao processar requisição para o Pieces MCP:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json({ success: false, error: errorMessage });
  }
}