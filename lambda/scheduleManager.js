/**
 * scheduleManager Lambda Function
 *
 * Handles CRUD operations for scheduled reports
 * Manages EventBridge rules for automated triggers
 *
 * API Gateway Routes:
 * - POST /exports/schedules - Create new schedule
 * - GET /exports/schedules - List all schedules for user
 * - GET /exports/schedules/{id} - Get schedule details
 * - PUT /exports/schedules/{id} - Update schedule
 * - DELETE /exports/schedules/{id} - Delete schedule
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand
} = require('@aws-sdk/lib-dynamodb');
const {
  EventBridgeClient,
  PutRuleCommand,
  PutTargetsCommand,
  DeleteRuleCommand,
  RemoveTargetsCommand,
  DisableRuleCommand,
  EnableRuleCommand
} = require('@aws-sdk/client-eventbridge');
const { v4: uuidv4 } = require('uuid');

// Initialize clients
const dynamoClient = new DynamoDBClient({ region: 'ap-southeast-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const eventBridgeClient = new EventBridgeClient({ region: 'ap-southeast-1' });

// Environment variables (set these in Lambda configuration)
const SCHEDULES_TABLE = process.env.SCHEDULES_TABLE || 'LeafAI-ScheduledReports';
const EXPORT_LAMBDA_ARN = process.env.EXPORT_LAMBDA_ARN || '';

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
    const { httpMethod, resource, pathParameters, queryStringParameters, body } = event;
    const parsedBody = body ? JSON.parse(body) : {};

    // POST /exports/schedules - Create new schedule
    if (httpMethod === 'POST' && resource === '/exports/schedules') {
      return await createSchedule(parsedBody);
    }

    // GET /exports/schedules - List schedules
    if (httpMethod === 'GET' && resource === '/exports/schedules') {
      const userEmail = queryStringParameters?.userEmail;
      return await listSchedules(userEmail);
    }

    // GET /exports/schedules/{id} - Get single schedule
    if (httpMethod === 'GET' && resource === '/exports/schedules/{id}') {
      const scheduleId = pathParameters?.id;
      return await getSchedule(scheduleId);
    }

    // PUT /exports/schedules/{id} - Update schedule
    if (httpMethod === 'PUT' && resource === '/exports/schedules/{id}') {
      const scheduleId = pathParameters?.id;
      return await updateSchedule(scheduleId, parsedBody);
    }

    // DELETE /exports/schedules/{id} - Delete schedule
    if (httpMethod === 'DELETE' && resource === '/exports/schedules/{id}') {
      const scheduleId = pathParameters?.id;
      return await deleteSchedule(scheduleId);
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
 * Create a new scheduled report
 */
async function createSchedule(params) {
  const { frequency, filters = {}, email, userEmail } = params;

  if (!frequency || !email) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'frequency and email are required' })
    };
  }

  const scheduleId = `sched-${uuidv4()}`;
  const ruleName = `LeafAI-Report-${scheduleId}`;
  const now = new Date();

  // Calculate next run time
  const nextRun = calculateNextRun(frequency);

  // Create EventBridge rule
  const cronExpression = getCronExpression(frequency);

  await eventBridgeClient.send(new PutRuleCommand({
    Name: ruleName,
    ScheduleExpression: cronExpression,
    State: 'ENABLED',
    Description: `LeafAI scheduled report for ${email}`
  }));

  // Add Lambda target to the rule
  if (EXPORT_LAMBDA_ARN) {
    await eventBridgeClient.send(new PutTargetsCommand({
      Rule: ruleName,
      Targets: [{
        Id: `target-${scheduleId}`,
        Arn: EXPORT_LAMBDA_ARN,
        Input: JSON.stringify({
          source: 'aws.events',
          'detail-type': 'Scheduled Report',
          detail: {
            scheduleId,
            userId: userEmail,
            email,
            filters
          }
        })
      }]
    }));
  }

  // Save schedule to DynamoDB
  const scheduleRecord = {
    scheduleId,
    userId: userEmail,
    frequency,
    filters,
    email,
    active: true,
    ruleName,
    nextRun: nextRun.toISOString(),
    createdAt: now.toISOString()
  };

  await docClient.send(new PutCommand({
    TableName: SCHEDULES_TABLE,
    Item: scheduleRecord
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(scheduleRecord)
  };
}

/**
 * List all schedules for a user
 */
async function listSchedules(userEmail) {
  if (!userEmail) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'userEmail is required' })
    };
  }

  // Query by userId GSI (you'll need to create this GSI)
  // For now, using scan with filter (less efficient but works without GSI)
  const result = await docClient.send(new QueryCommand({
    TableName: SCHEDULES_TABLE,
    IndexName: 'userId-index',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userEmail
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      schedules: result.Items || []
    })
  };
}

/**
 * Get a single schedule by ID
 */
async function getSchedule(scheduleId) {
  const result = await docClient.send(new GetCommand({
    TableName: SCHEDULES_TABLE,
    Key: { scheduleId }
  }));

  if (!result.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Schedule not found' })
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Item)
  };
}

