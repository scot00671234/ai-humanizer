# Deployment (Dokploy + Nixpacks)

## Node version

- The app is pinned to **Node 20** (`.nvmrc`, `package.json` engines, `nixpacks.toml`).
- Nixpacks is explicitly configured to use `nodejs_20` so it never pulls the nodejs_22 nixpkgs archive (which can fail with "writing a blob" / "pack entry" on constrained build servers).

## If the build still shows `nodejs_22` or fails on Nix

1. **Clear the build cache** in Dokploy (or run `docker builder prune -af` on the host) so the plan is re-generated from the repo and old nodejs_22 layers are dropped.
2. **Ensure no env override:** In Dokploy, do not set `NIXPACKS_NODE_VERSION=22` (or set it to `20` if you need to override).

## ENOSPC: "no space left on device" during `npm install`

This means the **Docker build environment has run out of disk**. The app cannot fix this from code; the host must have enough free space.

1. **Free disk on the build server** – Remove old images/containers:  
   `docker system prune -af` and/or `docker builder prune -af`.
2. **Increase build disk** – In Dokploy (or your host), give the build more disk or use a larger volume.
3. **Disable or clear the npm cache mount** – If the builder mounts `/root/.npm`, that plus `node_modules` can exceed available space. Clearing the Docker build cache (step 1) often frees enough for one successful build.
4. **`.dockerignore`** – The repo includes a `.dockerignore` so the build context omits `node_modules`, `.git`, `docs`, and tests to keep the image smaller.
