# IAF Plugin Encore-local

The Eyevinn Ingest Application Framework (Eyevinn IAF) is a framework to simplify building VOD ingest applications. A framework of open source plugins to integrate with various transcoding and streaming providers. This is the plugin for interacting with the [SVT Encore video transcoding tool](https://github.com/svt/encore).

## Installation

To install the plugin in your project, run the following command.

```
npm install --save @eyevinn/iaf-plugin-encore-local
```

## Using the module in your application based on Eyevinn IAF
To use the Encore upload module in your Eyevinn IAF setup, your `index.ts` should look like this:
```TypeScript
// other imports
import {EncoreUploadModule} from "@eyevinn/iaf-plugin-encore-local";

const encoreUploader = new EncoreUploadModule(/** args **/);
const fileWatcher = /** initialize your file watcher of choice**/

fileWatcher.onAdd(encoreUploader.onFileAdd);
```

# Plugin Documentation

## `EncoreUploadModule`
Default plugin export. This class is plug-and-play with the Ingest Application Framework, as described in the previous section.

### Methods
`constructor(encoreEndpoint: string, inputLocation: string, outputDestination: string, encodeParams: string, logger: winston.Logger)`

Creates a new `EncoreUploadModule` object. You need to provide the Encore endpoint URL as well as the name of your ingest and output destinations. If you want to use custom Encore settings you also need to provide those as the encodeParams. A winston logger is also needed. These parameters are used to initialize the sub-modules.

`onFileAdd = (filePath: string, readStream: Readable)`.

Method that is executed when a file is added to the directory being watched. `filePath` is the full path to the added file, and `readStream` is a `Readable` stream of the file data. Any file watcher plugins are *required* to provide these. The method dispatches a transcoding job to the Encore endpoint. On job completion a SMIL-file will be generated in the `outputDestination` containing all transcoded video/audio files.

## `EncoreDispatcher`
Sub-module that dispatches Encore transcoding jobs.

### Methods
`constructor(encoreEndpoint: string, inputLocation: string, outputDestination: string, encodeParams: string, logger: winston.Logger)`

Instantiates a new `EncoreDispatcher`. logging is injected in order to avoid multiple logging objects.
In most cases, the parameters will be passed down to the parent `EncoreUploadModule`.

`async dispatch(fileName: string)`

Dispatches a Encore transcoding job. Jobs are executed with the settings specified in `resources/exampleJob.json` or those that are specified in the encodeParams, and are in Encore job format. `fileName` is the filename of the input file.
# [Contributing](CONTRIBUTING.md)

In addition to contributing code, you can help to triage issues. This can include reproducing bug reports, or asking for vital information such as version numbers or reproduction instructions.

# License (MIT)

Copyright 2021 Eyevinn Technology

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

# About Eyevinn Technology

Eyevinn Technology is an independent consultant firm specialized in video and streaming. Independent in a way that we are not commercially tied to any platform or technology vendor.

At Eyevinn, every software developer consultant has a dedicated budget reserved for open source development and contribution to the open source community. This give us room for innovation, team building and personal competence development. And also gives us as a company a way to contribute back to the open source community.

Want to know more about Eyevinn and how it is to work here. Contact us at work@eyevinn.se!

