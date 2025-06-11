#!/bin/bash

# Setup NGINX Ingress Controller on AKS

set -e

echo "🌐 Setting up NGINX Ingress Controller..."

# Add the ingress-nginx repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install NGINX Ingress Controller
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --create-namespace \
  --namespace ingress-nginx \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz

echo "⏳ Waiting for ingress controller to be ready..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

# Get the external IP
echo "📍 Getting external IP address..."
sleep 30  # Wait a bit more for the LoadBalancer to get an IP

EXTERNAL_IP=""
while [ -z "$EXTERNAL_IP" ]; do
  echo "Waiting for external IP..."
  EXTERNAL_IP=$(kubectl get svc --namespace ingress-nginx ingress-nginx-controller --template="{{range .status.loadBalancer.ingress}}{{.ip}}{{end}}")
  [ -z "$EXTERNAL_IP" ] && sleep 10
done

echo "✅ NGINX Ingress Controller installed successfully!"
echo "🌍 External IP: $EXTERNAL_IP"
echo "📝 Update your DNS records to point your domain to this IP address"
echo "⚠️  Remember to update the host in your ingress manifest with your actual domain"
