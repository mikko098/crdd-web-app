# RoadVision AI Maintenance Dashboard

RoadVision AI Maintenance Dashboard is a Vite + React web application for viewing and managing road-damage reports submitted from the companion mobile app. It connects to Firebase/Firestore to display uploaded road captures, AI inference results, GPS locations, traffic impact, repair status, team assignment, and maintenance comments.

This dashboard is one part of the road-damage reporting system:

```text
Mobile app -> Firebase Storage + Firestore
Backend inference worker -> processes captures and updates Firestore
Vite dashboard -> displays and manages road-damage reports
```

## Features

- Firebase authentication for dashboard users
- Firestore-based road-damage report loading
- Map and list views for reported road damage
- Filtering by damage type, severity, status, and inference result
- Damage detail pages with uploaded images and AI inference metadata
- Maintenance workflow actions for status updates, team assignment, and comments
- Traffic impact display using stored traffic data or TomTom traffic lookup

## Tech Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Firebase Authentication
- Firestore
- Firebase Storage
- React Query
- Leaflet / React Leaflet
- TomTom Traffic API

## Getting Started

Install dependencies:

```sh
npm install
```

Create a local environment file:

```sh
cp .env.example .env.local
```

Add the required environment variables:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_TOMTOM_API_KEY=your_tomtom_api_key
```

Start the development server:

```sh
npm run dev
```

Build for production:

```sh
npm run build
```

Preview the production build locally:

```sh
npm run preview
```

## Firebase Data

The dashboard reads road-damage capture documents from Firestore and maps them into dashboard reports. The expected flow is:

1. The mobile app uploads an image and GPS metadata to Firebase.
2. The backend inference worker processes the capture.
3. Firestore is updated with inference results, status, and related metadata.
4. The dashboard displays the report and allows maintenance users to manage it.

The dashboard needs Firestore read access for viewing reports and write access for maintenance actions such as status updates, team assignment, and comments.

## Deployment

This app can be deployed as a static Vite site on Vercel, Netlify, or Firebase Hosting.

For Vercel or Netlify:

- Root directory: this project folder
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: add the same `VITE_` variables used locally

For Firebase Hosting:

```sh
npm run build
firebase deploy --only hosting
```

## Notes

- Do not commit `.env.local` or real API secrets.
- Only `VITE_` prefixed variables are exposed to the Vite client.
- The backend does not need to be hosted on the same server as this dashboard if both services communicate through Firebase.
