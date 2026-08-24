# MANUAL OPERATIVO DE USUARIO — SISTEMA INTEGRAL CIMASUR

**Versión:** 3.5  
**Plataforma:** React 18 + Vite + Google Cloud Firebase Firestore / SQL Engine  
**Documento Oficial de Operación, Procedimientos Técnicos y Soporte**

---

## 1. VISIÓN GENERAL Y ARQUITECTURA DEL SISTEMA

El **Sistema Integral CIMASUR** es una solución corporativa de alto rendimiento desarrollada para articular y digitalizar de manera integrada todas las operaciones comerciales, de seguimiento, formulación de laboratorio farmacéutico-veterinario, control financiero-administrativo y formación académica.

### 1.1 Arquitectura Tecnológica y Persistencia
* **Frontend:** React 18+ con TypeScript, Vite y Tailwind CSS.
* **Base de Datos & Sincronización:** Google Cloud Firebase Firestore en tiempo real combinada con un motor de consultas optimizado.
* **Caché en Memoria y Ahorro de Cuotas:** Sincronización atómica y búsquedas instantáneas en memoria RAM local para eliminar lecturas redundantes en Firestore y prevenir bloqueos por cuota.
* **Seguridad y Auditoría:** Autenticación protegida por roles (Super Admin, Administrador, Jefatura Laboratorio, Químico Farmacéutico, Consultor Comercial, Docente Escuela) con bitácora inmutable de eventos (`audit_logs`) accesible en la consola **CPANEL**.

### 1.2 Tabla Comparativa de Módulos Principales

| Módulo | Propósito y Alcance Operativo | Perfil de Usuario | Entidades y Datos Gestionados |
| :--- | :--- | :--- | :--- |
| **1. Comercial CRM** | Cartera única de clientes (CIE), membresías del Club (Platinum, Oro, Plata, Bronce), pipeline de oportunidades, prospección e integración con Intranet. | Equipo Comercial, Ventas, Admin | Clientes, RUT, Categoría Club, Venta Anual, Cómo Llegó, Intranet. |
| **2. Gestión** | Bitácora cronológica de interacciones diarias con clínicas y veterinarios, estados de seguimiento y carga masiva por lotes (Write Batches). | Consultoras, Ejecutivos de Cuenta, Soporte | Fichas de Interacción, Consultora Asignada, Estado, Observaciones. |
| **3. Laboratorio** | 12 submódulos técnicos que abarcan logística de despachos Courier, stock por área/kardex, formulaciones magistrales, tinturas, glóbulos, vademécum y mantención. | Químicos Farmacéuticos, Jefatura Lab, Asistentes | Guías OT, Stock, Kardex, Lotes, Potencias, Diluciones, Insumos, Equipos. |
| **4. Administración** | Emisión y control de cotizaciones, órdenes de venta, consignaciones a clínicas veterinarias, facturas DTE, inventario general y flujo de caja. | Administración, Contabilidad, Finanzas | Cotizaciones, Ventas Consignación, Liquidaciones, DTEs, Caja. |
| **5. Escuela CIMASUR** | Administración académica para diplomados, cursos de posgrado veterinario, nómina de alumnos, asistencia y actas de calificaciones. | Coordinación Académica, Docentes, Alumnos | Matrículas, Cursos, Asistencia %, Notas, Actas Finales. |
| **6. CPanel Control** | Centro de gobernanza institucional: gestión de usuarios, privilegios por módulo, cambio de contraseñas, auditoría forense y manual de soporte. | Super Administrador, Dirección General | Cuentas de Usuario, Roles, Traza de Auditoría, Manual Operativo. |

---

## 2. MÓDULO COMERCIAL CRM

El módulo comercial gestiona la relación 360° con los clientes y prospectos de CIMASUR.

### 2.1 Campos y Datos del Formulario
* **Razón Social / Nombre del Cliente:** Nombre de la clínica o médico veterinario.
* **RUT / Identificador:** RUT de facturación (validador de formato y unicidad).
* **Región y Comuna:** Ubicación geográfica para zonificación de entregas.
* **Tipo de Cliente:** Clínica Veterinaria, Farmacia, Médico Veterinario Independiente, Distribuidor.
* **Categoría Club CIMASUR:** Platinum, Oro, Plata o Bronce.
* **Teléfono / WhatsApp:** Teléfono de contacto directo para campañas y cotizaciones.
* **Email:** Correo electrónico para envío de DTEs y notificaciones.
* **Cómo Llegó (Canal de Origen):** Campañas Ads, Recomendación, Vía Pública, Redes Sociales, Congresos.
* **Venta Anual Acumulada ($):** Monto histórico consolidado que determina automáticamente el nivel de socio.
* **Inscrito en Intranet:** Estado de habilitación para acceso al portal de compras (`Sí` / `No`).

### 2.2 Herramientas Avanzadas
* **Algoritmo Antiduplicados:** Validación instantánea de coincidencias por RUT y fonética de nombres.
* **Paginación 20x20:** Paginador numerado con botones `Primero`, `Anterior`, números de página y `Último`.
* **Exportaciones:** Generación de Ficha 360° en PDF membretado y planillas Excel (.xlsx).

