import { Client } from './types';

export class ClientService {
  constructor(
    private getCollection: (col: string) => Promise<any[]>,
    private saveItem: (col: string, item: any) => Promise<any>,
    private updateItem: (col: string, id: string, updates: any) => Promise<void>
  ) {}

  async getAllClients(): Promise<Client[]> {
    return await this.getCollection('contacts');
  }

  async getClientById(id: string): Promise<Client | undefined> {
    const clients = await this.getAllClients();
    let client = clients.find(c => c.id === id || c.rut === id);
    if (!client) {
      const intranetClients = await this.getCollection('intranet_clients');
      client = intranetClients.find((c: any) => c.id === id || c.rut === id);
    }
    return client;
  }

  async getFullClientData(id: string): Promise<Client | undefined> {
    const client = await this.getClientById(id);
    if (!client) return undefined;

    const sales = await this.getCollection('sales');
    const loyalty = await this.getCollection('loyalty_accounts');
    
    // Merge data
    return {
      ...client,
      ventas: sales.filter((s: any) => s.contactId === client.id),
      clubComercial: loyalty.find((l: any) => l.contactId === client.id)
    };
  }

  async saveClient(client: Client): Promise<void> {
    await this.saveItem('contacts', client);
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<void> {
    const clients = await this.getCollection('contacts');
    if (clients.some(c => c.id === id)) {
      await this.updateItem('contacts', id, updates);
    } else {
      await this.updateItem('intranet_clients', id, updates);
    }
  }
}
