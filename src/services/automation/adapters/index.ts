export interface IConnectorAdapter {
  name: string;
  // This is a contract, not an implementation.
  // The actual communication logic will be injected when a provider is selected.
  send(payload: any): Promise<ConnectorResponse>;
}

export interface ConnectorResponse {
  success: boolean;
  messageId?: string;
  providerDetails?: any;
  error?: string;
}

// These are placeholders for the future integration.
// No implementation logic exists here.

export class EmailAdapter implements IConnectorAdapter {
  public name = 'EmailAdapter';
  async send(payload: any): Promise<ConnectorResponse> {
    throw new Error('Email provider not configured');
  }
}

export class WhatsAppAdapter implements IConnectorAdapter {
  public name = 'WhatsAppAdapter';
  async send(payload: any): Promise<ConnectorResponse> {
    throw new Error('WhatsApp provider not configured');
  }
}

export class SMSAdapter implements IConnectorAdapter {
  public name = 'SMSAdapter';
  async send(payload: any): Promise<ConnectorResponse> {
    throw new Error('SMS provider not configured');
  }
}

export class PushAdapter implements IConnectorAdapter {
  public name = 'PushAdapter';
  async send(payload: any): Promise<ConnectorResponse> {
    throw new Error('Push provider not configured');
  }
}

export class APIAdapter implements IConnectorAdapter {
  public name = 'APIAdapter';
  async send(payload: any): Promise<ConnectorResponse> {
    throw new Error('API provider not configured');
  }
}
