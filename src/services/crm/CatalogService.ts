export interface RewardItem {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  stock: number;
  isActive: boolean;
  category: 'Descuento' | 'Producto' | 'Servicio' | 'Premio';
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export class CatalogService {
  private readRecords: any;
  private writeRecords: any;

  constructor(readRecords: any, writeRecords: any) {
    this.readRecords = readRecords;
    this.writeRecords = writeRecords;
  }

  /**
   * Retrieves the current catalog of rewards. Seeds defaults if empty.
   */
  public async getCatalog(onlyActive = true): Promise<RewardItem[]> {
    let catalog = await this.readRecords('rewards_catalog');
    if (!catalog || catalog.length === 0) {
      catalog = this.getDefaultRewards();
      await this.writeRecords('rewards_catalog', catalog);
    }
    if (onlyActive) {
      return catalog.filter((r: any) => r.isActive && r.stock > 0);
    }
    return catalog;
  }

  /**
   * Retrieves default rewards for seeding.
   */
  private getDefaultRewards(): RewardItem[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'r_desc_10',
        name: 'Cupón 10% Descuento Adicional',
        description: 'Aplica un 10% de descuento extra en tu próxima compra de vademécum.',
        pointsCost: 500,
        stock: 100,
        isActive: true,
        category: 'Descuento',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'r_desc_20',
        name: 'Cupón 20% Descuento Adicional',
        description: 'Aplica un 20% de descuento extra en tu próxima compra de vademécum.',
        pointsCost: 1000,
        stock: 50,
        isActive: true,
        category: 'Descuento',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'r_prod_base',
        name: 'Set de 3 Frascos Base Gratuitos',
        description: 'Frascos base a elección para terapia homeopática.',
        pointsCost: 1500,
        stock: 30,
        isActive: true,
        category: 'Producto',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'r_envio_gratis',
        name: 'Membresía Despacho Gratis (6 Meses)',
        description: 'Envíos sin costo ilimitados vía Blue Express por un período de 6 meses.',
        pointsCost: 1200,
        stock: 40,
        isActive: true,
        category: 'Servicio',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'r_vademecum_impreso',
        name: 'Vademécum Impreso Premium Colección',
        description: 'Edición especial de tapa dura con ilustraciones científicas de fórmulas homeopáticas.',
        pointsCost: 800,
        stock: 25,
        isActive: true,
        category: 'Premio',
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  /**
   * Gets a specific reward by ID.
   */
  public async getRewardById(id: string): Promise<RewardItem | null> {
    const catalog = await this.getCatalog(false);
    return catalog.find((r: any) => r.id === id) || null;
  }

  /**
   * Updates (decrements) the stock of a reward.
   */
  public async updateStock(id: string, qty: number): Promise<boolean> {
    const catalog = await this.getCatalog(false);
    const index = catalog.findIndex((r: any) => r.id === id);
    if (index === -1) return false;
    
    if (catalog[index].stock < qty) return false; // Insufficient stock
    catalog[index].stock -= qty;
    catalog[index].updatedAt = new Date().toISOString();
    await this.writeRecords('rewards_catalog', catalog);
    return true;
  }

  /**
   * Rolls back a reward's stock in case of transaction failure.
   */
  public async rollbackStock(id: string, qty: number): Promise<void> {
    const catalog = await this.getCatalog(false);
    const index = catalog.findIndex((r: any) => r.id === id);
    if (index !== -1) {
      catalog[index].stock += qty;
      catalog[index].updatedAt = new Date().toISOString();
      await this.writeRecords('rewards_catalog', catalog);
    }
  }
}
