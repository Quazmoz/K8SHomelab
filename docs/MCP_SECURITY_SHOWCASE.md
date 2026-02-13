# 🎥 YouTube Video Outline: "Enterprise-Grade AI Security in a Homelab"

## 🎯 video Concept
A technical deep-dive into how we secured a Model Context Protocol (MCP) server environment using Kubernetes, SOPS, and Authentik, satisfying strict enterprise security standards on a Raspberry Pi cluster.

## 📝 Outline

### 0:00 - Intro: The Problem
*   **Hook**: "Everyone is running AI agents, but are they secure? What if your agent leaks your DB password?"
*   **Context**: We have a K8s Homelab running OpenWebUI + Context Forge (MCP).
*   **The Standard**: Briefly show the "Reyes Holdings MCP Security Standard" (Least Privilege, Identity, Data Protection, Audit).
*   **Challenge**: Meeting these enterprise requirements on bare metal.

### 2:00 - Part 1: Identity & Authentication (The Front Door)
*   **Concept**: Zero Trust. No one talks to the API without a badge.
*   **Implementation**: 
    *   Show **Authentik** running in K8s.
    *   Show `mcpo/ingress.yaml` with Nginx Annotations.
    *   **Demo**: Try to curl `mcpo.k8s.local` -> 302 Redirect -> Authentik Login -> Success.
*   **Standard Fulfilled**: §2a (Managed Identities/Auth), §4c (Access Logging).

### 5:00 - Part 2: Data Protection (Secrets Management)
*   **Concept**: Stop committing passwords to Git!
*   **Implementation**:
    *   Show `authentik-secrets.yaml` (Base64 encoded but plain in Cluster).
    *   **The Fix**: **SOPS + Age**. 
    *   Show `mcpo-config.secret.enc.yaml`. It's encrypted!
    *   Explain how Flux decrypts it inside the cluster using the Private Key.
*   **Standard Fulfilled**: §3c (Secrets never provided to AI model directly).

### 8:00 - Part 3: Least Privilege (RBAC)
*   **Concept**: If the specific Agent is compromised, what can it do?
*   **Implementation**:
    *   Show `mcpo-rbac.yaml`.
    *   Highlight: `verbs: ["get", "list"]` (Read Only).
    *   Highlight: **NO** `secrets` access. The Agent can find Pods, but can't steal API Keys.
*   **Standard Fulfilled**: §1a (Least Privilege), §1b (Separation of Duties).

### 10:00 - Part 4: Audit & Accountability (The "Black Box" Recorder)
*   **Concept**: Trust but Verify.
*   **Implementation**:
    *   Show **Grafana Dashboard** (`mcp-security-audit`).
    *   **Panel 1**: "MCP Tool Invocations" (Did the agent try to delete the DB?).
    *   **Panel 2**: "Anomalous Volume" (Is the agent looping?).
    *   **Panel 3**: "Pod Restarts" (Is the agent crashing?).
*   **Standard Fulfilled**: §4a (Logging), §4c (Anomaly Detection), §7c (Failsafes).

### 12:00 - Conclusion
*   **Summary**: We built a compliant AI platform on a Pi.
*   **Call to Action**: "Don't run raw Docker containers for Agents. Use Orchestration and Security Layers."

---

## 🛠️ Configuration Details mentioned in Video

### Authentik Ingress Annotation
```yaml
nginx.ingress.kubernetes.io/auth-url: "http://authentik.apps.svc.cluster.local:9000/..."
```

### SOPS Command
```bash
sops -e -i mcpo-config.secret.enc.yaml
```

### RBAC Rule
```yaml
- apiGroups: [""]
  resources: ["secrets"]
  verbs: [] # DENIED
```
