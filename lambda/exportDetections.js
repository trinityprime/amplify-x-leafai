/**
 * exportDetections Lambda Function
 *
 * Handles instant CSV exports and scheduled report generation
 *
 * API Gateway Routes:
 * - POST /exports - Generate instant CSV export
 * - GET /exports/{id} - Get export details/download URL
 * - DELETE /exports/{id} - Delete an export
 *
 * Also triggered by EventBridge for scheduled reports
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
  PutCommand,
  GetCommand,
  DeleteCommand
} = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { v4: uuidv4 } = require('uuid');

// Initialize clients
const dynamoClient = new DynamoDBClient({ region: 'ap-southeast-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: 'ap-southeast-1' });
const snsClient = new SNSClient({ region: 'ap-southeast-1' });

// Environment variables (set these in Lambda configuration)
const DETECTIONS_TABLE = process.env.DETECTIONS_TABLE || 'Todo-6mpvkcmhjrhyngqh4kptka4n6a-NONE';
const EXPORTS_TABLE = process.env.EXPORTS_TABLE || 'LeafAI-Exports';
const EXPORTS_BUCKET = process.env.EXPORTS_BUCKET || 'leafai-exports-bucket';
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN || '';

// CORS headers
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  // Handle OPTIONS for CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Check if this is an EventBridge scheduled trigger
    if (event.source === 'aws.events' || event['detail-type']) {
      return await handleScheduledExport(event);
    }

    // Handle API Gateway requests
    const { httpMethod, resource, pathParameters, body } = event;
    const parsedBody = body ? JSON.parse(body) : {};

    // POST /exports - Create instant export
    if (httpMethod === 'POST' && resource === '/exports') {
      return await createInstantExport(parsedBody);
    }

    // GET /exports/{id} - Get export details
    if (httpMethod === 'GET' && resource === '/exports/{id}') {
      const exportId = pathParameters?.id;
      return await getExport(exportId);
    }

    // DELETE /exports/{id} - Delete export
    if (httpMethod === 'DELETE' && resource === '/exports/{id}') {
      const exportId = pathParameters?.id;
      return await deleteExport(exportId);
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid request' })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

/**
 * Create an instant CSV export
 */
async function createInstantExport(params) {
  const { filters = {}, userEmail } = params;

  // Query detections with filters
  const detections = await queryDetections(filters, userEmail);

  // Calculate summary statistics
  const summary = calculateSummary(detections);

  // Generate CSV content
  const csvContent = generateCSV(detections, summary);

  // Generate unique export ID and S3 key
  const exportId = `export-${uuidv4()}`;
  const s3Key = `exports/${userEmail}/${exportId}.csv`;

  // Upload CSV to S3
  await s3Client.send(new PutObjectCommand({
    Bucket: EXPORTS_BUCKET,
    Key: s3Key,
    Body: csvContent,
    ContentType: 'text/csv',
    Metadata: {
      userEmail: userEmail || 'unknown',
      createdAt: new Date().toISOString()
    }
  }));

  // Generate pre-signed download URL (valid for 1 hour)
  const downloadUrl = await getSignedUrl(s3Client, new GetObjectCommand({
    Bucket: EXPORTS_BUCKET,
    Key: s3Key
  }), { expiresIn: 3600 });

  // Save export record to DynamoDB
  const exportRecord = {
    exportId,
    userId: userEmail,
    s3Key,
    filters,
    totalRecords: detections.length,
    summary,
    createdAt: new Date().toISOString()
  };

  await docClient.send(new PutCommand({
    TableName: EXPORTS_TABLE,
    Item: exportRecord
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      exportId,
      downloadUrl,
      totalRecords: detections.length,
      summary,
      createdAt: exportRecord.createdAt
    })
  };
}

/**
 * Get export details and refresh download URL
 */
async function getExport(exportId) {
  const result = await docClient.send(new GetCommand({
    TableName: EXPORTS_TABLE,
    Key: { exportId }
  }));

  if (!result.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Export not found' })
    };
  }

  // Generate fresh download URL
  const downloadUrl = await getSignedUrl(s3Client, new GetObjectCommand({
    Bucket: EXPORTS_BUCKET,
    Key: result.Item.s3Key
  }), { expiresIn: 3600 });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ...result.Item,
      downloadUrl
    })
  };
}

/**
 * Delete an export
 */
