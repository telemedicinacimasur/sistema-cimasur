export interface IMessageConnector {
  sendBatch(template: string, recipients: any[]): Promise<ConnectorResult>;
  getStatus(batchId: string): Promise<BatchStatus>;
}

export interface ConnectorResult {
  batchId: string;
  successCount: number;
  errorCount: number;
  errors: any[];
}

export interface BatchStatus {
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
}
