import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Location Tracker API',
      version: '1.0.0',
      description: 'API for location tracking system with React Native mobile support',
      contact: {
        name: 'API Support',
        email: 'support@locationtracker.com'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://your-domain.vercel.app' 
          : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development'
      }
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          required: ['id', 'username', 'role'],
          properties: {
            id: {
              type: 'integer',
              description: 'User unique identifier'
            },
            username: {
              type: 'string',
              description: 'Username'
            },
            role: {
              type: 'string',
              enum: ['admin', 'user', 'mobile_user'],
              description: 'User role'
            },
            tracking_enabled: {
              type: 'boolean',
              description: 'Whether tracking is enabled for this user'
            }
          }
        },
        Location: {
          type: 'object',
          required: ['user_id', 'username', 'latitude', 'longitude', 'timestamp'],
          properties: {
            user_id: {
              type: 'string',
              description: 'User identifier'
            },
            username: {
              type: 'string',
              description: 'Username'
            },
            latitude: {
              type: 'number',
              format: 'double',
              description: 'Latitude coordinate'
            },
            longitude: {
              type: 'number',
              format: 'double', 
              description: 'Longitude coordinate'
            },
            accuracy: {
              type: 'number',
              format: 'double',
              description: 'Location accuracy in meters'
            },
            timestamp: {
              type: 'integer',
              format: 'int64',
              description: 'Unix timestamp'
            }
          }
        },
        Device: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device unique identifier'
            },
            username: {
              type: 'string',
              description: 'Associated username'
            },
            user_agent: {
              type: 'string',
              description: 'Device user agent'
            },
            is_connected: {
              type: 'boolean',
              description: 'Whether device is currently connected'
            },
            is_tracking: {
              type: 'boolean',
              description: 'Whether device is actively tracking'
            },
            last_seen: {
              type: 'integer',
              format: 'int64',
              description: 'Last seen timestamp'
            }
          }
        },
        DeviceCommand: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Command unique identifier'
            },
            type: {
              type: 'string',
              enum: ['start_tracking', 'stop_tracking', 'get_location'],
              description: 'Command type'
            },
            payload: {
              type: 'object',
              description: 'Command payload data'
            },
            timestamp: {
              type: 'integer',
              format: 'int64',
              description: 'Command creation timestamp'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: {
              type: 'string',
              description: 'User username'
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'User password'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            }
          }
        }
      }
    },
    paths: {
      '/api/login': {
        post: {
          tags: ['Authentication'],
          summary: 'User login',
          description: 'Authenticate user with username and password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LoginRequest'
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/LoginResponse'
                  }
                }
              }
            },
            400: {
              description: 'Missing username or password',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse'
                  }
                }
              }
            },
            401: {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse'
                  }
                }
              }
            }
          }
        }
      },
      '/api/location': {
        post: {
          tags: ['Location'],
          summary: 'Submit location data',
          description: 'Submit user location data from mobile device',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Location'
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Location saved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean'
                      },
                      id: {
                        type: 'integer'
                      }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Missing required fields',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse'
                  }
                }
              }
            }
          }
        }
      },
      '/api/locations': {
        get: {
          tags: ['Location'],
          summary: 'Get location history',
          description: 'Retrieve location history with optional timeframe filter',
          parameters: [
            {
              name: 'timeframe',
              in: 'query',
              description: 'Time filter (1h, 6h, 24h, 7d)',
              required: false,
              schema: {
                type: 'string',
                enum: ['1h', '6h', '24h', '7d'],
                default: '24h'
              }
            }
          ],
          responses: {
            200: {
              description: 'Location data retrieved',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      locations: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Location'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/device/register': {
        post: {
          tags: ['Device'],
          summary: 'Register device',
          description: 'Register a new mobile device',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['device_id', 'user_id', 'user_agent'],
                  properties: {
                    device_id: {
                      type: 'string'
                    },
                    user_id: {
                      type: 'integer'
                    },
                    user_agent: {
                      type: 'string'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Device registered successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean'
                      },
                      device_id: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/user/tracking-status': {
        get: {
          tags: ['User'],
          summary: 'Get tracking status',
          description: 'Get user tracking status, creates user if not exists',
          parameters: [
            {
              name: 'username',
              in: 'query',
              required: true,
              schema: {
                type: 'string'
              }
            }
          ],
          responses: {
            200: {
              description: 'Tracking status retrieved',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      tracking_enabled: {
                        type: 'boolean'
                      },
                      user_created: {
                        type: 'boolean'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./app/api/**/*.ts']
};

export const swaggerSpec = swaggerJSDoc(options);