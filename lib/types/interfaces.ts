import { Readable } from 'stream';
import { Logger } from 'eyevinn-iaf';

export interface Uploader {
  destination: string;
  outputDestination: string;
  outputFiles: {};
  logger: Logger;
  upload(fileStream: Readable, fileName: string)
}

export interface TranscodeDispatcher {
  encodeParams: any;
  outputDestination: string;
  encoreEndpoint: string;
  logger: Logger;
  dispatch(fileName: string): Promise<any>;
  getJobs(page: number, size: number): Promise<any>;
  getJob(jobId: string): Promise<any>;
  createJobs(config: {}): Promise<any>;
  monitorJobUntilComplete(jobId: string): Promise<any>;
}
