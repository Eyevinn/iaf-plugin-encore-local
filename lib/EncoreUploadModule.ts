import {createSMILFile} from './utils/smilGenerator';
import {EncoreDispatcher, EncoreDispatcherOptions} from './encoreDispatcher';
import {Readable} from 'stream';
import {IafUploadModule, Logger} from 'eyevinn-iaf';

export interface MonitoredJobsStore {
  store: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  list: () => Promise<string[]>;
}

const NoStore : MonitoredJobsStore = {
  store: async (id: string) => {},
  remove: async (id: string) => {},
  list: async () => []
}

export interface EncoreUploadModuleOptions extends EncoreDispatcherOptions {
  generateSmilFile?: boolean;
  monitorJobs?: boolean;
  monitoredJobsStore?: MonitoredJobsStore;
}

export class EncoreUploadModule implements IafUploadModule {
  logger: Logger;
  playlistName: string;
  dispatcher: EncoreDispatcher;
  outputFolder: string;
  generateSmilFile: boolean;
  monitorJobs: boolean;
  monitoredJobsStore?: MonitoredJobsStore;
  fileUploadedDelegate: (result: any, error?: any) => any;
  progressDelegate: (result: any) => any;

  constructor(opts: EncoreUploadModuleOptions) {
    this.logger = opts.logger;
    this.outputFolder = opts.outputDestination;
    this.dispatcher = new EncoreDispatcher(opts);
    this.generateSmilFile = !!opts.generateSmilFile;
    this.monitorJobs = !!opts.monitorJobs;
    this.monitoredJobsStore = opts.monitoredJobsStore || NoStore;
    if (this.monitorJobs) {
      this.initializeMonitoredJobs();
    }
  }

  async initializeMonitoredJobs() {
    const jobs = await this.monitoredJobsStore.list();
    for (const jobId of jobs) {
      this.monitorJob(jobId);
    }
  }

  /**
   * Method that runs when a FileWatcher detects a new file.
   * dispatches a transcoding job to the encore dispatcher
   * Creates a SMIL file for the transcoded file and stores it in the output folder
   * @param filePath the path to the file being added.
   * @param readStream Readable stream of the file.
   */
  async onFileAdd (filePath: string, readStream: Readable)  {
    this.logger.info(`File added: ${filePath}`);
    const result = await this.dispatcher.dispatch(filePath);
    if (!result) {
      this.logger.error(`Error dispatching job for ${filePath}`);
      this.fileUploadedDelegate(null);
      return;
    }
    if (this.monitorJobs) {
      this.monitorJob(result.id);
    }
  }

  async monitorJob(jobId: string) {
    try {
      await this.monitoredJobsStore.store(jobId);
    } catch (err) {
      this.logger.error(`Error storing job ${jobId} in monitored jobs store`);
    }
    try {
      const job = await this.dispatcher.monitorJobUntilComplete(jobId);
      await this.monitoredJobsStore.remove(jobId);
      this.handleFinishedJob(job);
    } catch (err) {
      // Should we? Might be retryable error
      // retry loop might make sense
      //await this.monitoredJobsStore.remove(jobId);
      this.logger.error(err);
      this.fileUploadedDelegate?.(null, err);
    }
  }

  handleFinishedJob(job) {
    if (job.status === "COMPLETED" || job.status === "SUCCESSFUL") {
      this.logger.info(`Job ${job.id} completed successfully`);
      if (this.generateSmilFile) {
        createSMILFile(job.outputFolder, job.inputs[0].uri);
      }
      this.fileUploadedDelegate?.(job);
    } else {
      this.logger.error(`Job ${job.id} aborted with status: ${job.status} and message: ${job.message}`);
      this.fileUploadedDelegate?.(null, job);
    }
  }
}
