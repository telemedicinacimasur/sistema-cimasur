export interface PointsTransaction {
  id: string;
  contactId: string;
  type: 'accumulation' | 'redemption' | 'expiration' | 'adjustment' | 'rollback';
  amount: number;
  reason: string;
  referenceId?: string;
  idempotencyKey?: string;
  expiresAt?: string;
  isExpired?: boolean;
  createdAt: string;
}

export class PointsEngine {
  private readRecords: any;
  private writeRecords: any;

  constructor(readRecords: any, writeRecords: any) {
    this.readRecords = readRecords;
    this.writeRecords = writeRecords;
  }

  /**
   * Retrieves points multiplier based on CRM customer tier.
   */
  public getMultiplier(tier: string): number {
    const t = (tier || '').toLowerCase().trim();
    if (t.includes('platinum')) return 1.8;
    if (t.includes('oro')) return 1.5;
    if (t.includes('plata')) return 1.2;
    if (t.includes('bronce')) return 1.0;
    return 0.5; // "Sin categoría" or Prospecto
  }

  /**
   * Calculates the current points balance of a contact, accounting for expirations dynamically.
   */
  public async getContactBalance(contactId: string): Promise<{ balance: number; expired: number; lifetime: number }> {
    const allTx = await this.readRecords('points_transactions');
    const txs = allTx.filter((t: any) => t.contactId === contactId)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let totalAccumulated = 0;
    
    // Distinguish credits (accumulations, rollbacks, adjustments) and debits (redemptions)
    const accumulations: { id: string; amount: number; remaining: number; expiresAt?: string; createdAt: string }[] = [];
    let totalDebits = 0;

    for (const tx of txs) {
      if (tx.type === 'accumulation') {
        totalAccumulated += tx.amount;
        accumulations.push({
          id: tx.id,
          amount: tx.amount,
          remaining: tx.amount,
          expiresAt: tx.expiresAt,
          createdAt: tx.createdAt
        });
      } else if (tx.type === 'redemption' || (tx.type === 'adjustment' && tx.amount < 0)) {
        totalDebits += Math.abs(tx.amount);
      } else if (tx.type === 'rollback' || (tx.type === 'adjustment' && tx.amount > 0)) {
        totalAccumulated += tx.amount;
        accumulations.push({
          id: tx.id,
          amount: tx.amount,
          remaining: tx.amount,
          createdAt: tx.createdAt
        });
      }
    }

    // Apply debits to accumulations in FIFO order
    let debitToApply = totalDebits;
    for (const acc of accumulations) {
      if (debitToApply <= 0) break;
      const deduct = Math.min(acc.remaining, debitToApply);
      acc.remaining -= deduct;
      debitToApply -= deduct;
    }

    // Evaluate active and expired remaining points
    let expiredPoints = 0;
    let activePoints = 0;
    const now = new Date();

    for (const acc of accumulations) {
      if (acc.expiresAt && new Date(acc.expiresAt) < now) {
        expiredPoints += acc.remaining;
      } else {
        activePoints += acc.remaining;
      }
    }

    return {
      balance: Math.max(0, activePoints),
      expired: expiredPoints,
      lifetime: totalAccumulated
    };
  }

  /**
   * Accumulates points for a contact.
   */
  public async accumulate(
    contactId: string, 
    purchaseAmount: number, 
    tier: string, 
    referenceId: string, 
    idempotencyKey: string
  ): Promise<PointsTransaction | null> {
    if (!idempotencyKey) {
      throw new Error('Idempotency key is required for accumulation');
    }

    const allTx = await this.readRecords('points_transactions');
    const existing = allTx.find((t: any) => t.idempotencyKey === idempotencyKey);
    if (existing) {
      console.log(`[PointsEngine] Accumulation already processed for key ${idempotencyKey}`);
      return existing;
    }

    const multiplier = this.getMultiplier(tier);
    // 1 point per 1,000 CLP of purchase * tier multiplier
    const points = Math.floor((purchaseAmount / 1000) * multiplier);
    if (points <= 0) return null;

    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setFullYear(now.getFullYear() + 1); // Points expire in 1 year

    const newTx: PointsTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      contactId,
      type: 'accumulation',
      amount: points,
      reason: `Acumulación por compra - Multiplicador ${multiplier}x (${tier})`,
      referenceId,
      idempotencyKey,
      expiresAt: expiresAt.toISOString(),
      isExpired: false,
      createdAt: now.toISOString()
    };

