Deploying Puppeteer with Next.js on Vercel: A Step-by-Step Guide

Naeemudheen p
Naeemudheen p

Follow
3 min read
·
Nov 13, 2024
8

1


Why Use Puppeteer with Next.js?
Puppeteer is a JavaScript library which provides a high-level API to control Chrome or Firefox over the DevTools Protocol or WebDriver BiDi. and
Next.js is a React framework for building full-stack web applications. You use React Components to build user interfaces, and Next.js for additional features and optimizations.
We are using this combination to automate anything in the browser, from taking screenshots and generating PDFs to navigating through and testing complex UIs and analysing performance.
This example sets up a basic Puppeteer configuration to load a page, but you can extend it to use Puppeteer functions like screenshot or PDF generation as you wish
How to setup:
Set up from Scratch: This involves manually configuring and deploying the project on Vercel.
One-Click Deployment: Simply go to openpuppeteer.com and click the “Deploy to Vercel” button for an instant deployment.
Set up from Scratch
Step 1: Setting Up Your Next.js Project
Let’s start by creating a new Next.js project and installing the necessary dependencies.
1. Initialize a New Next.js Project
If you don’t already have a Next.js project, start by creating one:
npx create-next-app@latest open-puppeteer
cd open-puppeteer
2. Install Dependencies
Inside the project, install Puppeteer and a compatible version of Chromium:

npm install puppeteer puppeteer-core @sparticuz/chromium-min
puppeteer: The main Puppeteer library, used locally.
puppeteer-core: Lightweight Puppeteer for serverless environments, as it excludes bundled Chromium.
@sparticuz/chromium-min: A Chromium build compatible with Vercel, specifically tailored for serverless use.
Step 2: Configure Puppeteer with Chromium for Vercel
To handle Puppeteer in both local and production environments, we need to set up a conditional configuration that:
Uses the local Puppeteer library for local development.
Uses puppeteer-core and a remote Chromium for Vercel in production.
Create Your Puppeteer API in Next.js
In your Next.js project, go to pages/api and create a new file, pptr.js.(Currently, this example sets up a basic Puppeteer configuration to load a page, but you can extend it to use Puppeteer functions like screenshot or PDF generation as you wish😁)
2.Add the following code:
import chromium from “@sparticuz/chromium-min”;
import puppeteerCore from “puppeteer-core”;
import puppeteer from “puppeteer”;

export const dynamic = “force-dynamic”;

const remoteExecutablePath =
 “https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar";let browser;
async function getBrowser() {

 if (browser) return browser;

if (process.env.NEXT_PUBLIC_VERCEL_ENVIRONMENT === “production”) {
 browser = await puppeteerCore.launch({
 args: chromium.args,
 executablePath: await chromium.executablePath(remoteExecutablePath),
 headless: true,
 });
 } else {
 browser = await puppeteer.launch({
 args: [“ — no-sandbox”, “ — disable-setuid-sandbox”],
 headless: true,
 });
 }
 return browser;
}
async function checkPageStatus(url) {
 let statusCode;
 try {
 const browser = await getBrowser();
 const page = await browser.newPage();
 const response = await page.goto(url, { waitUntil: “domcontentloaded” });
 statusCode = response && response.status() === 200 ? 200 : 404;
 await page.close();
 } catch (error) {
 console.error(“Error accessing page:”, error);
 statusCode = 404;
 }
 return statusCode === 200;
}
export async function GET(request) {
 const { searchParams } = new URL(request.url);
 const url = searchParams.get(“url”);
 if (!url) {
 return new Response(
 JSON.stringify({ error: “URL parameter is required” }),
 {
 status: 400,
 headers: { “Content-Type”: “application/json” },
 }
 );
 }
 const status = await checkPageStatus(url);
 return new Response(
 JSON.stringify({
 statusCode: status ? 200 : 404,
 is200: status,
 }),
 {
 status: status ? 200 : 404,
 headers: { “Content-Type”: “application/json” },
 }
 );
}
Set up your .env.local file in the project root with the following environment variables:
NEXT_PUBLIC_APP_DOMAIN=http://localhost:3000/
NEXT_PUBLIC_VERCEL_ENVIRONMENT=development
Step 3: Deploy to Vercel
Now, you can deploy your project to Vercel directly from your repository or by visiting Open Puppeteer and clicking the “Deploy to Vercel” button for a quick, one-click deployment.
Handling Gateway Timeout Errors
If you encounter a 504 Gateway Timeout error, it may be due to Vercel’s function timeout limit. To increase the function timeout:
Go to Settings > Functions in your Vercel project.
Adjust the Function Timeout value to increase the time allowed for long-running Puppeteer operations.

