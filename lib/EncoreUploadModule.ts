import {createSMILFile} from './utils/smilGenerator';
import {EncoreDispatcher, EncoreDispatcherOptions} from './encoreDispatcher';
import {Readable} from 'stream';
import {IafUploadModule, Logger} from 'eyevinn-iaf';

export interface EncoreUploadModuleOptions extends EncoreDispatcherOptions {
  generateSmilFile?: boolean;
}

export class EncoreUploadModule implements IafUploadModule {
  logger: Logger;
  playlistName: string;
  dispatcher: EncoreDispatcher;
  outputFolder: string;
  generateSmilFile?: boolean;
  fileUploadedDelegate: (result: any, error?: any) => any;
  progressDelegate: (result: any) => any;

  constructor(opts: EncoreUploadModuleOptions) {
    this.logger = opts.logger;
    this.outputFolder = opts.outputDestination;
    this.dispatcher = new EncoreDispatcher(opts);
    this.generateSmilFile = opts.generateSmilFile;
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
    this.dispatcher.dispatch(filePath).then((result) => {
      if (!result) {
        this.logger.error(`Error dispatching job for ${filePath}`);
        this.fileUploadedDelegate(null);
        return;
      }
      this.dispatcher
        .monitorJobUntilComplete(result.id)
        .then((job) => {
          if (job.status === "COMPLETED" || job.status === "SUCCESSFUL") {
            this.logger.info(`Job ${job.id} completed successfully`);
            if (this.generateSmilFile) {
              createSMILFile(job.outputFolder, filePath);
            }
            this.fileUploadedDelegate?.(job);
          } else {
            this.logger.error(`Job ${job.id} aborted with status: ${job.status} and message: ${job.message}`);
            this.fileUploadedDelegate?.(null, job);
          }
        })
        .catch((err) => {
          this.logger.error(err);
          this.fileUploadedDelegate?.(null, err);
        });
    });
  };
}
