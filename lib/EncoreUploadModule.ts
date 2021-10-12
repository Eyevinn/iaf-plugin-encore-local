import winston from "winston";
import * as path from 'path'
import { createSMILFile } from './utils/smilGenerator'
import { IafUploadModule } from './types/interfaces'
import { EncoreDispatcher } from './encoreDispatcher'
import { Readable } from "stream";

export class EncoreUploadModule implements IafUploadModule {
    logger: winston.Logger;
    dispatcher: EncoreDispatcher;
    outputFolder: string;
    fileUploadedDelegate: Function;


    constructor(encoreEndpoint: string, ingestFolder: string, outputFolder: string, encodeParams: string, logger: winston.Logger) {
        this.logger = logger;
        this.outputFolder = outputFolder;
        this.dispatcher = new EncoreDispatcher(encoreEndpoint, ingestFolder, outputFolder, encodeParams, logger);
    }

    /**
     * Method that runs when a FileWatcher detects a new file.
     * dispatches a transcoding job to the encore dispatcher
     * Creates a SMIL file for the transcoded file and stores it in the output folder
     * @param filePath the path to the file being added.
     * @param readStream Readable stream of the file.
     */
    onFileAdd = (filePath: string, readStream: Readable) => {
        this.logger.info(`File added: ${filePath}`);
        const fileName = path.basename(filePath);
        this.dispatcher.dispatch(fileName).then((result) => {
            this.dispatcher.monitorJobUntilComplete(result.id).then((job) => {
                if (job) {
                    createSMILFile(this.outputFolder, fileName);
                    this.fileUploadedDelegate(job);
                } else {
                    this.logger.error(`Job ${result.id} failed to complete Encore job.`);
                }
            }).catch((err) => {
                this.logger.error(err);
            });
        });
    }
}