import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Location Tracker API',
      version: '1.0.0',
      description: `
## Endpoints para Aplicación Móvil

Los siguientes endpoints están específicamente diseñados para la integración con aplicaciones móviles:

### Autenticación
- **POST /api/login** - Autenticar usuario con credenciales
- **GET /api/user/tracking-status** - Verificar estado de rastreo del usuario

### Dispositivos
- **GET /api/device/{deviceId}/commands** - Obtener comandos pendientes para el dispositivo
- **POST /api/device/{deviceId}/status** - Actualizar estado del dispositivo
- **POST /api/device/command/{commandId}/ack** - Confirmar ejecución de comando

### Ubicación
- **POST /api/location** - Enviar datos de ubicación GPS. Este endpoint también registra el dispositivo automáticamente si no existe.
- **GET /api/locations** - Obtener historial de ubicaciones

## Flujo de Integración Móvil

1. **Autenticación**: POST /api/login
2. **Verificar permisos**: GET /api/user/tracking-status
3. **Envío periódico**: POST /api/location (el dispositivo se registra automáticamente en el primer envío)
4. **Verificar comandos**: GET /api/device/{deviceId}/commands

## Códigos de Estado

- **200**: Operación exitosa
- **400**: Datos inválidos o faltantes
- **401**: No autorizado / Credenciales inválidas
- **404**: Recurso no encontrado
- **500**: Error interno del servidor
      `,
      contact: {
        name: 'API Support',
        email: 'support@locationtracker.com'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://location-tracker-kigo.onrender.com' 
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
          required: ['user_id', 'username', 'latitude', 'longitude', 'timestamp', 'device_id', 'user_agent'],
          properties: {
            user_id: {
              type: 'string',
              description: 'User identifier'
            },
            username: {
              type: 'string',
              description: 'Username'
            },
            device_id: {
              type: 'string',
              description: 'Device identifier'
            },
            user_agent: {
              type: 'string',
              description: 'Device user agent'
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
        DeviceRegistration: {
          type: 'object',
          required: ['device_id', 'user_id', 'user_agent'],
          properties: {
            device_id: {
              type: 'string',
              description: 'Unique device identifier'
            },
            user_id: {
              type: 'integer',
              description: 'User ID associated with the device'
            },
            user_agent: {
              type: 'string',
              description: 'Device user agent string'
            }
          }
        },
        TrackingStatus: {
          type: 'object',
          properties: {
            tracking_enabled: {
              type: 'boolean',
              description: 'Whether tracking is enabled for the user'
            },
            user_created: {
              type: 'boolean',
              description: 'Whether the user was created in this request'
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
          description: 'Submit user location data from mobile device. This endpoint also automatically registers the device if it does not exist.',
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
                    $ref: '#/components/schemas/TrackingStatus'
                  }
                }
              }
            }
          }
        }
      },
      '/api/device/{deviceId}/commands': {
        get: {
          tags: ['Device'],
          summary: 'Get pending commands',
          description: 'Retrieve pending commands for a specific device',
          parameters: [
            {
              name: 'deviceId',
              in: 'path',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'Device unique identifier'
            }
          ],
          responses: {
            200: {
              description: 'Commands retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      commands: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/DeviceCommand'
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
      '/api/device/{deviceId}/status': {
        post: {
          tags: ['Device'],
          summary: 'Update device status',
          description: 'Update device connection and tracking status',
          parameters: [
            {
              name: 'deviceId',
              in: 'path',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'Device unique identifier'
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    is_tracking: {
                      type: 'boolean'
                    },
                    is_connected: {
                      type: 'boolean'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Status updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/device/command/{commandId}/ack': {
        post: {
          tags: ['Device'],
          summary: 'Acknowledge command execution',
          description: 'Confirm that a command has been executed by the device',
          parameters: [
            {
              name: 'commandId',
              in: 'path',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'Command unique identifier'
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['success', 'error'],
                      description: 'Execution status'
                    },
                    message: {
                      type: 'string',
                      description: 'Optional status message'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Command acknowledged',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
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