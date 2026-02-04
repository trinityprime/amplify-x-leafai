# LeafAI Weather Integration - AWS Setup Guide

This guide walks you through setting up the AWS infrastructure for the Weather Integration feature (Feature 2).

## Overview

The Weather Integration system requires:
1. **2 DynamoDB Tables** - Store weather data and correlation analyses
2. **1 Lambda Function** - Handle all weather operations
3. **API Gateway Routes** - REST endpoints for the frontend
4. **Secrets Manager** - Store OpenWeatherMap API key
5. **EventBridge Rule** - Schedule automatic weather fetching

---

## Step 1: Get OpenWeatherMap API Key

1. Go to https://openweathermap.org/api
2. Click "Sign Up" and create a free account
3. After signing in, go to "API keys" section
4. Copy your API key (looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)
5. **IMPORTANT**: The free tier allows 1,000 API calls/day - more than enough for this feature

---

## Step 2: Store API Key in Secrets Manager

1. Open AWS Console → **Secrets Manager**
2. Click **"Store a new secret"**
3. Select **"Other type of secret"**
4. Add key-value pair:
   - Key: `apiKey`
   - Value: `your-openweathermap-api-key`
5. Click **Next**
6. Secret name: `LeafAI/OpenWeatherMap`
7. Click **Next** → **Next** → **Store**

---

## Step 3: Create DynamoDB Tables

### Table 1: LeafAI-WeatherData

1. Open AWS Console → **DynamoDB**
2. Click **"Create table"**
3. Settings:
   - Table name: `LeafAI-WeatherData`
   - Partition key: `weatherId` (String)
4. Leave other settings as default
5. Click **"Create table"**

### Table 2: LeafAI-WeatherCorrelations

1. Click **"Create table"**
2. Settings:
   - Table name: `LeafAI-WeatherCorrelations`
   - Partition key: `correlationId` (String)
3. Leave other settings as default
4. Click **"Create table"**

---

## Step 4: Create Lambda Function

### 4.1 Create the Function

1. Open AWS Console → **Lambda**
2. Click **"Create function"**
3. Settings:
   - Function name: `LeafAI-WeatherIntegration`
   - Runtime: `Node.js 20.x`
   - Architecture: `x86_64`
4. Click **"Create function"**

### 4.2 Upload the Code

**Option A: Upload ZIP (Recommended for production)**

1. In your local `lambda/` folder, run:
   ```bash
   cd lambda
   npm install
   npm run zip-weather
   ```
2. In Lambda console, click **"Upload from"** → **".zip file"**
3. Upload the `weatherIntegration.zip` file

**Option B: Copy-paste code (Quick testing)**

1. In the Lambda console, open the Code tab
2. Replace the code with the content of `lambda/weatherIntegration.js`
3. Click **"Deploy"**

### 4.3 Configure Environment Variables

1. Go to **Configuration** → **Environment variables**
2. Click **"Edit"** → **"Add environment variable"**
3. Add these variables:
   | Key | Value |
   |-----|-------|
   | `WEATHER_TABLE` | `LeafAI-WeatherData` |
   | `CORRELATIONS_TABLE` | `LeafAI-WeatherCorrelations` |
   | `DETECTIONS_TABLE` | `Todo-6mpvkcmhjrhyngqh4kptka4n6a-NONE` |
   | `SECRET_NAME` | `LeafAI/OpenWeatherMap` |
   | `DEFAULT_LOCATION` | `Singapore` |

4. Click **"Save"**

### 4.4 Configure Lambda Permissions (IAM Role)

1. Go to **Configuration** → **Permissions**
2. Click on the **Role name** link (opens IAM console)
3. Click **"Add permissions"** → **"Attach policies"**
4. Search and add these policies:
   - `AmazonDynamoDBFullAccess`
   - `SecretsManagerReadWrite`
5. Click **"Add permissions"**

### 4.5 Configure Timeout

1. Go to **Configuration** → **General configuration**
2. Click **"Edit"**
3. Set Timeout to `30 seconds`
4. Click **"Save"**

---

