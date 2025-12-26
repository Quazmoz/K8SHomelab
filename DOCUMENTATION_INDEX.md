# Quick Links to Critical Documentation

## 🚨 Environment Variables & Setup

Your Flux build was failing due to a duplicate Service definition in Azure MCP. **This is now fixed!** All environment setup procedures are now fully documented.

### Start Here

📖 **[ENVIRONMENT_SETUP_INDEX.md](ENVIRONMENT_SETUP_INDEX.md)** - Master navigation for all setup documentation

### 5-Minute Quick Start

🚀 **[AZURE_MCP_QUICK_START.md](AZURE_MCP_QUICK_START.md)** - Fastest way to get Azure MCP running

### Complete Guides

- 📚 **[AZURE_MCP_ENV_SETUP.md](AZURE_MCP_ENV_SETUP.md)** - Detailed Azure setup with troubleshooting
- 📋 **[ENV_VARS_REFERENCE.md](ENV_VARS_REFERENCE.md)** - All 30+ environment variables
- 🔄 **[FLUX_JENKINS_INTEGRATION.md](FLUX_JENKINS_INTEGRATION.md)** - Flux + Jenkins workflow
- ✨ **[SETUP_COMPLETE.md](SETUP_COMPLETE.md)** - Complete summary of everything

## ✅ What Was Fixed

**Problem:** Flux kustomization build failing due to duplicate Service in MCP servers  
**Solution:** Removed embedded Service from `azure-mcp-deployment.yaml`  
**Status:** ✅ Fixed - kustomize build now succeeds

See [FLUX_BUILD_FIX.md](FLUX_BUILD_FIX.md) for technical details.

## 🔐 Security First

All sensitive information is managed securely:

- ✅ Template files (`.template`) checked into Git with placeholders
- ❌ Actual secret files excluded from Git via `.gitignore`
- 🔒 All procedures use `kubectl create secret` to manage credentials locally

No credentials are stored in the repository.

## 🎯 Your Next Steps

1. Read [ENVIRONMENT_SETUP_INDEX.md](ENVIRONMENT_SETUP_INDEX.md)
2. Follow [AZURE_MCP_QUICK_START.md](AZURE_MCP_QUICK_START.md) (5 minutes)
3. Create Azure service principal and Kubernetes secret
4. Wait for Flux sync (Jenkins jobs will auto-load)
5. Add GitHub credentials to Jenkins for GitHub push triggers

---

**Status:** ✅ Ready to Setup  
**Last Updated:** 2025-12-26

---

## 🌐 Networking

- 📡 **[docs/NETWORK.md](docs/NETWORK.md)** - Network architecture overview
- 🔧 **[docs/NETWORK_TROUBLESHOOTING.md](docs/NETWORK_TROUBLESHOOTING.md)** - Common issues and fixes

## 🤖 AI Agent Resources

- 🧠 **[AGENT_CONTEXT.md](AGENT_CONTEXT.md)** - Context document for AI agents working in this repo
