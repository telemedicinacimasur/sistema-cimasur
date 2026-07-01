
export class DataFetcherService {
  public async getSalesData() {
    const response = await fetch('/api/records/sales');
    return await response.json();
  }

  public async getIntranetData() {
    const response = await fetch('/api/records/intranet_clients');
    return await response.json();
  }
}
