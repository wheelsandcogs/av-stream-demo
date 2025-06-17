# Streaming AntiVirus Scanning

This project demos uploading a file as a stream from a frontend client directly to a backend API, without creating a
buffer on the frontend.

The backend then takes the file stream and sends it to a clamav container to scan for viruses, while at the same time
saving the same stream to disk. The file is never fully buffered in memory and we do not need to wait for the full file
to be uploaded before scanning it.

## How to run:

terminal 1
```bash
docker compose up -d
npm run front
```

terminal 2
```bash
npm run back
```

Visit http://localhost:3000 and upload a file.
