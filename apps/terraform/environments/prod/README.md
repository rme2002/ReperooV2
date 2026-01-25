# Production Environment

Terraform configuration for deploying the Reperoo API to Google Cloud Run in the production environment.

## Status

**This environment is PREPARED but NOT DEPLOYED yet.**

The Terraform files are ready, but deployment is deferred until:
1. Dev environment is tested and stable
2. Production secrets are available
3. Production database is set up
4. Team is ready for production deployment

## Deployment Guide (When Ready)

### Prerequisites

Before deploying production:
1. Dev environment fully tested
2. Production database configured
3. Production Supabase project created
4. Domain name configured (optional)
5. Cloud Armor policies defined (recommended)

### 1. Create State Backend Bucket

```bash
gcloud storage buckets create gs://reperoo-terraform-state-prod \
  --project=reperoo \
  --location=europe-west4 \
  --uniform-bucket-level-access

gcloud storage buckets update gs://reperoo-terraform-state-prod --versioning
```

### 2. Initialize Terraform

```bash
cd apps/terraform/environments/prod
terraform init
```

### 3. Review Configuration

Check `terraform.auto.tfvars` and customize if needed:
- Scaling limits (min/max instances)
- Resource allocation (CPU/memory)
- Log level

Optionally create `terraform.tfvars` for overrides:
```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars
```

### 4. Review and Apply

```bash
# Preview changes
terraform plan

# Apply infrastructure (only when ready!)
terraform apply
```

### 5. Update Secret Values

**IMPORTANT**: Use production credentials, not dev credentials!

```bash
# Production database connection string
gcloud secrets versions add prod-database-url \
  --data-file=- <<< "postgresql://prod-user:prod-pass@prod-host:5432/reperoo"

# Production Supabase configuration
gcloud secrets versions add prod-supabase-url \
  --data-file=- <<< "https://xxxxx.supabase.co"

gcloud secrets versions add prod-supabase-secret-api-key \
  --data-file=- <<< "prod-service-role-key"

gcloud secrets versions add prod-supabase-jwt-secret \
  --data-file=- <<< "prod-jwt-secret"
```

### 6. Deploy Application Image

```bash
# Tag production image
docker tag europe-west4-docker.pkg.dev/reperoo/reperoo-api-images/api:latest \
  europe-west4-docker.pkg.dev/reperoo/reperoo-api-images/api:prod-v1.0.0

# Push to registry
docker push europe-west4-docker.pkg.dev/reperoo/reperoo-api-images/api:prod-v1.0.0

# Deploy to Cloud Run
gcloud run services update reperoo-api-prod \
  --image=europe-west4-docker.pkg.dev/reperoo/reperoo-api-images/api:prod-v1.0.0 \
  --region=europe-west4
```

### 7. Verify Production Deployment

```bash
# Get service URL
terraform output cloud_run_url

# Test health endpoint
curl $(terraform output -raw cloud_run_url)/health

# Verify no placeholder secrets
gcloud run services logs read reperoo-api-prod --region=europe-west4 --limit=10

# Check service configuration
gcloud run services describe reperoo-api-prod --region=europe-west4
```

### 8. Configure Custom Domain (Optional)

```bash
# Map custom domain to Cloud Run
gcloud run domain-mappings create \
  --service=reperoo-api-prod \
  --domain=api.reperoo.com \
  --region=europe-west4

# Follow DNS configuration instructions
```

### 9. Set Up Monitoring

```bash
# Create uptime check
gcloud monitoring uptime create https \
  --display-name="Reperoo API Production Health Check" \
  --resource-type=uptime-url \
  --host=$(terraform output -raw cloud_run_url | sed 's|https://||') \
  --path=/health

# Create alert policy for errors
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Reperoo API Production Errors" \
  --condition-display-name="High Error Rate" \
  --condition-threshold-value=10 \
  --condition-threshold-duration=60s
```

## Configuration Differences from Dev

| Setting | Dev | Production |
|---------|-----|------------|
| Service Name | `reperoo-api-dev` | `reperoo-api-prod` |
| Min Instances | 0 | 0 (can set to 1 for warm start) |
| Max Instances | 5 | 20 |
| CPU | 1 | 2 |
| Memory | 512Mi | 1Gi |
| Log Level | info | warning |
| Secrets | `dev-*` | `prod-*` |

## Production Best Practices

### 1. Artifact Registry Repository

The Artifact Registry repository is **shared** between dev and prod. If it already exists from dev:

```bash
# Import existing repository
terraform import 'module.artifact_registry.google_artifact_registry_repository.repository' \
  projects/reperoo/locations/europe-west4/repositories/reperoo-api-images
```

### 2. Image Tagging Strategy

Use semantic versioning for production:

```bash
# Don't use :latest in production
# Use specific version tags instead
docker tag IMAGE:latest IMAGE:prod-v1.2.3
docker push IMAGE:prod-v1.2.3

# Update Cloud Run with specific tag
gcloud run services update reperoo-api-prod \
  --image=IMAGE:prod-v1.2.3 \
  --region=europe-west4
```

