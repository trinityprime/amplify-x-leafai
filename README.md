# LeafAI: Amplify x LeafAI
[![Ask DeepWiki](https://devin.ai/assets/askdeepwiki.png)](https://deepwiki.com/trinityprime/amplify-x-leafai)

LeafAI is a comprehensive, AI-driven agricultural management platform designed for enterprise use. It leverages a modern serverless stack on AWS to provide detailed farm reporting, pest detection analysis, and environmental correlation insights. The platform supports multiple user roles, enabling streamlined workflows for administrators, field technicians, and data analysts.

## Features

*   **AI-Powered Leaf Health Analysis**: Upload leaf images for real-time health classification and store detection records.
*   **Advanced Farm Reporting**: Create, view, and manage detailed farm reports on issues like pest infestations, fungal diseases, and nutrient deficiencies.
*   **Interactive Analytics Dashboard**: Visualize farm health with an interactive heat map of tent locations, trend charts, and categorical breakdowns of reported issues.
*   **AI-Generated Summaries**: Get concise, actionable insights generated from your farm reports, powered by Amazon Bedrock.
*   **Weather Correlation Engine**: Fetches real-time weather data from OpenWeatherMap and correlates it with pest detection records to identify environmental risk factors.
*   **Data Export & Scheduled Reporting**: Generate on-demand CSV exports of detection data and configure automated weekly or monthly reports delivered via email.
*   **Role-Based Access Control (RBAC)**: Securely manage user access with distinct roles for Admins, Data Analysts, and Field Technicians.
*   **Secure Authentication**: Features robust user authentication managed by AWS Cognito, protected by Cloudflare Turnstile CAPTCHA verification.

## Tech Stack

*   **Frontend**: React, Vite, TypeScript, Tailwind CSS, Recharts (for charts), AWS Amplify UI
*   **Backend**:
    *   **Core Services**: AWS Amplify (Gen 2), AWS Cognito, AWS AppSync (GraphQL), AWS DynamoDB
    *   **Custom Features**: AWS Lambda, Amazon API Gateway, AWS S3, AWS SNS, AWS EventBridge, Amazon Secrets Manager
    *   **AI/ML**: Amazon Bedrock for report summaries.

## Architecture Overview

LeafAI is a full-stack serverless application built on AWS.

*   The **React frontend** provides the user interface and interacts with the backend through various APIs.
*   **AWS Amplify (Gen 2)** provisions and manages the core backend infrastructure, including:
    *   **Authentication**: AWS Cognito for user sign-up, sign-in, and role management.
    *   **Data API**: AWS AppSync and DynamoDB for managing farm report data.
    *   **Functions**: A CAPTCHA verification Lambda function.
*   **Custom Microservices** are implemented using AWS Lambda and Amazon API Gateway to handle specialized features:
    *   **Image Upload & Export**: A set of Lambdas for handling image uploads, data exports, and scheduled reporting.
    *   **Weather Integration**: A dedicated Lambda for fetching data from the OpenWeatherMap API and performing correlation analysis.
    *   **User Management**: Admin-only APIs for creating and managing users in Cognito.
*   **AWS S3** is used for storing uploaded leaf images and generated CSV reports.
*   **AWS EventBridge** is used to trigger scheduled tasks, such as periodic weather data fetching and automated report generation.
*   **AWS SNS** sends email notifications for scheduled reports.

### Prerequisites

*   Node.js (v20.x or later)
*   AWS Account and configured AWS CLI
*   [AWS Amplify CLI](https://docs.amplify.aws/gen2/start/quickstart/) (`npm install -g @aws-amplify/cli`)

### 1. Clone the Repository

```bash
git clone https://github.com/trinityprime/amplify-x-leafai.git
cd amplify-x-leafai
```

### 2. Configure Environment Variables

Create a `.env` file in the root of the project for your Cloudflare Turnstile site key.

```
VITE_TURNSTILE_SITE_KEY=YOUR_TURNSTILE_SITE_KEY
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Deploy Core Amplify Backend

This step provisions the authentication (Cognito), the farm report data model (DynamoDB/AppSync), and the CAPTCHA verification function.

```bash
npx ampx deploy
```
This will generate an `amplify_outputs.json` file in the root directory, which configures the frontend client.

### 5. Run the Frontend

Once all backends are deployed and configured, run the frontend application locally:

```bash
npm run dev
```

## Usage Guide

1.  **Admin User**: Log in with your initial user (which should be an Admin). Navigate to the **Users** dashboard to create new users.
    *   Create users with the `DATA_ANALYST` role to access reporting and analytics dashboards.
    *   Create users with the `FIELD_TECH` role to access the image upload functionality.
2.  **Field Technician**: Log in and navigate to the **Upload** page to submit new leaf images for analysis and record-keeping.
3.  **Data Analyst**: Log in to access the main features:
    *   **New Report**: Create a new farm report by selecting a location on the interactive map.
    *   **Dashboard**: View the farm heat map, charts on issue trends, and AI-generated insights.
    *   **Export**: Generate on-demand CSV exports with custom filters.
    *   **Weather**: View the weather dashboard and run correlation analysis between weather patterns and pest detections.

## Contributing

Contributions are welcome! Please read through our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on reporting bugs, requesting features, and submitting pull requests.

## License

This project is licensed under the MIT-0 License. See the [LICENSE](LICENSE) file for details.