# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A project request management system built with Node.js/Express + EJS, backed by Microsoft Fabric (Azure Synapse Data Warehouse) via `mssql`, with session-based authentication.

## Commands

```bash
npm install        # install dependencies
npm run dev        # start with nodemon (auto-reload)
npm start          # start without auto-reload
```

## Environment

All configuration lives in `.env`:

- `PORT` — HTTP server port
- `SESSION_SECRET` — Express session secret (also used as the admin password)
- `FABRIC_SERVER` / `FABRIC_DATABASE` — Microsoft Fabric SQL endpoint and database
- `FABRIC_CLIENT_ID` / `FABRIC_TENANT_ID` / `FABRIC_CLIENT_SECRET` — Azure AD service principal for Fabric SQL auth

## Architecture

```
server.js              # Express app entry point — mounts routes, session, static
routes/
  index.js             # GET /login, POST /login, POST /logout, GET / → redirect
  projects.js          # CRUD for /projects — list, new form, create, show, update status
middleware/
  requireAuth.js       # Session guard — redirects to /login if no session.user
db/
  index.js             # Singleton mssql connection pool using Azure AD service principal
  schema.sql           # DDL — run once in Fabric to create the ProjectRequests table
views/
  login.ejs            # Standalone login page (no nav)
  projects/
    index.ejs          # Table of all requests
    new.ejs            # Submission form
    show.ejs           # Detail + status update form
public/css/style.css   # All styles
```

## Database

Run `db/schema.sql` once in your Microsoft Fabric workspace to create the `ProjectRequests` table before starting the app.

Login credentials: username `admin`, password = value of `SESSION_SECRET`.

## Status Flow

`Pending` → `In Review` → `Approved` | `Rejected`

Status is updated manually via the detail page dropdown.
