
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Analiza la siguiente base de clientes y el historial de campañas CRM para generar recomendaciones inteligentes de activación.

    Clientes:
    ${JSON.stringify(contacts.map(c => ({ name: c.name, categoria: c.categoria, historial: c.historialUnificado.substring(0, 100) })))}

    Historial de Actividades/Campañas:
    ${JSON.stringify(activities.map(a => ({ campania: a.campania, tipo: a.tipo, observaciones: a.observaciones })))}

    Objetivo: 
    1. Identifica clientes sin movimiento reciente o sin categoría definida para reactivar.
    2. Compara el desempeño de campañas pasadas (basado en las observaciones).
    3. Genera 3 recomendaciones concretas de acciones a seguir (ej: qué enviar, a qué categoría, por qué).

    Formato de salida (JSON):
    {
      "recomendaciones": [
        { "accion": "...", "objetivo": "...", "motivo": "..." }
      ]
    }
  `;

  const result = await model.generateContent(prompt);
  const jsonResponse = JSON.parse(result.response.text());
  return jsonResponse;
}
