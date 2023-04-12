const appRoot = require('app-root-path');
const async = require('async')
const express = require('express')
const fs = require('fs')
const path = require('path')
const { Base64Encode } = require('base64-stream')
const { pipeline } = require("stream/promises");
const Archiver = require('archiver')
const byteSize = require('byte-size');
const archiver = require('archiver');

const app = express()
const PORT = 8888

/**
 * / (root path) > returns index.html
 */
app.get('/', (req, res) => {
  // When user hits '/' return index.html as client
  res.sendFile(path.join(__dirname, 'index.html'))
})

/**
 * /download > responds with zipped "files" directory
 */
app.get('/download', async (req, res) => {
  // log the memory usage when the process of zipping and downloading start
  console.info(`start | heapUsed: ${byteSize(process.memoryUsage().heapUsed)}`)
  res.set('Content-Type', 'application/zip');

  // 1) create a zip file stream
  const archiver = new Archiver('zip');
  res.on('close', function () {
    console.log(`archive-size: ${byteSize(archiver.pointer())}`);
    console.log('archiver has been finalized and the output file descriptor has closed.');
  });

  // 2) design the pipeline that streams files to the response
  async function run() {
    await pipeline(
      archiver,
      new Base64Encode(),
      res
    );
    console.log("Pipeline succeeded");
  };

  // 3) run pipeline
  run().catch(console.error);

  // just for the poc we respond with an array of predefined files
  streamFilesIntoArchiver(
    (() => {
      // for the poc we return a static array of files to be read into the archive
      const staticFileDescriptors = [];
      staticFileDescriptors.push({ filePath: path.join(appRoot.path, 'files', '1.txt'), targetFilename: '1.txt' })
      staticFileDescriptors.push({ filePath: path.join(appRoot.path, 'files', '2.txt'), targetFilename: '2.txt' })
      staticFileDescriptors.push({ filePath: path.join(appRoot.path, 'files', '3_download.png'), targetFilename: '3_download.png' })
      // let`s add the 6mb pdf multiple times
      for (let index = 0; index < 10; index++) {
        staticFileDescriptors.push({ filePath: path.join(appRoot.path, 'files', '4_kafka-guide.pdf'), targetFilename: `4_kafka-guide-${index}.pdf` })
      }
      return staticFileDescriptors;
    })(),
    archiver,
    5
  );


})

// start listening
app.listen(PORT, () => {
  console.log(`Server running at ${PORT}.`)
})

/**
   * Create limited number of file read streams in parallel
   * and pipe each one into the zip transformer.
   * @param {*} fileDescriptors
   * @param {Archiver} zipArchive
   */
function streamFilesIntoArchiver(fileDescriptors, zipArchive, maxNumberOfParallelStreams) {
  async.eachLimit(
    fileDescriptors,
    maxNumberOfParallelStreams, // max number of files to read in parallel
    function (fileDescriptor, done) {
      // just the poc, we read the files from disk
      // later on, we might use the (single-)file-downloader endpoint to read the file
      if (fs.statSync(fileDescriptor.filePath).isFile()) {
        const stream = fs.createReadStream(fileDescriptor.filePath)
        zipArchive.append(stream, { name: path.basename(fileDescriptor.targetFilename) })
      }
      done()
    },
    function (err) {
      err && console.error(err)
      if (!err) {
        console.log('Done adding files')
        // call zip.finalize() to finalize the zip instance.
        zipArchive.finalize()
        // check the memory usage when the process of zipping and downloading finished
        console.log(`end | heapUsed: ${byteSize(process.memoryUsage().heapUsed)}`)
      }
    })
};
