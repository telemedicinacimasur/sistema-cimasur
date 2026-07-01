
export class CustomerJourneyService {
  /**
   * Identifies the current stage of a customer in the commercial journey based on their purchase history and category.
   */
  public determineState(customer: any, totalSales: number): string {
    if (!customer.isClient) return 'Prospecto';
    if (customer.isClient && totalSales === 0) return 'Prospecto';
    
    // Check if dormant (no purchases in last 90 days)
    if (customer.lastPurchaseDate) {
      const now = new Date();
      const lastDate = new Date(customer.lastPurchaseDate);
      const diffDays = (now.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000);
      
      if (diffDays > 365) return 'Dormido (365d)';
      if (diffDays > 180) return 'Dormido (180d)';
      if (diffDays > 90) return 'Dormido (90d)';
    }

    if (totalSales > 0 && totalSales < 100000) return 'Primera Compra';
    if (totalSales >= 100000 && totalSales < 500000) return 'Sin Categoría';
    if (totalSales >= 500000 && totalSales < 1000000) return 'Bronce';
    if (totalSales >= 1000000 && totalSales < 2000000) return 'Plata';
    if (totalSales >= 2000000 && totalSales < 5000000) return 'Oro';
    if (totalSales >= 5000000 && totalSales < 10000000) return 'Platinum';
    if (totalSales >= 10000000) return 'Embajador';

    return 'Sin Categoría';
  }
}

