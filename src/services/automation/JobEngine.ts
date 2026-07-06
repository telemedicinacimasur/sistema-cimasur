import { Job, JobState, IdempotencyRecord, AutomationHistoryRecord } from './types';

export class IdempotencyGuard {
  constructor(private readRecords: any, private writeRecords: any) {}

  public async checkAndLock(key: string, jobId: string): Promise<boolean> {
    const records: IdempotencyRecord[] = await this.readRecords('automation_idempotency') || [];
    if (records.find(r => r.key === key)) {
      return false; // Already executed
    }
    records.push({
      id: `idemp_${Date.now()}_${key}`,
      key,
      timestamp: new Date().toISOString(),
      jobId
    });
    await this.writeRecords('automation_idempotency', records);
    return true;
  }
}

export class HistoryManager {
  constructor(private readRecords: any, private writeRecords: any) {}

  public async logExecution(record: Omit<AutomationHistoryRecord, 'id' | 'timestamp'>): Promise<void> {
    const history: AutomationHistoryRecord[] = await this.readRecords('automation_history') || [];
    history.push({
      ...record,
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    });
    await this.writeRecords('automation_history', history);
  }
}

export class RetryManager {
  public calculateNextRetry(retries: number): string {
    // Exponential backoff strategy
    const baseDelay = 5 * 60 * 1000; // 5 minutes
    const delay = baseDelay * Math.pow(2, retries);
    return new Date(Date.now() + delay).toISOString();
  }
}

export class JobManager {
  constructor(private readRecords: any, private writeRecords: any) {}

  public async createJob(jobData: Omit<Job, 'id' | 'createdAt' | 'state' | 'retries'>): Promise<Job> {
    const jobs = await this.readRecords('automation_jobs') || [];
    const newJob: Job = {
      ...jobData,
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      state: jobData.scheduledAt ? 'scheduled' : 'pending',
      retries: 0
    };
    jobs.push(newJob);
    await this.writeRecords('automation_jobs', jobs);
    return newJob;
  }

  public async updateJobState(jobId: string, state: JobState, error?: string, executionTimeMs?: number): Promise<void> {
    const jobs = await this.readRecords('automation_jobs') || [];
    const index = jobs.findIndex((j: Job) => j.id === jobId);
    if (index > -1) {
      jobs[index].state = state;
      if (error) jobs[index].error = error;
      if (executionTimeMs) jobs[index].executionTimeMs = executionTimeMs;
      await this.writeRecords('automation_jobs', jobs);
    }
  }

  public async failJobWithRetry(jobId: string, error: string): Promise<void> {
    const jobs = await this.readRecords('automation_jobs') || [];
    const index = jobs.findIndex((j: Job) => j.id === jobId);
    if (index > -1) {
      const job = jobs[index];
      job.retries += 1;
      if (job.retries >= job.maxRetries) {
        job.state = 'failed';
      } else {
        job.state = 'scheduled';
        job.nextRetryAt = new RetryManager().calculateNextRetry(job.retries);
      }
      job.error = error;
      await this.writeRecords('automation_jobs', jobs);
    }
  }
}

export class MessageQueue {
  constructor(private readRecords: any, private writeRecords: any) {}

  public async enqueue(job: Job): Promise<void> {
    // In a real infrastructure, this pushes to RabbitMQ, SQS, or Redis
    // For now, it simply creates the job via JobManager and keeps it ready
    const jobManager = new JobManager(this.readRecords, this.writeRecords);
    const existingJobs = await this.readRecords('automation_jobs') || [];
    if (!existingJobs.find((j: Job) => j.id === job.id)) {
      await jobManager.createJob(job);
    }
  }

  public async peekNextPending(): Promise<Job | null> {
    const jobs = await this.readRecords('automation_jobs') || [];
    const pending = jobs.filter((j: Job) => j.state === 'pending');
    pending.sort((a: Job, b: Job) => {
      const pMap = { high: 0, medium: 1, low: 2 };
      return pMap[a.priority] - pMap[b.priority];
    });
    return pending.length > 0 ? pending[0] : null;
  }
}

export class Scheduler {
  constructor(private readRecords: any, private writeRecords: any) {}

  public async processScheduledJobs(): Promise<void> {
    // Find scheduled jobs whose time has arrived and move to pending
    const jobs = await this.readRecords('automation_jobs') || [];
    const now = new Date();
    let updated = false;

    jobs.forEach((j: Job) => {
      if (j.state === 'scheduled') {
        const triggerTime = j.nextRetryAt ? new Date(j.nextRetryAt) : (j.scheduledAt ? new Date(j.scheduledAt) : null);
        if (triggerTime && triggerTime <= now) {
          j.state = 'pending';
          updated = true;
        }
      }
    });

    if (updated) {
      await this.writeRecords('automation_jobs', jobs);
    }
  }
}
