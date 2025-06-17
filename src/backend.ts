import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import express, { Request, Response } from 'express';
import NodeClam from 'clamscan';

import { fileUpload } from './file-upload.js';
import { generateFactTable } from './fact-table.js';

const app = express();
const port = 3001;

const uploadDirPath = './uploads';
await fs.mkdir(path.resolve(uploadDirPath), { recursive: true });

const clamscan = await new NodeClam().init({
  clamdscan: { host: 'localhost', port: 3310, timeout: 60000 }
});

interface FileInfo {
  filename: string;
  filePath: string;
  saved: boolean;
  scan?: Record<string, unknown>;
}

// Handle file upload
app.post('/', fileUpload(), async (req: Request, res: Response) => {
  console.log('Handling file upload...');
  const files: FileInfo[] = [];
  const start = performance.now();

  try {
    // by default pechkin (and busboy) supports mutliple files in a single POST request. If we don't need that
    // we might be able to simplify this a bit.
    for await (const { stream, filename } of req.files!) {
      const fileInfo: FileInfo = { filename, filePath: '', saved: false, scan: undefined };
      files.push(fileInfo);

      if (!stream || !filename) {
        console.error('Invalid file upload request: missing stream or filename');
        res.status(400).json({ error: 'Invalid file upload request' });
        return;
      }

      const av = clamscan.passthrough();
      const filePath = path.resolve(uploadDirPath, filename);
      const outputFile = createWriteStream(filePath);

      stream.pipe(av).pipe(outputFile);

      outputFile.on('error', (err) => {
        throw err;
      });

      outputFile.on('finish', () => {
        fileInfo.filePath = filePath;
        fileInfo.saved = true;
      });

      av.on('error', (err) => {
        throw err;
      });

      av.on('timeout', () => {
        throw new Error('Virus scan timed out');
      });

      av.on('scan-complete', (scan) => {
        fileInfo.scan = scan;
      });
    }

    const waitForComplete = setInterval(async () => {
      if (files.every(file => file.saved && file.scan)) {
        clearInterval(waitForComplete);
        const end = performance.now();
        const time = Math.round(end - start);
        console.log(`Upload and scan took ${time}ms`);

        const file = files[0];

        if (file.scan?.isInfected === false) {
          await generateFactTable(files[0].filePath);
          res.json({ message: 'OK', files, time });
        } else {
          res.status(400).json({ message: 'REJECTED', files, time });
        }

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
