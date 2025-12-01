/**
 * EvidenTrace - Main Entry Point
 * 
 * Digital Evidence Capture System
 * Local-only web application for capturing and preserving web evidence
 * with cryptographic integrity and OpenTimestamps proofs.
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Enable CORS for local development (localhost only)
  app.enableCors({
    origin: [
      'http://localhost:5173',  // Vite dev server
      'http://localhost:3000',  // Same as backend
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  });
  
  const port = process.env.PORT ?? 3000;
  
  // Bind to localhost only for security
  await app.listen(port, '127.0.0.1');
  
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   ███████╗██╗   ██╗██╗██████╗ ███████╗███╗   ██╗████████╗██████╗ ║
║   ██╔════╝██║   ██║██║██╔══██╗██╔════╝████╗  ██║╚══██╔══╝██╔══██╗║
║   █████╗  ██║   ██║██║██║  ██║█████╗  ██╔██╗ ██║   ██║   ██████╔╝║
║   ██╔══╝  ╚██╗ ██╔╝██║██║  ██║██╔══╝  ██║╚██╗██║   ██║   ██╔══██╗║
║   ███████╗ ╚████╔╝ ██║██████╔╝███████╗██║ ╚████║   ██║   ██║  ██║║
║   ╚══════╝  ╚═══╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝║
║                                                                  ║
║   Digital Evidence Capture System                                ║
║   Version 1.0.0                                                  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝

🔒 Server running at http://127.0.0.1:${port}
📁 Evidence storage: ./evidence

API Endpoints:
  POST /api/capture           - Capture evidence from a URL
  GET  /api/evidence          - List all acquisitions
  GET  /api/evidence/:id/manifest - Get acquisition manifest
  GET  /api/evidence/:id/files/:name - Download artifact
  POST /api/verify/hashes     - Verify file hashes
  POST /api/verify/ots        - Verify timestamp proof

⚠️  This is a local tool. Do not expose to the internet.
`);
}

bootstrap();
