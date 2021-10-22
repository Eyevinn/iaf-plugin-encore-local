import { TranscodeDispatcher } from './types/interfaces'
import fetch from 'node-fetch';
import winston from "winston";
import * as fs from "fs";
import * as path from "path"


export class EncoreDispatcher implements TranscodeDispatcher {
  encodeParams: any;
  inputLocation: string;
  outputDestination: string;
  encoreEndpoint: string;
  logger: winston.Logger;

  constructor(encoreEndpoint: string, inputLocation: string, outputDestination: string, encodeParams: string, logger: winston.Logger) {
    this.inputLocation = inputLocation;
    this.outputDestination = outputDestination;
    this.logger = logger;
    if (encoreEndpoint.endsWith('/')) {
      this.encoreEndpoint = encoreEndpoint.slice(0, -1);
    } else {
      this.encoreEndpoint = encoreEndpoint;
    }
    if (encodeParams) {
      this.encodeParams = JSON.parse(encodeParams);
    } else {
      this.encodeParams = this.loadEncodeParams(path.join(__dirname,"..","resources", "exampleJob.json"));
    }
  }

  async dispatch(fileName: string): Promise<any> {
    const resp = await this.createJobs(fileName);
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

  async createJobs(fileName: string): Promise<any> {
    this.logger.info(`Creating job in Encore for ${fileName}`);
    let config = this.encodeParams;
    const outputFolder = path.join(this.outputDestination, path.basename(fileName, path.extname(fileName)));
    if (!fs.existsSync(outputFolder)) {
      this.logger.info(`Creating output folder ${outputFolder}`);
      process.umask(0);
      fs.mkdirSync(outputFolder, parseInt('0777', 8))
    }
    config["outputFolder"] = outputFolder;
    config["baseName"] = path.basename(fileName, path.extname(fileName));
    config.inputs[0]["uri"] = `${this.inputLocation}/${fileName}`;
    const url = `${this.encoreEndpoint}/encoreJobs`;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config)
      });
      return resp.json();
    } catch (err) {
      this.logger.error(err);
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
    const timeout = process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 7400;
    const timeoutAt = Date.now() + timeout * 1000;
    let job = await this.getJob(jobId);

    while(timeoutAt > Date.now()) {
      if (job.status === "FAILED") {
        this.logger.error(`Job with id ${jobId} failed`);
        break;
      }
      if (job.status === "CANCELLED") {
        this.logger.info(`Job with id ${jobId} was cancelled`);
        break;
      }
      this.logger.info(`Job with id ${jobId} Progress: ${job.progress}%`);
      if (job.status === "COMPLETED" || job.status === "SUCCESSFUL") {
        this.logger.info(`Job with id ${jobId} completed`);
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 30000));
      job = await this.getJob(jobId);
    }
    if (Date.now() > timeoutAt) {
      this.logger.error(`Job with id ${jobId} timed out`);
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
