# Location Tracker

Sistema de seguimiento de ubicaciones en tiempo real con panel de administrador y aplicación móvil.

## Instalación

```bash
bun install
```

## Configurar Base de Datos

1. Crear archivo `.env.local` con tu URL de PostgreSQL:
```
NEXT_PUBLIC_DATABASE_URL=postgresql://usuario:password@localhost:5432/location_tracker
```

## Uso

### 1. Iniciar el servidor
```bash
node server-new.js
```

### 2. Iniciar la aplicación web
```bash
bun run dev
```

### 3. Acceder al sistema

**Panel Admin**: `http://localhost:3000`
- Usuario: `admin`
- Contraseña: `admin123`

**App Móvil**: `http://localhost:3000/mobile`
- Ingresar usuario y contraseña
- Permitir permisos de ubicación

## Funcionalidades

- Seguimiento automático de ubicación en móvil
- Visualización en tiempo real en mapa
- Gestión de usuarios y dispositivos
- Base de datos persistente