Sparticuz chromium-min working with vercel for pdf
Help
nextjs
 
221
views

2
links
 
 
 
 
 
Levelz3111
Apr 1
Hi all,

I’m encountering a persistent runtime error when trying to generate PDFs using Puppeteer within a Next.js App Router project deployed on Vercel. The PDF generation works correctly in my local development environment but fails consistently on Vercel deployments.

Project Details:

**Project Name: Vectorcv
Framework: Next.js (App Router)
Node.js Runtime: Node 22.x (as per deployment logs)
**error from vercel
Error in PDF generation: Error: The input directory "/var/task/.next/server/bin" does not exist.
    at d.executablePath (/var/task/.next/server/chunks/191.js:1:64134)
    at l (/var/task/.next/server/app/api/pdf/route.js:1:1697)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async u (/var/task/.next/server/app/api/pdf/route.js:1:4235)
    at async /var/task/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38411
    at async e_.execute (/var/task/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:27880)
    at async e_.handle (/var/task/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:39943)
    at async en (/var/task/node_modules/next/dist/compiled/next-server/server.runtime.prod.js:16:25516)
    at async ea.responseCache.get.routeKind (/var/task/node_modules/next/dist/compiled/next-server/server.runtime.prod.js:17:1028)
    at async r9.renderToResponseWithComponentsImpl (/var/task/node_modules/next/dist/compiled/next-server/server.runtime.prod.js:17:508)


Error in PDF API route: Error: Failed to generate PDF: The input directory "/var/task/.next/server/bin" does not exist.
    at l (/var/task/.next/server/app/api/pdf/route.js:1:3486)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async u (/var/task/.next/server/app/api/pdf/route.js:1:4235)
    at async /var/task/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38411
    at async e_.execute (/var/task/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:27880)
    at async e_.handle (/var/task/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:39943)
    at async en (/var/task/node_modules/next/dist/compiled/next-server/server.runtime.prod.js:16:25516)
    at async ea.responseCache.get.routeKind (/var/task/node_modules/next/dist/compiled/next-server/server.runtime.prod.js:17:1028)
    at async r9.renderToResponseWithComponentsImpl (/var/task/node_modules/next/dist/compiled/next-server/server.runtime.prod.js:17:508)
    at async r9.renderPageComponent (/var/task/node_modules/next/dist/compiled/next-server/server.runtime.prod.js:17:5102)

Problem Description: The /api/pdf serverless function is designed to generate a PDF from HTML content using puppeteer-core and @sparticuz/chromium-min. While this works locally, on Vercel it fails with the following runtime error logged in the function logs:

Error: Failed to generate PDF: The input directory "/var/task/.next/server/bin" does not exist.
    at d.executablePath (/var/task/.next/server/chunks/191.js:1:64134)
    at l (/var/task/.next/server/app/api/pdf/route.js:1:1697)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async u (/var/task/.next/server/app/api/pdf/route.js:1:4235)
    ... (rest of stack trace) ...
This indicates that the necessary Chromium binary files provided by @sparticuz/chromium-min are not being found at the expected path within the Vercel runtime environment.

Troubleshooting Steps Taken:

