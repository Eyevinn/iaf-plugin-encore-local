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
    console.log(JSON.stringify(encodeParams))
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
    this.logger.info('Fetching jobs from Encore');
    const url = `${this.encoreEndpoint}/encoreJobs?page=${page}&size=${size}`;
    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      return resp.json();
    } catch (err) {
      this.logger.error(err);
    }
  }

  async getJob(jobId: string): Promise<any> {
    this.logger.info('Fetching job from Encore');
    const url = `${this.encoreEndpoint}/encoreJobs/${jobId}`;
    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      return resp.json();
    } catch (err) {
      this.logger.error(err);
    }
  }

  async createJobs(fileName: string): Promise<any> {
    this.logger.info('Creating job in Encore');
    let config = this.encodeParams;
    config["outputFolder"] = this.outputDestination;
    config["baseName"] = fileName;
    config.inputs = [{
      "type": "AudioVideo",
      "uri": `${this.inputLocation}/${fileName}`,
      "params": {
        "ac": "2"
      }
    }];
    const url = `${this.encoreEndpoint}/encoreJobs`;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: this.encodeParams
      });
      return resp.json();
    } catch (err) {
      this.logger.error(err);
    }
  }

  loadEncodeParams(templateFileName: string) {
    const encodeData = JSON.parse(fs.readFileSync(templateFileName, "utf-8"));
    return encodeData;
  }
}
