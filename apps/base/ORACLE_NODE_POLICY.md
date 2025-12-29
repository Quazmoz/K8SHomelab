# Oracle Node Exclusion Policy
# 
# Oracle VMs (oracle-wireguard, oracle-groupmebot) have networking issues:
# - WireGuard UDP doesn't work well with Kubernetes memberlist gossip
# - Pod-to-API-server connectivity is unreliable
#
# POLICY: Only DaemonSets (node-exporter, calico, kube-proxy) should run on Oracle nodes
#
# IMPLEMENTATION:
# 1. Taints (one-time setup - not managed by GitOps):
#    kubectl taint nodes oracle-wireguard node-role.kubernetes.io/oracle=:NoSchedule
#    kubectl taint nodes oracle-groupmebot node-role.kubernetes.io/oracle=:NoSchedule
#
# 2. Node Affinity patches in GitOps (see individual kustomization.yaml files):
#    - apps/base/metallb-system/kustomization.yaml - speaker DaemonSet
#    - apps/base/metrics-server/kustomization.yaml - metrics-server Deployment
#    - apps/base/ingress-nginx/kustomization.yaml - ingress controller Deployment
#
# The affinity pattern used:
#   affinity:
#     nodeAffinity:
#       requiredDuringSchedulingIgnoredDuringExecution:
#         nodeSelectorTerms:
#         - matchExpressions:
#           - key: kubernetes.io/hostname
#             operator: NotIn
#             values:
#             - oracle-wireguard
#             - oracle-groupmebot
