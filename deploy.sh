#!/bin/bash

# Deployment script for Nexus OR Planner on Azure AKS

set -e

# Configuration variables
RESOURCE_GROUP="nexus-or-planner-rg"
ACR_NAME="nexusorplanneracr"  # Replace with your ACR name
AKS_NAME="nexus-or-planner-aks"
IMAGE_NAME="nexus-or-planner"
TAG="latest"

echo "🚀 Starting deployment of Nexus OR Planner to Azure AKS..."

# Get ACR login server
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query "loginServer" --output tsv)
echo "📦 ACR Login Server: $ACR_LOGIN_SERVER"

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t $IMAGE_NAME:$TAG .

# Tag image for ACR
echo "🏷️  Tagging image for ACR..."
docker tag $IMAGE_NAME:$TAG $ACR_LOGIN_SERVER/$IMAGE_NAME:$TAG

# Push image to ACR
echo "⬆️  Pushing image to ACR..."
docker push $ACR_LOGIN_SERVER/$IMAGE_NAME:$TAG

# Get AKS credentials
echo "🔑 Getting AKS credentials..."
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_NAME --overwrite-existing

# Update the Kubernetes manifest with the correct image
echo "📝 Updating Kubernetes manifest..."
sed "s|<ACR_NAME>|$ACR_NAME|g" kubernetes-manifests.yaml > k8s-deploy.yaml

# Apply the Kubernetes manifests
echo "☸️  Deploying to Kubernetes..."
kubectl apply -f k8s-deploy.yaml

# Wait for deployment to be ready
echo "⏳ Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/nexus-or-planner -n nexus-or-planner

# Get service status
echo "📊 Checking service status..."
kubectl get pods -n nexus-or-planner
kubectl get services -n nexus-or-planner

echo "✅ Deployment completed successfully!"
echo "🌐 To access your application, you'll need to configure the ingress controller and DNS."
echo "📝 Check the ingress status with: kubectl get ingress -n nexus-or-planner"

# Cleanup
rm -f k8s-deploy.yaml
