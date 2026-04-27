# Kubernetes Deployment for DashBee

This directory contains Kubernetes manifests for deploying DashBee to a Kubernetes cluster.

## Prerequisites

- Kubernetes cluster (1.24+)
- kubectl configured to access your cluster
- PostgreSQL database (or use the included manifest)
- OpenAI API key

## Quick Start

### 1. Create Namespace

```bash
kubectl create namespace dashbee
```

### 2. Create Secrets

```bash
# Create database secret
kubectl create secret generic dashbee-secrets \
  --from-literal=database-url='postgresql://user:password@postgres-service:5432/dashbee' \
  --from-literal=openai-api-key='sk-...' \
  --from-literal=nextauth-secret="$(openssl rand -base64 32)" \
  --namespace=dashbee

# Or use the secret manifest template
cp secret.yaml.example secret.yaml
# Edit secret.yaml with your values (base64 encoded)
kubectl apply -f secret.yaml
```

### 3. Deploy PostgreSQL (Optional)

If you don't have an external PostgreSQL database:

```bash
kubectl apply -f postgres.yaml
```

### 4. Deploy DashBee

```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
```

### 5. Verify Deployment

```bash
# Check pod status
kubectl get pods -n dashbee

# Check logs
kubectl logs -f deployment/dashbee -n dashbee

# Check service
kubectl get svc -n dashbee

# Check ingress
kubectl get ingress -n dashbee
```

## Files

- `deployment.yaml` - DashBee application deployment
- `service.yaml` - Kubernetes service (LoadBalancer)
- `ingress.yaml` - Ingress for HTTP/HTTPS access
- `postgres.yaml` - PostgreSQL StatefulSet (optional)
- `secret.yaml.example` - Secret template
- `configmap.yaml` - ConfigMap for non-sensitive configuration

## Configuration

### Environment Variables

All sensitive configuration should be stored in Kubernetes Secrets. Non-sensitive configuration can be stored in ConfigMaps.

See `secret.yaml.example` for required secrets.

### Ingress

The `ingress.yaml` assumes you have cert-manager installed for automatic TLS certificates. If not, remove the cert-manager annotations and configure TLS manually.

### Database

You can use:
1. Included PostgreSQL StatefulSet (`postgres.yaml`) - for testing/small deployments
2. Cloud-managed database (AWS RDS, GCP Cloud SQL, Azure Database)
3. External PostgreSQL cluster

Update the `database-url` secret accordingly.

## Scaling

### Horizontal Scaling

```bash
# Scale to 3 replicas
kubectl scale deployment dashbee --replicas=3 -n dashbee
```

### Autoscaling

```bash
kubectl autoscale deployment dashbee \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n dashbee
```

## Upgrading

### Rolling Update

```bash
# Update image
kubectl set image deployment/dashbee \
  dashbee=jagansh/dashbee:v1.1.0 \
  -n dashbee

# Check rollout status
kubectl rollout status deployment/dashbee -n dashbee
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/dashbee -n dashbee

# Rollback to specific revision
kubectl rollout undo deployment/dashbee --to-revision=2 -n dashbee
```

## Monitoring

### Health Checks

DashBee includes:
- Liveness probe: `/api/health`
- Readiness probe: `/api/ready`

### Logs

```bash
# Stream logs from all pods
kubectl logs -f deployment/dashbee -n dashbee --all-containers=true

# Logs from specific pod
kubectl logs -f <pod-name> -n dashbee
```

### Metrics

Expose Prometheus metrics endpoint:

```bash
kubectl port-forward deployment/dashbee 9090:3000 -n dashbee
curl http://localhost:9090/api/metrics
```

## Troubleshooting

### Pod Not Starting

```bash
kubectl describe pod <pod-name> -n dashbee
kubectl logs <pod-name> -n dashbee
```

### Database Connection Issues

```bash
# Test database connectivity
kubectl run -it --rm debug --image=postgres:16 --restart=Never -n dashbee -- \
  psql postgresql://user:password@postgres-service:5432/dashbee
```

### DNS Resolution

```bash
# Test DNS from within cluster
kubectl run -it --rm debug --image=busybox --restart=Never -n dashbee -- \
  nslookup postgres-service.dashbee.svc.cluster.local
```

## Production Best Practices

1. **Use external managed database** (RDS, Cloud SQL, etc.)
2. **Enable Pod Disruption Budgets**
3. **Configure resource requests/limits** appropriately
4. **Use Horizontal Pod Autoscaler**
5. **Enable network policies** for security
6. **Use secrets management** (External Secrets Operator, Sealed Secrets)
7. **Configure persistent volumes** for any file storage needs
8. **Set up monitoring** (Prometheus, Grafana)
9. **Configure log aggregation** (ELK, Loki)
10. **Enable TLS** for all external traffic

## Security Considerations

- **Never commit secrets to Git** - use `secret.yaml.example` as template only
- **Use RBAC** to limit service account permissions
- **Enable Pod Security Standards** (baseline or restricted)
- **Use Network Policies** to restrict pod-to-pod communication
- **Scan images for vulnerabilities** before deployment
- **Rotate secrets regularly**

## Support

For issues with Kubernetes deployment, see:
- [DashBee Documentation](https://github.com/jagan-shanmugam/dashbee/tree/main/docs)
- [GitHub Issues](https://github.com/jagan-shanmugam/dashbee/issues)
