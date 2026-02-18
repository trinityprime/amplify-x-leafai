/**
 * weatherIntegration Lambda Function
 *
 * Handles weather data fetching, storage, and correlation analysis
 * for LeafAI pest prediction system.
 *
 * API Gateway Routes:
 * - POST /weather/fetch     - Manually trigger weather data fetch
 * - GET /weather/current    - Get current/latest weather for location
 * - GET /weather/history    - Get historical weather data (with date filters)
 * - POST /weather/correlations - Generate correlation analysis
 * - GET /weather/correlations  - View stored correlation analyses
 * - DELETE /weather/history/{date} - Delete old weather records
 *
 * Also triggered by EventBridge for scheduled weather fetching (every 6 hours)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
  PutCommand,
  GetCommand,
  DeleteCommand,
  BatchWriteCommand
} = require('@aws-sdk/lib-dynamodb');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const crypto = require('crypto');

// Generate UUID using built-in crypto module (no external dependency needed)
const uuidv4 = () => crypto.randomUUID();

// Initialize clients
const dynamoClient = new DynamoDBClient({ region: 'ap-southeast-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const secretsClient = new SecretsManagerClient({ region: 'ap-southeast-1' });

// Environment variables (set these in Lambda configuration)
const WEATHER_TABLE = process.env.WEATHER_TABLE || 'LeafAI-WeatherData';
const CORRELATIONS_TABLE = process.env.CORRELATIONS_TABLE || 'LeafAI-WeatherCorrelations';
const DETECTIONS_TABLE = process.env.DETECTIONS_TABLE || 'Todo-6mpvkcmhjrhyngqh4kptka4n6a-NONE';
const SECRET_NAME = process.env.SECRET_NAME || 'LeafAI/OpenWeatherMap';
const DEFAULT_LOCATION = process.env.DEFAULT_LOCATION || 'Singapore';

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
      return await handleScheduledFetch(event);
    }

    // Handle API Gateway requests
    const { httpMethod, resource, pathParameters, body, queryStringParameters } = event;
    const parsedBody = body ? JSON.parse(body) : {};

    // POST /weather/fetch - Manual weather fetch
    if (httpMethod === 'POST' && resource === '/weather/fetch') {
      return await fetchWeatherData(parsedBody);
    }

    // GET /weather/current - Get current weather
    if (httpMethod === 'GET' && resource === '/weather/current') {
      return await getCurrentWeather(queryStringParameters);
    }

    // GET /weather/history - Get historical weather
    if (httpMethod === 'GET' && resource === '/weather/history') {
      return await getWeatherHistory(queryStringParameters);
    }

    // POST /weather/correlations - Generate correlation analysis
    if (httpMethod === 'POST' && resource === '/weather/correlations') {
      return await analyzeCorrelations(parsedBody);
    }

    // GET /weather/correlations - Get stored correlations
    if (httpMethod === 'GET' && resource === '/weather/correlations') {
      return await getCorrelations(queryStringParameters);
    }

    // DELETE /weather/history/{date} - Delete weather data for a date
    if (httpMethod === 'DELETE' && resource === '/weather/history/{date}') {
      const date = pathParameters?.date;
      return await deleteWeatherData(date);
    }

    // PUT /weather/correlations/{correlationId} - Update a correlation analysis
    // Handle both /weather/correlations/{correlationId} and /correlations/{correlationId}
    if (httpMethod === 'PUT' && (resource === '/weather/correlations/{correlationId}' || resource === '/correlations/{correlationId}')) {
      const correlationId = pathParameters?.correlationId;
      return await updateCorrelation(correlationId, parsedBody);
    }

    // DELETE /weather/correlations/{correlationId} - Delete a correlation analysis
    if (httpMethod === 'DELETE' && (resource === '/weather/correlations/{correlationId}' || resource === '/correlations/{correlationId}')) {
      const correlationId = pathParameters?.correlationId;
      return await deleteCorrelation(correlationId);
    }

    // POST /weather/correlations/{correlationId}/rerun - Re-run analysis and update existing record
    if (httpMethod === 'POST' && (resource === '/weather/correlations/{correlationId}/rerun' || resource === '/correlations/{correlationId}/rerun')) {
      const correlationId = pathParameters?.correlationId;
      return await rerunCorrelationAnalysis(correlationId, parsedBody);
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
 * Get OpenWeatherMap API key from Secrets Manager
 */
