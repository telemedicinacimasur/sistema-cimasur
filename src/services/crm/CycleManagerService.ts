export class CycleManagerService {
  public getCurrentCycle(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed, 6 is July

    if (month >= 6) {
      return `Ciclo ${year}-${year + 1}`;
    } else {
      return `Ciclo ${year - 1}-${year}`;
    }
  }

  public isInCurrentCycle(dateString: string | Date | undefined): boolean {
    if (!dateString) return false;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    let startYear = month >= 6 ? year : year - 1;
    let endYear = startYear + 1;

    const startDate = new Date(startYear, 6, 1); // July 1st
    const endDate = new Date(endYear, 5, 30, 23, 59, 59, 999); // June 30th

    return date >= startDate && date <= endDate;
  }

  public isInEvaluationPeriod(dateString: string | Date | undefined): boolean {
    if (!dateString) return false;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    let startYear = month >= 6 ? year - 1 : year - 2;
    let endYear = month >= 6 ? year + 1 : year;

    const startDate = new Date(startYear, 6, 1);
    const endDate = new Date(endYear, 5, 30, 23, 59, 59, 999);

    return date >= startDate && date <= endDate;
  }
}
