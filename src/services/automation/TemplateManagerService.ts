import { SuggestedCampaign } from '../crm/CampaignStrategyService';

export class TemplateManagerService {
  public static generateTemplate(campaign: SuggestedCampaign, channel: 'email' | 'whatsapp' | 'both'): string {
    const isWhatsapp = channel === 'whatsapp' || channel === 'both';
    
    // Base greetings
    let template = isWhatsapp 
      ? `¡Hola {{customerName}}! 👋\n\n` 
      : `Estimado/a {{customerName}},\n\nEspero que se encuentre muy bien.\n\n`;

    // Body based on campaign type
    if (campaign.campaignType === 'first_purchase') {
      template += `Queremos agradecerle por su primera compra en Cimasur. Como cliente de la categoría {{currentCategory}}, le ofrecemos como bienvenida el siguiente beneficio: {{benefit}}.\n\n`;
    } else if (campaign.campaignType === 'upgrade') {
      template += `¡Grandes noticias! Está muy cerca de ascender de la categoría {{currentCategory}} a la categoría {{nextCategory}} en nuestro programa Cimasur Benefits. Al alcanzar este nivel, desbloqueará nuevos beneficios y mejores márgenes comerciales, como {{benefit}}.\n\n`;
      template += `Actualmente su brecha es de {{commercialGap}}. Le invitamos a revisar nuestro catálogo para aprovechar sus beneficios actuales y alcanzar el siguiente nivel.\n\n`;
    } else if (campaign.campaignType === 'dormant') {
      if (campaign.id.includes('365')) {
        template += `Ha pasado un tiempo desde su última interacción con Cimasur. Queremos invitarlo a retomar nuestra alianza comercial con un beneficio especial de reactivación diseñado exclusivamente para usted: {{benefit}}.\n\n`;
      } else {
        template += `Hemos notado que hace un tiempo no realiza pedidos con nosotros. Le escribimos para compartirle nuestras últimas novedades y un beneficio especial para retomar su actividad comercial: {{benefit}}.\n\n`;
      }
    } else if (campaign.campaignType === 'prospect') {
      template += `En Cimasur contamos con un programa de beneficios diseñado para potenciar el crecimiento de su negocio. Queremos invitarle a realizar su primera compra y comenzar a disfrutar de nuestras ventajas comerciales. Aproveche ahora: {{benefit}}.\n\n`;
    } else {
      template += `Tenemos novedades importantes para su cuenta en la categoría {{nextCategory}}.\n\n`;
    }

    // Call to action
    template += isWhatsapp 
      ? `¿Le gustaría que un ejecutivo se ponga en contacto para contarle más detalles? Responda este mensaje o visite nuestro portal.\n\n¡Saludos! 🚀` 
      : `Si desea conocer más detalles sobre cómo aprovechar estas oportunidades, no dude en contactarnos o visitar nuestro portal web.\n\nAtentamente,\nEl Equipo Comercial de Cimasur`;

    return template;
  }

  public static parseTemplate(template: string, variables: Record<string, string | number>): string {
    let parsed = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      parsed = parsed.replace(regex, String(value));
    }
    return parsed;
  }

  public static formatCurrency(val: number): string {
    return '$' + val.toLocaleString('es-CL');
  }
}
