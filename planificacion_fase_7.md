# PLANIFICACIÓN TÉCNICA - FASE 7: AUTOMATIZACIÓN Y ORQUESTACIÓN DE CAMPAÑAS INTELEGENTES

## 1. Declaración de Objetivos y Alcance Funcional
El objetivo central de la **Fase 7** es dotar al CRM de CIMASUR de un **Motor de Campañas y Automatización** capaz de reaccionar de manera programada o asíncrona a las oportunidades de negocio identificadas por los motores analíticos deterministas estabilizados en la Fase 6.

### Objetivos de Negocio:
*   **Segmentación Proactiva**: Habilitar a los coordinadores de marketing a configurar y despachar campañas masivas o micro-segmentadas (ej. beneficios exclusivos a nivel Diamante, reactivaciones a veterinarios dormidos).
*   **Orquestación de Canales**: Coordinación multicanal (WhatsApp, Email, Llamada institucional) basada en el canal preferente sugerido por el `RecommendationEngine`.
*   **Trazabilidad y Conversión (ROI)**: Vincular de forma unívoca cada interacción de campaña con transacciones reales en el módulo de ventas para medir el retorno económico real.

---

## 2. Decisiones Clave de Arquitectura y Desacoplamiento
Para preservar la estabilidad de los módulos ya estabilizados, la arquitectura de la Fase 7 respetará estrictamente las siguientes directrices:

1.  **Gobernanza por Consumo Exclusivo**: El motor de campañas **no calculará** categorías de lealtad, ni balances de puntos, ni scores de oportunidad de forma directa. Consumirá la API y las clases de servicio desarrolladas en las Fases 5 y 6 (`OpportunityEngine`, `RecommendationEngine`, `CustomerJourneyService`) como única fuente de verdad.
2.  **Desacoplamiento de Servicios de Despacho**: La ejecución física del envío (gateways de correo como SendGrid, o integraciones de WhatsApp) estará completamente abstraída mediante contratos de interfaz. En el entorno de desarrollo de AI Studio se utilizará un despachador simulado en memoria que registrará los despachos de forma determinista para auditoría.
3.  **Seguimiento Transaccional (Ledger de Campañas)**: Se implementará un registro persistente de interacciones de campaña (`campaign_interactions`) para evitar duplicación de despachos y mantener un historial transparente de contacto clínico.

---

## 3. Matriz de Madurez Técnica Diseñada para la Fase 7

Para mantener el rigor metodológico del proyecto, la implementación y validación de la Fase 7 se organizará bajo la misma taxonomía de tres niveles de madurez:

| Nivel de Madurez | Componente / Hito de Validación | Criterios de Aceptación Técnicos |
| :--- | :--- | :--- |
| **📋 Planificado para Desarrollo** | Motor de Despacho y Automatización | Estructura de servicio en backend que filtre el portafolio y genere interacciones de campaña basadas en reglas analíticas deterministas. |
| **📋 Planificado para Desarrollo** | Registro y Atribución de Conversión | Lógica de negocio en base de datos para enlazar una venta posterior a un despacho activo de campaña dentro de una ventana temporal lógica (ej. 14 días). |
| **📋 Planificado para Desarrollo** | Interfaz UI de Campañas | Creación de una pestaña dedicada en el panel del CRM que permita previsualizar el segmento, elegir canal, seleccionar borrador y despachar campañas. |
| **📋 Planificado para Desarrollo** | Suites de Pruebas Automatizadas | Pruebas unitarias y de integración que verifiquen el despacho correcto de segmentos simulados sin generar regresiones de código en los módulos congelados. |
| **⚠️ Pendiente de Validación Operacional** | Integración de Servicios Externos | Pruebas de envío reales bajo escenarios productivos de red, controlando políticas de reintentos (retries) y límites de envío diario (rate limits) de proveedores de mensajería. |
| **🚀 Pendiente para Producción** | Solares de Envíos en Segundo Plano | Implementación de tareas programadas (Cron jobs o colas de mensajes como BullMQ) para el procesamiento asíncrono y masivo de colas sin degradar la experiencia de usuario del CRM en el navegador. |

---

## 4. Estrategia de Pruebas y Resiliencia (Fase 7)

Para evitar reabrir los módulos congelados y asegurar la inmunidad a regresiones, se diseñará una suite de pruebas robusta (`/test_campaigns.ts`) que cubra los siguientes escenarios lógicos:

1.  **Prueba de Consistencia de Segmentos**: Garantizar que el motor de automatización seleccione exactamente los mismos identificadores de clientes que reporta el `OpportunityEngine` en un momento dado.
2.  **Prueba de Idempotencia de Despacho**: Verificar que la re-ejecución accidental de una campaña no envíe duplicados de mensajería a un mismo veterinario clínico en menos de un intervalo de gracia predefinido.
3.  **Prueba de Atribución de Ventas**: Comprobar el correcto enlazado del retorno económico (ROI) cuando una compra de ventas es procesada dentro de la ventana de influencia de una campaña activa.
4.  **Prueba de Degradación ante Errores de Mensajería**: Asegurar que una falla crítica de conexión con la pasarela de envío (ej. WhatsApp desconectado) se registre como "Falla de Despacho" en la base de datos sin interrumpir el resto de la cola de envíos masivos.
