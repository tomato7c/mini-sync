### config.json

```json
{
  "r2": {
    "accountId": "your-cloudflare-account-id",
    "accessKeyId": "your-r2-access-key-id",
    "secretAccessKey": "your-r2-secret-access-key",
    "bucketName": "rt2s2d",
    "publicUrl": "https://your-bucket-id.r2.cloudflarestorage.com"
  },
  "d1": {
    "accountId": "your-cloudflare-account-id",
    "databaseId": "your-d1-database-id",
    "apiToken": "your-cloudflare-api-token"
  }
}
```

### .env（环境变量）

```bash
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=rt2s2d
R2_PUBLIC_URL=https://your-bucket-id.r2.cloudflarestorage.com
D1_ACCOUNT_ID=your-cloudflare-account-id
D1_DATABASE_ID=your-d1-database-id
D1_API_TOKEN=your-cloudflare-api-token
```