async function getApiKey() {
  try {
    const response = await secretsClient.send(new GetSecretValueCommand({
      SecretId: SECRET_NAME
    }));

    if (response.SecretString) {
      const secret = JSON.parse(response.SecretString);
      return secret.apiKey || secret.OPENWEATHERMAP_API_KEY;
    }
    throw new Error('API key not found in secret');
  } catch (error) {
    console.error('Error fetching API key from Secrets Manager:', error);
    // Fallback to environment variable for testing
    if (process.env.OPENWEATHERMAP_API_KEY) {
      return process.env.OPENWEATHERMAP_API_KEY;
    }
    throw error;
  }
}

/**
 * Fetch weather data from OpenWeatherMap API
 */
async function fetchWeatherData(params) {
  const { location = DEFAULT_LOCATION } = params;

  // Get API key
  const apiKey = await getApiKey();

  // Call OpenWeatherMap API
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`;

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenWeatherMap API error: ${response.status} - ${errorText}`);
  }

  const weatherData = await response.json();

  // Parse response
  const now = new Date();
  const weatherId = `${location.replace(/[^a-zA-Z0-9]/g, '-')}-${now.toISOString().slice(0, 13).replace('T', '-')}`;

  const weatherRecord = {
    weatherId,
    location: `${weatherData.name}, ${weatherData.sys?.country || ''}`.trim(),
    date: now.toISOString(),
    temperature: Math.round(weatherData.main?.temp * 10) / 10, // Celsius
    humidity: weatherData.main?.humidity, // percentage
    rainfall: weatherData.rain?.['1h'] || weatherData.rain?.['3h'] || 0, // mm
    windSpeed: Math.round((weatherData.wind?.speed || 0) * 3.6 * 10) / 10, // Convert m/s to km/h
    conditions: weatherData.weather?.[0]?.main || 'Unknown',
    description: weatherData.weather?.[0]?.description || '',
    pressure: weatherData.main?.pressure, // hPa
    visibility: weatherData.visibility ? weatherData.visibility / 1000 : null, // km
    cloudCover: weatherData.clouds?.all, // percentage
    fetchedAt: now.toISOString()
  };

  // Store in DynamoDB
  await docClient.send(new PutCommand({
    TableName: WEATHER_TABLE,
    Item: weatherRecord
  }));

  console.log('Weather data stored:', weatherId);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Weather data fetched successfully',
      data: weatherRecord
    })
  };
}

/**
 * Handle EventBridge scheduled weather fetch
 */
async function handleScheduledFetch(event) {
  console.log('Processing scheduled weather fetch:', event);

  const location = event.detail?.location || DEFAULT_LOCATION;

  try {
    await fetchWeatherData({ location });
    console.log('Scheduled weather fetch completed for:', location);
    return { statusCode: 200, body: 'Scheduled weather fetch completed' };
  } catch (error) {
    console.error('Scheduled weather fetch failed:', error);
    return { statusCode: 500, body: error.message };
  }
}

/**
 * Get current/latest weather data
 */
async function getCurrentWeather(queryParams) {
  const location = queryParams?.location || DEFAULT_LOCATION;

  // Scan for the most recent weather record for this location
  const result = await docClient.send(new ScanCommand({
    TableName: WEATHER_TABLE,
    FilterExpression: 'contains(#loc, :location)',
    ExpressionAttributeNames: { '#loc': 'location' },
    ExpressionAttributeValues: { ':location': location }
  }));

  if (!result.Items || result.Items.length === 0) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'No weather data found for this location' })
    };
  }

  // Sort by date and get the most recent
  const sorted = result.Items.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      data: sorted[0],
      lastUpdated: sorted[0].fetchedAt
    })
  };
}

/**
 * Get historical weather data
 */
async function getWeatherHistory(queryParams) {
  const { startDate, endDate, location, limit = '100' } = queryParams || {};

  let filterExpressions = [];
  let expressionAttributeNames = {};
  let expressionAttributeValues = {};

  if (startDate) {
    filterExpressions.push('#date >= :startDate');
    expressionAttributeNames['#date'] = 'date';
    expressionAttributeValues[':startDate'] = startDate;
  }

  if (endDate) {
    // Include full end date
    const endDateObj = new Date(endDate);
    endDateObj.setDate(endDateObj.getDate() + 1);
    filterExpressions.push('#date < :endDate');
    expressionAttributeNames['#date'] = 'date';
    expressionAttributeValues[':endDate'] = endDateObj.toISOString().split('T')[0];
  }

  if (location) {
    filterExpressions.push('contains(#loc, :location)');
    expressionAttributeNames['#loc'] = 'location';
    expressionAttributeValues[':location'] = location;
  }

  const scanParams = {
    TableName: WEATHER_TABLE,
    Limit: parseInt(limit)
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

  const result = await docClient.send(new ScanCommand(scanParams));

  // Sort by date descending
  const sorted = (result.Items || []).sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      data: sorted,
      count: sorted.length
    })
  };
}

