import { TranscodeDispatcher } from './types/interfaces'
import { Logger } from "eyevinn-iaf";
import fetch from 'node-fetch';
import * as fs from "fs";
import * as path from "path"
import {randomUUID} from "node:crypto";

export interface EncoreDispatcherOptions {
  encoreEndpoint: string;
  outputDestination: string;
  encodeParams: string|object;
  logger: Logger;
  createOutputFolder?: boolean;
}

export class EncoreDispatcher implements TranscodeDispatcher {
  encodeParams: any;
  outputDestination: string;
  encoreEndpoint: string;
  logger: Logger;
  createOutputFolder?: boolean;

  constructor(opts: EncoreDispatcherOptions) {
    this.outputDestination = opts.outputDestination;
    this.logger = opts.logger;
    if (opts.encoreEndpoint.endsWith('/')) {
      this.encoreEndpoint = opts.encoreEndpoint.slice(0, -1);
    } else {
      this.encoreEndpoint = opts.encoreEndpoint;
    }
    if (typeof opts.encodeParams === 'string') {
      this.encodeParams = JSON.parse(opts.encodeParams);
    } else {
      this.encodeParams = opts.encodeParams;
    }
    this.createOutputFolder = opts.createOutputFolder;
  }

  async dispatch(inputUri: string): Promise<any> {
    const resp = await this.createJobs(inputUri);
    return resp;
  }

  async getJobs(page: number, size: number): Promise<any> {
    this.logger.info("Fetching jobs from Encore");
    const url = `${this.encoreEndpoint}/encoreJobs?page=${page}&size=${size}`;
    try {
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        }
      });
      return resp.json();
    } catch (err) {
      this.logger.error(err);
    }
  }

  async getJob(jobId: string): Promise<any> {
    this.logger.info(`Fetching job with id ${jobId}`);
    const url = `${this.encoreEndpoint}/encoreJobs/${jobId}`;
    try {
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        }
      });
      return resp.json();
    } catch (err) {
      this.logger.error(err);
    }
  }

  async createJobs(inputUri: string): Promise<any> {
    this.logger.info(`Creating job in Encore for ${inputUri}`);
    let config = this.encodeParams;
    config.jobId = randomUUID();
    const outputFolder = path.join(this.outputDestination, config.jobId, path.basename(inputUri, path.extname(inputUri)));

    if (this.createOutputFolder && !fs.existsSync(outputFolder)) {
      this.logger.info(`Creating output folder ${outputFolder}`);
      process.umask(0);
      fs.mkdirSync(outputFolder, parseInt('0777', 8))
    }

    config.outputFolder = outputFolder;
    config.baseName = path.basename(inputUri, path.extname(inputUri));
    config.inputs = [ {
      uri: inputUri,
      type: "AudioVideo"
    } ];
    const url = `${this.encoreEndpoint}/encoreJobs`;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config)
      });
      if (!resp.ok) {
        this.logger.error(`Failed to create job in Encore for ${inputUri}: status ${resp.status}`);
        this.logger.error(`Response: ${await resp.text()}`);
        throw new Error(`Failed to create job in Encore for ${inputUri}: status ${resp.status}`);
      }
      return resp.json();
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  async cancelJob(jobId: string): Promise<any> {
    this.logger.info(`Cancelling job with id ${jobId}`);
    const url = `${this.encoreEndpoint}/encoreJobs/${jobId}/cancel`;
    try {
      const resp = fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        }
      });
      return resp.json();
    } catch (err) {
      this.logger.error(err);
    }
  }

  async monitorJobUntilComplete(jobId: string): Promise<any> {
    const timeout = (process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 7400) * 1000;
    const INTERVAL = 30000;
    let jobCompleted = false;
    let timeoutAt = timeout;
    let job = await this.getJob(jobId);

    while(timeoutAt > 0) {
      timeoutAt -= INTERVAL;
      if (job.status === "QUEUED") {
        this.logger.info(`Job ${jobId} is queued`);
        timeoutAt = timeout;
      }
      if (job.status === "FAILED") {
        this.logger.error(`Job with id ${jobId} failed`);
        break;
      }
      if (job.status === "CANCELLED") {
        this.logger.info(`Job with id ${jobId} was cancelled`);
        break;
      }
      if (job.status === "COMPLETED" || job.status === "SUCCESSFUL") {
        jobCompleted = true;
        this.logger.info(`Job with id ${jobId} completed`);
        break;
      }
      if (job.status === "IN_PROGRESS") {
        this.logger.info(`Job with id ${jobId} Progress: ${job.progress}%`);
      }
      await new Promise(resolve => setTimeout(resolve, INTERVAL));
      job = await this.getJob(jobId);
    }
    if (!jobCompleted) {
      this.logger.warn(`Job with id ${jobId} timed out before completion`);
      if (process.env.CANCEL_ON_TIMEOUT) {
        await this.cancelJob(jobId);
        this.logger.error(`Job with id ${jobId} have been cancelled`);
      }
    }
    return job;
  }

  loadEncodeParams(templateFileName: string) {
    const encodeData = JSON.parse(fs.readFileSync(templateFileName, "utf-8"));
    return encodeData;
  }
}