## Step 5: Create API Gateway

### 5.1 Create or Reuse API

**Option A: Add to existing API (Recommended)**
1. Open AWS Console → **API Gateway**
2. Find your existing API (e.g., `upload-LeafAI-Image-API`)
3. Click on it to open

**Option B: Create new API**
1. Click **"Create API"**
2. Select **"REST API"** → **"Build"**
3. Settings:
   - API name: `LeafAI-Weather-API`
   - Endpoint type: `Regional`
4. Click **"Create API"**

### 5.2 Create Resources and Methods

Create this structure:
```
/weather
  /fetch         → POST
  /current       → GET
  /history       → GET
  /history/{date} → DELETE
  /correlations  → GET, POST
```

**Steps for each endpoint:**

1. Click **"Create Resource"**
2. Resource name: `weather`
3. Click **"Create Resource"**

4. Select `/weather`, click **"Create Resource"**
5. Resource name: `fetch`
6. Click **"Create Resource"**

7. Select `/weather/fetch`, click **"Create Method"**
8. Select **POST**
9. Integration type: **Lambda Function**
10. Lambda function: `LeafAI-WeatherIntegration`
11. Click **"Create method"**

Repeat for all endpoints:

| Resource | Method | Lambda |
|----------|--------|--------|
| `/weather/fetch` | POST | LeafAI-WeatherIntegration |
| `/weather/current` | GET | LeafAI-WeatherIntegration |
| `/weather/history` | GET | LeafAI-WeatherIntegration |
| `/weather/history/{date}` | DELETE | LeafAI-WeatherIntegration |
| `/weather/correlations` | GET | LeafAI-WeatherIntegration |
| `/weather/correlations` | POST | LeafAI-WeatherIntegration |

### 5.3 Enable CORS for Each Endpoint

For each resource:
1. Select the resource
2. Click **"Enable CORS"**
3. Check all methods (GET, POST, DELETE, OPTIONS)
4. Click **"Save"**

### 5.4 Deploy the API

