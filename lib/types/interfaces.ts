import { Readable } from "stream";
import winston from "winston";

export interface Uploader {
  destination: string;
  outputDestination: string;
  outputFiles: {};
  logger: winston.Logger;
  upload(fileStream: Readable, fileName: string)
}

export interface TranscodeDispatcher {
  encodeParams: any;
  inputLocation: string;
  outputDestination: string;
  encoreEndpoint: string;
  logger: winston.Logger;
  dispatch(fileName: string): Promise<any>;
  getJobs(page: number, size: number): Promise<any>;
  getJob(jobId: string): Promise<any>;
  createJobs(config: {}): Promise<any>;
  monitorJobUntilComplete(jobId: string): Promise<any>;
}
