import fs from 'node:fs/promises';
import { createWriteStream, WriteStream } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import express, { Request, Response } from 'express';
import NodeClam from 'clamscan';

import { fileUpload } from './file-upload.js';

const app = express();
const port = 3001;

const uploadDirPath = './uploads';
await fs.mkdir(path.resolve(uploadDirPath), { recursive: true });

const clamscan = await new NodeClam().init({
  clamdscan: { host: 'localhost', port: 3310, timeout: 60000 }
});

interface FileInfo {
  filename: string;
  mimeType: string;
  filePath: string;
  saved: boolean;
  scan?: Record<string, unknown>;
}

const getAVPassthrough = (fileInfo: FileInfo): Transform => {
  const av = clamscan.passthrough(); // doesn't wait for scan before passing the stream through

  av.on('error', (err) => {
    throw err;
  });

  av.on('timeout', () => {
    throw new Error('Virus scan timed out');
  });

  av.on('scan-complete', (scan) => {
    fileInfo.scan = scan;
  });

  return av;
};

const getOutputFile = (fileInfo: FileInfo): WriteStream => {
  const filePath = path.resolve(uploadDirPath, fileInfo.filename);
  const outputFile = createWriteStream(filePath);

  outputFile.on('error', (err) => {
      throw err;
    });

  outputFile.on('finish', () => {
    fileInfo.filePath = filePath;
    fileInfo.saved = true;
  });

  return outputFile;
};

// Handle file upload
app.post('/', fileUpload(), async (req: Request, res: Response) => {
  console.log('Handling file upload...');
  const start = performance.now();

  try {
    // we only care about the first file in the request, bin off the rest
    const iterable = await req.files?.next() as any || {};
    const { stream, filename, mimeType } = iterable.value || {};

    if (!stream || !filename) {
      console.error('Invalid file upload request: missing file stream or filename');
      res.status(400).json({ error: 'Invalid file upload request' });
      return;
    }

    const fileInfo: FileInfo = { filename, mimeType, filePath: '', saved: false, scan: undefined };
    const virusScanner = getAVPassthrough(fileInfo);
    const outputFile = getOutputFile(fileInfo);

    await pipeline(stream, virusScanner, outputFile).catch((err) => {
      throw err;
    });

    // virus scanner is passthrough so it does not block the pipeline - need to wait for it to complete
    const waitForScan = setInterval(async () => {
      if (fileInfo.scan) {
        clearInterval(waitForScan);
        const end = performance.now();
        const time = Math.round(end - start);
        console.log(`Save and scan took ${time}ms`);

        if (fileInfo.scan?.isInfected === true) {
          res.status(400).json({ message: 'INFECTED', fileInfo, time });
          return;
        }

        res.json({ message: 'OK', fileInfo, time });
        return;
      }
      console.log('.');
    }, 50);

  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});
