import type { Plugin } from 'vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parse as parseJsonc, type ParseError } from 'jsonc-parser';

interface Options {
  themesDir: string;
  uprightDir: string;
  metaFile: string;
  packageFile: string;
}

const FILENAME_RE = /^[A-Za-z0-9._-]+\.json$/;

async function readBody(req: { [Symbol.asyncIterator](): AsyncIterator<Buffer> }): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

export function themesApiPlugin({
  themesDir,
  uprightDir,
  metaFile,
  packageFile,
}: Options): Plugin {
  const dirByName: Record<string, string> = {
    default: themesDir,
    upright: uprightDir,
  };

  return {
    name: 'paddy-themes-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/')) return next();

        try {
          // /api/meta — manifest of classic vs procedural themes
          if (url === '/api/meta' || url === '/api/meta/') {
            if (req.method === 'GET') {
              const raw = await fs.readFile(metaFile, 'utf8');
              res.setHeader('content-type', 'application/json');
              return res.end(raw);
            }
            if (req.method === 'POST' || req.method === 'PUT') {
              const body = await readBody(req);
              JSON.parse(body);
              await fs.writeFile(metaFile, body, 'utf8');
              res.statusCode = 204;
              return res.end();
            }
            res.statusCode = 405;
            return res.end();
          }

          // /api/package — root extension package.json (read/write)
          if (url === '/api/package' || url === '/api/package/') {
            if (req.method === 'GET') {
              const raw = await fs.readFile(packageFile, 'utf8');
              res.setHeader('content-type', 'application/json');
              return res.end(raw);
            }
            if (req.method === 'POST' || req.method === 'PUT') {
              const body = await readBody(req);
              JSON.parse(body);
              await fs.writeFile(packageFile, body, 'utf8');
              res.statusCode = 204;
              return res.end();
            }
            res.statusCode = 405;
            return res.end();
          }

          if (!url.startsWith('/api/themes')) return next();

          // /api/themes (listing — default dir only)
          const [pathPart, queryPart = ''] = url.split('?');
          const params = new URLSearchParams(queryPart);
          const dirName = params.get('dir') ?? 'default';
          const dir = dirByName[dirName];
          if (!dir) {
            res.statusCode = 400;
            return res.end(`Unknown dir: ${dirName}`);
          }

          if (pathPart === '/api/themes' || pathPart === '/api/themes/') {
            if (req.method !== 'GET') {
              res.statusCode = 405;
              return res.end();
            }
            const files = await fs.readdir(dir);
            const themes = files.filter((f) => f.endsWith('.json')).sort();
            res.setHeader('content-type', 'application/json');
            return res.end(JSON.stringify(themes));
          }

          const match = pathPart.match(/^\/api\/themes\/([^/?#]+)$/);
          if (!match) {
            res.statusCode = 400;
            return res.end('Invalid path');
          }
          const filename = decodeURIComponent(match[1]);
          if (!FILENAME_RE.test(filename)) {
            res.statusCode = 400;
            return res.end('Invalid filename');
          }
          const filepath = path.join(dir, filename);

          if (req.method === 'GET') {
            const raw = await fs.readFile(filepath, 'utf8');
            const errors: ParseError[] = [];
            const parsed = parseJsonc(raw, errors, { allowTrailingComma: true });
            if (errors.length) {
              server.config.logger.warn(
                `[themes-api] ${filename} has ${errors.length} JSONC parse issue(s)`
              );
            }
            res.setHeader('content-type', 'application/json');
            return res.end(JSON.stringify(parsed));
          }

          if (req.method === 'POST' || req.method === 'PUT') {
            const body = await readBody(req);
            JSON.parse(body);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(filepath, body, 'utf8');
            res.statusCode = 204;
            return res.end();
          }

          if (req.method === 'DELETE') {
            await fs.rm(filepath, { force: true });
            res.statusCode = 204;
            return res.end();
          }

          res.statusCode = 405;
          res.end();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          server.config.logger.error(`[themes-api] ${msg}`);
          res.statusCode = 500;
          res.end(msg);
        }
      });
    },
  };
}
