# Nazuna NodeJS

This is a sample Node.js app for Opsta name Nazuna

## How to use

```bash
# To install all dependencies and run with docker-compose
make
# To install only dependencies
make install
# To delete and clean all dependencies
make clean
# To build docker image
make build
```

## Kubernetes

There is k8s directory that consist all deployment files for Kubernetes

- namespace: To create namespace for all environment
- ingress: To create ingress for each environment
- helm-nodejs: Helm template for NodeJS
- helm-nodejs/values-nazuna-*.yml: Helm values for each environment

Useful commands

```bash
# To create namespace
kubectl apply -f namespace.yml
# To create ingress
kubectl apply -f ingress.yml
# To deploy Nazuna on each environment (need Helm command and initial server first)
helm install --namespace dev -f k8s/helm-nodejs/values-nazuna-dev.yaml --name nazuna-dev k8s/helm-nodejs
helm install --namespace uat -f k8s/helm-nodejs/values-nazuna-uat.yaml --name nazuna-uat k8s/helm-nodejs
helm install --namespace prod -f k8s/helm-nodejs/values-nazuna-prod.yaml --name nazuna-prod k8s/helm-nodejs
```
