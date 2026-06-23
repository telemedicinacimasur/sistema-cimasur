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
  try {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: "Genera 3 recomendaciones de reactivación basadas en la base de clientes y campañas provistas.",
        context: `Clientes: ${JSON.stringify(contacts.slice(0, 10))}\nCampañas: ${JSON.stringify(activities.slice(0, 5))}`,
        isSchool: false
      })
    });

    if (!response.ok) {
      throw new Error("Error al consultar recomendaciones con el servidor.");
    }

    const data = await response.json();
    // Support mapping data back to the recommendations array structure
    return {
      recomendaciones: [
        {
          accion: "Recomendación del motor estratégico",
          objetivo: data.tipo_envio === 'whatsapp' ? "Fidelización vía WhatsApp" : "Campaña de Emailing",
          motivo: data.auditoria || "Se recomienda ejecutar la estrategia de contacto según el plan de pasos generado."
        }
      ]
    };
  } catch (error: any) {
    console.error("AI Recommendation error:", error);
    return {
      recomendaciones: [
        { 
          accion: "Revisión manual necesaria", 
          objetivo: "Error en análisis automático", 
          motivo: `El servicio de IA no pudo procesar la solicitud: ${error?.message || 'Error de conexión'}`
        }
      ]
    };
  }
}
