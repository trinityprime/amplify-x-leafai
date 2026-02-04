# LeafAI Feature 2: Export & Scheduled Reports - AWS Setup Guide

This guide walks you through setting up all AWS resources needed for the Export/Reporting feature.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Architecture Diagram                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Frontend (React)                                                       │
│        │                                                                 │
│        ▼                                                                 │
│   API Gateway ─────────────────────────────────────────┐                │
│        │                                                │                │
│        ├─────────────────────┐                          │                │
│        ▼                     ▼                          │                │
│   exportDetections      scheduleManager                 │                │
│   Lambda                Lambda                          │                │
│        │                     │                          │                │
│        │                     ├──────► EventBridge       │                │
│        │                     │        (Cron Rules)      │                │
│        │                     │              │           │                │
│        │                     │              ▼           │                │
│        │              ┌──────┴──────────────────────────┘                │
│        │              │                                                  │
│        ▼              ▼                                                  │
│   ┌─────────┐  ┌──────────────────┐                                     │
│   │   S3    │  │    DynamoDB      │                                     │
│   │ Exports │  │ - ScheduledRpts  │                                     │
│   │ Bucket  │  │ - Exports        │                                     │
│   └─────────┘  └──────────────────┘                                     │
│        │                                                                 │
│        ▼                                                                 │
│      SNS ──────► Email Notification                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Create DynamoDB Tables

### Table 1: LeafAI-Exports (for export records)

1. Go to **AWS Console → DynamoDB → Create Table**
2. Settings:
   - **Table name:** `LeafAI-Exports`
   - **Partition key:** `exportId` (String)
   - Leave Sort key blank
   - **Settings:** Default settings (On-demand capacity recommended)
3. Click **Create table**

### Table 2: LeafAI-ScheduledReports (for schedules)

1. Go to **AWS Console → DynamoDB → Create Table**
2. Settings:
   - **Table name:** `LeafAI-ScheduledReports`
   - **Partition key:** `scheduleId` (String)
   - Leave Sort key blank
   - **Settings:** Default settings
3. Click **Create table**

4. **IMPORTANT: Add Global Secondary Index (GSI)**
   - Go to the table → **Indexes** tab → **Create index**
   - **Partition key:** `userId` (String)
   - **Index name:** `userId-index`
   - **Projected attributes:** All
   - Click **Create index**

---

## Step 2: Create S3 Bucket for Exports

1. Go to **AWS Console → S3 → Create bucket**
2. Settings:
   - **Bucket name:** `leafai-exports-bucket-YOUR-ACCOUNT-ID` (must be globally unique)
   - **Region:** `ap-southeast-1`
   - **Block Public Access:** Keep all blocked (we use pre-signed URLs)
   - **Versioning:** Disabled (optional)
3. Click **Create bucket**

### Configure CORS (Required for frontend download)