    allTx.push(newTx);
    await this.writeRecords('points_transactions', allTx);

    // Update account pre-aggregated balances
    await this.updateLoyaltyAccountBalance(contactId);

    return newTx;
  }

  /**
   * Deducts points from a contact (redemption).
   */
  public async deduct(
    contactId: string,
    pointsAmount: number,
    reason: string,
    referenceId: string,
    idempotencyKey: string
  ): Promise<PointsTransaction> {
    if (!idempotencyKey) {
      throw new Error('Idempotency key is required for deduction');
    }

    const allTx = await this.readRecords('points_transactions');
    const existing = allTx.find((t: any) => t.idempotencyKey === idempotencyKey);
    if (existing) {
      console.log(`[PointsEngine] Deduction already processed for key ${idempotencyKey}`);
      return existing;
    }

    const { balance } = await this.getContactBalance(contactId);
    if (balance < pointsAmount) {
      throw new Error(`Saldo de puntos insuficiente. Requerido: ${pointsAmount}, Disponible: ${balance}`);
    }

    const now = new Date();
    const newTx: PointsTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      contactId,
      type: 'redemption',
      amount: -pointsAmount,
      reason,
      referenceId,
      idempotencyKey,
      createdAt: now.toISOString()
    };

    allTx.push(newTx);
    await this.writeRecords('points_transactions', allTx);

    // Update account pre-aggregated balances
    await this.updateLoyaltyAccountBalance(contactId);

    return newTx;
  }

  /**
   * Rolls back a transaction.
   */
  public async rollback(
    contactId: string,
    targetTransactionId: string,
    idempotencyKey: string
  ): Promise<PointsTransaction | null> {
    const allTx = await this.readRecords('points_transactions');
    
    // Check if rollback already processed
    const existingRollback = allTx.find((t: any) => t.idempotencyKey === idempotencyKey);
    if (existingRollback) {
      return existingRollback;
    }

    const targetTx = allTx.find((t: any) => t.id === targetTransactionId && t.contactId === contactId);
    if (!targetTx) {
      throw new Error(`Transaction ${targetTransactionId} not found for contact ${contactId}`);
    }

    const now = new Date();
    const rollbackTx: PointsTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      contactId,
      type: 'rollback',
      amount: -targetTx.amount, // Inverse amount
      reason: `Reversión automática de transacción ${targetTransactionId}`,
      referenceId: targetTransactionId,
      idempotencyKey,
      createdAt: now.toISOString()
    };

    allTx.push(rollbackTx);
    await this.writeRecords('points_transactions', allTx);
    await this.updateLoyaltyAccountBalance(contactId);

    return rollbackTx;
  }

  /**
   * Syncs pre-aggregated values in the contact loyalty account
   */
  public async updateLoyaltyAccountBalance(contactId: string): Promise<void> {
    const { balance, lifetime } = await this.getContactBalance(contactId);
    const accounts = await this.readRecords('loyalty_accounts');
    const accIndex = accounts.findIndex((a: any) => a.contactId === contactId);
    if (accIndex !== -1) {
      accounts[accIndex].pointsBalance = balance;
      accounts[accIndex].lifetimePoints = lifetime;
      accounts[accIndex].lastActivityAt = new Date().toISOString();
      await this.writeRecords('loyalty_accounts', accounts);
    }
  }
}