### 3. Deployment Process

1. Test in dev environment first
2. Tag with version number
3. Deploy to production
4. Monitor for errors
5. Keep previous version for quick rollback

### 4. Rollback Procedure

```bash
# List previous revisions
gcloud run revisions list --service=reperoo-api-prod --region=europe-west4

# Rollback to previous revision
gcloud run services update-traffic reperoo-api-prod \
  --to-revisions=REVISION_NAME=100 \
  --region=europe-west4
```

### 5. Security Enhancements

Consider adding:

- **Cloud Armor**: WAF and DDoS protection
  ```bash
  gcloud compute security-policies create reperoo-api-policy \
    --description="Security policy for Reperoo API"
  ```

- **Rate Limiting**: Prevent abuse
- **VPC Connector**: Private database access
- **Binary Authorization**: Only deploy signed images
- **Secret Rotation**: Automated credential rotation

### 6. Monitoring and Alerting

Set up alerts for:
- Error rate > 1%
- Latency > 500ms (p95)
- Instance count > 15 (approaching max)
- Health check failures
- Secret access errors

### 7. Cost Optimization

Production can be expensive. Optimize with:

1. **Scale to zero**: `min_instances = 0` (accepts cold starts)
2. **Right-size resources**: Don't over-provision CPU/memory
3. **Request timeout**: Lower if possible (default 300s)
4. **Image cleanup**: Delete old production images
5. **Log retention**: Configure retention policies

Current cost estimate:
- Cloud Run: $20-80/month (varies with traffic)
- Secrets: $0.10/month
- Artifact Registry: $0.50/month
- **Total**: ~$20-100/month

### 8. Backup Strategy

**Terraform State**:
- Stored in `gs://reperoo-terraform-state-prod`
- Versioning enabled for recovery
- Backed up by Google Cloud Storage

**Secrets**:
- Keep encrypted backups outside GCP
- Use secret rotation policies
- Document secret recovery process

**Database**:
- Regular automated backups (handled by database provider)
- Point-in-time recovery
- Test restore procedures

## Maintenance

### Update Production Configuration

```bash
# Modify terraform.auto.tfvars or terraform.tfvars
# Example: Increase max_instances to 30

terraform plan   # Review changes carefully
terraform apply  # Apply after review
```

### Update Secret Values

```bash
# Rotate secrets (adds new version)
gcloud secrets versions add prod-database-url \
  --data-file=- <<< "new-connection-string"

# Force Cloud Run to pick up new secret
gcloud run services update reperoo-api-prod --region=europe-west4
```

### View Production Status

```bash
# Service details
gcloud run services describe reperoo-api-prod --region=europe-west4

# Recent logs
gcloud run services logs read reperoo-api-prod --region=europe-west4 --limit=50

# Metrics
gcloud monitoring time-series list \
  --filter='resource.type="cloud_run_revision" AND resource.labels.service_name="reperoo-api-prod"'
```

## Emergency Procedures

### Incident Response

1. **Check service status**:
   ```bash
   gcloud run services describe reperoo-api-prod --region=europe-west4
   ```

2. **Check recent logs**:
   ```bash
   gcloud run services logs read reperoo-api-prod --region=europe-west4 --limit=100
   ```

3. **Rollback if needed**:
   ```bash
   gcloud run services update-traffic reperoo-api-prod \
     --to-revisions=PREVIOUS_REVISION=100 \
     --region=europe-west4
   ```

4. **Scale down if overwhelmed**:
   ```bash
   # Temporarily reduce max instances
   # Edit terraform.auto.tfvars: max_instances = 5
   terraform apply
   ```

### Disaster Recovery

If production infrastructure is lost:

1. Terraform state is versioned in GCS (recoverable)
2. Re-apply Terraform: `terraform apply`
3. Restore secret values from encrypted backup
4. Redeploy application image
5. Verify service functionality

## Troubleshooting

### Artifact Registry Conflict

**Error**: "Repository already exists"

**Solution**: Import from dev environment
```bash
terraform import 'module.artifact_registry.google_artifact_registry_repository.repository' \
  projects/reperoo/locations/europe-west4/repositories/reperoo-api-images
```

### High Latency

**Cause**: Cold starts from scale-to-zero

**Solution**: Set `min_instances = 1` to keep one instance warm
```hcl
# In terraform.auto.tfvars
min_instances = 1
```

### Out of Resources

**Error**: "Insufficient resources"

**Solution**: Increase max_instances or reduce CPU/memory

## Next Steps After Deployment

1. Set up custom domain (api.reperoo.com)
2. Configure Cloud Armor for DDoS protection
3. Set up monitoring dashboards
4. Create runbook for common issues
5. Document deployment procedures
6. Train team on production operations
7. Schedule regular security audits

## References

- [Root README](../../README.md) - Complete setup guide
- [Dev Environment](../dev/README.md) - Development setup
- [Cloud Run Module](../../modules/cloud-run/README.md)
- [Production Best Practices](https://cloud.google.com/run/docs/tips/general)
