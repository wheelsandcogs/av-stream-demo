import express, { Request, Response } from 'express';
import proxy from 'express-http-proxy';

const app = express();
const port = 3000;

const pageTemplate = `
  <h2>File Upload</h2>
  <form action="/" method="post" enctype="multipart/form-data">
    <input type="file" name="file" required />
    <button type="submit">Upload</button>
  </form>
`;

app.use();

app.get('/', (req: Request, res: Response) => {
  console.log('Rendering upload form...');
  res.send(pageTemplate);
});

// Proxy file upload requests directly to the backend server as a stream
// This avoids the file being stored or loaded into memory on the frontend server
app.post('/', proxy('http://localhost:3001'));

app.listen(port, () => {
  console.log(`Frontend running at http://localhost:${port}`);
});