1. Go to your bucket → **Permissions** tab → **CORS configuration**
2. Add this configuration:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"]
    }
]
```

---

## Step 3: Create SNS Topic for Email Notifications

1. Go to **AWS Console → SNS → Topics → Create topic**
2. Settings:
   - **Type:** Standard
   - **Name:** `LeafAI-Report-Notifications`
   - Leave other settings as default
3. Click **Create topic**
4. **Copy the Topic ARN** (you'll need this for Lambda)

### Create Email Subscription

1. Go to the topic → **Create subscription**
2. Settings:
   - **Protocol:** Email
   - **Endpoint:** Your email address (or a test email)
3. Click **Create subscription**
4. **Check your email and confirm the subscription**

---

## Step 4: Create IAM Role for Lambda Functions

1. Go to **AWS Console → IAM → Roles → Create role**
2. Settings:
   - **Trusted entity type:** AWS service
   - **Use case:** Lambda
3. Click **Next**
4. **Attach these policies:**
   - `AmazonDynamoDBFullAccess`
   - `AmazonS3FullAccess`
   - `AmazonSNSFullAccess`
   - `AmazonEventBridgeFullAccess`
   - `AWSLambdaBasicExecutionRole`
5. Click **Next**
6. **Role name:** `LeafAI-Export-Lambda-Role`
7. Click **Create role**

---

## Step 5: Create Lambda Functions

### Lambda 1: exportDetections

1. Go to **AWS Console → Lambda → Create function**
2. Settings:
   - **Function name:** `LeafAI-ExportDetections`
   - **Runtime:** Node.js 20.x
   - **Architecture:** x86_64
   - **Execution role:** Use existing role → `LeafAI-Export-Lambda-Role`
3. Click **Create function**

4. **Upload the code:**
   - Copy the contents of `lambda/exportDetections.js`
   - Paste into the Lambda code editor
   - Click **Deploy**

5. **Configure environment variables:**
   - Go to **Configuration** → **Environment variables** → **Edit**
   - Add these variables:
     | Key | Value |
     |-----|-------|
     | `DETECTIONS_TABLE` | `Todo-6mpvkcmhjrhyngqh4kptka4n6a-NONE` |
     | `EXPORTS_TABLE` | `LeafAI-Exports` |
     | `EXPORTS_BUCKET` | `leafai-exports-bucket-YOUR-ACCOUNT-ID` |
     | `SNS_TOPIC_ARN` | `arn:aws:sns:ap-southeast-1:YOUR-ACCOUNT:LeafAI-Report-Notifications` |

6. **Increase timeout:**
   - Go to **Configuration** → **General configuration** → **Edit**
   - Set **Timeout:** 30 seconds
   - Set **Memory:** 256 MB
   - Click **Save**

### Lambda 2: scheduleManager

1. Go to **AWS Console → Lambda → Create function**
2. Settings:
   - **Function name:** `LeafAI-ScheduleManager`
   - **Runtime:** Node.js 20.x
   - **Execution role:** Use existing role → `LeafAI-Export-Lambda-Role`
3. Click **Create function**

4. **Upload the code:**
   - Copy the contents of `lambda/scheduleManager.js`
   - Paste into the Lambda code editor
   - Click **Deploy**

5. **Configure environment variables:**
   | Key | Value |
   |-----|-------|
   | `SCHEDULES_TABLE` | `LeafAI-ScheduledReports` |
   | `EXPORT_LAMBDA_ARN` | `arn:aws:lambda:ap-southeast-1:YOUR-ACCOUNT:function:LeafAI-ExportDetections` |

6. **Increase timeout:** 30 seconds, Memory: 256 MB

### Add Lambda Layer for AWS SDK (if needed)

If you get errors about missing AWS SDK modules:

1. Go to **Lambda → Layers → Create layer**
2. Name: `aws-sdk-v3-layer`
3. Upload a ZIP containing the node_modules with:
   - `@aws-sdk/client-dynamodb`
   - `@aws-sdk/lib-dynamodb`
   - `@aws-sdk/client-s3`
   - `@aws-sdk/s3-request-presigner`
   - `@aws-sdk/client-sns`
   - `@aws-sdk/client-eventbridge`
   - `uuid`

---

## Step 6: Create API Gateway

### Option A: Add to existing API Gateway

If you want to add routes to your existing `upload-LeafAI-Image-API`:

1. Go to **API Gateway → APIs → upload-LeafAI-Image-API**
2. Create new resources and methods as shown below

### Option B: Create new API Gateway (Recommended)

1. Go to **AWS Console → API Gateway → Create API**
2. Choose **REST API** (not private) → **Build**
3. Settings:
   - **API name:** `LeafAI-Export-API`
   - **Endpoint Type:** Regional
4. Click **Create API**

### Create Resources and Methods

#### Resource: /exports

1. **Actions → Create Resource**
   - Resource Name: `exports`
   - Resource Path: `/exports`
   - Enable CORS: ✓
2. Click **Create Resource**

3. Select `/exports` → **Actions → Create Method** → **POST**
   - Integration type: Lambda Function
   - Lambda Function: `LeafAI-ExportDetections`
   - Click **Save** → **OK**

4. Select `/exports` → **Actions → Create Method** → **OPTIONS** (for CORS)

#### Resource: /exports/{id}

1. Select `/exports` → **Actions → Create Resource**
   - Resource Name: `{id}`
   - Resource Path: `{id}`
   - Enable CORS: ✓
2. Click **Create Resource**

3. Select `/exports/{id}` → Create methods:
   - **GET** → Lambda: `LeafAI-ExportDetections`
   - **DELETE** → Lambda: `LeafAI-ExportDetections`
   - **OPTIONS** (for CORS)

#### Resource: /exports/schedules

1. Select `/exports` → **Actions → Create Resource**
   - Resource Name: `schedules`
   - Resource Path: `schedules`
   - Enable CORS: ✓
2. Click **Create Resource**

3. Select `/exports/schedules` → Create methods:
   - **POST** → Lambda: `LeafAI-ScheduleManager`
   - **GET** → Lambda: `LeafAI-ScheduleManager`
   - **OPTIONS** (for CORS)

#### Resource: /exports/schedules/{id}

1. Select `/exports/schedules` → **Actions → Create Resource**
   - Resource Name: `{id}`
   - Resource Path: `{id}`
   - Enable CORS: ✓
2. Click **Create Resource**

3. Select `/exports/schedules/{id}` → Create methods:
   - **GET** → Lambda: `LeafAI-ScheduleManager`
   - **PUT** → Lambda: `LeafAI-ScheduleManager`
   - **DELETE** → Lambda: `LeafAI-ScheduleManager`
   - **OPTIONS** (for CORS)

### Enable CORS on all endpoints

1. Select each resource → **Actions → Enable CORS**
2. Check all methods
3. Click **Enable CORS and replace existing CORS headers**

### Deploy the API

1. **Actions → Deploy API**
2. **Deployment stage:** Create new stage
   - Stage name: `prod`
3. Click **Deploy**
4. **Copy the Invoke URL** (e.g., `https://abc123.execute-api.ap-southeast-1.amazonaws.com/prod`)

---

## Step 7: Update Frontend Configuration

1. Open `src/hooks/exportApi.ts`
2. Update the `EXPORT_API_BASE_URL`:

```typescript
const EXPORT_API_BASE_URL = 'https://YOUR-API-ID.execute-api.ap-southeast-1.amazonaws.com/prod';
```

---

## Step 8: Configure EventBridge Permissions

The `scheduleManager` Lambda creates EventBridge rules that trigger `exportDetections`. You need to give EventBridge permission to invoke the export Lambda.

1. Go to **Lambda → LeafAI-ExportDetections → Configuration → Permissions**
2. Scroll down to **Resource-based policy statements**
3. Click **Add permissions**
4. Settings:
   - **Statement ID:** `EventBridge-Invoke`
   - **Principal:** `events.amazonaws.com`
   - **Source ARN:** `arn:aws:events:ap-southeast-1:YOUR-ACCOUNT-ID:rule/LeafAI-Report-*`
   - **Action:** `lambda:InvokeFunction`
5. Click **Save**

---

## Step 9: Test the Setup

### Test 1: Instant Export

```bash
# Using curl (replace with your API URL)
curl -X POST https://YOUR-API-ID.execute-api.ap-southeast-1.amazonaws.com/prod/exports \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "status": "all"
    },
    "userEmail": "test@example.com"
  }'
```

Expected response:
```json
{
  "exportId": "export-xxxx-xxxx",
  "downloadUrl": "https://s3.amazonaws.com/...",
  "totalRecords": 10,
  "summary": {
    "totalDetections": 10,
    "goodLeaves": 7,
    "badLeaves": 3,
    "goodPercentage": 70,
    "badPercentage": 30
  }
}
```

### Test 2: Create Schedule

```bash
curl -X POST https://YOUR-API-ID.execute-api.ap-southeast-1.amazonaws.com/prod/exports/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "frequency": "weekly",
    "email": "test@example.com",
    "filters": { "status": "all" },
    "userEmail": "test@example.com"
  }'
```

### Test 3: List Schedules

```bash
curl "https://YOUR-API-ID.execute-api.ap-southeast-1.amazonaws.com/prod/exports/schedules?userEmail=test@example.com"
```

---

## Troubleshooting

### Error: "AccessDeniedException"
- Check IAM role has all required permissions
- Verify Lambda has the correct role attached

### Error: "Table not found"
- Verify DynamoDB table names match environment variables
- Check region is `ap-southeast-1`

### Error: "CORS"
- Ensure OPTIONS methods are configured
- Check API Gateway CORS settings
- Verify `Access-Control-Allow-Origin` header in Lambda responses

### EventBridge rules not triggering
- Check the rule is ENABLED in EventBridge console
- Verify Lambda has resource-based policy for EventBridge
- Check CloudWatch Logs for Lambda invocation errors

### No email received
- Confirm SNS subscription (check email)
- Verify SNS_TOPIC_ARN environment variable
- Check SNS topic permissions

---

## Cost Estimates

| Service | Usage | Estimated Cost |
|---------|-------|----------------|
| Lambda | 1000 invocations/month | ~$0.02 |
| DynamoDB | On-demand, <1GB | ~$1.00 |
| S3 | <1GB storage | ~$0.03 |
| SNS | 100 emails/month | ~$0.10 |
| EventBridge | 100 triggers/month | ~$0.01 |
| API Gateway | 1000 requests/month | ~$0.35 |
| **Total** | | **~$1.50/month** |

---

## Quick Reference: Environment Variables

### exportDetections Lambda
```
DETECTIONS_TABLE=Todo-6mpvkcmhjrhyngqh4kptka4n6a-NONE
EXPORTS_TABLE=LeafAI-Exports
EXPORTS_BUCKET=leafai-exports-bucket-YOUR-ACCOUNT-ID
SNS_TOPIC_ARN=arn:aws:sns:ap-southeast-1:YOUR-ACCOUNT:LeafAI-Report-Notifications
```

### scheduleManager Lambda
```
SCHEDULES_TABLE=LeafAI-ScheduledReports
EXPORT_LAMBDA_ARN=arn:aws:lambda:ap-southeast-1:YOUR-ACCOUNT:function:LeafAI-ExportDetections
```

---

## Checklist

- [ ] DynamoDB: `LeafAI-Exports` table created
- [ ] DynamoDB: `LeafAI-ScheduledReports` table created with `userId-index` GSI
- [ ] S3: Export bucket created with CORS
- [ ] SNS: Topic created and email subscription confirmed
- [ ] IAM: Lambda role created with all permissions
- [ ] Lambda: `LeafAI-ExportDetections` deployed with env vars
- [ ] Lambda: `LeafAI-ScheduleManager` deployed with env vars
- [ ] API Gateway: All routes created and deployed
- [ ] API Gateway: CORS enabled on all endpoints
- [ ] EventBridge: Lambda permission added for event triggers
- [ ] Frontend: API URL updated in `exportApi.ts`
- [ ] Test: Instant export working
- [ ] Test: Scheduled report creation working
- [ ] Test: Email notification received

---

Good luck! If you have questions, refer to the AWS documentation or check CloudWatch Logs for detailed error messages.