Dependencies: Confirmed use of puppeteer-core and @sparticuz/chromium-min (switched from the full @sparticuz/chromium in an attempt to resolve).
Dynamic Imports: Implemented dynamic imports (await import(...)) for both puppeteer-core and @sparticuz/chromium-min within the service function (lib/services/pdf.service.ts) that handles PDF generation. This successfully reduced the reported Vercel function size from ~68MB to ~7MB, suggesting the initial bundle size limit is not the issue.
next.config.mjs Configurations: Tried various configurations, including:
The recommended setup: experimental: { serverComponentsExternalPackages: ['@sparticuz/chromium-min'], outputFileTracingIncludes: { '/api/pdf': ['./node_modules/@sparticuz/chromium-min/**'] } }
Using more specific paths in outputFileTracingIncludes (e.g., targeting the bin directory).
Removing @sparticuz/chromium-min from serverComponentsExternalPackages.
Removing outputFileTracingIncludes entirely.
Using @vercel/nft’s withFileTracing helper.
Removing the entire experimental block related to tracing/externals. None of these configuration changes resolved the runtime path error.
Environment Variables: Added SPARTICUZ_FUNCTION_NAME=pdf-generator to Vercel environment variables based on troubleshooting guides. Confirmed other potentially conflicting variables like PUPPETEER_EXECUTABLE_PATH are not set.
Code Structure: The API route (app/api/pdf/route.tsx) simply imports and calls a service function (lib/services/pdf.service.ts). The service function contains the dynamic imports and Puppeteer logic, correctly calling await chromium.executablePath().
Despite these steps, the runtime error persists across deployments. It seems like an issue with Vercel’s build process not correctly tracing or packaging the necessary binary files from @sparticuz/chromium-min into the expected runtime location (/var/task/.next/server/bin or similar path resolved by chromium.executablePath()).

Could you please provide guidance on how to resolve this file tracing/packaging issue for @sparticuz/chromium-min within the Vercel environment?

also having @sparticuz/chromium-min has helped me keep this under 50MB limit

any assistance will be greatly appreciated. thank you.



221
views

2
links
 
 
 
 

Miguel Cabs
Vercel Staff
Apr 2
Hey Levelz3111 :smiley:

I was able to take inspiration from this post on medium and get a working deployment on Vercel.

The big difference is it utlizes the remote executable vs trying to find the one if the file system from the dependency.

I’m not sure if that will give you what you need, my example just took a PDF of a site and returns it as a buffer. I’ll add the relevant bits below, curious to know your thoughts:

// package.json
"dependencies": {
    "@sparticuz/chromium-min": "^133.0.0",
    "next": "15.2.4",
    "puppeteer-core": "^24.5.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
The Next Config

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
// v15 made this property stable
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
};

export default nextConfig;
Here is the main pdf service I have

// @/lib/pdf.ts
import chromium from "@sparticuz/chromium-min";
import puppeteerCore from "puppeteer-core";

async function getBrowser() {
  const REMOTE_PATH = process.env.CHROMIUM_REMOTE_EXEC_PATH;
  const LOCAL_PATH = process.env.CHROMIUM_LOCAL_EXEC_PATH;
  if (!REMOTE_PATH && !LOCAL_PATH) {
    throw new Error("Missing a path for chromium executable");
  }

  if (!!REMOTE_PATH) {
    return await puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(
        process.env.CHROMIUM_REMOTE_EXEC_PATH,
      ),
      defaultViewport: null,
      headless: true,
    });
  }

  return await puppeteerCore.launch({
    executablePath: LOCAL_PATH,
    defaultViewport: null,
    headless: true,
  });
}

export const makePDFFromDomain = async (url: string): Promise<Buffer> => {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();

    page.on("pageerror", (err: Error) => {
      throw err;
    });
    page.on("error", (err: Error) => {
      throw err;
    });

    await page.goto(url);
    await page.setViewport({ width: 1080, height: 1024 });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      scale: 1.0,
    });

    return Buffer.from(pdf);
  } catch (error) {
    throw error;
  }
};
Please let me know if any of this helped, happy to keep trying to find a solution for you!



Kai Firschau
May 30
@miguelcabs this solution works perfectly for me, as well! For me, the problem was the missing update in the Next config. Thank you very much for your help!