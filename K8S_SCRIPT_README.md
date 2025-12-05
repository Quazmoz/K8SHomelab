# k8s.sh - Kubernetes Homelab Troubleshooting Script

A comprehensive bash script with 40+ functions for troubleshooting and managing a Kubernetes homelab setup.

## Location
`/workspaces/K8SHomelab/k8s.sh`

## Features

This script provides colored output functions and organized command groups for:

### Cluster Operations
- **check_cluster** - Verify cluster connectivity
- **show_nodes** - List all cluster nodes
- **show_node_resources** - Display node resource usage
- **show_kubeconfig** - Show current context
- **check_api_health** - Check API server health
- **check_addons** - Check addon status
- **check_certificates** - Check certificate expiration (requires kubeadm)
- **debug_node `<node-name>`** - Get detailed node information

### Namespace & Pod Operations
- **list_namespaces** - List all namespaces
- **show_all_resources `<namespace>`** - Show all resources in namespace
- **show_pods `<namespace>`** - List pods
- **show_pod_resources `<namespace>`** - Show pod resource usage
- **show_pod_events `<namespace>`** - Show recent pod events
- **describe_pod `<namespace> <pod-name>`** - Get detailed pod information
- **show_pod_logs `<namespace> <pod-name> [container]`** - View logs
- **exec_pod `<namespace> <pod-name> [container] <command>`** - Execute command in pod
- **port_forward `<namespace> <pod-name> <local-port> <remote-port>`** - Port forward

### Deployment Management
- **show_deployments `<namespace>`** - List deployments
- **show_statefulsets `<namespace>`** - List statefulsets
- **show_daemonsets `<namespace>`** - List daemonsets

### Networking
- **show_services `<namespace>`** - List services
- **show_ingresses `<namespace>`** - List ingresses
- **show_network_policies `<namespace>`** - List network policies
- **test_dns `<namespace> <dns-name>`** - Test DNS resolution

### Storage
- **show_pvs** - List persistent volumes
- **show_pvcs `<namespace>`** - List PVCs

### RBAC
- **show_roles `<namespace>`** - List roles
- **show_rolebindings `<namespace>`** - List role bindings
- **show_clusterroles** - List cluster roles
- **show_clusterrolebindings** - List cluster role bindings
- **show_resource_quotas `<namespace>`** - Show resource quotas

### Kustomize Operations
- **apply_kustomize `<path>`** - Apply kustomization
- **dry_run_kustomize `<path>`** - Dry-run kustomization
- **get_resource_yaml `<type> <name> [namespace]`** - Get resource YAML

### General Operations
- **watch_resource `<type> [namespace]`** - Watch resource changes
- **delete_resource `<type> <name> [namespace]`** - Delete resource
- **show_help** - Display help message

## Usage Examples

```bash
# Show help
./k8s.sh show_help
./k8s.sh help
./k8s.sh -h

# Check cluster health
./k8s.sh check_cluster
./k8s.sh show_nodes
./k8s.sh show_node_resources

# Work with pods in default namespace
./k8s.sh show_pods default
./k8s.sh describe_pod default my-pod
./k8s.sh show_pod_logs default my-pod
./k8s.sh show_pod_logs default my-pod my-container

# Execute commands in pods
./k8s.sh exec_pod default my-pod sh
./k8s.sh exec_pod default my-pod my-container bash

# Port forwarding
./k8s.sh port_forward default my-pod 8080 8000
./k8s.sh port_forward zionup-production svc/backend 8000 8000

# Test DNS
./k8s.sh test_dns default postgres.default.svc.cluster.local
./k8s.sh test_dns zionup-production postgres.zionup-production.svc.cluster.local

# View services and ingresses
./k8s.sh show_services default
./k8s.sh show_ingresses zionup-production

# Kustomize operations
./k8s.sh apply_kustomize ./apps/base/
./k8s.sh dry_run_kustomize ./apps/base/zionup
./k8s.sh get_resource_yaml deployment backend zionup-production

# Watch resources
./k8s.sh watch_resource pods default
./k8s.sh watch_resource deployments zionup-production

# RBAC checks
./k8s.sh show_roles default
./k8s.sh show_roles zionup-production
./k8s.sh show_clusterroles

# Storage checks
./k8s.sh show_pvs
./k8s.sh show_pvcs zionup-production
```

## Features

✓ **Colored Output** - Easy-to-read colored messages (success, error, warning, header)
✓ **Comprehensive** - 40+ troubleshooting functions
✓ **Error Handling** - Validates inputs and provides helpful error messages
✓ **Help System** - Built-in help and usage examples
✓ **Flexible** - Works with any namespace and resource type
✓ **Homelab Friendly** - Optimized for self-hosted Kubernetes

## Installation

The script is already executable at the repository root. Use it directly:

```bash
cd /workspaces/K8SHomelab
./k8s.sh show_help
```

Or add to your PATH for system-wide access:

```bash
cp k8s.sh /usr/local/bin/k8s-homelab
chmod +x /usr/local/bin/k8s-homelab
k8s-homelab show_help
```

## Tips

1. **Default namespace**: Most commands default to `default` namespace if not specified
2. **Namespace required**: Always specify the namespace for pod operations
3. **Interactive logs**: `show_pod_logs` uses `-f` for streaming logs
4. **Probes**: The script checks for metrics-server availability before showing resource usage
5. **RBAC checks**: Filter out system resources for cleaner output

## Requirements

- `kubectl` - Kubernetes command-line tool
- `bash` - Bash shell
- Access to Kubernetes cluster (valid kubeconfig)
- Optional: `kubeadm` for certificate checking

## License

Part of K8SHomelab repository
