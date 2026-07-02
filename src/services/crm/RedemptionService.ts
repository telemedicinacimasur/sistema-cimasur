import { PointsEngine } from './PointsEngine';
import { CatalogService } from './CatalogService';

export interface Redemption {
  id: string;
  contactId: string;
  rewardId: string;
  pointsSpent: number;
  status: 'completed' | 'cancelled' | 'rolled_back';
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export class RedemptionService {
  private readRecords: any;
  private writeRecords: any;
  private pointsEngine: PointsEngine;
  private catalogService: CatalogService;

  // Static mutex map to prevent race conditions / double spend of the same contact concurrently
  private static activeLocks = new Map<string, boolean>();

  constructor(readRecords: any, writeRecords: any) {
    this.readRecords = readRecords;
    this.writeRecords = writeRecords;
    this.pointsEngine = new PointsEngine(readRecords, writeRecords);
    this.catalogService = new CatalogService(readRecords, writeRecords);
  }

  /**
   * Helper to acquire a lock for a contactId.
   */
  private acquireLock(contactId: string): boolean {
    if (RedemptionService.activeLocks.get(contactId)) {
      return false; // Already locked
    }
    RedemptionService.activeLocks.set(contactId, true);
    return true;
  }

  /**
   * Helper to release the lock for a contactId.
   */
  private releaseLock(contactId: string): void {
    RedemptionService.activeLocks.delete(contactId);
  }

  /**
   * Executes a reward redemption.
   */
  public async redeem(
    contactId: string, 
    rewardId: string, 
    idempotencyKey: string
  ): Promise<Redemption> {
    if (!idempotencyKey) {
      throw new Error('Idempotency key is required for redemption');
    }

    // 1. Check idempotency
    const allRedemptions = await this.readRecords('redemptions');
    const existing = allRedemptions.find((r: any) => r.idempotencyKey === idempotencyKey);
    if (existing) {
      console.log(`[RedemptionService] Redemption already processed for key ${idempotencyKey}`);
      return existing;
    }

    // 2. Acquire concurrency lock
    const lockAcquired = this.acquireLock(contactId);
    if (!lockAcquired) {
      throw new Error('Operación en progreso. Por favor, espere un momento antes de reintentar.');
    }

    let stockUpdated = false;
    let pointsDeducted = false;
    let deductionTxId: string | undefined;

    try {
      // 3. Retrieve reward information and validate stock
      const reward = await this.catalogService.getRewardById(rewardId);
      if (!reward) {
        throw new Error(`La recompensa seleccionada no existe o no está disponible.`);
      }

      if (reward.stock <= 0 || !reward.isActive) {
        throw new Error(`Esta recompensa no tiene stock suficiente o se encuentra inactiva.`);
      }

      // 4. Validate contact balance
      const { balance } = await this.pointsEngine.getContactBalance(contactId);
      if (balance < reward.pointsCost) {
        throw new Error(`Saldo de puntos insuficiente. Requerido: ${reward.pointsCost}, Disponible: ${balance}`);
      }

      // 5. Decrement Reward Stock
      const stockSuccess = await this.catalogService.updateStock(rewardId, 1);
      if (!stockSuccess) {
        throw new Error('No se pudo descontar el stock de la recompensa.');
      }
      stockUpdated = true;

      // 6. Deduct Points from Contact
      const deductionTx = await this.pointsEngine.deduct(
        contactId,
        reward.pointsCost,
        `Canje de recompensa: ${reward.name}`,
        rewardId,
        `red_deduct_${idempotencyKey}`
      );
      deductionTxId = deductionTx.id;
      pointsDeducted = true;

      // 7. Register redemption transaction
      const now = new Date().toISOString();
      const redemption: Redemption = {
        id: `red_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        contactId,
        rewardId,
        pointsSpent: reward.pointsCost,
        status: 'completed',
        idempotencyKey,
        createdAt: now,
        updatedAt: now
      };

      allRedemptions.push(redemption);
      await this.writeRecords('redemptions', allRedemptions);

      // Trigger automatic automation/history tracking for completed redemption
      await this.logActivity(contactId, `Canjeado: ${reward.name} por ${reward.pointsCost} puntos`);

      return redemption;

    } catch (error: any) {
      console.error(`[RedemptionService] Error executing redemption, executing rollback...`, error);

      // Rollback logic
      if (stockUpdated) {
        await this.catalogService.rollbackStock(rewardId, 1);
      }

      if (pointsDeducted && deductionTxId) {
        try {
          await this.pointsEngine.rollback(contactId, deductionTxId, `red_rollback_${idempotencyKey}`);
        } catch (rollErr) {
          console.error('[RedemptionService] Points rollback failed, manual intervention needed:', rollErr);
        }
      }

      throw error;

    } finally {
      // Always release lock
      this.releaseLock(contactId);
    }
  }

  /**
   * Helper to append a description of the loyalty activity in user accounts or logs
   */
  private async logActivity(contactId: string, description: string): Promise<void> {
    const accounts = await this.readRecords('loyalty_accounts');
    const index = accounts.findIndex((a: any) => a.contactId === contactId);
    if (index !== -1) {
      accounts[index].lastActivityAt = new Date().toISOString();
      accounts[index].activityLogs = accounts[index].activityLogs || [];
      accounts[index].activityLogs.unshift({
        timestamp: new Date().toISOString(),
        description
      });
      // Keep only last 50 activity logs to save storage
      if (accounts[index].activityLogs.length > 50) {
        accounts[index].activityLogs = accounts[index].activityLogs.slice(0, 50);
      }
      await this.writeRecords('loyalty_accounts', accounts);
    }
  }
}
