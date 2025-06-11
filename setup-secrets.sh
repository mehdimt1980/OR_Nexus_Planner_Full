#!/bin/bash

# Setup secrets for Nexus OR Planner

set -e

echo "🔐 Setting up secrets for Nexus OR Planner..."

# Prompt for Google API Key
read -s -p "Enter your Google AI API Key: " GOOGLE_API_KEY
echo

if [ -z "$GOOGLE_API_KEY" ]; then
  echo "❌ Google API Key cannot be empty"
  exit 1
fi

# Create namespace if it doesn't exist
kubectl create namespace nexus-or-planner --dry-run=client -o yaml | kubectl apply -f -

# Create the secret
kubectl create secret generic nexus-or-planner-secrets \
  --from-literal=GOOGLE_API_KEY="$GOOGLE_API_KEY" \
  --namespace=nexus-or-planner \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Secrets created successfully!"
echo "🔑 The following secrets have been configured:"
echo "   - GOOGLE_API_KEY"

# Verify the secret
echo "📋 Verifying secret creation..."
kubectl get secrets -n nexus-or-planner nexus-or-planner-secrets

echo "✅ Secret verification completed!"
