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
  jobCustomizer?: (job: any) => any;
  encoreAuth?: {
    username: string;
    password: string;
  }
}

export class EncoreDispatcher implements TranscodeDispatcher {
  encodeParams: any;
  outputDestination: string;
  encoreEndpoint: string;
  logger: Logger;
  createOutputFolder?: boolean;
  jobCustomizer?: (job: any) => any;
  encoreAuth?: {
    username: string;
    password: string;
  }

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
    this.jobCustomizer = opts.jobCustomizer;
    this.encoreAuth = opts.encoreAuth;
  }

  async dispatch(inputUri: string): Promise<any> {
    const resp = await this.createJobs(inputUri);
    return resp;
  }

  authHeader() {
    return this.encoreAuth ? {
      "Authorization": "Basic " + Buffer.from(`${this.encoreAuth.username}:${this.encoreAuth.password}`).toString("base64")
    } : {};
  }

  async getJobs(page: number, size: number): Promise<any> {
    this.logger.info("Fetching jobs from Encore");
    const url = `${this.encoreEndpoint}/encoreJobs?page=${page}&size=${size}`;
    const authHeader = this.authHeader();
    try {
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeader
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
          ...this.authHeader()
        }
      });
      if (!resp.ok) {
        this.logger.error(`Failed to get job from Encore for ${jobId}: status ${resp.status}`);
        return;
      }
      return resp.json();
    } catch (err) {
      this.logger.error(err);
    }
  }

  async createJobs(inputUri: string): Promise<any> {
    this.logger.info(`Creating job in Encore for ${inputUri}`);
    let config = this.encodeParams;
    config.id = randomUUID();
    config.baseName = path.basename(inputUri, path.extname(inputUri));
    const outputFolder = path.join(this.outputDestination, config.baseName, config.id);

    if (this.createOutputFolder && !fs.existsSync(outputFolder)) {
      this.logger.info(`Creating output folder ${outputFolder}`);
      process.umask(0);
      fs.mkdirSync(outputFolder, {recursive: true, mode: parseInt('0755', 8)})
    }

    config.outputFolder = outputFolder;
    config.inputs = [ {
      uri: inputUri,
      type: "AudioVideo"
    } ];
    const url = `${this.encoreEndpoint}/encoreJobs`;
    const job = this.jobCustomizer ? this.jobCustomizer(config) : config;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.authHeader()
        },
        body: JSON.stringify(job)
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
          ...this.authHeader()
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
