#!/usr/bin/env bash
# ==============================================================================
# OpenQHSE — Production Deploy Script
# ==============================================================================
# Usage:
#   ./scripts/deploy.sh [OPTIONS]
#
# Options:
#   -e, --env       Environment: staging | production  (default: staging)
#   -v, --version   Image tag / app version           (default: git SHA short)
#   -n, --namespace K8s namespace                     (default: openqhse)
#   --skip-build    Skip Docker build (use existing images)
#   --skip-push     Skip docker push
#   --skip-deploy   Skip Helm upgrade (build/push only)
#   --seed          Run marketplace seed after deploy
#   --dry-run       Helm dry-run mode (no changes applied)
#   -h, --help      Show this help
#
# Environment variables (required unless using --skip-build):
#   AWS_REGION            e.g. us-east-1
#   AWS_ACCOUNT_ID        e.g. 123456789012
#   HELM_VALUES_FILE      path to override values.yaml (optional)
# ==============================================================================

set -euo pipefail
IFS=$'\n\t'

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }
step()    { echo -e "\n${BOLD}══ $* ══${RESET}"; }

# ── Defaults ──────────────────────────────────────────────────────────────────
ENV="staging"
VERSION="${VERSION:-$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')}"
NAMESPACE="openqhse"
HELM_RELEASE="openqhse"
SKIP_BUILD=false
SKIP_PUSH=false
SKIP_DEPLOY=false
RUN_SEED=false
DRY_RUN=false
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"
HELM_VALUES_FILE="${HELM_VALUES_FILE:-}"

# ── Parse args ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    -e|--env)        ENV="$2";       shift 2 ;;
    -v|--version)    VERSION="$2";   shift 2 ;;
    -n|--namespace)  NAMESPACE="$2"; shift 2 ;;
    --skip-build)    SKIP_BUILD=true; shift ;;
    --skip-push)     SKIP_PUSH=true;  shift ;;
    --skip-deploy)   SKIP_DEPLOY=true; shift ;;
    --seed)          RUN_SEED=true;   shift ;;
    --dry-run)       DRY_RUN=true;    shift ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//' | head -30
      exit 0 ;;
    *)               error "Unknown option: $1" ;;
  esac
done

[[ "$ENV" =~ ^(staging|production)$ ]] || error "Invalid env: $ENV"

# ── Computed vars ─────────────────────────────────────────────────────────────
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGES=(api web ai-engine)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ── Header ────────────────────────────────────────────────────────────────────
echo -e "${BOLD}"
echo "  ╔═══════════════════════════════════╗"
echo "  ║   OpenQHSE Deploy Script          ║"
echo "  ╚═══════════════════════════════════╝"
echo -e "${RESET}"
info "Environment : $ENV"
info "Version     : $VERSION"
info "Namespace   : $NAMESPACE"
info "Dry-run     : $DRY_RUN"
echo ""

# ── Pre-flight checks ─────────────────────────────────────────────────────────
step "Pre-flight checks"

command -v docker  &>/dev/null || error "docker not found"
command -v kubectl &>/dev/null || error "kubectl not found"
command -v helm    &>/dev/null || error "helm not found"

if [[ "$SKIP_BUILD" == "false" || "$SKIP_PUSH" == "false" ]]; then
  [[ -n "$AWS_ACCOUNT_ID" ]] || error "AWS_ACCOUNT_ID is required"
  command -v aws &>/dev/null || error "aws CLI not found"
fi

# Verify kubectl context
KUBE_CONTEXT=$(kubectl config current-context 2>/dev/null || echo "none")
info "kubectl context: $KUBE_CONTEXT"
if [[ "$ENV" == "production" && "$DRY_RUN" == "false" ]]; then
  echo -e "${YELLOW}"
  read -rp "  ⚠️  Deploying to PRODUCTION. Continue? [y/N] " confirm
  echo -e "${RESET}"
  [[ "$confirm" =~ ^[Yy]$ ]] || { info "Aborted."; exit 0; }
fi

success "Pre-flight checks passed"

# ── ECR login ─────────────────────────────────────────────────────────────────
if [[ "$SKIP_BUILD" == "false" || "$SKIP_PUSH" == "false" ]]; then
  step "Authenticating with ECR"
  aws ecr get-login-password --region "$AWS_REGION" \
    | docker login --username AWS --password-stdin "$ECR_REGISTRY"
  success "ECR login successful"
fi

