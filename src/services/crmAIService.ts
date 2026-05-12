
import { GoogleGenAI, Type } from "@google/genai";

// Initialize AI lazily to avoid issues if key is missing on startup
let aiClient: GoogleGenAI | null = null;

function getAI() {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

interface Contact {
  id: string;
  name: string;
  categoria: string;
  historialUnificado: string;
  fechaIngreso: string;
}

interface Activity {
  id: string;
  campania: string;
  tipo: string;
  observaciones: string;
  fecha: string;
  targetCategories: string[];
}

export async function getCRMAIRecommendations(contacts: Contact[], activities: Activity[]) {
  const ai = getAI();
  const prompt = `
    Analiza la siguiente base de clientes y el historial de campañas CRM para generar recomendaciones inteligentes de activación.

    Base de Clientes:
    ${JSON.stringify(contacts.slice(0, 50).map(c => ({ name: c.name, categoria: c.categoria, historial: (c.historialUnificado || '').substring(0, 100) })))}

    Historial de Actividades/Campañas:
    ${JSON.stringify(activities.slice(0, 20).map(a => ({ campania: a.campania, tipo: a.tipo, observaciones: a.observaciones })))}

    Tareas:
    1. Identifica clientes sin movimiento reciente o sin categoría definida para reactivar.
    2. Compara el desempeño de campañas pasadas (basado en las observaciones).
    3. Genera 3 recomendaciones concretas de acciones a seguir (ej: qué enviar, a qué categoría, por qué).
  `;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "Eres un experto analista de CRM y Estrategia Comercial. Tu objetivo es proporcionar recomendaciones accionables basadas en datos históricos.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recomendaciones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  accion: { type: Type.STRING },
                  objetivo: { type: Type.STRING },
                  motivo: { type: Type.STRING }
                },
                required: ["accion", "objetivo", "motivo"]
              }
            }
          },
          required: ["recomendaciones"]
        }
      }
    });

    const text = result.text;
    if (!text) throw new Error("No response from AI models");
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error("AI Recommendation error:", error);
    
    // Check if it's an API key issue
    if (error?.message?.includes("API_KEY_INVALID") || error?.message?.includes("403")) {
      return {
        recomendaciones: [
          { 
            accion: "Verificar API Key", 
            objetivo: "Configuración requerida", 
            motivo: "La clave de Gemini API no es válida o no tiene permisos. Verifique en Settings > Secrets." 
          }
        ]
      };
    }

    return {
      recomendaciones: [
        { 
          accion: "Revisión manual necesaria", 
          objetivo: "Error en análisis automático", 
          motivo: `El servicio de IA no pudo procesar la solicitud: ${error?.message || 'Error desconocido'}`
        }
      ]
    };
  }
}
