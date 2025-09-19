/**
 * Get a random available port for testing
 */

import { createServer } from 'http';

/**
 * Find an available port by trying to create a server
 */
export async function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;

      server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve(port);
        }
      });
    });

    server.on('error', reject);
  });
}

/**
 * Create and start a test server on an available port
 */
export async function createTestServer(
  handler: (req: any, res: any) => void
): Promise<{ server: any; port: number; url: string }> {
  const server = createServer(handler);

  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;

      resolve({
        server,
        port,
        url: `http://localhost:${port}`
      });
    });

    server.on('error', reject);
  });
}

/**
 * Close a test server gracefully
 */
export async function closeTestServer(server: any): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }

    server.close((err: any) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}