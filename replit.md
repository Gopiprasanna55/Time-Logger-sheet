# TimeTracker Pro

## Overview

TimeTracker Pro is a full-stack web application for employee timesheet management and HR approval workflows. The system provides dual interfaces - one for employees to submit timesheets and track their hours, and another for HR personnel to review, approve, and manage all employee timesheets across the organization.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for the client-side application
- **Vite** as the build tool and development server with hot module replacement
- **Wouter** for client-side routing instead of React Router
- **TanStack Query** for server state management, caching, and API synchronization
- **Tailwind CSS** with custom CSS variables for styling and responsive design
- **Radix UI** components with shadcn/ui design system for consistent UI components
- **React Hook Form** with Zod validation for form handling and input validation

### Backend Architecture
- **Express.js** server with TypeScript for RESTful API endpoints
- **In-memory storage** using Map-based data structures for development/demo purposes
- **Session-based authentication** with mock user switching for role demonstration
- **Comprehensive API layer** supporting CRUD operations for users and timesheets
- **Request logging middleware** for API monitoring and debugging

### Data Storage Solutions
- **PostgreSQL** database schema defined with Drizzle ORM
- **Drizzle Kit** for database migrations and schema management
- **Neon Database** serverless PostgreSQL for production deployment
- **Memory storage adapter** for development with pre-seeded demo data
- **Structured schema** with proper relationships between users and timesheets

### Authentication and Authorization
- **Role-based access control** with 'employee', 'hr', and 'manager' user roles
- **Microsoft 365 Azure AD integration** for secure authentication
- **Context-aware API endpoints** that filter data based on user permissions
- **Session management** with proper authentication flow

### UI/UX Design Patterns
- **Component-driven architecture** with reusable UI components
- **Responsive design** using Tailwind's mobile-first approach
- **Consistent design system** through shadcn/ui component library
- **Toast notifications** for user feedback on actions
- **Loading states** and error handling throughout the application
- **Data tables** with sorting, filtering, and batch operations

### State Management
- **Server state** managed by TanStack Query with automatic caching and invalidation
- **Form state** handled by React Hook Form with Zod schema validation
- **Component state** using React hooks for local UI state
- **Query invalidation patterns** for maintaining data consistency after mutations

## External Dependencies

### Database Services
- **Neon Database** - Serverless PostgreSQL hosting
- **Drizzle ORM** - Type-safe database operations and migrations
- **Drizzle Kit** - Database migration tooling

### UI Framework and Styling
- **Radix UI** - Unstyled, accessible UI primitives
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library for consistent iconography
- **shadcn/ui** - Pre-built component library built on Radix UI

### Development Tools
- **Vite** - Fast build tool and development server
- **TypeScript** - Type safety across frontend and backend
- **ESBuild** - Fast JavaScript bundling for production builds
- **PostCSS** - CSS processing with Autoprefixer

### Form and Validation
- **React Hook Form** - Performant form library with validation
- **Zod** - TypeScript-first schema validation
- **@hookform/resolvers** - Integration between React Hook Form and Zod

### Utilities and Libraries
- **date-fns** - Date manipulation and formatting
- **clsx** and **class-variance-authority** - Conditional CSS class handling
- **nanoid** - Unique ID generation
- **TanStack Query** - Powerful data synchronization for React

### Replit Integration
- **Replit-specific plugins** for development environment optimization
- **Runtime error overlay** for better debugging experience
- **Development banner** for external access indication