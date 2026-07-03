export interface IConnectorAdapter {
  name: string;
  send(payload: any): Promise<ConnectorResponse>;
}

export interface ConnectorResponse {
  success: boolean;
  messageId?: string;
  providerDetails?: any;
  error?: string;
}

export class EmailAdapter implements IConnectorAdapter {
  public name = 'EmailAdapter';
  async send(payload: any): Promise<ConnectorResponse> {
    // Decoupled Email Sending Logic
    return { success: true, messageId: `email_${Date.now()}` };
  }
}

export class WhatsAppAdapter implements IConnectorAdapter {
  public name = 'WhatsAppAdapter';
  async send(payload: any): Promise<ConnectorResponse> {
    // Decoupled WhatsApp Sending Logic
    return { success: true, messageId: `wa_${Date.now()}` };
  }
}

export class SMSAdapter implements IConnectorAdapter {
  public name = 'SMSAdapter';
  async send(payload: any): Promise<ConnectorResponse> {
    // Decoupled SMS Logic
    return { success: true, messageId: `sms_${Date.now()}` };
  }
}

export class PushAdapter implements IConnectorAdapter {
  public name = 'PushAdapter';
  async send(payload: any): Promise<ConnectorResponse> {
    // Decoupled Push Notification Logic
    return { success: true, messageId: `push_${Date.now()}` };
  }
}

export class APIAdapter implements IConnectorAdapter {
  public name = 'APIAdapter';
  async send(payload: any): Promise<ConnectorResponse> {
    // Decoupled External API Request Logic
    return { success: true, messageId: `api_${Date.now()}` };
  }
}
