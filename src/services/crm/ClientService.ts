import { Client } from './types';
import { localDB } from '../../lib/auth';

export class ClientService {
  constructor(
    private getCollection: (col: string) => Promise<any[]>,
    private saveItem: (col: string, item: any) => Promise<any>,
    private updateItem: (col: string, id: string, updates: any) => Promise<void>
  ) {}

  async getAllClients(): Promise<Client[]> {
    return await this.getCollection('intranet_clients');
  }

  async getClientById(id: string): Promise<Client | undefined> {
    const clients = await this.getAllClients();
    return clients.find(c => c.id === id);
  }

  async getFullClientData(id: string): Promise<Client | undefined> {
    const client = await this.getClientById(id);
    if (!client) return undefined;

    const sales = await localDB.getCollection('sales');
    const loyalty = await localDB.getCollection('loyalty_accounts');
    
    // Merge data
    return {
      ...client,
      ventas: sales.filter((s: any) => s.contactId === client.id),
      clubComercial: loyalty.find((l: any) => l.contactId === client.id)
    };
  }

  async saveClient(client: Client): Promise<void> {
    await this.saveItem('intranet_clients', client);
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<void> {
    await this.updateItem('intranet_clients', id, updates);
  }
}