---

## 3. MÓDULO DE GESTIÓN

Diseñado para registrar y supervisar cada llamada, reunión o acuerdo comercial.

### 3.1 Datos Registrados
* **Fecha de Ingreso:** Día y hora del contacto.
* **Cliente / RUT:** Identificación del profesional o establecimiento.
* **Tipo de Empresa & Comuna:** Contexto operativo del cliente.
* **Consultora Asignada:** Profesional responsable de la gestión.
* **Estado de la Interacción:** *En proceso*, *Con compra*, *Sin compra*, *Finalizado*.
* **Historial Unificado & Observaciones:** Bitácora acumulada de comentarios, acuerdos y compromisos.

### 3.2 Carga Masiva (Write Batches)
Permite subir archivos Excel con cientos de registros a la vez mediante transacciones atómicas que aseguran que no existan duplicados ni pérdida de registros.

---

## 4. MÓDULO DE LABORATORIO (12 SUBMÓDULOS OPERATIVOS)

El módulo de laboratorio cuenta con 12 submódulos especializados para cubrir todo el ciclo productivo y logístico:

### 4.1 Submódulo 1: Seguimiento de Pedidos / Despachos (Courier & Trazabilidad)
* **Objetivo:** Monitoreo logístico en tiempo real de cada despacho despachado por courier.
* **Campos:**
  - `N° Cotización / Pedido`: Identificador del documento comercial de origen.
  - `N° OT / Guía de Transporte`: Número de seguimiento emitido por la empresa de envíos.
  - `Cliente / Destinatario`: Nombre de la clínica o receptor.
  - `Courier`: Starken, Chilexpress, CorreosChile, BlueExpress, Transporte Propio.
  - `Situación / Estado`: PENDIENTE, EN TRÁNSITO, OK (Entregado), RECLAMO.
  - `Fechas Clave`: Fecha Cotización, Fecha Envío, Fecha Cierre, Fecha Estimada de Recepción.
  - `Detalle de Seguimiento / Observaciones`: Comentarios de entrega o incidencias.
* **Optimizaciones:** Paginación de 20 en 20 y filtro por defecto que oculta pedidos finalizados (`OK`) para reducir consultas a Firestore.

### 4.2 Submódulo 2: Stock de Insumo Diario (Control por Áreas & Kardex)
* **Objetivo:** Control del inventario físico distribuido en 4 áreas de trabajo.
* **Áreas de Inventario:**
  1. *Almacén Tinturas*
  2. *Diluciones y Gotas Puras*
  3. *Fórmulas Magistrales*
  4. *Insumos Generales y Envases*
* **Campos:**
  - `Nombre del Insumo / Reactivo`: Descripción clara del material.
  - `Código / SKU`: Código de barras o identificador de estantería.
  - `Stock Actual`: Cantidad física disponible.
  - `Límite Mínimo`: Umbral que detona alerta visual de reabastecimiento.
  - `Alerta de Stock`: Switch ON/OFF de advertencia.
* **Kardex:** Movimientos de entrada (+) y salida (-) con generación automática de Órdenes de Compra en PDF.

### 4.3 Submódulo 3: Elaboración de Gotas y Diluciones
* **Objetivo:** Registro técnico del proceso de dinamización y potenciación homeopática.
* **Campos:** `Fecha de Elaboración`, `Producto / Insumo Base`, `Dilución / Potencia` (6D, 30CH, LM), `Cantidad de Frascos`, `Lote Insumo Base`, `Operador Responsable`, `Control de Calidad` (Aprobado/Rechazado), `Observaciones`.

### 4.4 Submódulo 4: Elaboración de Fórmulas Magistrales
* **Objetivo:** Preparación de recetas veterinarias personalizadas según indicación clínica.
* **Campos:** `Fecha`, `N° Receta / Ficha`, `Nombre del Paciente / Tutor`, `Médico Veterinario Prescriptor`, `Componentes & Dosis`, `Forma Farmacéutica` (Gotas, Glóbulos, Polvo), `Lote Asignado`, `Fecha de Vencimiento`.

### 4.5 Submódulo 5: Elaboración de Glóbulos Homeopáticos
* **Objetivo:** Impregnación estandarizada de glóbulos inertes de sacarosa con diluciones medicamentosas.
* **Campos:** `Fecha de Impregnación`, `Número de Glóbulos / Gramaje`, `Vehículo / Medicamento Impregnado`, `Potencia Dinamizada`, `Tiempo de Secado`, `Lote`, `Responsable`.

### 4.6 Submódulo 6: Elaboración de Cremas y Geles
* **Objetivo:** Producción de formas semi-sólidas tópicas de base hidrofílica o lipofílica.
* **Campos:** `Fecha`, `Tipo de Base` (Gel Carbopol, Crema Base Beeler, Pomada), `Principios Activos / Tinturas Incorporadas`, `Porcentaje (%) de Concentración`, `Cantidad Producida (g/kg)`, `Envase Final` (Pote 50g, Tubo 100g), `Lote & Vencimiento`.

