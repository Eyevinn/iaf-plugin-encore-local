import * as path from 'path';
import { createSMILFile } from './utils/smilGenerator';
import { EncoreDispatcher } from './encoreDispatcher';
import { Readable } from 'stream';
import { IafUploadModule, Logger } from 'eyevinn-iaf';

export class EncoreUploadModule implements IafUploadModule {
  logger: Logger;
  playlistName: string;
  dispatcher: EncoreDispatcher;
  outputFolder: string;
  fileUploadedDelegate: (result: any, error?: any) => any;
  progressDelegate: (result: any) => any;

  constructor(encoreEndpoint: string, ingestFolder: string, outputFolder: string, encodeParams: string, logger: Logger) {
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
      if (!result) {
        this.logger.error(`Error dispatching job for ${fileName}`);
        this.fileUploadedDelegate(null);
        return;
      }
      this.dispatcher
        .monitorJobUntilComplete(result.id)
        .then((job) => {
          if (job.status === "COMPLETED" || job.status === "SUCCESSFUL") {
            this.logger.info(`Job ${job.id} completed successfully`);
            createSMILFile(this.outputFolder, fileName);
            this.fileUploadedDelegate(job);
          } else {
            this.logger.error(`Job ${job.id} aborted with status: ${job.status} and message: ${job.message}`);
            this.fileUploadedDelegate(null, job);
          }
        })
        .catch((err) => {
          this.logger.error(err);
          this.fileUploadedDelegate(null, err);
        });
    });
  };
}
