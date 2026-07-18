#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'

SERVICE_NAME="heureka-service"
API_GATEWAY_NAME="heureka-api-gateway"
NAMESPACE="${NAMESPACE:-statex-apps}"
K8S_DIR="$PROJECT_ROOT/k8s"
REGISTRY="localhost:5000"
# Tag describes the WORKING TREE that is actually built, not just git HEAD:
# a tag derived from HEAD alone repeats itself when files changed without a
# commit, which makes `kubectl set image` a no-op and silently keeps the old
# image running.
compute_default_tag() {
  local head dirty root
  root="${PROJECT_ROOT:-$(pwd)}"
  head="$(git -C "$root" rev-parse --short HEAD 2>/dev/null || true)"
  if [ -z "$head" ]; then
    echo "build-$(date -u +%Y%m%d%H%M%S)"
    return
  fi
  dirty="$(git -C "$root" status --porcelain 2>/dev/null || true)"
  if [ -n "$dirty" ]; then
    echo "${head}-wt$(date -u +%Y%m%d%H%M%S)"
  else
    echo "$head"
  fi
}

DEFAULT_TAG="$(compute_default_tag)"
IMAGE_TAG="${1:-$DEFAULT_TAG}"
IMAGE="${REGISTRY}/${SERVICE_NAME}:${IMAGE_TAG}"
IMAGE_LATEST="${REGISTRY}/${SERVICE_NAME}:latest"
API_GATEWAY_IMAGE="${REGISTRY}/${API_GATEWAY_NAME}:${IMAGE_TAG}"
API_GATEWAY_IMAGE_LATEST="${REGISTRY}/${API_GATEWAY_NAME}:latest"

# shellcheck disable=SC1091
source "$(dirname "$PROJECT_ROOT")/shared/scripts/load-deploy-phase-timing.sh" "$PROJECT_ROOT" 2>/dev/null \
  || source "$HOME/Documents/Github/shared/scripts/load-deploy-phase-timing.sh" "$PROJECT_ROOT" \
  || { echo "Error: deploy timing library not found" >&2; exit 1; }
deploy_timing_init "$SERVICE_NAME"

