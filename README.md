# InstantCanvas MERN

This repository contains the full stack for the **InstantCanvas** website. It includes:

- A **frontend** in `public/` built with plain HTML, CSS and JavaScript. It covers the marketing site, services section, contact form, blog and case study pages.
- A **backend** in `server/` using Node.js and Express. It serves the static files, exposes an API endpoint for contact form submissions and persists them to MongoDB. Optionally it can send a notification email via SMTP.

## Local development

1. Install dependencies for the server:

   ```bash
   cd server
   npm install
   ```

2. Copy `.env.example` to `.env` and edit the variables for your environment (MongoDB URI, allowed origins, SMTP credentials).

3. Start the server:

   ```bash
   npm start
   ```

   The server will run on `http://localhost:10000` by default. Open `http://localhost:10000` in your browser to view the site.

## Deployment to Render

1. Push this repository to GitHub (or another git provider).
2. In Render, create a **Web Service** and point it to your repository:
   - **Root directory:** `server`
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
   - Add environment variables under the **Environment** section using your MongoDB URI and SMTP settings (see `.env.example` for required keys).
   - Render will automatically serve the static files from the `/public` directory.

3. After the service deploys, test the site using the onrender.com URL. Submitting the contact form should create a document in MongoDB (and send an email if SMTP variables are set).

## Custom domain

To point a custom domain such as `instantcanvas.io` at your Render service, follow Render’s custom domain instructions. You’ll typically need to:

1. Add the domain in Render’s **Custom Domains** section for your web service.
2. Create DNS records at your domain registrar: an **ANAME/ALIAS** or **A** record for the root domain and a **CNAME** record for `www` pointing at your Render app. Render will provide the exact values when you add the domain.

Once DNS propagates, your site will be available at your custom domain.
