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
    this.encoreEndpoint = encoreEndpoint;
    this.encodeParams = encodeParams;

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
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    const json = await response.json();
    return json;
  }

  async getJob(jobId: string): Promise<any> {
    this.logger.info('Fetching job from Encore');
    const url = `${this.encoreEndpoint}/encoreJobs/${jobId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    const json = await response.json();
    return json;
  }

  async createJobs(fileName: string): Promise<any> {
    this.logger.info('Creating job in Encore');
    let config = JSON.parse(this.encodeParams);
    config["outputFolder"] = this.outputDestination;
    config["baseName"] = fileName;
    config.inputs = [{
      "type": "AudioVideo",
      "uri": `${this.inputLocation}/${fileName}`,
    }];
    const url = `${this.encoreEndpoint}/encoreJobs`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.encodeParams)
    });
    const json = await response.json();
    return json;
  }

  loadEncodeParams(templateFileName: string) {
    const encodeData = JSON.parse(fs.readFileSync(templateFileName, "utf-8"));
    return encodeData;
  }
}