### 4.7 Submódulo 7: Registro de Tinturas Madre (T.M.)
* **Objetivo:** Trazabilidad de maceraciones hidroalcohólicas de origen vegetal y biológico.
* **Campos:** `Fecha de Inicio Maceración`, `Especie Botánica / Cepa`, `Parte de la Planta Utilizada`, `Graduación Alcohólica (% v/v)`, `Proporción Droga/Solvente`, `Fecha Estimada de Filtrado`, `Volumen Obtenido (L)`, `Lote Matriz`.

### 4.8 Submódulo 8: Preparación Gotas Puras (Envasado & Fraccionamiento)
* **Objetivo:** Planificación de lotes de fraccionamiento de tinturas y diluciones en frascos gotarios.
* **Campos:** `Fecha de Envasado`, `Tintura Madre de Origen`, `Cantidad de Unidades Envasadas`, `Tipo de Frasco` (Vidrio ámbar 30ml, 60ml, cuentagotas), `Operador Responsable`.

### 4.9 Submódulo 9: Registro de Insumos Laboratorio T.M. y Otros
* **Objetivo:** Recepción y control de calidad de materias primas e insumos ingresados al laboratorio.
* **Campos:** `Fecha de Recepción`, `Proveedor`, `Descripción del Insumo / Droga Seca / Reactivo`, `Cantidad Recibida`, `N° Guía / Factura`, `Lote de Origen del Proveedor`, `Fecha de Vencimiento de Materia Prima`.

### 4.10 Submódulo 10: Vademécum Técnico
* **Objetivo:** Biblioteca oficial de fórmulas estandarizadas del catálogo CIMASUR.
* **Campos:** `Nombre del Medicamento`, `Código Vademécum`, `Indicaciones Terapéuticas Veterinarias`, `Composición Cuantitativa e Insumos por Frasco`, `Posología Sugerida`.

### 4.11 Submódulo 11: Mantención de Equipos
* **Objetivo:** Programa preventivo y calibración de instrumentos críticos de laboratorio.
* **Campos:** `Fecha de Intervención`, `Equipo` (Balanza Analítica, Campana de Flujo Laminar, Autoclave, Destilador, pH-metro), `Tipo de Mantención` (Calibración, Limpieza Profunda, Desinfección, Preventivo), `Técnico / Empresa Certificadora`, `Próxima Fecha Programada`.

### 4.12 Submódulo 12: Fichas Especializadas / Dr. Conejero (Protocolos Exclusivos EC)
* **Objetivo:** Registro y custodia de formulaciones exclusivas y protocolos clínicos de alta especialidad veterinaria.

---

## 5. MÓDULO DE ADMINISTRACIÓN Y FINANZAS

* **Cotizaciones y Ventas:** Generación de propuestas con cálculo automático de IVA, retenciones y exportación a PDF formal.
* **Ventas en Consignación:** Seguimiento de productos entregados a clínicas, liquidaciones periódicas y control de saldos por cobrar.
* **Inventario General CIMASUR:** Catálogo de productos terminados, precios netos mayoristas/minoristas y valorización contable.
* **Flujo de Caja y Resumen Financiero:** Balance diario y mensual de ingresos versus egresos operativos.

---

## 6. MÓDULO ESCUELA CIMASUR

* **Matrícula y Ficha de Alumnos:** Expediente académico de médicos veterinarios y estudiantes de posgrado.
* **Cursos & Módulos:** Calendario de clases presenciales y virtuales con enlaces a plataformas de videoconferencia.
* **Control de Asistencia:** Registro por sesión y cálculo automático del porcentaje de asistencia mínima.
* **Calificaciones y Actas:** Evaluaciones teóricas y prácticas con emisión de actas de aprobación.

---

## 7. PANEL DE CONTROL (CPANEL) Y AUDITORÍA

* **Gestión de Accesos:** Creación de usuarios, asignación de roles, activación/desactivación de cuentas y cambio de claves.
* **Traza de Auditoría (Audit Logs):** Registro detallado con fecha, hora, usuario, IP, módulo y acción realizada (creación, edición, eliminación o restauración).
* **Papelera de Resiliencia:** Sistema de recuperación de documentos eliminados que permite restaurar cualquier registro a su módulo de origen.
* **Manual de Usuario y Soporte Integrado:** Consulta directa en pantalla con opciones de descarga en formatos **.MD** y **.DOC**.

---

## 8. ESTÁNDAR GLOBAL DE PAGINACIÓN (20 REGISTROS POR PÁGINA)

Para garantizar velocidad instantánea y optimización estricta de consumo de recursos en Firestore, **todos los módulos y submódulos** del sistema implementan la barra de navegación:
* **Botón `Primero`:** Salta de inmediato a la Página 1.
* **Botón `Anterior`:** Retrocede una página.
* **Páginas Numeradas (`1, 2, 3...`):** Navegación directa a cualquier bloque.
* **Botón `Siguiente`:** Avanza a la siguiente página.
* **Botón `Último`:** Salta directamente a la página final de datos.