preflight_service_health() {
  echo -e "${YELLOW}Preflight: checking Kubernetes and current service health...${NC}"

  if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
    echo -e "${RED}Namespace not found: $NAMESPACE${NC}"
    exit 1
  fi

  if ! kubectl get nodes >/dev/null 2>&1; then
    echo -e "${RED}kubectl cannot reach cluster${NC}"
    exit 1
  fi

  BAD_PODS=$(kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME" --no-headers 2>/dev/null | awk '$3 ~ /Error|CrashLoopBackOff|ImagePullBackOff|CreateContainerConfigError|CreateContainerError|ErrImagePull/ {print $1}')
  if [ -n "$BAD_PODS" ]; then
    echo -e "${RED}Service has unhealthy pods before deploy:${NC}"
    kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME" -o wide || true
    for pod in $BAD_PODS; do
      echo -e "${YELLOW}--- describe pod/$pod ---${NC}"
      kubectl describe pod -n "$NAMESPACE" "$pod" || true
      echo -e "${YELLOW}--- logs pod/$pod (tail 80) ---${NC}"
      kubectl logs -n "$NAMESPACE" "$pod" --tail=80 || true
    done
    echo -e "${RED}Fix service pod errors first, then redeploy.${NC}"
    exit 1
  fi

  GATEWAY_BAD_PODS=$(kubectl get pods -n "$NAMESPACE" -l app="$API_GATEWAY_NAME" --no-headers 2>/dev/null | awk '$3 ~ /Error|CrashLoopBackOff|ImagePullBackOff|CreateContainerConfigError|CreateContainerError|ErrImagePull/ {print $1}')
  if [ -n "$GATEWAY_BAD_PODS" ]; then
    echo -e "${YELLOW}Gateway has unhealthy pods before deploy; continuing so rollout can repair ${API_GATEWAY_NAME}.${NC}"
    kubectl get pods -n "$NAMESPACE" -l app="$API_GATEWAY_NAME" -o wide || true
  fi

  echo -e "${GREEN}Preflight passed${NC}"
}

echo -e "${BLUE}==========================================================${NC}"
echo -e "${BLUE}  Heureka Service - Kubernetes Deployment${NC}"
echo -e "${BLUE}==========================================================${NC}"

if [ ! -d "$K8S_DIR" ]; then
  echo -e "${RED}Missing k8s directory: $K8S_DIR${NC}"
  exit 1
fi

deploy_timing_run_phase "Preflight" preflight_service_health

deploy_timing_phase_start "Build image"
echo -e "${YELLOW}Building image ${IMAGE}...${NC}"
docker build -t "$IMAGE" -t "$IMAGE_LATEST" "$PROJECT_ROOT"
echo -e "${YELLOW}Building image ${API_GATEWAY_IMAGE}...${NC}"
docker build -f "$PROJECT_ROOT/services/api-gateway/Dockerfile" -t "$API_GATEWAY_IMAGE" -t "$API_GATEWAY_IMAGE_LATEST" "$PROJECT_ROOT"
deploy_timing_phase_end "Build image"

deploy_timing_phase_start "Push image"
echo -e "${YELLOW}Pushing image...${NC}"
docker push "$IMAGE"
docker push "$IMAGE_LATEST"
docker push "$API_GATEWAY_IMAGE"
docker push "$API_GATEWAY_IMAGE_LATEST"
deploy_timing_phase_end "Push image"

deploy_timing_phase_start "Apply Kubernetes manifests"
echo -e "${YELLOW}Applying Kubernetes manifests...${NC}"
RENDERED_DEPLOYMENT="$(mktemp)"
trap 'rm -f "$RENDERED_DEPLOYMENT"' EXIT

for manifest in configmap.yaml external-secret.yaml service.yaml api-gateway-service.yaml; do
  if [ -f "$K8S_DIR/$manifest" ]; then
    kubectl apply -f "$K8S_DIR/$manifest" -n "$NAMESPACE"
  fi
done

if [ -f "$K8S_DIR/deployment.yaml" ]; then
  sed -E "s#image: ${REGISTRY}/${SERVICE_NAME}:[^[:space:]]+#image: ${IMAGE}#" "$K8S_DIR/deployment.yaml" > "$RENDERED_DEPLOYMENT"
  kubectl apply -f "$RENDERED_DEPLOYMENT" -n "$NAMESPACE"
fi

if [ -f "$K8S_DIR/api-gateway-deployment.yaml" ]; then
  RENDERED_GATEWAY_DEPLOYMENT="$(mktemp)"
  trap 'rm -f "$RENDERED_DEPLOYMENT" "$RENDERED_GATEWAY_DEPLOYMENT"' EXIT
  sed -E "s#image: ${REGISTRY}/${API_GATEWAY_NAME}:[^[:space:]]+#image: ${API_GATEWAY_IMAGE}#" "$K8S_DIR/api-gateway-deployment.yaml" > "$RENDERED_GATEWAY_DEPLOYMENT"
  kubectl apply -f "$RENDERED_GATEWAY_DEPLOYMENT" -n "$NAMESPACE"
fi

if [ -f "$K8S_DIR/ingress.yaml" ]; then
  kubectl apply -f "$K8S_DIR/ingress.yaml" -n "$NAMESPACE"
fi
echo -e "${GREEN}OK Kubernetes manifests applied with images ${IMAGE} and ${API_GATEWAY_IMAGE}${NC}"
deploy_timing_phase_end "Apply Kubernetes manifests"

deploy_timing_phase_start "Rollout restart"
echo -e "${YELLOW}Triggering rollout with immutable image ${IMAGE}...${NC}"
kubectl set image "deployment/${SERVICE_NAME}" app="$IMAGE" -n "$NAMESPACE"
kubectl set image "deployment/${API_GATEWAY_NAME}" app="$API_GATEWAY_IMAGE" -n "$NAMESPACE"
kubectl annotate deployment/"$SERVICE_NAME" "deploy.heureka-service/image-tag=${IMAGE_TAG}" "deploy.heureka-service/restarted-at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" -n "$NAMESPACE" --overwrite
kubectl annotate deployment/"$API_GATEWAY_NAME" "deploy.heureka-service/image-tag=${IMAGE_TAG}" "deploy.heureka-service/restarted-at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" -n "$NAMESPACE" --overwrite
echo -e "${GREEN}OK Rollout triggered for ${IMAGE} and ${API_GATEWAY_IMAGE}${NC}"
deploy_timing_phase_end "Rollout restart"

deploy_timing_phase_start "Wait for rollout"
echo -e "${YELLOW}Waiting for rollout...${NC}"
deploy_timing_k8s_rollout_wait kubectl "$SERVICE_NAME" "$NAMESPACE"
deploy_timing_k8s_rollout_wait kubectl "$API_GATEWAY_NAME" "$NAMESPACE"
echo -e "${GREEN}OK Rollouts complete${NC}"
deploy_timing_phase_end "Wait for rollout"

deploy_timing_phase_start "Post-deploy status"
echo -e "${YELLOW}Current pods:${NC}"
kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME"
kubectl get pods -n "$NAMESPACE" -l app="$API_GATEWAY_NAME"
deploy_timing_phase_end "Post-deploy status"

deploy_timing_finish_success "Heureka Service"
DEPLOY_TIMING_FINISHED=1
exit 0