async function deleteExport(exportId) {
  // Get export record first
  const result = await docClient.send(new GetCommand({
    TableName: EXPORTS_TABLE,
    Key: { exportId }
  }));

  if (!result.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Export not found' })
    };
  }

  // Delete from S3
  await s3Client.send(new DeleteObjectCommand({
    Bucket: EXPORTS_BUCKET,
    Key: result.Item.s3Key
  }));

  // Delete from DynamoDB
  await docClient.send(new DeleteCommand({
    TableName: EXPORTS_TABLE,
    Key: { exportId }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Export deleted successfully' })
  };
}

/**
 * Handle EventBridge scheduled report trigger
 */
async function handleScheduledExport(event) {
  console.log('Processing scheduled export:', event);

  // Extract schedule details from EventBridge event
  const { scheduleId, userId, email, filters } = event.detail || {};

  if (!scheduleId || !userId) {
    console.error('Missing required schedule details');
    return { statusCode: 400, body: 'Missing schedule details' };
  }

  // Query detections
  const detections = await queryDetections(filters || {}, userId);
  const summary = calculateSummary(detections);
  const csvContent = generateCSV(detections, summary);

  // Generate export
  const exportId = `scheduled-${scheduleId}-${Date.now()}`;
  const s3Key = `scheduled-exports/${userId}/${exportId}.csv`;

  await s3Client.send(new PutObjectCommand({
    Bucket: EXPORTS_BUCKET,
    Key: s3Key,
    Body: csvContent,
    ContentType: 'text/csv'
  }));

  // Generate download URL
  const downloadUrl = await getSignedUrl(s3Client, new GetObjectCommand({
    Bucket: EXPORTS_BUCKET,
    Key: s3Key
  }), { expiresIn: 604800 }); // 7 days for scheduled reports

  // Send email notification via SNS
  if (SNS_TOPIC_ARN && email) {
    await sendEmailNotification(email, downloadUrl, summary);
  }

  console.log('Scheduled export completed:', exportId);
  return { statusCode: 200, body: 'Scheduled export completed' };
}

/**
 * Query detections from DynamoDB with filters
 */
async function queryDetections(filters, userEmail) {
  const { startDate, endDate, farmerId, location, status } = filters;

  // Build filter expression
  let filterExpressions = [];
  let expressionAttributeNames = {};
  let expressionAttributeValues = {};

  // Filter by user email (owner)
  if (userEmail) {
    filterExpressions.push('#owner = :owner');
    expressionAttributeNames['#owner'] = 'owner';
    expressionAttributeValues[':owner'] = userEmail;
  }

  // Filter by date range
  if (startDate) {
    filterExpressions.push('createdAt >= :startDate');
    expressionAttributeValues[':startDate'] = startDate;
  }
  if (endDate) {
    // Add one day to include the full end date
    const endDateObj = new Date(endDate);
    endDateObj.setDate(endDateObj.getDate() + 1);
    filterExpressions.push('createdAt < :endDate');
    expressionAttributeValues[':endDate'] = endDateObj.toISOString().split('T')[0];
  }

  // Filter by farmerId
  if (farmerId) {
    filterExpressions.push('farmerId = :farmerId');
    expressionAttributeValues[':farmerId'] = farmerId;
  }

  // Filter by location
  if (location) {
    filterExpressions.push('#loc = :location');
    expressionAttributeNames['#loc'] = 'location';
    expressionAttributeValues[':location'] = location;
  }

  // Filter by status (label)
  if (status && status !== 'all') {
    filterExpressions.push('#lbl = :status');
    expressionAttributeNames['#lbl'] = 'label';
    expressionAttributeValues[':status'] = status;
  }

  // Build scan params
  const scanParams = {
    TableName: DETECTIONS_TABLE
  };

  if (filterExpressions.length > 0) {
    scanParams.FilterExpression = filterExpressions.join(' AND ');
  }
  if (Object.keys(expressionAttributeNames).length > 0) {
    scanParams.ExpressionAttributeNames = expressionAttributeNames;
  }
  if (Object.keys(expressionAttributeValues).length > 0) {
    scanParams.ExpressionAttributeValues = expressionAttributeValues;
  }

  console.log('Scan params:', JSON.stringify(scanParams, null, 2));

  // Execute scan (consider pagination for large datasets)
  const result = await docClient.send(new ScanCommand(scanParams));

  return result.Items || [];
}

/**
 * Calculate summary statistics
 */
function calculateSummary(detections) {
  const total = detections.length;
  const good = detections.filter(d => d.label === 'good').length;
  const bad = detections.filter(d => d.label === 'bad').length;

  return {
    totalDetections: total,
    goodLeaves: good,
    badLeaves: bad,
    goodPercentage: total > 0 ? Math.round((good / total) * 100) : 0,
    badPercentage: total > 0 ? Math.round((bad / total) * 100) : 0
  };
}

/**
 * Generate CSV content
 */
function generateCSV(detections, summary) {
  // CSV Header
  const header = 'Detection ID,Farmer,Location,Status,Pest Type,Date,Photo URL';

  // CSV Rows
  const rows = detections.map(d => {
    return [
      d.id || '',
      d.farmerId || '',
      d.location || '',
      d.label || '',
      d.pestType || '',
      d.createdAt || '',
      d.photoUrl || ''
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
  });

  // Summary section
  const summarySection = [
    '',
    '--- SUMMARY ---',
    `Total Detections,${summary.totalDetections}`,
    `Good Leaves,${summary.goodLeaves} (${summary.goodPercentage}%)`,
    `Bad Leaves,${summary.badLeaves} (${summary.badPercentage}%)`,
    `Generated,${new Date().toISOString()}`
  ];

  return [header, ...rows, ...summarySection].join('\n');
}

/**
 * Send email notification via SNS
 */
async function sendEmailNotification(email, downloadUrl, summary) {
  const message = `
Your LeafAI Scheduled Report is Ready!

Summary:
- Total Detections: ${summary.totalDetections}
- Healthy Leaves: ${summary.goodLeaves} (${summary.goodPercentage}%)
- Diseased Leaves: ${summary.badLeaves} (${summary.badPercentage}%)

Download your report here (valid for 7 days):
${downloadUrl}

---
LeafCorp AI - Enterprise Agricultural Management
  `.trim();

  await snsClient.send(new PublishCommand({
    TopicArn: SNS_TOPIC_ARN,
    Message: JSON.stringify({
      default: message,
      email: message
    }),
    MessageStructure: 'json',
    Subject: 'Your LeafAI Report is Ready',
    MessageAttributes: {
      email: {
        DataType: 'String',
        StringValue: email
      }
    }
  }));

  console.log('Email notification sent to:', email);
}
