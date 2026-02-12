# 🔐 Security & Authentication

This document outlines how secrets are managed and how authentication is handled in the K8S Homelab.

## 1. Secret Management (SOPS)

We use [SOPS](https://github.com/getsops/sops) (Secret Operations) with **Age** encryption to manage Kubernetes secrets. This allows us to store encrypted secrets safely in Git, which Flux CD decrypts automatically inside the cluster.

### 🛠️ Prerequisites
- **SOPS**: Installed via `go install github.com/getsops/sops/v3/cmd/sops@latest` (or `winget`).
- **Age**: Installed via `winget install FiloSottile.age`.

### 🔑 Key Management
- **Public Key**: `age1lcl4x9eckuj7skyjq26h4e70dl2qvjec3saerxzunp8z7r28e3qsd0c8d9`
  - Safe to share. Located in `.sops.yaml` in the repo root.
- **Private Key**: 
  - **Local**: User's machine at `%APPDATA%\sops\age\keys.txt` (Windows) or `~/.config/sops/age/keys.txt` (Linux/Mac).
  - **Cluster**: Stored in `flux-system` namespace as `sops-age` secret.

### 📝 Workflow
#### Encrypting a New Secret
1. Create a Kubernetes Secret manifest (e.g., `my-secret.yaml`).
2. Rename it to match the SOPS regex (must contain `.secret.yaml`, `.creds.yaml`, or `.enc.yaml`), e.g., `my-secret.enc.yaml`.
3. Encrypt it in-place:
   ```powershell
   sops -e -i my-secret.enc.yaml
   ```
4. Verify it contains `sops:` metadata section.
5. Commit and push.

#### Editing an Encrypted Secret
To edit a secret that is already encrypted:
```powershell
sops apps/base/path/to/secret.enc.yaml
```
This opens the decrypted file in your default editor. Upon saving, it is re-encrypted automatically.

#### Troubleshooting
- **MAC Error**: Ensure your private key is in the correct location (`%APPDATA%\sops\age\keys.txt`).
- **No Matching Rules**: Ensure the filename matches `.sops.yaml` regex (e.g. ends in `.enc.yaml`).

## 2. Authentication

### 🛡️ Application Authentication
- **Postgres**: Credentials are stored in `postgres-credentials` secret (managed via SOPS). Apps connect using `POSTGRES_USER` and `POSTGRES_PASSWORD` env vars populated from this secret.
- **Service Accounts**: Access restricted via RBAC.
- **User Access**: 
  - **Ingress**: Exposed services may be protected by `Authentik` (SSO) or basic auth (configured per Ingress).
  - **SSH**: Key-based authentication for node access.

### 🕸️ Automated Auth
- **Flux**: Authenticates to Git using a Deploy Key or Token (stored in `flux-system`).
- **MCP Servers**: Authenticate using tokens or mTLS as configured in their manifests.
