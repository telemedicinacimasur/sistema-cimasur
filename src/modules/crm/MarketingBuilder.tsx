import React, { useState, useRef, useEffect } from 'react';
import { 
  Mail, 
  MessageSquare, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  Smartphone, 
  Monitor, 
  Send, 
  Save, 
  FileText, 
  Code, 
  Eye, 
  Check, 
  Settings, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  ChevronDown, 
  Layers, 
  Type, 
  RefreshCw,
  Info,
  Copy,
  ExternalLink,
  Undo
} from 'lucide-react';

// ==========================================
// Types and Interfaces
// ==========================================

export interface EmailBlock {
  id: string;
  type: 'text' | 'image' | 'button' | 'divider' | 'spacer';
  content: string; // The main text, URL for image, or text for button
  title?: string;  // Title/heading for text block if any, or link URL for button/image
  alignment?: 'left' | 'center' | 'right';
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
  backgroundColor?: string;
  textColor?: string;
  padding?: 'sm' | 'md' | 'lg';
  buttonUrl?: string;
  imageUrl?: string;
  imageAlt?: string;
}

export interface SavedTemplate {
  id: string;
  name: string;
  type: 'email' | 'whatsapp';
  subject?: string;
  blocks?: EmailBlock[];
  whatsappBody?: string;
  whatsappHeaderUrl?: string;
  whatsappSendType?: 'individual' | 'masivo';
  updatedAt: string;
}

// Default dynamic variables available for insertion
const DYNAMIC_VARIABLES = [
  { tag: '{{nombre}}', label: 'Nombre del Cliente', mockValue: 'Dr. Alejandro Silva' },
  { tag: '{{categoria_club}}', label: 'Categoría Club', mockValue: 'Oro' },
  { tag: '{{frascos_comprados}}', label: 'Frascos Comprados', mockValue: '48 frascos' },
  { tag: '{{promedio_mensual}}', label: 'Promedio Mensual', mockValue: '$425,000 CLP' },
  { tag: '{{estado_origen}}', label: 'Región de Origen', mockValue: 'Región de Los Lagos' },
];