1. Click **"Deploy API"**
2. Stage: Select existing stage (e.g., `prod`) or create new
3. Click **"Deploy"**
4. **Copy the Invoke URL** (you'll need this for the frontend)

Example URL: `https://abc123xyz.execute-api.ap-southeast-1.amazonaws.com/prod`

---

## Step 6: Update Frontend API URL

1. Open `src/hooks/weatherApi.ts`
2. Find this line:
   ```typescript
   const WEATHER_API_BASE_URL = 'https://YOUR-API-GATEWAY-ID.execute-api.ap-southeast-1.amazonaws.com/prod';
   ```
3. Replace with your actual API Gateway URL:
   ```typescript
   const WEATHER_API_BASE_URL = 'https://abc123xyz.execute-api.ap-southeast-1.amazonaws.com/prod';
   ```

---

## Step 7: Set Up EventBridge for Automatic Weather Fetching

1. Open AWS Console → **Amazon EventBridge**
2. Click **"Rules"** → **"Create rule"**
3. Settings:
   - Name: `LeafAI-WeatherFetch-Every6Hours`
   - Description: `Fetch weather data every 6 hours for LeafAI`
   - Event bus: `default`
4. Click **"Next"**
5. Select **"Schedule"**
6. Schedule pattern: **"A schedule that runs at a regular rate, such as every 10 minutes"**
7. Rate expression: `rate(6 hours)`
8. Click **"Next"**
9. Target:
   - Target type: **"AWS service"**
   - Select target: **"Lambda function"**
   - Function: `LeafAI-WeatherIntegration`
10. Configure input (optional):
    ```json
    {
      "source": "aws.events",
      "detail-type": "Scheduled Event",
      "detail": {
        "location": "Singapore"
      }
    }
    ```
11. Click **"Next"** → **"Next"** → **"Create rule"**

---

## Step 8: Test the Setup

### Test Lambda Function Directly

1. Open Lambda → `LeafAI-WeatherIntegration`
2. Go to **"Test"** tab
3. Create test event:
   ```json
   {
     "httpMethod": "POST",
     "resource": "/weather/fetch",
     "body": "{\"location\": \"Singapore\"}"
   }
   ```
4. Click **"Test"**
5. Check the response - should see weather data

### Test API Gateway

Use curl or Postman:

```bash
# Fetch weather
curl -X POST "https://YOUR-API-URL/prod/weather/fetch" \
  -H "Content-Type: application/json" \
  -d '{"location": "Singapore"}'

# Get current weather
curl "https://YOUR-API-URL/prod/weather/current"

# Get weather history
curl "https://YOUR-API-URL/prod/weather/history?startDate=2026-01-01&endDate=2026-01-31"

# Analyze correlations
curl -X POST "https://YOUR-API-URL/prod/weather/correlations" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2026-01-01", "endDate": "2026-01-31"}'
```

### Test Frontend

1. Run `npm run dev`
2. Login as a DATA_ANALYST user
3. Click "Weather" in the navigation
4. Click "Refresh Data" to fetch weather
5. Go to "Correlation Analysis"
6. Set date range and click "Run Correlation Analysis"

---

## Troubleshooting

### "Failed to fetch weather" Error
- Check if OpenWeatherMap API key is correct in Secrets Manager
- Verify Lambda has `SecretsManagerReadWrite` permission
- Check Lambda CloudWatch logs for detailed error

### "No weather data found" Error
- Weather data hasn't been fetched yet
- Click "Refresh Data" button or trigger Lambda manually

### CORS Errors
- Ensure CORS is enabled for all API Gateway endpoints
- Verify OPTIONS method exists for each resource
- Check that Lambda returns CORS headers

### "Insufficient data" in Correlation Analysis
- You need both weather data AND detection data for the same time period
- Ensure detections have `createdAt` dates that match weather data dates
- Upload more leaf detections to improve analysis accuracy

---

## Cost Estimation

With Free Tier (first 12 months):
- Lambda: 1M requests/month FREE
- DynamoDB: 25GB storage FREE
- API Gateway: 1M calls/month FREE
- Secrets Manager: $0.40/month for 1 secret
- EventBridge: 4 invocations/day = FREE

**Estimated monthly cost: ~$0.40**

---

## Files Created/Modified

### New Files
- `lambda/weatherIntegration.js` - Lambda function
- `src/hooks/weatherApi.ts` - Frontend API client
- `src/pages/WeatherDashboard.tsx` - Weather dashboard page
- `src/pages/CorrelationAnalysis.tsx` - Correlation analysis page

### Modified Files
- `lambda/package.json` - Added Secrets Manager dependency
- `src/components/layout/Layout.tsx` - Added Weather nav link
- `src/main.tsx` - Added Weather routes

---

## Quick Reference

| AWS Service | Resource Name |
|-------------|---------------|
| Lambda | `LeafAI-WeatherIntegration` |
| DynamoDB Table 1 | `LeafAI-WeatherData` |
| DynamoDB Table 2 | `LeafAI-WeatherCorrelations` |
| Secrets Manager | `LeafAI/OpenWeatherMap` |
| EventBridge Rule | `LeafAI-WeatherFetch-Every6Hours` |
| API Gateway Stage | `/prod/weather/*` |

---

## Defense for Mr. Wong

**Feature 1 (Training Data Upload):**
- Internal farm detection data
- User uploads leaf images
- Stores detection records (good/bad)
- Single data source (farm data)

**Feature 2 (Weather Integration):**
- **External** environmental data from OpenWeatherMap API
- Completely separate DynamoDB tables
- Automatic data collection via EventBridge
- **Correlation analytics** - joins weather + detections
- **Predictive insights** - identifies risky conditions
- Enables preventive action based on forecasts

**Key Differentiators:**
1. External API integration (OpenWeatherMap)
2. Scheduled automation (EventBridge)
3. Advanced analytics (correlation analysis)
4. Predictive capabilities (pest risk indicators)
5. Environmental intelligence (weather patterns)

This is NOT an improvement to Feature 1 - it's a completely independent data pipeline that provides environmental context for pest predictions.