# ── Build Docker images ───────────────────────────────────────────────────────
if [[ "$SKIP_BUILD" == "false" ]]; then
  step "Building Docker images (version=$VERSION)"

  build_image() {
    local name="$1"
    local dockerfile="$2"
    local context="$3"
    local tag="${ECR_REGISTRY}/openqhse-${name}:${VERSION}"
    local latest="${ECR_REGISTRY}/openqhse-${name}:latest"

    info "Building $name → $tag"
    docker build \
      --file "$dockerfile" \
      --tag "$tag" \
      --tag "$latest" \
      --build-arg "APP_VERSION=${VERSION}" \
      --build-arg "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      --cache-from "${latest}" \
      "$context"
    success "$name built"
  }

  build_image "api"       "${REPO_ROOT}/docker/api.Dockerfile"       "${REPO_ROOT}/apps/api"
  build_image "web"       "${REPO_ROOT}/docker/web.Dockerfile"       "${REPO_ROOT}/apps/web"
  build_image "ai-engine" "${REPO_ROOT}/docker/ai-engine.Dockerfile" "${REPO_ROOT}/apps/ai-engine"
fi

# ── Push images ───────────────────────────────────────────────────────────────
if [[ "$SKIP_PUSH" == "false" ]]; then
  step "Pushing images to ECR"
  for img in "${IMAGES[@]}"; do
    tag="${ECR_REGISTRY}/openqhse-${img}:${VERSION}"
    info "Pushing $tag …"
    docker push "$tag"
    docker push "${ECR_REGISTRY}/openqhse-${img}:latest"
    success "$img pushed"
  done
fi

# ── Helm upgrade ──────────────────────────────────────────────────────────────
if [[ "$SKIP_DEPLOY" == "false" ]]; then
  step "Deploying with Helm"

  # Ensure namespace exists
  kubectl get namespace "$NAMESPACE" &>/dev/null \
    || kubectl create namespace "$NAMESPACE"

  # Build helm args
  HELM_ARGS=(
    upgrade --install "$HELM_RELEASE"
    "${REPO_ROOT}/k8s/helm"
    --namespace "$NAMESPACE"
    --set "appVersion=${VERSION}"
    --set "api.image.tag=${VERSION}"
    --set "web.image.tag=${VERSION}"
    --set "aiEngine.image.tag=${VERSION}"
    --set "celery.worker.image.tag=${VERSION}"
    --set "celery.beat.image.tag=${VERSION}"
    --set "api.image.repository=${ECR_REGISTRY}/openqhse-api"
    --set "web.image.repository=${ECR_REGISTRY}/openqhse-web"
    --set "aiEngine.image.repository=${ECR_REGISTRY}/openqhse-ai-engine"
    --set "celery.worker.image.repository=${ECR_REGISTRY}/openqhse-api"
    --set "celery.beat.image.repository=${ECR_REGISTRY}/openqhse-api"
    --timeout 10m
    --wait
    --atomic
    --history-max 5
  )

  if [[ -n "$HELM_VALUES_FILE" ]]; then
    HELM_ARGS+=(--values "$HELM_VALUES_FILE")
  fi

  if [[ -f "${REPO_ROOT}/k8s/helm/values-${ENV}.yaml" ]]; then
    HELM_ARGS+=(--values "${REPO_ROOT}/k8s/helm/values-${ENV}.yaml")
    info "Using env overlay: values-${ENV}.yaml"
  fi

  if [[ "$RUN_SEED" == "true" ]]; then
    HELM_ARGS+=(--set "seedMarketplace.enabled=true")
    info "Marketplace seed enabled"
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    HELM_ARGS+=(--dry-run)
    warn "DRY RUN — no changes will be applied"
  fi

  helm "${HELM_ARGS[@]}"
  success "Helm release $HELM_RELEASE deployed"

  # ── Rollout status ─────────────────────────────────────────
  if [[ "$DRY_RUN" == "false" ]]; then
    step "Checking rollout status"
    for component in api web ai-engine celery-worker; do
      deployment="${HELM_RELEASE}-openqhse-${component}"
      if kubectl get deployment "$deployment" -n "$NAMESPACE" &>/dev/null; then
        kubectl rollout status deployment/"$deployment" -n "$NAMESPACE" --timeout=5m \
          && success "$component rollout OK" \
          || warn "$component rollout timed out"
      fi
    done
  fi

  # ── Health check ───────────────────────────────────────────
  if [[ "$DRY_RUN" == "false" ]]; then
    step "Health check"
    API_URL="${API_HEALTH_URL:-https://app.openqhse.io/api/v1/health}"
    if curl -sf --max-time 10 "$API_URL" &>/dev/null; then
      success "API health check passed: $API_URL"
    else
      warn "API health check failed: $API_URL (may still be starting)"
    fi
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}════ Deploy Complete ════${RESET}"
echo -e "  Environment : ${BOLD}$ENV${RESET}"
echo -e "  Version     : ${BOLD}$VERSION${RESET}"
echo -e "  Namespace   : ${BOLD}$NAMESPACE${RESET}"
echo -e "  Helm release: ${BOLD}$HELM_RELEASE${RESET}"
if [[ "$DRY_RUN" == "true" ]]; then
  echo -e "  ${YELLOW}(DRY RUN — no actual changes applied)${RESET}"
fi
echo ""