/**
 * Analyze correlations between weather and pest detections
 */
async function analyzeCorrelations(params) {
  const { startDate, endDate, userEmail } = params;

  // Calculate date range (default: last 30 days)
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Format dates for comparison - use start of day and end of day
  const startDateStr = start.toISOString().split('T')[0]; // "2026-02-01"
  const endDateStr = end.toISOString().split('T')[0]; // "2026-02-01"

  // For end date, we need to include the entire day, so use next day
  const endDatePlusOne = new Date(end);
  endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
  const endDatePlusOneStr = endDatePlusOne.toISOString().split('T')[0];

  console.log('Analyzing correlations for date range:', startDateStr, 'to', endDateStr);

  // Fetch weather data for the period (using begins_with for date matching)
  const weatherResult = await docClient.send(new ScanCommand({
    TableName: WEATHER_TABLE
  }));

  // Filter weather data by date range (in JavaScript for more flexible date comparison)
  const weatherData = (weatherResult.Items || []).filter(w => {
    const weatherDate = w.date.split('T')[0]; // Get just the date part
    return weatherDate >= startDateStr && weatherDate <= endDateStr;
  });

  console.log('Weather data found:', weatherData.length, 'records');

  // Fetch ALL detection data first, then filter
  const detectionResult = await docClient.send(new ScanCommand({
    TableName: DETECTIONS_TABLE
  }));

  // Filter detections by date range (in JavaScript for more flexible date comparison)
  let detections = (detectionResult.Items || []).filter(d => {
    const detectionDate = d.createdAt?.split('T')[0]; // Get just the date part
    return detectionDate >= startDateStr && detectionDate <= endDateStr;
  });

  // Filter by user email if provided
  if (userEmail) {
    detections = detections.filter(d => d.owner === userEmail || d.userEmail === userEmail);
  }

  console.log('Detections found:', detections.length, 'records');

  // Calculate correlations by weather condition
  const correlations = calculateCorrelationsByCondition(weatherData, detections);

  // Generate insights
  const insights = generateInsights(correlations);

  // Store correlation analysis
  const correlationId = `corr-${uuidv4()}`;
  const correlationRecord = {
    correlationId,
    dateRange: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
    weatherDataPoints: weatherData.length,
    totalDetections: detections.length,
    correlations,
    insights,
    userEmail: userEmail || 'all',
    createdAt: new Date().toISOString()
  };

  await docClient.send(new PutCommand({
    TableName: CORRELATIONS_TABLE,
    Item: correlationRecord
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Correlation analysis completed',
      data: correlationRecord
    })
  };
}

/**
 * Calculate correlations by weather conditions
 */
function calculateCorrelationsByCondition(weatherData, detections) {
  // Define condition thresholds (adjusted for Singapore tropical climate)
  const conditions = {
    'High Humidity (>55%)': {
      test: (w) => w.humidity > 55,
      threshold: '>55%'
    },
    'Low Humidity (<50%)': {
      test: (w) => w.humidity < 50,
      threshold: '<50%'
    },
    'Rainy Weather': {
      test: (w) => w.rainfall > 0 || ['Rain', 'Drizzle', 'Thunderstorm'].includes(w.conditions),
      threshold: 'Any rain'
    },
    'Hot Weather (>30C)': {
      test: (w) => w.temperature > 30,
      threshold: '>30C'
    },
    'Warm Weather (28-30C)': {
      test: (w) => w.temperature >= 28 && w.temperature <= 30,
      threshold: '28-30C'
    },
    'Cloudy Conditions': {
      test: (w) => ['Clouds', 'Overcast', 'Mist', 'Fog', 'Haze'].includes(w.conditions) || w.cloudCover > 50,
      threshold: 'Cloudy/Overcast'
    },
    'High Cloud Cover (>70%)': {
      test: (w) => w.cloudCover > 70,
      threshold: '>70%'
    },
    'Clear Conditions': {
      test: (w) => ['Clear', 'Sunny'].includes(w.conditions),
      threshold: 'Clear/Sunny'
    }
  };

  const results = [];

  for (const [conditionName, config] of Object.entries(conditions)) {
    // Get dates matching this weather condition
    const matchingWeatherDates = weatherData
      .filter(w => config.test(w))
      .map(w => w.date.split('T')[0]);

    if (matchingWeatherDates.length === 0) {
      results.push({
        condition: conditionName,
        threshold: config.threshold,
        weatherDays: 0,
        badLeafCount: 0,
        goodLeafCount: 0,
        totalDetections: 0,
        correlationRate: 0,
        sampleSize: 'No data'
      });
      continue;
    }

    // Find detections on those dates
    const matchingDetections = detections.filter(d => {
      const detectionDate = d.createdAt?.split('T')[0];
      return matchingWeatherDates.includes(detectionDate);
    });

    const badLeaves = matchingDetections.filter(d => d.label === 'bad').length;
    const goodLeaves = matchingDetections.filter(d => d.label === 'good').length;
    const total = matchingDetections.length;

    results.push({
      condition: conditionName,
      threshold: config.threshold,
      weatherDays: [...new Set(matchingWeatherDates)].length,
      badLeafCount: badLeaves,
      goodLeafCount: goodLeaves,
      totalDetections: total,
      correlationRate: total > 0 ? Math.round((badLeaves / total) * 100) : 0,
      sampleSize: total
    });
  }

  // Sort by correlation rate descending
  return results.sort((a, b) => b.correlationRate - a.correlationRate);
}

