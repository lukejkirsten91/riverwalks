Products
Solutions
Pricing
Resources
Careers
Sign in
Book a Call
Start Free Trial
Table of contents
Getting started with Vercel deployment
Setup your environment
Configure Playwright for serverless
Write the basic scraping script
Deploy to Vercel
Handling common deployment issues
Memory issue
Timeout problems
Browser binary issue
Cold start optimization
Streamline Playwright deployments with ZenRows
Conclusion
Scrape any web page
Try ZenRows for Free
Share
How to Deploy Playwright on Vercel
Rubén del Campo
Rubén del Campo
March 17, 2025 · 8 min read
Deploying Playwright on Vercel can be challenging due to the platform's 50MB function size limit, whereas Chromium's binary alone exceeds 280MB. Standard Playwright setups fail because serverless environments restrict large dependencies and lack built-in browser support.

A tested solution is to use @sparticuz/chromium, a lightweight Chromium build optimized for AWS Lambda and Vercel. In this guide, you'll learn to deploy your Playwright scraper on Vercel's serverless platform using the following steps:

Step 1: Setting up your environment.
Step 2: Configuring Playwright for serverless.
Step 3: Writing the scraping script.
Step 4: Deploying to Vercel.
Getting Started With Vercel Deployment

In this tutorial, you'll build a simple Playwright web scraper that targets this ScrapingCourse E-commerce demo site. You'll then deploy it to Vercel.

This tutorial will use Vercel's serverless functions, which allow you to run backend code without managing a dedicated server.

Let's get started with the environment setup.

Step 1: Setup Your Environment

You need the following tools for this tutorial:

Node.js: A JavaScript runtime environment. Download and install the latest version if you haven't already.
playwright-core: A Playwright version without browser binaries.
@sparticuz/chromium: A lightweight, precompiled Chromium binary optimized for AWS Lambda and other serverless environments.
Now, initialize a Node.js project and install the above packages:

Terminal
npm init -y
npm install @sparticuz/chromium playwright-core
Next, create an api directory with a scraper.js file inside your project root folder. You also need a vercel.json file to configure serverless functions for deployment. Add this file to your project root directory.

Your project structure should look like the following:

Example
project/
├── api/
│ └── scraper.js
├── node_modules/
├── package.json
├── package-lock.json
└── vercel.json
You've scaled the initial stage! Let's get Playwright ready for serverless deployment to Vercel.

Step 2: Configure Playwright for Serverless

The next step is configuring how Vercel handles serverless functions and routing for deployment.

To achieve this, paste the following into your vercel.json file:

vercel.json
{
    "functions": {
    "api/scraper.js": {
      "memory": 1024,
      "maxDuration": 10
    }
  },
   
    "routes": [
      {
        "src": "/api/scraper",
        "dest": "api/scraper.js"
      }
    ]
}
The above file has two key parts: functions and routes. Here's what each parameter means:

functions: This specifies the configuration for the serverless function (api/scraper.js). It allocates 1024MB (1GB) of memory with a maximum timeout of 10 seconds based on the acceptable Vercel functions limits for the free (Hobby) plan. These values vary depending on your Vercel plan, but the above limits are enough for our use case.
routes: This part defines custom routing rules for HTTP requests. src specifies the source URL pattern for the scraper API, allowing you to access the deployed function via <BASE_URL>/api/scraper. The dest parameter defines the destination file containing the serverless function for executing Playwright.
Frustrated that your web scrapers are blocked once and again?
ZenRows API handles rotating proxies and headless browsers for you.
Try for FREE
Step 3: Write the Basic Scraping Script

Let's now write the web scraping script. You'll start by testing it locally before modifying it for serverless deployment on Vercel.

The @sparticuz/chromium package is suited explicitly for serverless environments, so you don't need it in a local setup. Since you're using playwright-core, a better option is to spin the browser instance from the local Chromium binary.

Start the script by importing playwright-core. Then, define a scraper function that launches a local Chromium instance from its executable path, opens the target site, and logs its full-page HTML:

api/scraper.js
// npm install playwright-core
const { chromium } = require('playwright-core');

