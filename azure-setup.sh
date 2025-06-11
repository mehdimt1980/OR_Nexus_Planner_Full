# Azure setup script for Nexus OR Planner

# Set variables
RESOURCE_GROUP="nexus-or-planner-rg"
LOCATION="westeurope"  # Change to your preferred region
ACR_NAME="nexusorplanneracr"  # Must be globally unique
AKS_NAME="nexus-or-planner-aks"
NODE_COUNT=2

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Container Registry
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true

# Create AKS cluster
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --node-count $NODE_COUNT \
  --node-vm-size Standard_B2s \
  --enable-addons monitoring \
  --generate-ssh-keys \
  --attach-acr $ACR_NAME

# Get AKS credentials
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_NAME

# Login to ACR
az acr login --name $ACR_NAME

echo "Azure resources created successfully!"
echo "ACR Login Server: ${ACR_NAME}.azurecr.io"
