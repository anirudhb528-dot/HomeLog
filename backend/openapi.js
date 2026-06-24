'use strict';

/**
 * OpenAPI 3 description of the HomeLog API, served as interactive docs at
 * `/api/docs` via swagger-ui-express. Kept as a plain object so it needs no
 * build step. Schemas are summarized; see the Mongoose models for full detail.
 */
const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'HomeLog API',
    version: '1.0.0',
    description:
      'REST API for HomeLog — home maintenance tracking, expense logging, and a local ' +
      'services directory. All authenticated endpoints expect `Authorization: Bearer <token>`.',
  },
  servers: [{ url: '/api', description: 'API root' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          home: { type: 'object' },
        },
      },
      MaintenanceTask: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          category: { type: 'string' },
          dueDate: { type: 'string', format: 'date-time' },
          recurrence: { type: 'string', enum: ['none', 'monthly', 'quarterly', 'biannual', 'annual'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          status: { type: 'string', enum: ['pending', 'done', 'skipped'] },
        },
      },
      Expense: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          description: { type: 'string' },
          amount: { type: 'number' },
          category: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: { tags: ['System'], summary: 'Liveness probe', security: [], responses: { 200: { description: 'OK' } } },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create an account',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          409: { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'Get my profile', responses: { 200: { description: 'OK' }, 401: { description: 'Unauthorized' } } },
      patch: { tags: ['Auth'], summary: 'Update my profile / home', responses: { 200: { description: 'OK' } } },
      delete: {
        tags: ['Auth'],
        summary: 'Permanently delete my account and all my data',
        responses: { 200: { description: 'Deleted' }, 401: { description: 'Unauthorized' } },
      },
    },
    '/maintenance': {
      get: { tags: ['Maintenance'], summary: 'List tasks', responses: { 200: { description: 'OK' } } },
      post: { tags: ['Maintenance'], summary: 'Create a task', responses: { 201: { description: 'Created' } } },
    },
    '/maintenance/{id}': {
      patch: { tags: ['Maintenance'], summary: 'Update a task', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      delete: { tags: ['Maintenance'], summary: 'Delete a task', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/maintenance/{id}/complete': {
      post: { tags: ['Maintenance'], summary: 'Complete a task (spawns next if recurring)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/expenses': {
      get: { tags: ['Expenses'], summary: 'List expenses', responses: { 200: { description: 'OK' } } },
      post: { tags: ['Expenses'], summary: 'Log an expense', responses: { 201: { description: 'Created' } } },
    },
    '/expenses/summary': {
      get: { tags: ['Expenses'], summary: 'Totals by category + monthly trend', responses: { 200: { description: 'OK' } } },
    },
    '/expenses/{id}': {
      patch: { tags: ['Expenses'], summary: 'Update an expense', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      delete: { tags: ['Expenses'], summary: 'Delete an expense', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/services': {
      get: { tags: ['Services'], summary: 'Browse/search providers', security: [], responses: { 200: { description: 'OK' } } },
    },
    '/services/{id}': {
      get: { tags: ['Services'], summary: 'Provider detail + reviews', security: [], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/services/{id}/reviews': {
      post: { tags: ['Services'], summary: 'Add a review (1–5)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 201: { description: 'Created' } } },
    },
    '/services/{id}/book': {
      post: { tags: ['Services'], summary: 'Request a booking', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 201: { description: 'Created' } } },
    },
    '/services/bookings/mine': {
      get: { tags: ['Services'], summary: 'List my bookings', responses: { 200: { description: 'OK' } } },
    },
    '/uploads/image': {
      post: {
        tags: ['Uploads'],
        summary: 'Upload an image to Supabase Storage (multipart field "image")',
        parameters: [
          {
            name: 'folder',
            in: 'query',
            required: true,
            schema: { type: 'string', enum: ['receipts', 'avatars', 'misc'] },
            description: 'Namespaces the stored object.',
          },
        ],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { image: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: {
          201: { description: 'Uploaded — returns { url, path }' },
          400: { description: 'Invalid/oversized file' },
          503: { description: 'Storage not configured on the server' },
        },
      },
    },
  },
};

module.exports = openapiSpec;