/**
 * Generate human-readable insights from correlations
 */
function generateInsights(correlations) {
  const insights = [];

  // Find highest correlation
  const highestCorrelation = correlations.find(c => c.totalDetections >= 5);
  if (highestCorrelation && highestCorrelation.correlationRate > 50) {
    insights.push({
      type: 'warning',
      message: `${highestCorrelation.condition} shows ${highestCorrelation.correlationRate}% disease rate. Monitor closely during these conditions.`
    });
  }

  // Compare humidity conditions
  const highHumidity = correlations.find(c => c.condition.includes('High Humidity'));
  const lowHumidity = correlations.find(c => c.condition.includes('Low Humidity'));
  if (highHumidity && lowHumidity && highHumidity.totalDetections >= 3 && lowHumidity.totalDetections >= 3) {
    const ratio = highHumidity.correlationRate / Math.max(lowHumidity.correlationRate, 1);
    if (ratio > 2) {
      insights.push({
        type: 'insight',
        message: `Pests are ${ratio.toFixed(1)}x more likely during high humidity conditions. Consider protective measures when humidity exceeds 70%.`
      });
    }
  }

  // Rain correlation
  const rainy = correlations.find(c => c.condition.includes('Rainy'));
  if (rainy && rainy.totalDetections >= 3 && rainy.correlationRate > 60) {
    insights.push({
      type: 'warning',
      message: `Rainy conditions correlate with ${rainy.correlationRate}% disease rate. Inspect plants after rainfall.`
    });
  }

  // Temperature insights
  const hotWeather = correlations.find(c => c.condition.includes('Hot Weather'));
  if (hotWeather && hotWeather.totalDetections >= 3 && hotWeather.correlationRate > 50) {
    insights.push({
      type: 'insight',
      message: `Hot weather (>32C) shows elevated pest activity. Ensure adequate irrigation during heat waves.`
    });
  }

  // Default insight if no strong correlations
  if (insights.length === 0) {
    insights.push({
      type: 'info',
      message: 'Insufficient data to determine strong weather-pest correlations. Continue collecting detection data for better analysis.'
    });
  }

  return insights;
}

/**
 * Get stored correlation analyses
 */
async function getCorrelations(queryParams) {
  const { userEmail, limit = '10' } = queryParams || {};

  let scanParams = {
    TableName: CORRELATIONS_TABLE,
    Limit: parseInt(limit)
  };

  if (userEmail) {
    scanParams.FilterExpression = 'userEmail = :email';
    scanParams.ExpressionAttributeValues = { ':email': userEmail };
  }

  const result = await docClient.send(new ScanCommand(scanParams));

  // Sort by creation date descending
  const sorted = (result.Items || []).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      data: sorted,
      count: sorted.length
    })
  };
}

/**
 * Update a correlation analysis (name, notes, or full re-run data)
 */
async function updateCorrelation(correlationId, updates) {
  if (!correlationId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'correlationId is required' })
    };
  }

  // Get existing correlation
  const existing = await docClient.send(new GetCommand({
    TableName: CORRELATIONS_TABLE,
    Key: { correlationId }
  }));

  if (!existing.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Correlation analysis not found' })
    };
  }

  // Build update expression for name and notes only
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (updates.name !== undefined) {
    updateExpressions.push('#name = :name');
    expressionAttributeNames['#name'] = 'name';
    expressionAttributeValues[':name'] = updates.name;
  }

  if (updates.notes !== undefined) {
    updateExpressions.push('#notes = :notes');
    expressionAttributeNames['#notes'] = 'notes';
    expressionAttributeValues[':notes'] = updates.notes;
  }

  if (updateExpressions.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'No valid updates provided' })
    };
  }

  // Use UpdateCommand for partial updates
  const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
  await docClient.send(new UpdateCommand({
    TableName: CORRELATIONS_TABLE,
    Key: { correlationId },
    UpdateExpression: 'SET ' + updateExpressions.join(', '),
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues
  }));

  // Return updated record
  const updatedRecord = {
    ...existing.Item,
    ...updates
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Correlation analysis updated',
      data: updatedRecord
    })
  };
}

