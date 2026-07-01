export class NotificationEngine {
  public notify(userId: string, message: string, type: 'email' | 'whatsapp' | 'in-app') {
    console.log(`Sending notification to ${userId}: [${type}] ${message}`);
    // Logic to be implemented
  }
}
