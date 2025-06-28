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

How can I generate a PDF with HTML content on separate pages using Puppeteer?
Other Questions
Puppeteer

311
views
 
 
 
 
 
Dec 2024
Jan 1
 
Ethan99
Dec 2024
I’m utilizing Puppeteer in a Node.js environment to create PDF reports from HTML content. I have sections of HTML that I want to appear on distinct pages in the final PDF document. For instance, if my HTML includes

Title 1 - Page A
Title 2 - Page B
Title 3 - Page C
, I would like to ensure that Title 1 - Page A occupies page one, Title 2 - Page B is on page two, and Title 3 - Page C is on page three. Below is the sample code I am using for PDF generation:
const uniqueID = uuidv4();

const filename = 
output.pdf
;

const browserInstance = await puppeteer.launch({

headless: true,

args: [‘–no-sandbox’],

});

const newPage = await browserInstance.newPage();

const sampleHTML = ‘

Title 1 - Page A
Title 2 - Page B
Title 3 - Page C
’;

await newPage.setContent(sampleHTML, { waitUntil: ‘domcontentloaded’ });

await newPage.pdf({

path: filename,

format: ‘A4’,

margin: {

top: ‘20px’,

bottom: ‘20px’,

left: ‘20px’,

right: ‘20px’,

},

});

await browserInstance.close();