/**
 * Delete a correlation analysis
 */
async function deleteCorrelation(correlationId) {
  if (!correlationId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'correlationId is required' })
    };
  }

  // Check if it exists
  const existing = await docClient.send(new GetCommand({
    TableName: CORRELATIONS_TABLE,
    Key: { correlationId }
  }));

  if (!existing.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Correlation analysis not found' })
    };
  }

  // Delete the record
  await docClient.send(new DeleteCommand({
    TableName: CORRELATIONS_TABLE,
    Key: { correlationId }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Correlation analysis deleted',
      correlationId
    })
  };
}

/**
 * Re-run correlation analysis and update existing record
 */
async function rerunCorrelationAnalysis(correlationId, params) {
  if (!correlationId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'correlationId is required' })
    };
  }

  // Get existing correlation to preserve name and notes
  const existing = await docClient.send(new GetCommand({
    TableName: CORRELATIONS_TABLE,
    Key: { correlationId }
  }));

  if (!existing.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Correlation analysis not found' })
    };
  }

  const { startDate, endDate, userEmail } = params;

  // Calculate date range
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  const startDateStr = start.toISOString().split('T')[0];
  const endDateStr = end.toISOString().split('T')[0];

  console.log('Re-running correlation analysis for date range:', startDateStr, 'to', endDateStr);

  // Fetch weather data for the period
  const weatherResult = await docClient.send(new ScanCommand({
    TableName: WEATHER_TABLE
  }));

  // Filter weather data by date range
  const weatherData = (weatherResult.Items || []).filter(w => {
    const weatherDate = w.date.split('T')[0];
    return weatherDate >= startDateStr && weatherDate <= endDateStr;
  });

  console.log('Weather data found:', weatherData.length, 'records');

  // Fetch ALL detection data first, then filter
  const detectionResult = await docClient.send(new ScanCommand({
    TableName: DETECTIONS_TABLE
  }));

  // Filter detections by date range
  let detections = (detectionResult.Items || []).filter(d => {
    const detectionDate = d.createdAt?.split('T')[0];
    return detectionDate >= startDateStr && detectionDate <= endDateStr;
  });

  // Filter by user email if provided
  const email = userEmail || existing.Item.userEmail;
  if (email && email !== 'all') {
    detections = detections.filter(d => d.owner === email || d.userEmail === email);
  }

  console.log('Detections found:', detections.length, 'records');

  // Calculate correlations by weather condition
  const correlations = calculateCorrelationsByCondition(weatherData, detections);

  // Generate insights
  const insights = generateInsights(correlations);

  // Update the existing record with new analysis data, preserving name and notes
  const updatedRecord = {
    correlationId,
    dateRange: `${startDateStr} to ${endDateStr}`,
    weatherDataPoints: weatherData.length,
    totalDetections: detections.length,
    correlations,
    insights,
    userEmail: email || 'all',
    createdAt: existing.Item.createdAt, // Keep original creation date
    updatedAt: new Date().toISOString(), // Add update timestamp
    name: existing.Item.name || undefined, // Preserve name
    notes: existing.Item.notes || undefined // Preserve notes
  };

  // Save the updated record
  await docClient.send(new PutCommand({
    TableName: CORRELATIONS_TABLE,
    Item: updatedRecord
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Correlation analysis re-run and updated',
      data: updatedRecord
    })
  };
}

/**
 * Delete weather data for a specific date
 */
async function deleteWeatherData(date) {
  if (!date) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Date parameter is required' })
    };
  }

  // Find all records for this date
  const result = await docClient.send(new ScanCommand({
    TableName: WEATHER_TABLE,
    FilterExpression: 'begins_with(#date, :date)',
    ExpressionAttributeNames: { '#date': 'date' },
    ExpressionAttributeValues: { ':date': date }
  }));

  if (!result.Items || result.Items.length === 0) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'No weather data found for this date' })
    };
  }

  // Delete each record
  for (const item of result.Items) {
    await docClient.send(new DeleteCommand({
      TableName: WEATHER_TABLE,
      Key: { weatherId: item.weatherId }
    }));
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: `Deleted ${result.Items.length} weather records for ${date}`
    })
  };
}
