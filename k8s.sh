#!/bin/bash

# Kubernetes Homelab Troubleshooting Script
# Common commands for diagnosing and troubleshooting a homelab K8s setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function to print colored output
print_header() {
    echo -e "${BLUE}==== $1 ====${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to check cluster connectivity
check_cluster() {
    print_header "Checking Cluster Connectivity"
    if kubectl cluster-info &> /dev/null; then
        print_success "Cluster is accessible"
        kubectl cluster-info
    else
        print_error "Cannot connect to cluster"
        return 1
    fi
}

# Function to show cluster nodes
show_nodes() {
    print_header "Cluster Nodes"
    kubectl get nodes -o wide
}

# Function to show node resource usage
show_node_resources() {
    print_header "Node Resource Usage"
    kubectl top nodes --no-headers 2>/dev/null || print_warning "Metrics server not available"
}

# Function to list all namespaces
list_namespaces() {
    print_header "Namespaces"
    kubectl get namespaces
}

# Function to get pods in a namespace
show_pods() {
    local namespace=${1:-default}
    print_header "Pods in namespace: $namespace"
    kubectl get pods -n "$namespace" -o wide
}

# Function to show pod logs
show_pod_logs() {
    local namespace=${1:-default}
    local pod=${2}
    local containers=${3}
    
    if [ -z "$pod" ]; then
        print_error "Usage: show_pod_logs <namespace> <pod-name> [container-name]"
        return 1
    fi
    
    print_header "Logs for pod: $pod (namespace: $namespace)"
    if [ -n "$containers" ]; then
        kubectl logs -n "$namespace" "$pod" -c "$containers" -f
    else
        kubectl logs -n "$namespace" "$pod" -f
    fi
}

# Function to describe pod
describe_pod() {
    local namespace=${1:-default}
    local pod=${2}
    
    if [ -z "$pod" ]; then
        print_error "Usage: describe_pod <namespace> <pod-name>"
        return 1
    fi
    
    print_header "Pod details: $pod (namespace: $namespace)"
    kubectl describe pod -n "$namespace" "$pod"
}

# Function to show pod resource usage
show_pod_resources() {
    local namespace=${1:-default}
    print_header "Pod Resource Usage in namespace: $namespace"
    kubectl top pods -n "$namespace" --no-headers 2>/dev/null || print_warning "Metrics server not available"
}

# Function to check pod events
show_pod_events() {
    local namespace=${1:-default}
    print_header "Recent Pod Events in namespace: $namespace"
    kubectl get events -n "$namespace" --sort-by='.lastTimestamp'
}

# Function to show services
show_services() {
    local namespace=${1:-default}
    print_header "Services in namespace: $namespace"
    kubectl get svc -n "$namespace" -o wide
}

# Function to show ingresses
show_ingresses() {
    local namespace=${1:-default}
    print_header "Ingresses in namespace: $namespace"
    kubectl get ingress -n "$namespace" -o wide
}

# Function to show persistent volumes
show_pvs() {
    print_header "Persistent Volumes"
    kubectl get pv
}

# Function to show persistent volume claims
show_pvcs() {
    local namespace=${1:-default}
    print_header "Persistent Volume Claims in namespace: $namespace"
    kubectl get pvc -n "$namespace" -o wide
}

# Function to show deployments
show_deployments() {
    local namespace=${1:-default}
    print_header "Deployments in namespace: $namespace"
    kubectl get deployments -n "$namespace" -o wide
}

# Function to show statefulsets
show_statefulsets() {
    local namespace=${1:-default}
    print_header "StatefulSets in namespace: $namespace"
    kubectl get statefulsets -n "$namespace" -o wide
}

# Function to show daemonsets
show_daemonsets() {
    local namespace=${1:-default}
    print_header "DaemonSets in namespace: $namespace"
    kubectl get daemonsets -n "$namespace" -o wide
}

# Function to test DNS
test_dns() {
    local namespace=${1:-default}
    local dns_name=${2}
    
    if [ -z "$dns_name" ]; then
        print_error "Usage: test_dns <namespace> <dns-name>"
        return 1
    fi
    
    print_header "Testing DNS: $dns_name (namespace: $namespace)"
    kubectl run -n "$namespace" -it --rm debug --image=alpine --restart=Never -- sh -c "nslookup $dns_name"
}

# Function to execute command in pod
exec_pod() {
    local namespace=${1:-default}
    local pod=${2}
    local container=${3}
    shift 3
    local cmd=$@
    
    if [ -z "$pod" ] || [ -z "$cmd" ]; then
        print_error "Usage: exec_pod <namespace> <pod-name> [container-name] <command>"
        return 1
    fi
    
    if [ -n "$container" ]; then
        kubectl exec -it -n "$namespace" "$pod" -c "$container" -- $cmd
    else
        kubectl exec -it -n "$namespace" "$pod" -- $cmd
    fi
}

# Function to port forward
port_forward() {
    local namespace=${1:-default}
    local pod=${2}
    local local_port=${3}
    local remote_port=${4}
    
    if [ -z "$pod" ] || [ -z "$local_port" ] || [ -z "$remote_port" ]; then
        print_error "Usage: port_forward <namespace> <pod-name> <local-port> <remote-port>"
        return 1
    fi
    
    print_header "Port forwarding: localhost:$local_port -> $pod:$remote_port"
    kubectl port-forward -n "$namespace" "$pod" "$local_port:$remote_port"
}

# Function to check resource quotas
show_resource_quotas() {
    local namespace=${1:-default}
    print_header "Resource Quotas in namespace: $namespace"
    kubectl get resourcequota -n "$namespace" -o wide
}

# Function to show network policies
show_network_policies() {
    local namespace=${1:-default}
    print_header "Network Policies in namespace: $namespace"
    kubectl get networkpolicies -n "$namespace"
}

# Function to check RBAC
show_roles() {
    local namespace=${1:-default}
    print_header "Roles in namespace: $namespace"
    kubectl get roles -n "$namespace"
}

show_rolebindings() {
    local namespace=${1:-default}
    print_header "RoleBindings in namespace: $namespace"
    kubectl get rolebindings -n "$namespace"
}

# Function to check cluster RBAC
show_clusterroles() {
    print_header "Cluster Roles"
    kubectl get clusterroles | grep -v '^system\|^kubeadm\|^kubelets'
}

show_clusterrolebindings() {
    print_header "Cluster RoleBindings"
    kubectl get clusterrolebindings | grep -v '^system\|^kubeadm\|^kubelets'
}

# Function to get kubeconfig info
show_kubeconfig() {
    print_header "Current Kubeconfig Context"
    kubectl config current-context
    print_header "Kubeconfig Clusters"
    kubectl config get-clusters
}

# Function to check API server health
check_api_health() {
    print_header "API Server Health"
    if kubectl get --raw /healthz &>/dev/null; then
        print_success "API Server is healthy"
    else
        print_error "API Server health check failed"
    fi
}

# Function to check addon status
check_addons() {
    print_header "Addon Status"
    kubectl get nodes
    kubectl get deployments --all-namespaces
}

# Function to show all resources in namespace
show_all_resources() {
    local namespace=${1:-default}
    print_header "All Resources in namespace: $namespace"
    kubectl get all -n "$namespace" -o wide
}

# Function to apply kustomization
apply_kustomize() {
    local path=${1}
    
    if [ -z "$path" ]; then
        print_error "Usage: apply_kustomize <path-to-kustomization>"
        return 1
    fi
    
    if [ ! -f "$path/kustomization.yaml" ]; then
        print_error "No kustomization.yaml found at $path"
        return 1
    fi
    
    print_header "Applying kustomization from: $path"
    kubectl apply -k "$path"
}

# Function to dry-run kustomization
dry_run_kustomize() {
    local path=${1}
    
    if [ -z "$path" ]; then
        print_error "Usage: dry_run_kustomize <path-to-kustomization>"
        return 1
    fi
    
    if [ ! -f "$path/kustomization.yaml" ]; then
        print_error "No kustomization.yaml found at $path"
        return 1
    fi
    
    print_header "Dry-run kustomization from: $path"
    kubectl apply -k "$path" --dry-run=client -o yaml
}

# Function to get resource YAML
get_resource_yaml() {
    local resource=${1}
    local name=${2}
    local namespace=${3:-default}
    
    if [ -z "$resource" ] || [ -z "$name" ]; then
        print_error "Usage: get_resource_yaml <resource-type> <resource-name> [namespace]"
        return 1
    fi
    
    print_header "YAML for $resource: $name (namespace: $namespace)"
    kubectl get "$resource" "$name" -n "$namespace" -o yaml
}

# Function to delete resource
delete_resource() {
    local resource=${1}
    local name=${2}
    local namespace=${3:-default}
    
    if [ -z "$resource" ] || [ -z "$name" ]; then
        print_error "Usage: delete_resource <resource-type> <resource-name> [namespace]"
        return 1
    fi
    
    print_warning "Deleting $resource: $name (namespace: $namespace)"
    kubectl delete "$resource" "$name" -n "$namespace"
}

# Function to watch resource
watch_resource() {
    local resource=${1}
    local namespace=${2:-default}
    
    if [ -z "$resource" ]; then
        print_error "Usage: watch_resource <resource-type> [namespace]"
        return 1
    fi
    
    print_header "Watching $resource in namespace: $namespace"
    kubectl get "$resource" -n "$namespace" -w
}

# Function to debug node
debug_node() {
    local node=${1}
    
    if [ -z "$node" ]; then
        print_error "Usage: debug_node <node-name>"
        return 1
    fi
    
    print_header "Debug information for node: $node"
    kubectl describe node "$node"
}

# Function to check certificates
check_certificates() {
    print_header "Certificate Check"
    print_warning "This function checks API server certificates - requires kubeadm"
    if command -v kubeadm &> /dev/null; then
        kubeadm certs check-expiration
    else
        print_warning "kubeadm not found on this system"
    fi
}

# Function to show help
show_help() {
    cat << 'EOF'
Kubernetes Homelab Troubleshooting Script

CLUSTER OPERATIONS:
  check_cluster              - Check cluster connectivity
  show_nodes                 - List all nodes
  show_node_resources        - Show node resource usage
  show_kubeconfig            - Show current kubeconfig context
  check_api_health           - Check API server health
  check_addons               - Check addon status
  check_certificates         - Check certificate expiration
  debug_node <node-name>     - Get detailed node information

NAMESPACE OPERATIONS:
  list_namespaces            - List all namespaces
  show_all_resources <ns>    - Show all resources in namespace

POD OPERATIONS:
  show_pods <ns>             - List pods in namespace
  show_pod_resources <ns>    - Show pod resource usage
  show_pod_events <ns>       - Show recent pod events
  describe_pod <ns> <pod>    - Get detailed pod information
  show_pod_logs <ns> <pod> [container]  - Show pod logs (with optional container)
  exec_pod <ns> <pod> [container] <cmd> - Execute command in pod
  port_forward <ns> <pod> <local-port> <remote-port> - Port forward to pod

DEPLOYMENT OPERATIONS:
  show_deployments <ns>      - List deployments
  show_statefulsets <ns>     - List statefulsets
  show_daemonsets <ns>       - List daemonsets

NETWORKING:
  show_services <ns>         - List services in namespace
  show_ingresses <ns>        - List ingresses in namespace
  show_network_policies <ns> - List network policies
  test_dns <ns> <dns-name>   - Test DNS resolution

STORAGE:
  show_pvs                   - List persistent volumes
  show_pvcs <ns>             - List PVCs in namespace

RBAC:
  show_roles <ns>            - List roles in namespace
  show_rolebindings <ns>     - List role bindings in namespace
  show_clusterroles          - List cluster roles
  show_clusterrolebindings   - List cluster role bindings
  show_resource_quotas <ns>  - Show resource quotas

KUSTOMIZE OPERATIONS:
  apply_kustomize <path>     - Apply kustomization
  dry_run_kustomize <path>   - Dry-run kustomization
  get_resource_yaml <type> <name> [ns] - Get resource YAML

GENERAL OPERATIONS:
  watch_resource <type> [ns] - Watch resource changes
  delete_resource <type> <name> [ns] - Delete resource
  show_help                  - Show this help message

EXAMPLES:
  show_pods default
  describe_pod default my-pod
  show_pod_logs default my-pod
  show_pod_logs default my-pod my-container
  exec_pod default my-pod sh
  port_forward default my-pod 8080 8000
  test_dns default postgres.default.svc.cluster.local
  apply_kustomize ./apps/base/
  dry_run_kustomize ./apps/base/n8n

EOF
}

# Main script logic
case "${1}" in
    check_cluster)
        check_cluster
        ;;
    show_nodes)
        show_nodes
        ;;
    show_node_resources)
        show_node_resources
        ;;
    list_namespaces)
        list_namespaces
        ;;
    show_pods)
        show_pods "${2}"
        ;;
    show_pod_logs)
        show_pod_logs "${2}" "${3}" "${4}"
        ;;
    describe_pod)
        describe_pod "${2}" "${3}"
        ;;
    show_pod_resources)
        show_pod_resources "${2}"
        ;;
    show_pod_events)
        show_pod_events "${2}"
        ;;
    show_services)
        show_services "${2}"
        ;;
    show_ingresses)
        show_ingresses "${2}"
        ;;
    show_pvs)
        show_pvs
        ;;
    show_pvcs)
        show_pvcs "${2}"
        ;;
    show_deployments)
        show_deployments "${2}"
        ;;
    show_statefulsets)
        show_statefulsets "${2}"
        ;;
    show_daemonsets)
        show_daemonsets "${2}"
        ;;
    test_dns)
        test_dns "${2}" "${3}"
        ;;
    exec_pod)
        shift
        exec_pod "${@}"
        ;;
    port_forward)
        port_forward "${2}" "${3}" "${4}" "${5}"
        ;;
    show_resource_quotas)
        show_resource_quotas "${2}"
        ;;
    show_network_policies)
        show_network_policies "${2}"
        ;;
    show_roles)
        show_roles "${2}"
        ;;
    show_rolebindings)
        show_rolebindings "${2}"
        ;;
    show_clusterroles)
        show_clusterroles
        ;;
    show_clusterrolebindings)
        show_clusterrolebindings
        ;;
    show_kubeconfig)
        show_kubeconfig
        ;;
    check_api_health)
        check_api_health
        ;;
    check_addons)
        check_addons
        ;;
    show_all_resources)
        show_all_resources "${2}"
        ;;
    apply_kustomize)
        apply_kustomize "${2}"
        ;;
    dry_run_kustomize)
        dry_run_kustomize "${2}"
        ;;
    get_resource_yaml)
        get_resource_yaml "${2}" "${3}" "${4}"
        ;;
    delete_resource)
        delete_resource "${2}" "${3}" "${4}"
        ;;
    watch_resource)
        watch_resource "${2}" "${3}"
        ;;
    debug_node)
        debug_node "${2}"
        ;;
    check_certificates)
        check_certificates
        ;;
    show_help|help|-h|--help)
        show_help
        ;;
    *)
        if [ $# -eq 0 ]; then
            show_help
        else
            print_error "Unknown command: $1"
            show_help
            exit 1
        fi
        ;;
esac
