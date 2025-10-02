# Lib Directory

This directory contains utility functions, configurations, and type definitions for the Overcast video classroom application.

## Structure

- `types.ts` - TypeScript interface definitions for Daily integration and app entities
- `daily-config.ts` - Daily.co room URLs and configuration constants
- `constants.ts` - Application constants (classroom names, capacity limits, etc.)

## Usage

Import utilities using the configured path aliases:

```typescript
import { AppUser, Classroom } from '@/lib/types';
import { DAILY_ROOMS } from '@/lib/daily-config';
import { CLASSROOM_NAMES } from '@/lib/constants';
```

All code in this directory follows the Overcast Constitution principles of simplicity and newcomer-friendly documentation.
