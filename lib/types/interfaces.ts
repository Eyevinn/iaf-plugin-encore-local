import internal, { Readable } from "stream";
import winston from "winston";

export interface IafUploadModule {
    logger: winston.Logger;
    onFileAdd(filePath: string, readStream: Readable): any;
    fileUploadedDelegate: Function;
}

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
}

export interface FileWatcher {
    dirName: String;
    logger: winston.Logger;
    onAdd(callback: (filePath: string, readStream: Readable) => any);
}