/**
 * Update a schedule
 */
async function updateSchedule(scheduleId, updates) {
  // Get existing schedule
  const existingResult = await docClient.send(new GetCommand({
    TableName: SCHEDULES_TABLE,
    Key: { scheduleId }
  }));

  if (!existingResult.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Schedule not found' })
    };
  }

  const existing = existingResult.Item;
  const { frequency, filters, email, active } = updates;

  // Build update expression
  let updateExpressions = [];
  let expressionAttributeNames = {};
  let expressionAttributeValues = {};

  if (frequency !== undefined) {
    updateExpressions.push('#freq = :frequency');
    expressionAttributeNames['#freq'] = 'frequency';
    expressionAttributeValues[':frequency'] = frequency;

    // Update EventBridge cron if frequency changed
    if (frequency !== existing.frequency) {
      const cronExpression = getCronExpression(frequency);
      await eventBridgeClient.send(new PutRuleCommand({
        Name: existing.ruleName,
        ScheduleExpression: cronExpression,
        State: existing.active ? 'ENABLED' : 'DISABLED'
      }));

      // Recalculate next run
      const nextRun = calculateNextRun(frequency);
      updateExpressions.push('nextRun = :nextRun');
      expressionAttributeValues[':nextRun'] = nextRun.toISOString();
    }
  }

  if (filters !== undefined) {
    updateExpressions.push('filters = :filters');
    expressionAttributeValues[':filters'] = filters;

    // Update EventBridge target with new filters
    if (EXPORT_LAMBDA_ARN) {
      await eventBridgeClient.send(new PutTargetsCommand({
        Rule: existing.ruleName,
        Targets: [{
          Id: `target-${scheduleId}`,
          Arn: EXPORT_LAMBDA_ARN,
          Input: JSON.stringify({
            source: 'aws.events',
            'detail-type': 'Scheduled Report',
            detail: {
              scheduleId,
              userId: existing.userId,
              email: email || existing.email,
              filters
            }
          })
        }]
      }));
    }
  }

  if (email !== undefined) {
    updateExpressions.push('email = :email');
    expressionAttributeValues[':email'] = email;
  }

  if (active !== undefined) {
    updateExpressions.push('active = :active');
    expressionAttributeValues[':active'] = active;

    // Enable/disable EventBridge rule
    if (active) {
      await eventBridgeClient.send(new EnableRuleCommand({
        Name: existing.ruleName
      }));
    } else {
      await eventBridgeClient.send(new DisableRuleCommand({
        Name: existing.ruleName
      }));
    }
  }

  if (updateExpressions.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'No updates provided' })
    };
  }

  // Update DynamoDB
  const updateResult = await docClient.send(new UpdateCommand({
    TableName: SCHEDULES_TABLE,
    Key: { scheduleId },
    UpdateExpression: 'SET ' + updateExpressions.join(', '),
    ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(updateResult.Attributes)
  };
}

/**
 * Delete a schedule
 */
async function deleteSchedule(scheduleId) {
  // Get existing schedule
  const existingResult = await docClient.send(new GetCommand({
    TableName: SCHEDULES_TABLE,
    Key: { scheduleId }
  }));

  if (!existingResult.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Schedule not found' })
    };
  }

  const existing = existingResult.Item;

  // Remove EventBridge target
  try {
    await eventBridgeClient.send(new RemoveTargetsCommand({
      Rule: existing.ruleName,
      Ids: [`target-${scheduleId}`]
    }));
  } catch (err) {
    console.warn('Failed to remove target:', err.message);
  }

  // Delete EventBridge rule
  try {
    await eventBridgeClient.send(new DeleteRuleCommand({
      Name: existing.ruleName
    }));
  } catch (err) {
    console.warn('Failed to delete rule:', err.message);
  }

  // Delete from DynamoDB
  await docClient.send(new DeleteCommand({
    TableName: SCHEDULES_TABLE,
    Key: { scheduleId }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Schedule deleted successfully' })
  };
}

/**
 * Get cron expression for EventBridge based on frequency
 */
function getCronExpression(frequency) {
  if (frequency === 'weekly') {
    // Every Monday at 9:00 AM UTC+8 (1:00 AM UTC)
    return 'cron(0 1 ? * MON *)';
  } else if (frequency === 'monthly') {
    // 1st of each month at 9:00 AM UTC+8 (1:00 AM UTC)
    return 'cron(0 1 1 * ? *)';
  }
  throw new Error('Invalid frequency. Must be "weekly" or "monthly"');
}

/**
 * Calculate next run date based on frequency
 */
function calculateNextRun(frequency) {
  const now = new Date();

  if (frequency === 'weekly') {
    // Next Monday at 9:00 AM Singapore time
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(9, 0, 0, 0);
    return nextMonday;
  } else if (frequency === 'monthly') {
    // 1st of next month at 9:00 AM Singapore time
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0, 0);
    return nextMonth;
  }

  throw new Error('Invalid frequency');
}
