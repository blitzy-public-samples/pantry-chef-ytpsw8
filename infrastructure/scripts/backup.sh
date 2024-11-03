#!/bin/bash

# HUMAN TASKS:
# 1. Ensure AWS CLI v2.0.0+ is installed and configured with appropriate credentials
# 2. Install mongodb-database-tools v100.6.1+ for mongodump utility
# 3. Install redis-tools v6.2.0+ for redis-cli
# 4. Install elasticdump v6.0.0+ via npm for Elasticsearch backup
# 5. Create encryption key at /opt/pantrychef/keys/backup.key with appropriate permissions
# 6. Ensure backup directories exist with correct permissions at /opt/pantrychef/backups
# 7. Configure MongoDB, Redis, and Elasticsearch connection details in environment

# Requirement: Database Backup
# Location: 10. INFRASTRUCTURE/D. DEPLOYMENT CHECKLIST/Backup
# Description: Automated backup schedule for database systems

# Set strict error handling
set -euo pipefail

# Global variables from specification
BACKUP_ROOT="/opt/pantrychef/backups"
RETENTION_DAYS=30
LOG_FILE="/var/log/pantrychef/backup.log"
ENCRYPTION_KEY_PATH="/opt/pantrychef/keys/backup.key"

# Timestamp for backup naming
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Requirement: Data Security
# Location: 9. SECURITY CONSIDERATIONS/9.2 Data Security/9.2.1 Encryption Standards
# Description: AES-256 encryption for data at rest and in transit

# Logging function
log() {
    local level=$1
    local message=$2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
}

# Requirement: Database Backup - MongoDB
backup_mongodb() {
    local backup_path=$1
    local mongodb_uri=$2
    local encryption_key=$3
    
    log "INFO" "Starting MongoDB backup..."
    
    # Create backup directory
    local mongo_backup_dir="${backup_path}/mongodb_${TIMESTAMP}"
    mkdir -p "$mongo_backup_dir"
    
    # Execute mongodump with compression and encryption
    mongodump --uri="$mongodb_uri" \
        --out="$mongo_backup_dir" \
        --gzip \
        --archive \
        --ssl \
        2>> "$LOG_FILE"
    
    # Encrypt backup using AES-256
    openssl enc -aes-256-cbc -salt -in "${mongo_backup_dir}" \
        -out "${mongo_backup_dir}.enc" \
        -pass file:"$encryption_key"
    
    # Generate checksum
    sha256sum "${mongo_backup_dir}.enc" > "${mongo_backup_dir}.enc.sha256"
    
    # Upload to S3 with server-side encryption
    aws s3 cp "${mongo_backup_dir}.enc" \
        "s3://${S3_BUCKET}/backups/mongodb/${TIMESTAMP}/" \
        --sse AES256
    
    # Cleanup local files
    rm -rf "$mongo_backup_dir"
    rm "${mongo_backup_dir}.enc"
    
    log "INFO" "MongoDB backup completed successfully"
    return 0
}

# Requirement: Database Backup - Redis
backup_redis() {
    local backup_path=$1
    local redis_host=$2
    local encryption_key=$3
    
    log "INFO" "Starting Redis backup..."
    
    # Create backup directory
    local redis_backup_dir="${backup_path}/redis_${TIMESTAMP}"
    mkdir -p "$redis_backup_dir"
    
    # Trigger SAVE operation
    redis-cli -h "$redis_host" SAVE
    
    # Copy and compress dump.rdb
    cp /var/lib/redis/dump.rdb "${redis_backup_dir}/dump.rdb"
    gzip "${redis_backup_dir}/dump.rdb"
    
    # Encrypt backup
    openssl enc -aes-256-cbc -salt \
        -in "${redis_backup_dir}/dump.rdb.gz" \
        -out "${redis_backup_dir}/dump.rdb.gz.enc" \
        -pass file:"$encryption_key"
    
    # Upload to S3
    aws s3 cp "${redis_backup_dir}/dump.rdb.gz.enc" \
        "s3://${S3_BUCKET}/backups/redis/${TIMESTAMP}/" \
        --sse AES256
    
    # Cleanup
    rm -rf "$redis_backup_dir"
    
    log "INFO" "Redis backup completed successfully"
    return 0
}

# Requirement: Database Backup - Elasticsearch
backup_elasticsearch() {
    local backup_path=$1
    local elasticsearch_url=$2
    local encryption_key=$3
    
    log "INFO" "Starting Elasticsearch backup..."
    
    # Create backup directory
    local es_backup_dir="${backup_path}/elasticsearch_${TIMESTAMP}"
    mkdir -p "$es_backup_dir"
    
    # Use elasticdump to backup all indices
    elasticdump \
        --input="$elasticsearch_url" \
        --output="${es_backup_dir}/backup.json" \
        --type=data
    
    # Compress backup
    tar -czf "${es_backup_dir}/backup.tar.gz" -C "$es_backup_dir" backup.json
    
    # Encrypt backup
    openssl enc -aes-256-cbc -salt \
        -in "${es_backup_dir}/backup.tar.gz" \
        -out "${es_backup_dir}/backup.tar.gz.enc" \
        -pass file:"$encryption_key"
    
    # Upload to S3
    aws s3 cp "${es_backup_dir}/backup.tar.gz.enc" \
        "s3://${S3_BUCKET}/backups/elasticsearch/${TIMESTAMP}/" \
        --sse AES256
    
    # Cleanup
    rm -rf "$es_backup_dir"
    
    log "INFO" "Elasticsearch backup completed successfully"
    return 0
}

# Requirement: S3 Replication - Cleanup old backups
cleanup_old_backups() {
    local backup_path=$1
    local retention_days=$2
    
    log "INFO" "Starting backup cleanup..."
    
    # Calculate cutoff date
    local cutoff_date=$(date -d "$retention_days days ago" +%Y%m%d)
    
    # Clean local backups
    find "$backup_path" -type f -mtime +"$retention_days" -exec shred -u {} \;
    
    # Clean S3 backups
    aws s3 ls "s3://${S3_BUCKET}/backups/" --recursive | while read -r line; do
        local file_date=$(echo "$line" | awk '{print $4}' | grep -oP '\d{8}')
        if [[ "$file_date" < "$cutoff_date" ]]; then
            local file_path=$(echo "$line" | awk '{print $4}')
            aws s3 rm "s3://${S3_BUCKET}/backups/$file_path"
        fi
    done
    
    log "INFO" "Backup cleanup completed"
    return 0
}

# Main backup orchestration function
main() {
    log "INFO" "Starting backup process..."
    
    # Create timestamp directory
    local backup_dir="${BACKUP_ROOT}/${TIMESTAMP}"
    mkdir -p "$backup_dir"
    
    # Load encryption key
    if [[ ! -f "$ENCRYPTION_KEY_PATH" ]]; then
        log "ERROR" "Encryption key not found at $ENCRYPTION_KEY_PATH"
        exit 1
    fi
    
    # Execute backups
    backup_mongodb "$backup_dir" "$MONGODB_URI" "$ENCRYPTION_KEY_PATH"
    backup_redis "$backup_dir" "$REDIS_HOST" "$ENCRYPTION_KEY_PATH"
    backup_elasticsearch "$backup_dir" "$ELASTICSEARCH_URL" "$ENCRYPTION_KEY_PATH"
    
    # Cleanup old backups
    cleanup_old_backups "$BACKUP_ROOT" "$RETENTION_DAYS"
    
    log "INFO" "Backup process completed successfully"
}

# Execute main function
main