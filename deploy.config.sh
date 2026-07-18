# deploy.config.sh — declaration consumed by shared/scripts/deploy.sh.
# See shared/docs/DEPLOY_STANDARDIZATION_REPORT.md section 6/7 (Phase D) for the design.
# scripts/deploy.sh is still the live, authoritative deploy path.
#
# Same sed-template + kubectl set image + annotation pattern as bazos (both
# services -- heureka-service and heureka-api-gateway -- get both treatments).
# One of the two services from the 2026-07-18 containerd incident (section 9).

SERVICE_NAME="heureka-service"
API_GATEWAY_NAME="heureka-api-gateway"
PORT="3000"

IMAGES=(
  "heureka-service|.||"
  "heureka-api-gateway|.|services/api-gateway/Dockerfile|"
)

DEPLOYMENTS=(
  "heureka-service|app|heureka-service"
  "heureka-api-gateway|app|heureka-api-gateway"
)

MANIFESTS=(configmap.yaml external-secret.yaml service.yaml api-gateway-service.yaml)

deploy_post_manifests() {
  local image api_image
  image="${REGISTRY}/${SERVICE_NAME}:${IMAGE_TAG}"
  api_image="${REGISTRY}/${API_GATEWAY_NAME}:${IMAGE_TAG}"
  if [ -f "$PROJECT_ROOT/k8s/deployment.yaml" ]; then
    sed -E "s#image: ${REGISTRY}/${SERVICE_NAME}:[^[:space:]]+#image: ${image}#" "$PROJECT_ROOT/k8s/deployment.yaml" \
      | kubectl apply -f - -n "$NAMESPACE"
  fi
  if [ -f "$PROJECT_ROOT/k8s/api-gateway-deployment.yaml" ]; then
    sed -E "s#image: ${REGISTRY}/${API_GATEWAY_NAME}:[^[:space:]]+#image: ${api_image}#" "$PROJECT_ROOT/k8s/api-gateway-deployment.yaml" \
      | kubectl apply -f - -n "$NAMESPACE"
  fi
  if [ -f "$PROJECT_ROOT/k8s/ingress.yaml" ]; then
    kubectl apply -f "$PROJECT_ROOT/k8s/ingress.yaml" -n "$NAMESPACE"
  fi
}

deploy_post_verify() {
  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  kubectl annotate deployment/"$SERVICE_NAME" "deploy.heureka-service/image-tag=${IMAGE_TAG}" "deploy.heureka-service/restarted-at=${ts}" -n "$NAMESPACE" --overwrite
  kubectl annotate deployment/"$API_GATEWAY_NAME" "deploy.heureka-service/image-tag=${IMAGE_TAG}" "deploy.heureka-service/restarted-at=${ts}" -n "$NAMESPACE" --overwrite
}
