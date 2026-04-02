# CAFEMO — Finals Project for Intelligent Systems

This repository contains the Finals project for the Intelligent Systems course. CAFEMO is a regular cafe digital kiosk with an integrated conversational chatbot that supports ordering and personalized recommendations.

## App Description

CAFEMO functions as a digital kiosk for a cafe, allowing customers to browse the menu, place orders, and interact with a conversational chatbot. The chatbot acts as both an ordering interface and a smart recommender that personalizes suggestions based on prior user behavior, inferred mood, and environmental cues.

## Chatbot Features

### Main

- Conversational ordering: customers can place and modify orders via chat.

### Secondary (Recommendations & Personalization)

- Uses historical user data (previous orders, favorites) to prioritize recommendations.
- Considers inferred mood from user input and prior data:
  - If user appears sad, recommend their favorite or most frequently ordered items.
  - If user appears curious, suggest something new or a limited-time item.
- Considers environment/context such as weather or time of day:
  - Example: if it is sunny/hot, prioritize cold drinks; if it is cold, prioritize hot drinks.
- Interprets vague statements and maps them to closest matching menu items using prior preferences and simple semantic matching. For example, from a vague phrase like "something refreshing", recommend chilled citrus drinks or iced specialties, weighted by user taste history.
  - "pag sad" -> return favorite/most-ordered
  - "pag curious" -> suggest something new
  - "pag maaraw" -> prefer cold drinks

### Recommendation Logic (technical)

- Recommendation combines simple heuristic rules (mood/weather) with lightweight ranking from past orders.
- Mood and intent are inferred from chat text (basic sentiment + keyword matching); prior orders are used to break ties.
- The system prefers explainability over opaque models for grading clarity.

## Quick Start

- **Install dependencies:**

  ```bash
  npm install
  ```

- **Run development server:**

  ```bash
  npm run dev
  ```

- **Open in browser:**

  Navigate to `http://localhost:3000`.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Global CSS (see `app/globals.css`) and PostCSS
- **Backend / Database:** Supabase (client utilities in `utils/supabase/`)
- **Package Manager / Runtime:** Node.js and npm

## Project Structure (high level)

- `app/` — Next.js app routes and UI
- `utils/supabase/` — Supabase client, server helpers, and middleware
- `public/` — Static assets

### Project Requirements

This project was created to satisfy the Finals requirement for the Intelligent Systems course. The goals were:

- Build a small full-stack app using Next.js
- Integrate a cloud database/auth backend (Supabase)
- Demonstrate clear project structure and readable code

### Architecture & Design Decisions

- The app uses the Next.js App Router for server and client components.
- Supabase provides authentication and persistence; see `utils/supabase/client.ts` for configuration.
- Styling is kept minimal with global CSS and PostCSS to make grading straightforward.

### Supabase Setup

To run the app locally with Supabase integration:

1. Create a Supabase project and get the `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
2. Add them to your environment (e.g., `.env.local`) as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Verify `utils/supabase/client.ts` reads from the environment values.

Note: The repository includes Supabase helper files under `utils/supabase/` to help with client and server usage.

### Deployment

You can deploy the app to Vercel or any platform that supports Next.js. Ensure environment variables for Supabase are set in the deployment settings.

## Contributing / Authors

- Project: Finals project for Intelligent Systems course
- Source: `CAFEMO` repository