const scraper = async () => {
    try {
        // get correct Chromium path
        const executablePath =
            '<CHROMIUM_EXECUTABLE_PATH>/chrome.exe';

        // launch browser with external Chromium
        const browser = await chromium.launch({
            executablePath: executablePath,
            headless: true,
        });

        // create a new page instance
        const context = await browser.newContext();
        const page = await context.newPage();

        // navigate to the target site
        await page.goto('https://www.scrapingcourse.com/ecommerce/');

        // get the target site HTML content
        const htmlContent = await page.content();

        // close the browser instance
        await browser.close();

        console.log(htmlContent);
    } catch (error) {
        console.error('Browser Launch Error:', error);
    }
};

// execute the scraper
scraper();
Run the above code, and you'll get the target site's full-page HTML:

Output
<!DOCTYPE html>
<html lang="en-US">
<head>
    <!--- ... --->
  
    <title>Ecommerce Test Site to Learn Web Scraping - ScrapingCourse.com</title>
    
  <!--- ... --->
</head>
<body class="home archive ...">
    <p class="woocommerce-result-count">Showing 1-16 of 188 results</p>
    <ul class="products columns-4">

        <!--- ... --->

    </ul>
</body>
</html>
You've tested your scraper locally! Let's modify it to a remote server's standard.

Add @sparticuz/chromium to your imports and update the executablePath to use its Chromium binary. Modify the function to return the full-page HTML as a JSON response rather than logging it in the console. Finally, catch server error status and export the function as a Node.js module.

See the modified, production-ready code below with the changes highlighted:

api/scraper.js
// npm install playwright-core @sparticuz/chromium
const { chromium } = require('playwright-core');
const chromiumBinary = require('@sparticuz/chromium');

const scraper = async (req, res) => {
    try {
        // get correct Chromium path from @sparticuz/chromium
        const executablePath = await chromiumBinary.executablePath();

        // launch browser with external Chromium
        const browser = await chromium.launch({
            args: chromiumBinary.args,
            executablePath: executablePath,
            headless: true,
        });

        // create a new page instance
        const context = await browser.newContext();
        const page = await context.newPage();

        // navigate to the target site
        await page.goto('https://www.scrapingcourse.com/ecommerce/');

        // get the target site HTML content
        const htmlContent = await page.content();

        // close the browser instance
        await browser.close();

        //get the HTML as JSON response
        res.status(200).json({ htmlContent });
    } catch (error) {
        console.error('Browser Launch Error:', error);
        res.status(500).json({ error: 'Failed to scrape page' });
    }
};

// export the function
module.exports = scraper;
Great! Your project is ready for deployment!

Step 4: Deploy to Vercel

The first step to deployment is to create an account on Vercel.

Next, install the Vercel CLI, the command line interface for communicating with Vercel's deployment API.

Install it globally like so:

Terminal
npm install -g vercel
You can verify Vercel CLI's installation by checking its version:

Terminal
vercel --version
The above command should return the installed Vercel CLI version.

Now, login to Vercel through its CLI and follow the prompts to complete the authentication process:

Terminal
vercel login
Next, you want to deploy the project in preview mode before going to production. To achieve this, execute the following command:

Terminal
vercel
The above command will prompt you to complete an initial setup, including specifications for project scopes, names, and directories. Below is an example showing responses to the prompts (y=yes, and n=no):

Terminal
? Set up and deploy "..."? y
? Which scope should contain your project? ...
? Link to existing project? n
? What's your project's name? playwright-scraper
? In which directory is your code located? ./
// ...
? Want to modify these settings? n
Once the command executes, it will return the inspection and production URLs. Open the inspection URL via your browser to preview the deployment. You'll see a screen showing the home page screenshot and domain links.

 
Click to open the image in full screen
The featured screenshot returns a Vercel 404: NOT_FOUND error because it displays the base URL and doesn't route to the correct endpoint (/api/scraper). Click Visit at the top-right to open the preview URL in a new tab. This is the base URL, and it looks like this:

Example
https://your-project-6fgqcrygn-username-projects.vercel.app
Note
The above link will also return 404: NOT_FOUND since it's the base URL and doesn't point to the correct endpoint.
To get the expected result, append the correct endpoint to the base URL like so:

Example
https://your-project-6fgqcrygn-username-projects.vercel.app/api/scraper
Open this new URL above in a browser. The page should now return the target site's full-page HTML as expected:

Output
{
    "htmlContent":"<!DOCTYPE html><html...><!-- ... --></html>"
}
The deployment works in preview. To deploy to production, run:

Terminal
vercel --prod
Once deployed, the scraper's endpoint becomes accessible via the following URL:

Example
https://your-project.vercel.app/api/scraper
Test the live endpoint using cURL:

Terminal
curl https://your-project.vercel.app/api/scraper
The request returns the website's full-page HTML as a JSON:

Output
{
    "htmlContent":"<!DOCTYPE html><html...><!-- ... --></html>"
}
Bravo! You've deployed your Playwright Vercel scraper. You can now run scraping jobs with API calls.

Handling Common Deployment Issues

Playwright's deployment to Vercel can fail for several reasons, including memory limitations, missing browser binaries, timeouts, and other issues. Let's address the common problems you'll likely face.

Memory Issue

Memory limitations happen when you exceed the allocated memory space for your serverless function. The error message looks like the following, and you can find it in your Vercel logs:

Example
Error: Lambda function failed with error: Memory limit exceeded
Vercel places a specific memory limit on each of its plans. For instance, the Hobby plan allows a maximum of 1024MB (1GB), while pro and enterprise plans get up to 3004MB (2.94GB).

If not adequately managed, Playwright's high memory demand can quickly use the allocated RAM, resulting in the "Memory limit exceeded" error. This error can be caused by small memory allocation, deploying a browser instance with its GUI (non-headless mode), large viewport size, loading heavy resources like images, or making multiple requests on a single node.

The current scraper mitigates some of these limitations using playwright-core, a lightweight version of Playwright without browser binaries. It also uses @sparticuz/chromium, a Chromium instance optimized for serverless environments.

That said, you can still manage memory efficiently by blocking heavy resources like images, font scripts, and CSS. This involves intercepting and blocking every request to these assets:

api/scraper.js
// ...
const scraper = async (req, res) => {
    try {
        // ...

        // disable CSS, images, and font scripts
        await page.route('**/*', (route) => {
            if (
                ['image', 'stylesheet', 'font'].includes(
                    route.request().resourceType()
                )
            ) {
                route.abort();
            } else {
                route.continue();
            }
        });

        // ...navigate to the target site
        // ...
    } catch (error) {
        // error handling
    }
};
The above modification can significantly reduce your scraper's memory and bandwidth usage.

Timeout Problems

Vercel applies timeout limits to prevent serverless functions from consuming resources indefinitely. Vercel's maximum timeout configuration docs provide more information.

Timeout errors occur when your script exceeds the serverless execution timeout limit. The error typically looks like this:

Example
Error: Function execution timed out after 10 seconds
This error can result from a poor internet connection, the latency of the target page, heavy resources, complex DOM structure, slow browser startup, and prolonged wait times. To allow the serverless environment more time to handle these factors, you should consider increasing the timeout limit in your vercel.json file:

vercel.json
{
    "functions": {
    "api/scraper.js": {
      // ...,
      "maxDuration": 15 // adjust as needed
    }
    //   ...
}
While Vercel's free plan allows a maximum timeout of 60 seconds, paid plans offer as high as 900 seconds. However, adjust these timeout limits reasonably to accommodate the time required to run the function.

Additionally, if you're scraping a resource-heavy website, you can block non-essential page assets as in the previous section. You can also mitigate slow browser startup by connecting Playwright with a persistent remote Chromium instance (to be discussed in detail later). This relieves the serverless environment from the overhead of launching a new browser process on every request.

Browser Binary Issue

Missing browser binaries is a common issue when deploying Playwright to a Vercel. The error usually appears as shown, indicating that your deployment can't find a browser binary.

Example
Error: Failed to launch browser: No browser binary found
The "No browser binary found" error can happen if:

You use playwright-core without a dedicated browser binary: The @sparticuz/chromium binary is recommended for serverless environments.
Chromium's executable path is incorrect. To mitigate this, point playwright-core to the @sparticuz/chromium binary executable path (chromiumBinary.executablePath).
The playwright-core and Chromium versions are incompatible: To avoid this, ensure you run the npm installation command without specifying a version to get the latest version of both tools by default.
Cold Start Optimization

Cold start occurs when the serverless function starts from scratch after a period of inactivity. This significantly slows execution time, as the Playwright browser instance restarts instead of reusing an existing instance. Depending on factors such as network connection, the cold start duration can be between 5 to 10 seconds.

One way to avoid cold starts is to keep the connection warm by persisting the Chromium instance.

To keep the browser warm, you can cache its instance and reuse it across multiple requests. You can achieve this by serving the browser cache with a dedicated function:

api/scraper.js
// ...

// global browser instance
let browser;

// function to get or create the browser instance
const getBrowser = async () => {
    if (!browser) {
        const executablePath = await chromiumBinary.executablePath();
        browser = await chromium.launch({
            args: chromiumBinary.args,
            executablePath: executablePath,
            headless: true,
        });
    }
    return browser;
};
// ...
However, maintaining a persistent browser instance involves trade-offs, such as accumulated cost and the risk of memory leaks if not appropriately managed.

You can monitor your build's memory usage on Vercel by going to the Observability tab and clicking Build Diagnostics. Scroll to the Deployments section, and you'll see the memory consumed by each deployment. Irregular spikes may indicate memory leakages.

Alternatively, you can monitor runtime memory consumption using logs or monitoring tools like Datadog, Logtail, or Prometheus. These tools track real-time memory usage, detect irregular spikes, and provide alerts for potential memory leaks. You can also log process.memoryUsage() in your Vercel functions to track consumption manually.

In addition to persisting the browser instance, ensure you only close page runtimes instead of exiting the entire browser instance for every connection:

Example
await page.close();
You should also periodically clean up the browser environment to free trapped resources and reset bandwidth consumption. A handy cleanup strategy is to restart the browser at intervals. This reduces runtime memory leaks and bandwidth accumulation.

The code below resets the connection every 10 minutes:

api/scraper.js
// ...

// periodic cleanup to prevent memory leaks
setInterval(async () => {
    if (browser) {
        await browser.close();
        browser = null;
        console.log('browser restarted to free memory');
    }
}, 600000); // restart every 10 minutes
// ...
Here are some best practices for effective browser environment cleanup:

Restart the browser periodically (as done in above).
Close pages after scraping instead of keeping them open.
Limit concurrent scraping tasks to avoid overwhelming system resources.
Updating the serverless scraper function with the changes from all sections produces the following final code:

api/scraper.js
// npm install playwright-core @sparticuz/chromium
const { chromium } = require('playwright-core');
const chromiumBinary = require('@sparticuz/chromium');

// global browser instance
let browser;

// function to get or create the browser instance
const getBrowser = async () => {
    if (!browser) {
        const executablePath = await chromiumBinary.executablePath();
        browser = await chromium.launch({
            args: chromiumBinary.args,
            executablePath: executablePath,
            headless: true,
        });
    }
    return browser;
};

const scraper = async (req, res) => {
    try {
        const browser = await getBrowser();

        // navigate to the target site
        const context = await browser.newContext();
        const page = await context.newPage();

        //turn off css, images, and font scripts
        await page.route('**/*', (route) => {
            if (
                ['image', 'stylesheet', 'font'].includes(
                    route.request().resourceType()
                )
            ) {
                route.abort();
            } else {
                route.continue();
            }
        });

        // get the target site html content
        await page.goto('https://www.scrapingcourse.com/ecommerce/');
        const htmlContent = await page.content();

        // close the page
        await page.close();

        // get the html as json response
        res.status(200).json({ htmlContent });
    } catch (error) {
        console.error('browser error:', error);
        res.status(500).json({ error: 'failed to scrape page' });
    }
};

// periodic cleanup to prevent memory leaks
setInterval(async () => {
    if (browser) {
        await browser.close();
        browser = null;
        console.log('browser restarted to free memory');
    }
}, 600000); // restart every 10 minutes

// export the function
module.exports = scraper;
Nice! You've optimized your Playwright scraper for deployment to Vercel's serverless platform. Yet, these optimizations may be inadequate, especially in edge cases like large-scale scraping.

However, the next section will introduce a solution that effectively addresses all these trade-offs and eliminates manual efforts.

Streamline Your Playwright Deployments With ZenRows' Scraping Browser

Deploying Playwright to Vercel presents scaling challenges, including increased infrastructure costs, complex maintenance requirements, and increased risks of anti-bot detection. These can impact reliability and performance.

The best way to handle these challenges is to replace the complex self-hosted setup with a cloud persistent browser instance such as the ZenRows Scraping Browser. This solution offers instantly available browser instances and a production-ready setup requiring simple one-line integration. You can run multiple browser instances concurrently at scale without worrying about infrastructure management.

The ZenRows Scraping Browser also significantly reduces the chances of anti-bot detection through advanced fingerprint management, automatic premium proxy rotation, and optimized human-like pattern spoofing.

Let's see how it works by scraping the previous E-commerce target website.

Sign up and go to the Scraping Browser Builder. Then, select Playwright as your scraping tool.

 ZenRows scraping browser
Click to open the image in full screen
Copy and paste the generated code into your scraper file. Ensure you replace the placeholder URL with your target URL.

Here's the generated code:

Example
// npm install playwright
const { chromium } = require('playwright');
const connectionURL = 'wss://browser.zenrows.com?apikey=<YOUR_ZENROWS_API_KEY>';

(async () => {
    const browser = await chromium.connectOverCDP(connectionURL);
    const page = await browser.newPage();
    await page.goto('https://www.scrapingcourse.com/ecommerce/');
    console.log(await page.title());
    await browser.close();
})();
The above code returns the target site's HTML, as shown:

Output
<!DOCTYPE html>
<html lang="en-US">
<head>
    <!--- ... --->
  
    <title>Ecommerce Test Site to Learn Web Scraping - ScrapingCourse.com</title>
    
  <!--- ... --->
</head>
<body class="home archive ...">
    <p class="woocommerce-result-count">Showing 1-16 of 188 results</p>
    <ul class="products columns-4">

        <!--- ... --->

    </ul>
</body>
</html>
Congratulations! 🎉 You've just super-charged your Playwright scraper with a cloud browser and are ready to scrape dynamic web pages at any scale.

Conclusion

In this article, you've learned how to host your Playwright scraper on Vercel's serverless platform. Remotely hosting your Playwright scraper relieves your local machine from managing heavy tasks.

However, scaling a self-hosted Playwright scraper can be challenging, as it is costly and increases the risk of being blocked. We recommend using the ZenRows Scraping Browser, a cloud-hosted, auto-managed, and production-ready solution.

Try ZenRows for free!
Ready to get started?
Up to 1,000 URLs for free are waiting for you
Try ZenRows for Free
Products
Scraper APIs
Universal Scraper API
Scraping Browser
Residential Proxies
Pricing
Solutions
E-commerce
Real Estate
SERP
Logistics
Job Boards
Social Media
Price Monitoring
Lead Generation
Sentiment Analysis
Market Research
LLM Training
Scraping Tutorials
Python Web Scraping
Node.js Web Scraping
Java Web Scraping
PHP Web Scraping
Golang Web Scraping
C# Web Scraping
Ruby Web Scraping
Scrapy Python Web Scraping
Selenium Web Scraping
Playwright Web Scraping
Puppeteer Web Scraping
Cloudflare Bypass
DataDome Bypass
Akamai Bypass
PerimeterX Bypass
Web Scraping Without Getting Blocked
Avoid Getting Blocked In Python
Solve CAPTCHAs
Web Scraping Proxy
Resources
API Documentation
Knowledge Hub
Web Scraping Blog
Status
Company
Careers
Press
Affiliate
Contact
Legal
2025 ZenRows®. All rights reserved.