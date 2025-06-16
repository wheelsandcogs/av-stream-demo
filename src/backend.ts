import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
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

// Handle file upload
app.post('/', fileUpload(), async (req: Request, res: Response) => {
  console.log('Handling file upload...');
  const files: string[] = [];
  const scanResults: any[] = [];

  try {
    for await (const { stream, filename } of req.files!) {
      if (!stream || !filename) {
        console.error('Invalid file upload request: missing stream or filename');
        res.status(400).json({ error: 'Invalid file upload request' });
        return;
      }

      const av = clamscan.passthrough();

      const filePath = path.resolve(uploadDirPath, filename);
      const outputFile = createWriteStream(filePath);

      console.log(`Received file: ${filename}, scanning for viruses and saving to ${filePath}`);
      stream.pipe(av).pipe(outputFile);

      outputFile.on('error', (err) => {
        throw err;
      });

      outputFile.on('finish', () => {
        console.log(`File ${filename} finished.`);
        files.push(filename);
      });

      av.on('error', (err) => {
        throw err;
      });

      av.on('timeout', () => {
        throw new Error('Virus scan timed out');
      });

      av.on('scan-complete', (result) => {
        console.log(`Scan complete for file: ${filename}`, result);
        scanResults.push(result);
        res.json({ message: 'OK', files, scanResults });
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});
