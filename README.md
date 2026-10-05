# glmps.upleb.uk

> Public Nostr discography — releases as kind:31237 events.

**Live**: <https://glmps.upleb.uk>

## Stack

- [Vite](https://vitejs.dev/) + React 18 + TypeScript
- Tailwind CSS
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools)
- lucide-react

## Nostr

- **Login**: NIP-07 (browser extension) + NIP-55 (Amber callback URI)
- `kind:31237` — release event
- `kind:7` — reactions
- `kind:0` — profile lookup

Owner = `nurture@fizx.uk` (`OWNER_NPUB` in `src/config.ts`). Owner-only publish; any signed-in user can react. **nginx vhost needs SPA fallback** for `/r/<naddr>` deep links.

## Develop

```bash
npm install
npm run dev
```

## Build + deploy

```bash
./deploy.sh
```

Builds, then rsyncs `dist/` to the webroot. The script names the server by an
SSH host alias (`upleb.uk` in `~/.ssh/config`), which carries the user, port and
key.

> nginx vhost for this site uses an SPA fallback:
> `location / { try_files $uri $uri/ /index.html; }`
> so client-side routes resolve.

Server addresses and the nginx / SSL / DNS notes for the wider deployment live in the local `code_gh/macos-node/CLAUDE.md` (not pushed; this README is the public-facing summary).

---

_Sister repo on the other side: <https://github.com/adjmx/glmps.fizx.uk>_
