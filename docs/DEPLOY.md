# Deployment (Dokploy + Nixpacks)

## Node version

- The app is pinned to **Node 20** (`.nvmrc`, `package.json` engines, `nixpacks.toml`).
- Nixpacks is explicitly configured to use `nodejs_20` so it never pulls the nodejs_22 nixpkgs archive (which can fail with "writing a blob" / "pack entry" on constrained build servers).

## If the build still shows `nodejs_22` or fails on Nix

1. **Clear the build cache** in Dokploy (or run `docker builder prune -af` on the host) so the plan is re-generated from the repo and old nodejs_22 layers are dropped.
2. **Ensure no env override:** In Dokploy, do not set `NIXPACKS_NODE_VERSION=22` (or set it to `20` if you need to override).
3. **Disk space:** If you see `ENOSPC` or "no space left on device", free disk on the build server or increase the build volume.