export default function MarketingBuilder({ 
  preloadedTemplate, 
  clearPreloadedTemplate,
  isEmbedded = false,
  activeChannel,
  selectedClients = []
}: { 
  preloadedTemplate?: string | null; 
  clearPreloadedTemplate?: () => void;
  isEmbedded?: boolean;
  activeChannel?: 'email' | 'whatsapp';
  selectedClients?: any[];
} = {}) {
  // ==========================================
  // Component State
  // ==========================================
  const [internalTab, setInternalTab] = useState<'email' | 'whatsapp'>('email');
  const activeTab = activeChannel || internalTab;
  const setActiveTab = setInternalTab;

  const [previewClientIndex, setPreviewClientIndex] = useState<number>(0);

  // Sync index to stay in-bounds when selected list changes
  useEffect(() => {
    if (selectedClients && selectedClients.length > 0) {
      if (previewClientIndex >= selectedClients.length) {
        setPreviewClientIndex(0);
      }
    } else {
      setPreviewClientIndex(0);
    }
  }, [selectedClients, previewClientIndex]);
  
  // Email Editor States
  const [emailSubject, setEmailSubject] = useState('🌟 Oferta Especial Club de Socios CIMASUR (2026)');
  const [emailBlocks, setEmailBlocks] = useState<EmailBlock[]>([
    {
      id: 'block-1',
      type: 'text',
      content: 'Estimado/a **{{nombre}}**,\n\nQueremos agradecer su confianza continua como miembro distinguido del **Club de Socios CIMASUR**. Nos complace comunicarle los beneficios exclusivos que tenemos preparados para usted en esta temporada especial del 2026.',
      title: '¡Beneficios Exclusivos Club {{categoria_club}}! 🎉',
      alignment: 'left',
      fontSize: 'md',
      padding: 'md'
    },
    {
      id: 'block-2',
      type: 'image',
      content: '',
      imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800',
      imageAlt: 'Instalaciones Médicas CIMASUR 2026',
      alignment: 'center',
      padding: 'sm'
    },
    {
      id: 'block-3',
      type: 'text',
      content: 'Actualmente usted cuenta con un consumo registrado de **{{frascos_comprados}}** y un promedio mensual de compras de **{{promedio_mensual}}** en la zona de **{{estado_origen}}**.\n\nPor este motivo, hemos activado un cupón especial del **15% de descuento** en su próximo pedido de insumos críticos.',
      alignment: 'center',
      fontSize: 'md',
      padding: 'md'
    },
    {
      id: 'block-4',
      type: 'button',
      content: 'Canjear Mi Cupón Club {{categoria_club}}',
      buttonUrl: 'https://cimasur.cl/club-socios',
      alignment: 'center',
      backgroundColor: '#0f766e', // teal-700
      textColor: '#ffffff',
      padding: 'md'
    },
    {
      id: 'block-5',
      type: 'divider',
      content: ''
    },
    {
      id: 'block-6',
      type: 'text',
      content: 'CIMASUR Chile - Soluciones de Salud de Alta Precisión. Para consultas adicionales, contáctenos directamente respondiendo a este email.',
      alignment: 'center',
      fontSize: 'sm',
      padding: 'sm'
    }
  ]);
  
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>('block-1');
  const [emailHtmlMode, setEmailHtmlMode] = useState<boolean>(false);
  const [customHtmlContent, setCustomHtmlContent] = useState<string>('');
  
  // Custom email state history for HTML conversion safety
  const [isHtmlSynced, setIsHtmlSynced] = useState<boolean>(true);

  // WhatsApp Editor States
  const [whatsappBody, setWhatsappBody] = useState(
    '📱 *Club de Socios CIMASUR (2026)* 📱\n\nHola *{{nombre}}*,\n\nLe contactamos del área comercial para informarle que su membresía nivel *Club {{categoria_club}}* le otorga beneficios especiales hoy.\n\n📊 *Resumen de Cuenta:*\n• Consumo: {{frascos_comprados}}\n• Compras Mensuales: {{promedio_mensual}}\n• Distribución: {{estado_origen}}\n\nPara canjear sus descuentos premium, escriba *CLUB2026* o haga clic en el botón de soporte adjunto.'
  );

  useEffect(() => {
    if (preloadedTemplate) {
      const isWhatsApp = preloadedTemplate.toLowerCase().includes('whatsapp') || 
                         preloadedTemplate.toLowerCase().includes('📱') ||
                         preloadedTemplate.toLowerCase().includes('hola');
      
      if (isWhatsApp) {
        setWhatsappBody(preloadedTemplate);
        setActiveTab('whatsapp');
      } else {
        let bodyText = preloadedTemplate;
        const subjectMatch = preloadedTemplate.match(/^asunto:\s*(.+)$/im);
        if (subjectMatch) {
          setEmailSubject(subjectMatch[1]);
          bodyText = preloadedTemplate.replace(/^asunto:\s*(.+)$/im, '').trim();
        }
        
        setEmailBlocks([
          {
            id: 'block-preloaded-1',
            type: 'text',
            content: bodyText,
            title: 'Propuesta de Campaña Generada por IA 🌟',
            alignment: 'left',
            fontSize: 'md',
            padding: 'md'
          }
        ]);
        setSelectedBlockId('block-preloaded-1');
        setActiveTab('email');
      }
      clearPreloadedTemplate?.();
    }
  }, [preloadedTemplate]);

  useEffect(() => {
    const handleAssistantUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{
        whatsappMessage?: string;
        emailBody?: string;
        imageUrl?: string;
      }>;
      const { whatsappMessage, emailBody, imageUrl } = customEvent.detail || {};

      if (whatsappMessage) {
        setWhatsappBody(whatsappMessage);
      }
      
      if (emailBody) {
        let bodyText = emailBody;
        const subjectMatch = emailBody.match(/^asunto:\s*(.+)$/im);
        if (subjectMatch) {
          setEmailSubject(subjectMatch[1]);
          bodyText = emailBody.replace(/^asunto:\s*(.+)$/im, '').trim();
        }
        
        setEmailBlocks([
          {
            id: `block-${Date.now()}`,
            type: 'text',
            content: bodyText,
            title: 'Propuesta Modificada por Asistente IA 🌟',
            alignment: 'left',
            fontSize: 'md',
            padding: 'md'
          }
        ]);
      }

      if (imageUrl) {
        setWhatsappHeaderUrl(imageUrl);
      }

      // Switch tab based on what was modified
      if (whatsappMessage && !emailBody) {
        setActiveTab('whatsapp');
      } else if (emailBody && !whatsappMessage) {
        setActiveTab('email');
      }
    };

    window.addEventListener('assistant-update-editor', handleAssistantUpdate);
    return () => {
      window.removeEventListener('assistant-update-editor', handleAssistantUpdate);
    };
  }, []);

  const [whatsappHeaderUrl, setWhatsappHeaderUrl] = useState('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800');
  const [whatsappSendType, setWhatsappSendType] = useState<'individual' | 'masivo'>('masivo');

  // Preview Settings (Shared)
  const [previewSize, setPreviewSize] = useState<'desktop' | 'mobile'>('desktop');
  const [useMockValues, setUseMockValues] = useState<boolean>(true); // Variable Substitution engine toggle

  // Test Simulator state
  const [testEmailDestination, setTestEmailDestination] = useState('telemedicina.cimasur@gmail.com');
  const [testPhoneDestination, setTestPhoneDestination] = useState('+56 9 8765 4321');
  const [alertNotification, setAlertNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Templates Persistence
  const [templatesList, setTemplatesList] = useState<SavedTemplate[]>([
    {
      id: 'tmpl-1',
      name: 'Bienvenida Club Socios 2026',
      type: 'email',
      subject: '✨ Bienvenido al Club de Socios de Precisión CIMASUR 2026',
      updatedAt: '2026-07-01 14:30',
      blocks: [
        { id: 'b-1', type: 'text', content: 'Estimado socio **{{nombre}}**, le damos la bienvenida oficial al Club de Socios CIMASUR.', title: '¡Su membresía está activa!', alignment: 'center', fontSize: 'lg' }
      ]
    },
    {
      id: 'tmpl-2',
      name: 'Recordatorio Alerta Clientes en Riesgo',
      type: 'whatsapp',
      whatsappBody: 'Estimado *{{nombre}}*, notamos que no ha realizado solicitudes en las últimas semanas. Queremos ofrecerle un beneficio en su promedio habitual de *{{promedio_mensual}}*. Contáctenos.',
      whatsappSendType: 'individual',
      updatedAt: '2026-07-05 09:12'
    }
  ]);
  const [templateName, setTemplateName] = useState('Mi Nueva Plantilla Comercial');

  // Input ref helpers for variable insertion
  const emailTextAreaRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});
  const emailInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const whatsappTextAreaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-dismiss notification toast
  useEffect(() => {
    if (alertNotification) {
      const timer = setTimeout(() => {
        setAlertNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alertNotification]);

  // Sync state-based HTML from Blocks whenever blocks or subject change
  useEffect(() => {
    if (!emailHtmlMode) {
      const compiled = generateEmailHTML(emailBlocks, emailSubject, false);
      setCustomHtmlContent(compiled);
    }
  }, [emailBlocks, emailSubject, emailHtmlMode]);

  // ==========================================
  // Helper functions / Variable Replacer
  // ==========================================

  // Replace tags with simulated real data or keep tags
  const currentPreviewClient = selectedClients && selectedClients.length > 0 ? selectedClients[previewClientIndex] : null;

  const getClientVariableValue = (client: any, tag: string, fallbackMock: string): string => {
    if (!client) return fallbackMock;
    switch (tag) {
      case '{{nombre}}':
        return client.name || client.nombre || 'Socio Veterinario';
      case '{{categoria_club}}':
        return client.categoria || client.clubCategory || client.clubComercial?.categoria || 'Sin Categoría';
      case '{{frascos_comprados}}':
        return `${client.compras || 0} frascos`;
      case '{{promedio_mensual}}':
        const val = client.promedio || client.promedioMensual || 0;
        return `$${Math.round(val).toLocaleString('es-CL')} CLP`;
      case '{{estado_origen}}':
        return client.region || client.region_origen || client.ciudad || 'Región Metropolitana';
      default:
        return fallbackMock;
    }
  };

  const processVariables = (text: string): string => {
    if (!text) return '';
    let result = text;
    DYNAMIC_VARIABLES.forEach(v => {
      const replacement = useMockValues 
        ? getClientVariableValue(currentPreviewClient, v.tag, v.mockValue) 
        : v.tag;
      result = result.replace(new RegExp(v.tag, 'g'), replacement);
    });
    return result;
  };

  // Basic markdown parser for preview (*bold* and \n to br)
  const parseMarkdown = (text: string): string => {
    if (!text) return '';
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    // Process markdown-like **bold** or *bold*
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    // Process _italics_
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    // Process ~strikethrough~
    html = html.replace(/~(.*?)~/g, '<del>$1</del>');
    // Process linebreaks
    html = html.replace(/\n/g, '<br />');

    return html;
  };

  // Convert block based structure into actual clean responsive HTML Table format
  const generateEmailHTML = (blocks: EmailBlock[], subject: string, replaceVars: boolean): string => {
    const renderBlock = (b: EmailBlock) => {
      const contentProcessed = replaceVars ? processVariables(b.content) : b.content;
      const titleProcessed = b.title ? (replaceVars ? processVariables(b.title) : b.title) : '';
      const textAlignment = b.alignment || 'left';
      const fontSizeClass = b.fontSize === 'sm' ? '13px' : b.fontSize === 'lg' ? '18px' : b.fontSize === 'xl' ? '24px' : '15px';
      const spacingStyle = b.padding === 'sm' ? 'padding: 8px 24px;' : b.padding === 'lg' ? 'padding: 32px 24px;' : 'padding: 16px 24px;';

      switch (b.type) {
        case 'text':
          return `
            <tr>
              <td style="${spacingStyle} background-color: #ffffff; font-family: 'Helvetica Neue', Arial, sans-serif; color: #334155;">
                ${titleProcessed ? `<h2 style="margin-top: 0; margin-bottom: 12px; font-size: ${b.fontSize === 'xl' ? '26px' : '20px'}; font-weight: 700; color: #0f172a; text-align: ${textAlignment};">${parseMarkdown(titleProcessed)}</h2>` : ''}
                <p style="margin: 0; font-size: ${fontSizeClass}; line-height: 1.6; text-align: ${textAlignment}; color: #475569;">
                  ${parseMarkdown(contentProcessed)}
                </p>
              </td>
            </tr>
          `;
        case 'image':
          return `
            <tr>
              <td align="${textAlignment}" style="padding: 12px 24px; background-color: #ffffff;">
                <img src="${b.imageUrl || 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800'}" 
                     alt="${b.imageAlt || 'Imagen de CIMASUR'}" 
                     style="max-width: 100%; height: auto; border-radius: 8px; display: block;" />
              </td>
            </tr>
          `;
        case 'button':
          return `
            <tr>
              <td align="${textAlignment}" style="padding: 24px; background-color: #ffffff;">
                <table border="0" cellspacing="0" cellpadding="0" style="display: inline-block;">
                  <tr>
                    <td align="center" bgcolor="${b.backgroundColor || '#0f766e'}" style="border-radius: 6px;">
                      <a href="${b.buttonUrl || '#'}" target="_blank" style="font-size: 16px; font-family: Helvetica, Arial, sans-serif; color: ${b.textColor || '#ffffff'}; text-decoration: none; border-radius: 6px; padding: 12px 24px; border: 1px solid ${b.backgroundColor || '#0f766e'}; display: inline-block; font-weight: bold;">
                        ${parseMarkdown(contentProcessed)}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          `;
        case 'divider':
          return `
            <tr>
              <td style="padding: 16px 24px; background-color: #ffffff;">
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 0;" />
              </td>
            </tr>
          `;
        case 'spacer':
          return `
            <tr>
              <td style="height: 24px; background-color: #ffffff; line-height: 24px; font-size: 1px;">&nbsp;</td>
            </tr>
          `;
        default:
          return '';
      }
    };

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${replaceVars ? processVariables(subject) : subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; border-collapse: collapse; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border-radius: 12px;">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0d1e2e; padding: 28px 24px; text-align: center; border-bottom: 3px solid #14b8a6;">
              <h1 style="color: #ffffff; margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">CIMASUR</h1>
              <p style="color: #94a3b8; margin: 4px 0 0 0; font-family: Arial, sans-serif; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase;">Motor Comercial Inteligente</p>
            </td>
          </tr>
          
          <!-- Email Content Blocks -->
          ${blocks.map(b => renderBlock(b)).join('')}
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; text-align: center; font-family: Arial, sans-serif; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; font-weight: bold;">CIMASUR Club de Socios &copy; 2026</p>
              <p style="margin: 0 0 12px 0;">Este correo fue enviado a un socio registrado de CIMASUR.</p>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="#" style="color: #0f766e; text-decoration: underline; margin: 0 10px;">Darse de baja</a>
                    <span style="color: #cbd5e1;">|</span>
                    <a href="#" style="color: #0f766e; text-decoration: underline; margin: 0 10px;">Preferencias de contacto</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  // ==========================================
  // Interactions & Actions
  // ==========================================

  // Add block to Email Canvas
  const handleAddBlock = (type: 'text' | 'image' | 'button' | 'divider' | 'spacer') => {
    const newId = `block-${Date.now()}`;
    let newBlock: EmailBlock;

    switch (type) {
      case 'text':
        newBlock = {
          id: newId,
          type: 'text',
          content: 'Escriba aquí el contenido del texto. Puede usar marcadores de personalización como **{{nombre}}** o **{{categoria_club}}** para automatizar el mensaje.',
          title: 'Nuevo Bloque de Título',
          alignment: 'left',
          fontSize: 'md',
          padding: 'md'
        };
        break;
      case 'image':
        newBlock = {
          id: newId,
          type: 'image',
          content: '',
          imageUrl: 'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?auto=format&fit=crop&q=80&w=800',
          imageAlt: 'Imagen Ilustrativa',
          alignment: 'center',
          padding: 'sm'
        };
        break;
      case 'button':
        newBlock = {
          id: newId,
          type: 'button',
          content: 'Botón de Acción',
          buttonUrl: 'https://cimasur.cl',
          alignment: 'center',
          backgroundColor: '#0f766e',
          textColor: '#ffffff',
          padding: 'md'
        };
        break;
      case 'divider':
        newBlock = {
          id: newId,
          type: 'divider',
          content: ''
        };
        break;
      case 'spacer':
        newBlock = {
          id: newId,
          type: 'spacer',
          content: ''
        };
        break;
    }

    setEmailBlocks([...emailBlocks, newBlock]);
    setSelectedBlockId(newId);
    triggerSuccessToast(`Bloque de ${type === 'text' ? 'Texto' : type === 'image' ? 'Imagen' : type === 'button' ? 'Botón' : type === 'divider' ? 'Separador' : 'Espacio'} insertado exitosamente`);
  };

  // Delete block from Email Canvas
  const handleDeleteBlock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = emailBlocks.filter(b => b.id !== id);
    setEmailBlocks(filtered);
    if (selectedBlockId === id) {
      setSelectedBlockId(filtered.length > 0 ? filtered[filtered.length - 1].id : null);
    }
    triggerSuccessToast('Bloque eliminado del borrador');
  };

  // Block re-ordering
  const handleMoveBlock = (id: string, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const index = emailBlocks.findIndex(b => b.id === id);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= emailBlocks.length) return;

    const updated = [...emailBlocks];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    setEmailBlocks(updated);
  };

  // Block inline changes
  const updateBlockProperty = (id: string, property: keyof EmailBlock, value: any) => {
    setEmailBlocks(prev => 
      prev.map(b => b.id === id ? { ...b, [property]: value } : b)
    );
  };

  // Insert Dynamic Variable inside specific target cursor or active state
  const insertVariable = (variableTag: string) => {
    if (activeTab === 'email') {
      if (!selectedBlockId) {
        triggerSuccessToast('Seleccione un bloque de texto primero para insertar variables.');
        return;
      }
      
      const block = emailBlocks.find(b => b.id === selectedBlockId);
      if (!block) return;

      // Handle insertion into text content or title
      if (block.type === 'text' || block.type === 'button') {
        const inputEl = emailTextAreaRefs.current[selectedBlockId];
        if (inputEl) {
          const start = inputEl.selectionStart;
          const end = inputEl.selectionEnd;
          const content = block.content;
          const updatedContent = content.substring(0, start) + variableTag + content.substring(end);
          updateBlockProperty(selectedBlockId, 'content', updatedContent);
          
          // Re-focus and set selection
          setTimeout(() => {
            inputEl.focus();
            const newCursorPos = start + variableTag.length;
            inputEl.setSelectionRange(newCursorPos, newCursorPos);
          }, 50);
        } else {
          // Fallback if ref is not found
          updateBlockProperty(selectedBlockId, 'content', block.content + ' ' + variableTag);
        }
        triggerSuccessToast(`Insertado ${variableTag} en el bloque seleccionado`);
      } else {
        triggerSuccessToast('Las variables dinámicas sólo se pueden insertar en textos y botones.');
      }
    } else {
      // WhatsApp Insertion
      const textEl = whatsappTextAreaRef.current;
      if (textEl) {
        const start = textEl.selectionStart;
        const end = textEl.selectionEnd;
        const updatedBody = whatsappBody.substring(0, start) + variableTag + whatsappBody.substring(end);
        setWhatsappBody(updatedBody);
        
        setTimeout(() => {
          textEl.focus();
          const newCursorPos = start + variableTag.length;
          textEl.setSelectionRange(newCursorPos, newCursorPos);
        }, 50);
      } else {
        setWhatsappBody(prev => prev + ' ' + variableTag);
      }
      triggerSuccessToast(`Insertado ${variableTag} en WhatsApp`);
    }
  };

  // Show customized modern toasts
  const triggerSuccessToast = (message: string) => {
    setAlertNotification({
      type: 'success',
      message
    });
  };

  // Save template to memory
  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    const isExisting = templatesList.find(t => t.name.toLowerCase() === templateName.toLowerCase());
    
    const newTemplate: SavedTemplate = {
      id: isExisting ? isExisting.id : `tmpl-${Date.now()}`,
      name: templateName,
      type: activeTab,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      ...(activeTab === 'email' ? {
        subject: emailSubject,
        blocks: emailBlocks
      } : {
        whatsappBody,
        whatsappHeaderUrl,
        whatsappSendType
      })
    };

    if (isExisting) {
      setTemplatesList(templatesList.map(t => t.id === isExisting.id ? newTemplate : t));
      triggerSuccessToast(`Plantilla "${templateName}" actualizada correctamente`);
    } else {
      setTemplatesList([newTemplate, ...templatesList]);
      triggerSuccessToast(`Nueva Plantilla "${templateName}" guardada en la base de datos comercial`);
    }
  };

  // Load a saved template
  const handleLoadTemplate = (t: SavedTemplate) => {
    setTemplateName(t.name);
    setActiveTab(t.type);
    
    if (t.type === 'email' && t.blocks) {
      setEmailBlocks(t.blocks);
      if (t.subject) setEmailSubject(t.subject);
      setEmailHtmlMode(false);
      if (t.blocks.length > 0) {
        setSelectedBlockId(t.blocks[0].id);
      }
    } else if (t.type === 'whatsapp') {
      if (t.whatsappBody) setWhatsappBody(t.whatsappBody);
      if (t.whatsappHeaderUrl) setWhatsappHeaderUrl(t.whatsappHeaderUrl);
      if (t.whatsappSendType) setWhatsappSendType(t.whatsappSendType);
    }
    
    triggerSuccessToast(`Cargada plantilla: ${t.name}`);
  };

  // Run simulated dispatch / test send
  const handleSimulateSend = (e: React.FormEvent) => {
    e.preventDefault();
    const destination = activeTab === 'email' ? testEmailDestination : testPhoneDestination;
    
    setAlertNotification({
      type: 'info',
      message: `Enviando prueba comercial...`
    });

    setTimeout(() => {
      setAlertNotification({
        type: 'success',
        message: `✅ ¡Envío de prueba de ${activeTab === 'email' ? 'Email' : 'WhatsApp'} exitoso a ${destination}! El motor aplicó la personalización en tiempo real.`
      });
    }, 1200);
  };

  return (
    <div id="marketing-builder-root" className={`w-full bg-slate-900 text-slate-100 font-sans ${isEmbedded ? '' : 'min-h-screen p-4 md:p-8 flex flex-col'}`}>
      
      {/* Header Panel with Brand & Instructions */}
      <div id="marketing-header" className={`mb-6 flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-5 ${isEmbedded ? 'hidden' : ''}`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-full">
              Club Socios CIMASUR 2026
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Motor Comercial Inteligente
            <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Herramienta avanzada de diseño y personalización para campañas dirigidas del Club de Socios. Defina plantillas, inyecte variables directas y simule despachos omnicanales.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
          <div className="bg-slate-800/80 p-1 rounded-lg border border-slate-700/80 flex">
            <button 
              id="tab-email-trigger"
              onClick={() => { setActiveTab('email'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-xs md:text-sm transition-all ${activeTab === 'email' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
            >
              <Mail className="h-4 w-4" />
              Campañas de Email
            </button>
            <button 
              id="tab-whatsapp-trigger"
              onClick={() => { setActiveTab('whatsapp'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-xs md:text-sm transition-all ${activeTab === 'whatsapp' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
            >
              <MessageSquare className="h-4 w-4" />
              WhatsApp Marketing
            </button>
          </div>
        </div>
      </div>

      {/* Global Alerts Portal */}
      {alertNotification && (
        <div id="builder-toast-notification" className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 max-w-md animate-bounce border ${alertNotification.type === 'success' ? 'bg-teal-950/95 text-teal-200 border-teal-500/40 shadow-teal-900/10' : 'bg-slate-900/95 text-slate-100 border-slate-700 shadow-black/20'}`}>
          <div className={`p-1.5 rounded-lg ${alertNotification.type === 'success' ? 'bg-teal-500/20 text-teal-400' : 'bg-blue-500/20 text-blue-400'}`}>
            <Check className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium">{alertNotification.message}</div>
        </div>
      )}

      {/* Central Application Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Hand: Toolbox / Controls & Saved Templates (cols: 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Saved Templates Loader Panel */}
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/60 p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-teal-400" />
              Plantillas Guardadas (Club 2026)
            </h2>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {templatesList.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleLoadTemplate(t)}
                  className="w-full text-left p-3 rounded-lg bg-slate-900/50 hover:bg-slate-700/50 border border-slate-800 hover:border-slate-600 transition-all flex items-center justify-between group"
                >
                  <div className="truncate">
                    <p className="font-medium text-xs md:text-sm text-slate-200 truncate group-hover:text-white">{t.name}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                      <span className={`w-1.5 h-1.5 rounded-full ${t.type === 'email' ? 'bg-teal-400' : 'bg-emerald-400'}`}></span>
                      <span>{t.type === 'email' ? 'Email' : 'WhatsApp'}</span>
                      <span>•</span>
                      <span>{t.updatedAt}</span>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-500 -rotate-90 group-hover:text-slate-300 transition-transform" />
                </button>
              ))}
              {templatesList.length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-4">No hay plantillas guardadas.</p>
              )}
            </div>
          </div>

          {/* Dynamic Variable Quick-Injector Panel */}
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/60 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Variables del Club
              </h2>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                <Info className="h-3 w-3" />
                Reemplazo Activo
              </div>
            </div>
            
            <p className="text-xs text-slate-400 mb-4">
              Haga clic sobre cualquier variable para inyectarla en la posición activa de su editor de {activeTab === 'email' ? 'Email (bloque seleccionado)' : 'WhatsApp'}.
            </p>

            {selectedClients && selectedClients.length > 0 && (
              <div className="mb-4 bg-slate-900/60 p-3 rounded-lg border border-slate-700/80 space-y-2">
                <label htmlFor="preview-client-select" className="block text-xs font-semibold text-teal-400 uppercase tracking-wider">
                  Socio Seleccionado para Previsualizar:
                </label>
                <select
                  id="preview-client-select"
                  value={previewClientIndex}
                  onChange={(e) => setPreviewClientIndex(parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                >
                  {selectedClients.map((client, idx) => (
                    <option key={client.id || idx} value={idx}>
                      {client.name || client.nombre || `Socio ${idx + 1}`} ({client.categoria || client.clubCategory || client.clubComercial?.categoria || 'Sin cat.'})
                    </option>
                  ))}
                </select>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>{selectedClients.length} socios listos</span>
                  <span className="text-emerald-400 font-medium">Previsualizando #{previewClientIndex + 1}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              {DYNAMIC_VARIABLES.map(v => {
                const activeValue = currentPreviewClient 
                  ? getClientVariableValue(currentPreviewClient, v.tag, v.mockValue) 
                  : v.mockValue;
                return (
                  <button
                    key={v.tag}
                    onClick={() => insertVariable(v.tag)}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 hover:bg-teal-950/40 border border-slate-800 hover:border-teal-500/40 text-left transition-all group"
                  >
                    <div className="space-y-0.5">
                      <span className="font-mono text-xs text-teal-400 font-bold bg-teal-950/80 px-1.5 py-0.5 rounded border border-teal-500/10 group-hover:border-teal-500/30">
                        {v.tag}
                      </span>
                      <p className="text-[11px] text-slate-400 pl-1">{v.label}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 italic block">
                        {currentPreviewClient ? 'Valor Socio:' : 'Simula:'}
                      </span>
                      <span className="text-xs font-semibold text-slate-300 block max-w-[140px] truncate" title={activeValue}>
                        {activeValue}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Simulated Data Toggle Switch */}
            <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-center justify-between">
              <label htmlFor="toggle-mock-data" className="text-xs font-medium text-slate-300 flex flex-col cursor-pointer">
                <span>Simular Datos del Cliente</span>
                <span className="text-[10px] text-slate-500 font-normal">Reemplaza variables en la previsualización</span>
              </label>
              <button
                id="toggle-mock-data"
                onClick={() => setUseMockValues(!useMockValues)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${useMockValues ? 'bg-teal-600' : 'bg-slate-700'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${useMockValues ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* Save/Template Form */}
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/60 p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
              <Save className="h-4 w-4 text-emerald-400" />
              Guardar Avances
            </h2>
            <form onSubmit={handleSaveTemplate} className="space-y-3">
              <div>
                <label htmlFor="template-name-input" className="block text-xs font-medium text-slate-400 mb-1">Nombre de la Plantilla</label>
                <input
                  id="template-name-input"
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Ej: Oferta Premium Julio"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-2 px-4 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                Registrar Plantilla
              </button>
            </form>
          </div>

          {/* Test Sender Simulator Panel */}
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/60 p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
              <Send className="h-4 w-4 text-blue-400" />
              Simulador de Despacho
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Realice un envío de prueba para validar que las variables dinámicas se inyectan correctamente según las reglas del Club de Socios.
            </p>
            <form onSubmit={handleSimulateSend} className="space-y-3">
              {activeTab === 'email' ? (
                <div>
                  <label htmlFor="test-email-input" className="block text-xs font-medium text-slate-400 mb-1">Email de Prueba</label>
                  <input
                    id="test-email-input"
                    type="email"
                    value={testEmailDestination}
                    onChange={(e) => setTestEmailDestination(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="correo@ejemplo.com"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="test-phone-input" className="block text-xs font-medium text-slate-400 mb-1">Celular de Prueba (WhatsApp)</label>
                  <input
                    id="test-phone-input"
                    type="text"
                    value={testPhoneDestination}
                    onChange={(e) => setTestPhoneDestination(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="+56 9 XXXX XXXX"
                    required
                  />
                </div>
              )}
              <button
                type="submit"
                className={`w-full text-white font-medium py-2 px-4 rounded-lg text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'email' ? 'bg-teal-600 hover:bg-teal-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
              >
                <Send className="h-4 w-4" />
                Enviar Prueba de {activeTab === 'email' ? 'Email' : 'WhatsApp'}
              </button>
            </form>
          </div>

        </div>

        {/* Right Hand Side: Main Working Panel & Dual Live Previews (cols: 8) */}
        <div className="lg:col-span-8 space-y-6">

          {/* ============================================================== */}
          {/* TAB 1: EMAIL BUILDER WORKSPACE                                 */}
          {/* ============================================================== */}
          {activeTab === 'email' && (
            <div id="email-builder-workspace" className="space-y-6">
              
              {/* Toolbar Controls inside the builder */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/20">
                    <Mail className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-white">Editor Visual de Correo</h3>
                    <p className="text-[11px] text-slate-400">Inserte bloques para estructurar su plantilla</p>
                  </div>
                </div>
                
                {/* Visual vs Raw HTML Switch */}
                <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
                  <button
                    id="switch-visual-editor"
                    onClick={() => setEmailHtmlMode(false)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!emailHtmlMode ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Visual (Bloques)
                  </button>
                  <button
                    id="switch-html-editor"
                    onClick={() => setEmailHtmlMode(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${emailHtmlMode ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <Code className="h-3.5 w-3.5" />
                    Código HTML Directo
                  </button>
                </div>
              </div>

              {/* Subject Configuration */}
              <div className="bg-slate-800/80 rounded-xl border border-slate-700 p-5 space-y-3">
                <label htmlFor="email-subject-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Asunto del Correo</label>
                <div className="relative">
                  <input
                    id="email-subject-input"
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-3 pr-24 py-2.5 text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Defina un asunto atractivo..."
                  />
                  <div className="absolute right-2 top-2 text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                    Asunto
                  </div>
                </div>
              </div>

              {/* Split Editor (Visual Mode) */}
              {!emailHtmlMode ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Visual Left Sub-Panel: Blocks Catalog (cols: 4) */}
                  <div className="md:col-span-4 space-y-4">
                    <div className="bg-slate-800/60 rounded-xl border border-slate-700/60 p-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5 text-teal-400" />
                        Añadir Bloques
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          onClick={() => handleAddBlock('text')}
                          className="flex items-center gap-3 w-full p-2.5 rounded-lg bg-slate-900 hover:bg-slate-700/60 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-600 text-left text-xs transition-all"
                        >
                          <span className="p-1.5 bg-sky-500/10 text-sky-400 rounded border border-sky-500/20">
                            <Type className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="font-semibold">Bloque de Texto</p>
                            <p className="text-[10px] text-slate-400">Párrafos con títulos editables</p>
                          </div>
                        </button>

                        <button
                          onClick={() => handleAddBlock('image')}
                          className="flex items-center gap-3 w-full p-2.5 rounded-lg bg-slate-900 hover:bg-slate-700/60 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-600 text-left text-xs transition-all"
                        >
                          <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">
                            <ImageIcon className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="font-semibold">Bloque de Imagen</p>
                            <p className="text-[10px] text-slate-400">Banners, productos o logos</p>
                          </div>
                        </button>

                        <button
                          onClick={() => handleAddBlock('button')}
                          className="flex items-center gap-3 w-full p-2.5 rounded-lg bg-slate-900 hover:bg-slate-700/60 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-600 text-left text-xs transition-all"
                        >
                          <span className="p-1.5 bg-teal-500/10 text-teal-400 rounded border border-teal-500/20">
                            <ExternalLink className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="font-semibold">Botón de Acción</p>
                            <p className="text-[10px] text-slate-400">Llamados a la acción (CTA)</p>
                          </div>
                        </button>

                        <button
                          onClick={() => handleAddBlock('divider')}
                          className="flex items-center gap-3 w-full p-2.5 rounded-lg bg-slate-900 hover:bg-slate-700/60 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-600 text-left text-xs transition-all"
                        >
                          <span className="p-1.5 bg-purple-500/10 text-purple-400 rounded border border-purple-500/20">
                            <Layers className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="font-semibold">Línea Divisoria</p>
                            <p className="text-[10px] text-slate-400">Separador horizontal sutil</p>
                          </div>
                        </button>

                        <button
                          onClick={() => handleAddBlock('spacer')}
                          className="flex items-center gap-3 w-full p-2.5 rounded-lg bg-slate-900 hover:bg-slate-700/60 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-600 text-left text-xs transition-all"
                        >
                          <span className="p-1.5 bg-slate-500/10 text-slate-400 rounded border border-slate-600/20">
                            <RefreshCw className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="font-semibold">Espacio Vacío</p>
                            <p className="text-[10px] text-slate-400">Aumentar espacio vertical</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Block Settings Panel */}
                    {selectedBlockId && emailBlocks.find(b => b.id === selectedBlockId) && (
                      <div id="block-properties-editor" className="bg-slate-800/60 rounded-xl border border-slate-700/60 p-4 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                            <Settings className="h-3.5 w-3.5 text-teal-400" />
                            Ajustes del Bloque
                          </h4>
                          <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800 uppercase font-mono">
                            {emailBlocks.find(b => b.id === selectedBlockId)?.type}
                          </span>
                        </div>

                        {/* Text Block Controls */}
                        {emailBlocks.find(b => b.id === selectedBlockId)?.type === 'text' && (
                          <div className="space-y-3">
                            <div>
                              <label htmlFor="block-text-title" className="block text-[11px] font-medium text-slate-400 mb-1">Título / Encabezado (Opcional)</label>
                              <input
                                id="block-text-title"
                                type="text"
                                value={emailBlocks.find(b => b.id === selectedBlockId)?.title || ''}
                                onChange={(e) => updateBlockProperty(selectedBlockId, 'title', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                placeholder="Ingrese título de sección..."
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-slate-400 mb-1">Alineación del Texto</label>
                              <div className="grid grid-cols-3 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-center">
                                {(['left', 'center', 'right'] as const).map(align => (
                                  <button
                                    key={align}
                                    onClick={() => updateBlockProperty(selectedBlockId, 'alignment', align)}
                                    className={`py-1 text-[10px] rounded capitalize transition-all ${emailBlocks.find(b => b.id === selectedBlockId)?.alignment === align ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                                  >
                                    {align === 'left' ? 'Izquierda' : align === 'center' ? 'Centro' : 'Derecha'}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-slate-400 mb-1">Tamaño de Fuente</label>
                              <div className="grid grid-cols-4 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-center">
                                {(['sm', 'md', 'lg', 'xl'] as const).map(size => (
                                  <button
                                    key={size}
                                    onClick={() => updateBlockProperty(selectedBlockId, 'fontSize', size)}
                                    className={`py-1 text-[10px] rounded uppercase transition-all ${emailBlocks.find(b => b.id === selectedBlockId)?.fontSize === size ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                                  >
                                    {size}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Image Block Controls */}
                        {emailBlocks.find(b => b.id === selectedBlockId)?.type === 'image' && (
                          <div className="space-y-3">
                            <div>
                              <label htmlFor="block-img-url" className="block text-[11px] font-medium text-slate-400 mb-1">URL de la Imagen</label>
                              <input
                                id="block-img-url"
                                type="text"
                                value={emailBlocks.find(b => b.id === selectedBlockId)?.imageUrl || ''}
                                onChange={(e) => updateBlockProperty(selectedBlockId, 'imageUrl', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                placeholder="https://..."
                              />
                            </div>
                            <div>
                              <label htmlFor="block-img-alt" className="block text-[11px] font-medium text-slate-400 mb-1">Texto Alternativo (Alt)</label>
                              <input
                                id="block-img-alt"
                                type="text"
                                value={emailBlocks.find(b => b.id === selectedBlockId)?.imageAlt || ''}
                                onChange={(e) => updateBlockProperty(selectedBlockId, 'imageAlt', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                placeholder="Descripción corta para accesibilidad"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-slate-400 mb-1">Alineación</label>
                              <div className="grid grid-cols-3 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-center">
                                {(['left', 'center', 'right'] as const).map(align => (
                                  <button
                                    key={align}
                                    onClick={() => updateBlockProperty(selectedBlockId, 'alignment', align)}
                                    className={`py-1 text-[10px] rounded capitalize transition-all ${emailBlocks.find(b => b.id === selectedBlockId)?.alignment === align ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                                  >
                                    {align === 'left' ? 'Izquierda' : align === 'center' ? 'Centro' : 'Derecha'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Button Block Controls */}
                        {emailBlocks.find(b => b.id === selectedBlockId)?.type === 'button' && (
                          <div className="space-y-3">
                            <div>
                              <label htmlFor="block-btn-url" className="block text-[11px] font-medium text-slate-400 mb-1">URL de Destino (Link)</label>
                              <input
                                id="block-btn-url"
                                type="text"
                                value={emailBlocks.find(b => b.id === selectedBlockId)?.buttonUrl || ''}
                                onChange={(e) => updateBlockProperty(selectedBlockId, 'buttonUrl', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                placeholder="https://..."
                              />
                            </div>
                            <div>
                              <label htmlFor="block-btn-color" className="block text-[11px] font-medium text-slate-400 mb-1">Color de Fondo (Hex)</label>
                              <div className="flex gap-2">
                                <input
                                  id="block-btn-color"
                                  type="color"
                                  value={emailBlocks.find(b => b.id === selectedBlockId)?.backgroundColor || '#0f766e'}
                                  onChange={(e) => updateBlockProperty(selectedBlockId, 'backgroundColor', e.target.value)}
                                  className="bg-slate-900 border border-slate-700 rounded w-10 h-8 p-0 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={emailBlocks.find(b => b.id === selectedBlockId)?.backgroundColor || '#0f766e'}
                                  onChange={(e) => updateBlockProperty(selectedBlockId, 'backgroundColor', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-slate-400 mb-1">Alineación del Botón</label>
                              <div className="grid grid-cols-3 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-center">
                                {(['left', 'center', 'right'] as const).map(align => (
                                  <button
                                    key={align}
                                    onClick={() => updateBlockProperty(selectedBlockId, 'alignment', align)}
                                    className={`py-1 text-[10px] rounded capitalize transition-all ${emailBlocks.find(b => b.id === selectedBlockId)?.alignment === align ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                                  >
                                    {align === 'left' ? 'Izquierda' : align === 'center' ? 'Centro' : 'Derecha'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Global Padding Adjuster */}
                        {['text', 'image', 'button'].includes(emailBlocks.find(b => b.id === selectedBlockId)?.type || '') && (
                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Relleno Vertical (Padding)</label>
                            <div className="grid grid-cols-3 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-center">
                              {(['sm', 'md', 'lg'] as const).map(pad => (
                                <button
                                  key={pad}
                                  onClick={() => updateBlockProperty(selectedBlockId, 'padding', pad)}
                                  className={`py-1 text-[10px] rounded uppercase transition-all ${emailBlocks.find(b => b.id === selectedBlockId)?.padding === pad ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                                >
                                  {pad === 'sm' ? 'Bajo' : pad === 'md' ? 'Medio' : 'Alto'}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                  </div>

                  {/* Visual Center Panel: Canvas Workstation (cols: 8) */}
                  <div className="md:col-span-8 bg-slate-850 rounded-xl border border-slate-700 p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5" />
                        Área de Edición Visual Interactiva
                      </h4>
                      <p className="text-[10px] text-slate-500 italic">Haga clic en un bloque para editar sus contenidos en tiempo real</p>
                    </div>

                    <div className="space-y-3 min-h-[400px] bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                      {emailBlocks.map((block, idx) => {
                        const isSelected = selectedBlockId === block.id;
                        return (
                          <div
                            key={block.id}
                            onClick={() => setSelectedBlockId(block.id)}
                            className={`group relative rounded-xl transition-all duration-200 border cursor-pointer ${isSelected ? 'bg-slate-800/90 border-teal-500/80 ring-1 ring-teal-500/30 shadow-lg' : 'bg-slate-850/40 border-slate-800 hover:bg-slate-800/30 hover:border-slate-700'}`}
                          >
                            {/* Drag-free Block Utility Header (floating on selected) */}
                            <div className="absolute right-3 top-2.5 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => handleMoveBlock(block.id, 'up', e)}
                                disabled={idx === 0}
                                className="p-1 bg-slate-900 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-900 disabled:text-slate-600 rounded transition-colors"
                                title="Subir Bloque"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleMoveBlock(block.id, 'down', e)}
                                disabled={idx === emailBlocks.length - 1}
                                className="p-1 bg-slate-900 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-900 disabled:text-slate-600 rounded transition-colors"
                                title="Bajar Bloque"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteBlock(block.id, e)}
                                className="p-1 bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded transition-colors"
                                title="Eliminar Bloque"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Inline Visual Block Content Renderer */}
                            <div className="p-4">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2 font-mono">
                                #{(idx + 1).toString().padStart(2, '0')} - {block.type}
                              </span>

                              {/* TEXT BLOCK RENDER */}
                              {block.type === 'text' && (
                                <div className="space-y-2">
                                  {block.title && (
                                    <h3 className={`font-bold tracking-tight text-white mb-2 ${block.fontSize === 'xl' ? 'text-xl' : 'text-md'} text-${block.alignment || 'left'}`}>
                                      {processVariables(block.title)}
                                    </h3>
                                  )}
                                  <textarea
                                    ref={(el) => { emailTextAreaRefs.current[block.id] = el; }}
                                    value={block.content}
                                    onChange={(e) => updateBlockProperty(block.id, 'content', e.target.value)}
                                    rows={Math.max(2, block.content.split('\n').length)}
                                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-700 resize-y font-normal"
                                    placeholder="Ingrese texto con formato markdown sutil y variables..."
                                    onClick={(e) => e.stopPropagation()} // don't re-select block inside textarea clicks
                                  />
                                </div>
                              )}

                              {/* IMAGE BLOCK RENDER */}
                              {block.type === 'image' && (
                                <div className="space-y-2">
                                  <div className="flex justify-center max-w-full overflow-hidden border border-slate-900 bg-slate-950 rounded-lg p-1">
                                    <img 
                                      src={block.imageUrl || 'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?auto=format&fit=crop&q=80&w=800'} 
                                      alt="Vista previa" 
                                      className="max-h-36 rounded object-cover"
                                    />
                                  </div>
                                  <p className="text-[10px] text-slate-400 text-center truncate italic">{block.imageUrl || 'Sin imagen definida'}</p>
                                </div>
                              )}

                              {/* BUTTON BLOCK RENDER */}
                              {block.type === 'button' && (
                                <div className={`flex flex-col gap-2 items-${block.alignment === 'left' ? 'start' : block.alignment === 'right' ? 'end' : 'center'}`}>
                                  <input
                                    type="text"
                                    value={block.content}
                                    onChange={(e) => updateBlockProperty(block.id, 'content', e.target.value)}
                                    className="bg-slate-950/80 border border-slate-800 text-center font-bold px-4 py-2 text-xs rounded-lg shadow-sm w-64 text-white focus:outline-none focus:border-slate-700"
                                    placeholder="Texto del botón..."
                                    style={{
                                      backgroundColor: block.backgroundColor || '#0f766e',
                                      color: block.textColor || '#ffffff'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <p className="text-[10px] text-slate-400 italic truncate w-full text-center">Destino: {block.buttonUrl || '#'}</p>
                                </div>
                              )}

                              {/* DIVIDER BLOCK RENDER */}
                              {block.type === 'divider' && (
                                <div className="py-4">
                                  <hr className="border-t border-slate-800 border-dashed" />
                                </div>
                              )}

                              {/* SPACER BLOCK RENDER */}
                              {block.type === 'spacer' && (
                                <div className="py-2.5 bg-slate-900/30 rounded border border-dashed border-slate-800/80 text-center text-[10px] text-slate-500">
                                  Espacio vertical pasivo (24px)
                                </div>
                              )}

                            </div>
                          </div>
                        );
                      })}

                      {emailBlocks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                          <Layers className="h-10 w-10 text-slate-600 mb-2" />
                          <p className="text-sm">Área de trabajo vacía</p>
                          <p className="text-xs">Haga clic en un bloque del catálogo a la izquierda para agregarlo.</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                /* Raw HTML Code Editor Mode */
                <div className="bg-slate-850 rounded-xl border border-slate-700 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <Code className="h-4 w-4 text-amber-500" />
                      Editor de Código HTML Puro (Desarrollador)
                    </h4>
                    <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Exportable Outlook / Gmail
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Escriba o pegue plantillas HTML estructuradas. Este editor es compatible con tablas anidadas y estilos de soporte en línea. Al guardar, se registrará el contenido íntegro.
                  </p>

                  <div className="relative">
                    <textarea
                      id="html-raw-textarea"
                      value={customHtmlContent}
                      onChange={(e) => {
                        setCustomHtmlContent(e.target.value);
                        setIsHtmlSynced(false); // Flag customized manually
                      }}
                      rows={18}
                      className="w-full bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent leading-relaxed"
                      placeholder="<!-- Inserte su HTML aquí -->"
                    />
                    {!isHtmlSynced && (
                      <div className="absolute bottom-4 right-4 bg-slate-900/90 text-amber-400 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2 shadow-lg text-[10px] font-medium">
                        <Info className="h-3.5 w-3.5 animate-pulse" />
                        Desincronizado del editor visual
                        <button 
                          onClick={() => {
                            setCustomHtmlContent(generateEmailHTML(emailBlocks, emailSubject, false));
                            setIsHtmlSynced(true);
                            triggerSuccessToast('Re-sincronizado con bloques visuales');
                          }}
                          className="ml-2 underline hover:text-white"
                        >
                          Revertir a Bloques
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* DUAL PREVIEW SIMULATION (Desktop & Mobile viewports) */}
              <div className="bg-slate-800/80 rounded-xl border border-slate-700 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-700 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Eye className="h-4 w-4 text-teal-400" />
                      Previsualización Dual en Tiempo Real
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Simule el renderizado responsive del cliente de correo</p>
                  </div>

                  {/* Toggle Preview Viewport Width */}
                  <div className="flex items-center gap-1.5 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                    <button
                      id="preview-desktop-trigger"
                      onClick={() => setPreviewSize('desktop')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${previewSize === 'desktop' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      Escritorio (100%)
                    </button>
                    <button
                      id="preview-mobile-trigger"
                      onClick={() => setPreviewSize('mobile')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${previewSize === 'mobile' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      Móvil (375px)
                    </button>
                  </div>
                </div>

                {/* Simulated Device Frame Container */}
                <div className="flex justify-center bg-slate-950 p-4 sm:p-6 rounded-xl border border-slate-900 min-h-[300px] overflow-hidden">
                  
                  <div 
                    className={`transition-all duration-300 bg-white shadow-2xl relative ${
                      previewSize === 'mobile' 
                        ? 'w-[375px] rounded-[40px] border-[12px] border-slate-800 ring-4 ring-slate-700 shadow-teal-950/20 overflow-hidden' 
                        : 'w-full max-w-4xl rounded-lg'
                    }`}
                  >
                    {/* Mobile Status Bar Simulation */}
                    {previewSize === 'mobile' && (
                      <div className="bg-slate-900 text-white text-[11px] px-6 py-1.5 flex justify-between items-center font-semibold">
                        <span>09:41</span>
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                          <span>CIMASUR LTE</span>
                        </div>
                      </div>
                    )}

                    {/* Email Window Browser Shell */}
                    <div className="bg-slate-100 text-slate-800 p-3 sm:p-4 border-b border-slate-200 text-xs font-normal flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 w-16">De:</span>
                        <span className="font-semibold text-slate-700">Club de Socios CIMASUR &lt;club@cimasur.cl&gt;</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 w-16">Para:</span>
                        <span className="text-slate-600 truncate">
                          {useMockValues ? 'telemedicina.cimasur@gmail.com' : '{{email_cliente}}'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 w-16">Asunto:</span>
                        <span className="font-bold text-slate-800">
                          {useMockValues ? processVariables(emailSubject) : emailSubject}
                        </span>
                      </div>
                    </div>

                    {/* Email Sandbox Content Rendering */}
                    <div className="bg-white overflow-y-auto max-h-[500px]">
                      <div 
                        id="email-preview-content"
                        dangerouslySetInnerHTML={{ 
                          __html: emailHtmlMode 
                            ? (useMockValues ? processVariables(customHtmlContent) : customHtmlContent)
                            : generateEmailHTML(emailBlocks, emailSubject, useMockValues) 
                        }} 
                      />
                    </div>

                  </div>

                </div>
              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: WHATSAPP BUILDER WORKSPACE                              */}
          {/* ============================================================== */}
          {activeTab === 'whatsapp' && (
            <div id="whatsapp-builder-workspace" className="space-y-6">
              
              {/* Toolbar Controls */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                    <MessageSquare className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-white">Consola de Envío de WhatsApp</h3>
                    <p className="text-[11px] text-slate-400">Canal directo omnicanal para el Club de Socios</p>
                  </div>
                </div>

                {/* Sending Type Selector (Individual vs Massive) */}
                <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
                  <button
                    id="whatsapp-send-individual"
                    onClick={() => setWhatsappSendType('individual')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${whatsappSendType === 'individual' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Individual (Cliente Activo)
                  </button>
                  <button
                    id="whatsapp-send-masivo"
                    onClick={() => setWhatsappSendType('masivo')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${whatsappSendType === 'masivo' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Masivo (Segmentación Club)
                  </button>
                </div>
              </div>

              {/* Main Configuration Input Form split into grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Inputs Box (cols: 6) */}
                <div className="md:col-span-6 space-y-4">
                  <div className="bg-slate-800/60 rounded-xl border border-slate-700/60 p-5 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Settings className="h-3.5 w-3.5 text-emerald-400" />
                      Estructurar Mensaje WhatsApp
                    </h4>

                    {/* Optional Image Header */}
                    <div>
                      <label htmlFor="wa-header-image" className="block text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
                        <span>URL de Imagen Principal (Cabecera)</span>
                        <span className="text-[10px] text-slate-500 font-normal">Opcional</span>
                      </label>
                      <div className="relative">
                        <input
                          id="wa-header-image"
                          type="text"
                          value={whatsappHeaderUrl}
                          onChange={(e) => setWhatsappHeaderUrl(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="https://..."
                        />
                        {whatsappHeaderUrl && (
                          <button
                            type="button"
                            onClick={() => setWhatsappHeaderUrl('')}
                            className="absolute right-2 top-2 text-slate-500 hover:text-white"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Text Body */}
                    <div>
                      <label htmlFor="wa-body-text" className="block text-xs font-medium text-slate-400 mb-1">
                        Cuerpo del Mensaje
                      </label>
                      <textarea
                        id="wa-body-text"
                        ref={whatsappTextAreaRef}
                        value={whatsappBody}
                        onChange={(e) => setWhatsappBody(e.target.value)}
                        rows={10}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-normal"
                        placeholder="Escriba su mensaje comercial..."
                      />
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                        <span>Soporta: *negrita*, _cursiva_, ~tachado~</span>
                        <span>Caracteres: {whatsappBody.length}</span>
                      </div>
                    </div>

                    {/* Segment Rules Indicator (if Masivo selected) */}
                    {whatsappSendType === 'masivo' && (
                      <div className="p-3 bg-emerald-950/20 rounded-lg border border-emerald-500/20 flex gap-2.5 items-start">
                        <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] font-bold text-slate-200">Envío Masivo Club de Socios</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Este mensaje se procesará y enviará secuencialmente a los miembros que califiquen en los filtros comerciales activos del Club de Socios.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* WhatsApp Chat Simulation Bubble Screen (cols: 6) */}
                <div className="md:col-span-6 space-y-4">
                  <div className="bg-slate-800/60 rounded-xl border border-slate-700/60 p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                      Vista Previa Real de WhatsApp
                    </h4>

                    {/* Phone shell */}
                    <div className="rounded-[30px] border-[8px] border-slate-850 shadow-2xl bg-slate-950 overflow-hidden relative max-w-sm mx-auto">
                      
                      {/* WA Header Panel */}
                      <div className="bg-[#075e54] p-3 text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-800 flex items-center justify-center font-bold text-xs text-teal-200 border border-teal-600">
                          CS
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs leading-none">Club Socios CIMASUR</p>
                          <p className="text-[10px] text-teal-200 leading-none mt-1">en línea</p>
                        </div>
                        <div className="flex gap-2.5 text-teal-100">
                          <span className="text-xs font-bold">⋮</span>
                        </div>
                      </div>

                      {/* WA BG Box with simulated patterns */}
                      <div 
                        className="p-4 min-h-[350px] max-h-[420px] overflow-y-auto space-y-3 relative flex flex-col justify-end"
                        style={{
                          backgroundColor: '#efeae2',
                          backgroundImage: `radial-gradient(#d5d0c7 1px, transparent 0), radial-gradient(#d5d0c7 1px, transparent 0)`,
                          backgroundSize: '16px 16px',
                          backgroundPosition: '0 0, 8px 8px'
                        }}
                      >
                        {/* Dynamic Message Bubble */}
                        <div className="max-w-[85%] bg-white rounded-lg p-2 shadow-sm relative text-slate-800 ml-auto self-end border border-slate-200">
                          
                          {/* Image preview in chat */}
                          {whatsappHeaderUrl && (
                            <div className="mb-2 max-w-full rounded overflow-hidden">
                              <img 
                                src={whatsappHeaderUrl} 
                                alt="Cabecera WhatsApp" 
                                className="w-full h-24 object-cover"
                              />
                            </div>
                          )}

                          {/* Message core */}
                          <div 
                            className="text-xs whitespace-pre-wrap leading-relaxed text-slate-800 break-words"
                            dangerouslySetInnerHTML={{
                              __html: parseMarkdown(processVariables(whatsappBody))
                            }}
                          />

                          {/* Timestamp and ticks */}
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-[9px] text-slate-400 font-medium">12:00</span>
                            <div className="flex text-sky-500">
                              <span className="text-[10px] leading-none">✓✓</span>
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Footer Input Bar */}
                      <div className="bg-[#f0f0f0] p-2 flex items-center gap-2 border-t border-slate-200">
                        <span className="text-sm text-slate-500 pl-2">☺</span>
                        <div className="flex-1 bg-white rounded-full py-1.5 px-3 text-[11px] text-slate-400 border border-slate-300">
                          Escribir mensaje...
                        </div>
                        <div className="w-7 h-7 bg-[#128c7e] rounded-full flex items-center justify-center text-white text-xs shadow-sm font-bold">
                          ➤
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Guidelines and best practices */}
          <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-teal-400" />
              Recomendaciones del Motor Comercial Inteligente (2026)
            </h4>
            <ul className="text-xs text-slate-400 space-y-2.5 pl-4 list-disc leading-relaxed">
              <li>
                <strong className="text-slate-300">Variables Dinámicas:</strong> Recuerde utilizar <code className="font-mono text-teal-400 bg-teal-950 px-1 py-0.5 rounded">{"{{nombre}}"}</code> en las primeras dos líneas para optimizar la tasa de apertura y el enganche emocional del socio.
              </li>
              <li>
                <strong className="text-slate-300">Visual vs Código:</strong> Si realiza modificaciones manuales en el <span className="text-slate-300">Código HTML Directo</span>, asegúrese de guardar una copia del código antes de revertir al editor de bloques para no sobreescribir sus ajustes avanzados.
              </li>
              <li>
                <strong className="text-slate-300">Estrategia Omnicanal:</strong> Se sugiere complementar las campañas de correo electrónico informativas con un seguimiento breve de WhatsApp para clientes categorizados como <span className="text-teal-400 font-bold">Club Oro</span> o de alto valor.
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
