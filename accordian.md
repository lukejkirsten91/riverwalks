Skip to main content
Register for our Fusion Q&A session on 7/1


Builder logo
builder.io
Platform

Resources

Docs

Pricing
Contact Sales
Sign up



‹ Back to blog
WEB DESIGN
Creating Animated Accordions with the Details Element and Modern CSS
7 MARCH 2025
WRITTEN BY STEFAN JUDIS

Accordions are everywhere these days. GitHub has them on their home page right now. Figma ships them, too. I've implemented so many custom accordions that I can't count them.
But I must say, today’s accordions are pretty fancy. Here's what you'll find on github.com.


The accordion opens and closes with a good-looking slide animation, and when you toggle the entries, the image on the right column reflects the currently open entry.
How does this work?

JavaScript toggles data attributes and classes, and the good old CSS grid 0fr to 1fr trick is used to open the details content with a slide transition.

What If I told you you can build the same thing using only HTML and modern CSS?

Check out this version that I built.


This example is built without any JavaScript. Without JS? Yep, there’s not a single script element.
Let me show you how to create these fancy accordions using details elements, the new interpolate-size and transition-behavior CSS properties, and the:has() selector.


Disclaimer: At the time of writing, some described CSS features are Chromium-only. However, all the features can be treated as progressive enhancement, and the accordion will still work for other browsers. The only thing missing will be the sliding animation.
Generating markup from your design

Whenever I want to sketch something like this quick 50/50 layout, I reach for Builder's Visual Copilot. Design something in Figma, import the design into Builder using the Figma plugin, and off you go.

After Builder generates the component source code, you can either copy and paste it into your editor or go the fancy route and automatically add your codified designs to your project with a single npx command.
You can even “talk” to your components, ask for improvements and refactorings, and export your designs to vanilla web HTML/CSS, React, Vue, and even Swift. It's pretty cool!

But let's get to our vanilla accordion code!

The base setup

After generating some juicy CSS, I cleaned things up a bit (AI ain't perfect yet) and ended up with the following HTML for our new accordion component.
<div class="accordion">
  <div class="detailsColumn">
    <details open>
      <summary>First entry</summary>
      <p>...<p>
    </details>
    <details>
      <summary>Second entry</summary>
      <p>...</p>
    </details>
    <details>
      <summary>Third entry</summary>
      <p>...</p>
    </details>
  </div>
  <div class="imagesColumn"></div>
</div>
The details elements allow us to show and hide content by clicking on the visible summary element. Additionally, the first element is already expanded by setting the open attribute.

Let's style the details elements and make them a real accordion that only allows one entry to be open!
Removing the details default styling

The details default styles are valuable for quick designs, but we aim for something more polished here. So, where are these triangle markers coming from?
The tiny triangles are defined in the user agent stylesheets. Unfortunately, Chromium/Firefox and Webkit render them in different ways.

A comparison of webkit and chromium/firefox, highlighting where the details default styling is located.
Chromium/Firefox defines a display: list-item on the summary element. Similar to li element, these elements come with a stylable ::marker pseudo-element, which can also be adjusted using the list-style property.
To remove the triangles coming from list-style-type: disclosure-open, you can either declare list-style: none to remove all the ::marker elements or change the display property to anything but list-item to avoid rendering list styles at all.

A summary of the default user agent styles in Chromium.
Webkit's details implementation is entirely different. For Apple's browser, we have to reach for the internal pseudo-element selector ::-webkit-details-marker and hide it with display: none.
If we combine both approaches, we end up with the following CSS to remove the details triangles altogether.

/* Chromium / Firefox */
details summary {
  /* Either remove the list style ... */
  list-style: none;
  
  /* ... or change the `display` property to something else */
  display: flex;
}

/* Webkit */
details summary::-webkit-details-marker {
  display: none;
}
Side note: it's not great that major browsers ship different details element implementations. Luckily, this topic is included in Interop 2025, so we will see improvements this year.
Let's continue to make the elements a “real” accordion.
Connecting multiple details to build an exclusive accordion

Forcing all these details elements to be open one at a time is a trivial task in 2025 because you only need to set the same name attribute on all the elements.
<details open name="something">
  <summary>First entry</summary>
  <p>...<p>
</details>
<details name="something">
  <summary>Second entry</summary>
  <p>...</p>
</details>
That's it? Yes!
Connecting the details elements with the same name allows only one element to be open at a time. If one details element is opened, the others will be closed.

However, before you slap the same name attribute on all your details elements, be aware that exclusive accordions have accessibility and UX tradeoffs. In many situations, accessing information included in multiple elements is beneficial. For example, if extensive FAQs only allow one question to be open at a time, it will be terrible UX if someone wants to compare paragraphs. I would say that an exclusive accordion is “okay” for this small marketing widget, though.

With these few details tweaks, we implemented the core accordion functionality, and the component started to look like something real after adding some styling.


Animating the details content

At this stage, our details elements are connected and open only one at a time, but they're not looking perfect yet. The hidden content isn't animating or transitioning. How can we make the details content “slide open”?
To do that, we can reach into our CSS magic bag!

::details-content — the expandable/collapsible details content

To animate and transition the hidden accordion content, we need to find a way to select it first.
Wrapping everything in a div might be an option, but this approach often leads to CSS hacks and spacing issues. Chromium browsers ship a new solution to avoid these wrapper elements — ::details-content.

The new pseudo-element lets us select all the content that's not the summary element itself.

A preview of the Chromuim "details-content" pseudo-element, located in a "slot" element.
For example, if you want to color everything that shows up after clicking the summary element in red, you can set a background color on the ::details-content pseudo-element.
details::details-content {
  background: red;
}
An accordion menu, with one list item highlighted in red.
Coloring this new pseudo-element isn't helpful, though, so let's use ::details-content for a sliding transition.
Animating height with interpolate-size

Now that we can select all the hidden content, you could think of adding an overflow: hidden to transition the height property, but, unfortunately, this won’t work.
/* This won't work yet */
details::details-content {  
  overflow: hidden;
  height: 0;  
  transition: height 0.3s;
}

details[open]::details-content {
  height: auto;
}
We can't animate from a <length-percentage> value like 0 to an intrinsic size value like auto in CSS. Or can we?
I have a surprise for you!

In Chromium, you can animate from 200px (or other values) to auto by setting interpolate-size. The allow-keywords value will instruct browsers to do some Math and allow transitioning from specific values to auto, min-content, and other keyword values. This new CSS property is a big deal!

It should be safe to turn on interpolate-size on the :root element, and all included elements will inherit this new setting.

:root {
  interpolate-size: allow-keywords;
}
And now look at this.

This sliding animation isn't perfect yet, but opening the details element looks pretty good already. However, what's up with the closing transition?
Transitioning properties like display or content-visibility with transition-behavior

If you inspect Chromium's details toggle behavior, you'll discover that the closed ::details-content element includes a content-visibility: hidden;. This CSS property prevents our closing slide transition from being visible.
A comparison between closed and open details elements, showing that the closed details has a "content-visibility" of "hidden".
Whenever we close the details element, content-visibility: hidden; is applied to the ::details-content pseudo-element. content-visibility makes any visible effect disappear immediately because there's nothing to transition when the value changes from visible to hidden. The element is just hidden right away.
If you ever wanted to create an exit animation and realized that it wouldn’t work because display: none will hide the element right away, this here is the same problem.

The question is how should browsers transition discrete values (hidden, visible, …)?

The default behavior is to flip the values immediately and ignore the fact that you defined a transition. This is why display: none or content-visibility: hidden are applied immediately.

Luckily, there are new ways to change this behavior! To enable easier transitions, we now have the transition-behavior property.

details::details-content {
  overflow: hidden;
  height: 0;
  /* Enable transitioning of `content-visibility` */
  transition: height 0.3s, content-visibility 0.3s;  
  transition-behavior: allow-discrete;
}
By setting transition-behavior: allow-discrete we can tell the browser that it's okay to also transition properties that aren't based on numbers. If you allow discrete animations, the values won't be flipped immediately but at the 50% transition mark.
For special cases like display and content-visibility, the values will only be flipped when the entire transition is over. This allows us to transition other properties and set display: none at the end of a transition.

When we turn on transition-behavior for the ::details-content, the browser will only toggle to content-visibility: hidden at the end of the specified transition (0.3s).

And now check this out!


This visual effect might not look like a big deal, but after fifteen years of web development, I'm absolutely amazed by being able to transition height and animate from and to display: none. This is huge!
Now that our accordion looks good, how can we show images depending on the opened details element?

Reacting to DOM changes with the :has() selector

Let's bring in the images in the right column of the accordion component.
<div class="accordion">
  <!-- The left column -->
  <div class="detailsColumn">
    <details open name="something">
      <summary>First entry</summary>
      <p>...<p>
    </details>
    <details name="something">
      <summary>Second entry</summary>
      <p>...</p>
    </details>
  </div>
  <!-- The right column -->
  <div class="imagesColumn">
    <img src="..." width="1000" height="1000" alt="">
    <img src="..." width="1000" height="1000" alt="">
  </div>
</div>
Side note: to keep things simpler, I decided to treat the images as “decorative” with an empty alt attribute (alt=””). This way, we can transition opacity to show and hide the images without worrying about their exposure in the accessibility tree.
The accordion should, by definition, always include the same number of details and img elements. Would it be possible to show and hide images depending on which details element is currently open?
It might be a bit adventurous, but I love using :has() for these cases.

Let’s hide all the images with opacity: 0; and scale them up to make them appear with a nice transition when they become visible.

.accordion img {
  opacity: 0;
  scale: 1.1;
  
  transition: scale 0.3s, opacity 0.3s;
}
Next, let’s bring in some :has() magic to make the images appear when their details counterpart was opened.
.accordion:has(details:nth-child(1)[open]) img:nth-child(1) {
  opacity: 1;
  scale: 1;
}
I know, this selector is a mouthful. Let's dissect it!
From right to left: we want to show the image that is a first child (img:nth-child(1)) inside of an .accordion that includes an opened details element that's also a first child (details:nth-child(1)[open]). It takes a moment to wrap your head around it, I know…

However, with this selector, we’re matching the position of the open details element with the visible img element, and we can extend it to cover all the included accordion entries.

.accordion:has(details:nth-child(1)[open]) img:nth-child(1),
.accordion:has(details:nth-child(2)[open]) img:nth-child(2),
.accordion:has(details:nth-child(3)[open]) img:nth-child(3),
.accordion:has(details:nth-child(4)[open]) img:nth-child(4),
.accordion:has(details:nth-child(5)[open]) img:nth-child(5),
.accordion:has(details:nth-child(6)[open]) img:nth-child(6) {
  opacity: 1;
  scale: 1;
}
And now look at this!

Of course, this approach comes with a significant trade-off. To cover all the cases, you must hardcode a number of entries in your CSS. This obviously isn't great, but I'm okay with shipping a few more selectors to avoid some JavaScript onClick handlers.
And now we're almost done; only one tiny feature is missing.

You might have noticed it: when all details elements are closed, all images are hidden and, unfortunately, we can't prevent the details elements from getting closed.

There's an open HTML specification issue about this problem, but it doesn't seem to have gotten any traction.
To work around this problem, I think it’s fair game to bring in a fallback image. Let's add a .fallback image at the end of the images container…
<div class="accordion">
  <div class="detailsCol">
    <!-- ... -->
  </div>
  <div class="imagesColumn">
    <img src="..." width="1000" height="1000" alt="">
    <img src="..." width="1000" height="1000" alt="">
    <img class="fallback" src="..." width="1000" height="1000" alt="">
  </div>
</div>
… and show this image when there are no open details elements inside our .accordion container.
/* 
  Show the `.default` image when `.accordion` 
  doesn't include open `details` elements 
*/
.accordion:not(:has(details[open])) .fallback {
  opacity: 1;
  scale: 1;
}
Et voilà!

I might sound like a broken record, but I'm absolutely amazed by all this CSS magic.
Conclusion

This was a wild ride, wasn't it?
In this post, we covered how to animate elements from height: 0; to height: auto;. We transitioned content-visibility from visible to hidden. And we wrote a funky :has() selector to react to all these details elements' opening and closing state.

All these new features show that the CSS evolution is in full swing, and it's enabling us to build things that we couldn’t build before. And I'm so here for building more with less code!

If you have any questions, let us know in the comments, shoot me an email, or tag us on social. And if you want to catch the next article teaching all this cutting-edge webdev stuff, subscribe to our newsletter below.

Until then — talk soon!




Written by
Stefan Judis

Stefan loves getting into web performance, new technologies, and accessibility, sends out a weekly web development newsletter and enjoys sharing nerdy discoveries on his blog.


INTRODUCING FUSION
BETA
What should we build?
Ask Fusion to build a SaaS l|
Attach

GitHubConnect a repo
FigmaFigma Import
MCPMCP Servers
Cursor ExtensionVS Code ExtensionGet Extension


SHARE
Twitter / X
LinkedIn
Facebook






Generate high quality code that uses your components & design tokens.
Try it now
Get a demo
Design to Code Automation
A pragmatic guide for engineering leaders and development teams
Access Now




Continue Reading
DESIGN TO CODE6 MIN
Figma to Code with Fusion AI
24 JUNE 2025
AI7 MIN
Introducing Fusion: Vibe Code at Any Scale
18 JUNE 2025
AI10 MIN
Mock up a website in five prompts
10 JUNE 2025
Get the latest from Builder.io
Dev Drop Newsletter
News, tips, and tricks from Builder, for frontend developers.
Product Newsletter
Latest features and updates on the Builder.io platform

By submitting, you agree to our Privacy Policy

PRODUCT
Platform Overview
AI Overview
Integrations
What's New
CAPABILITIES
Design to Code
Visual Editor
Headless CMS
A/B & Personalization
COMPANY
About
Careers
DEVELOPERS
Documentation
Devtools
Builder Blueprints
Best of Web
Performance Insights
OPEN SOURCE

Builder

Mitosis

AI Shell

Micro Agent

GPT Crawler

Qwik

Partytown
SOLUTIONS
Headless Commerce
Marketing Sites
Landing Pages
Mobile Apps
Multi-brand
POPULAR GUIDES
Figma to Code Guide
Composable Commerce Guide
Headless CMS Guide
Headless Commerce Guide
Composable DXP Guide
Design to Code
RESOURCES
Blog
Knowledge Base
Community Forum
Partners
Templates
Success Stories
Showcase
Resource Center
Glossary
Page Builder
>
FRAMEWORKS

React

Next.js

Qwik

Gatsby

Angular

Vue

Svelte

Remix

Nuxt

Astro
See All

© 2025 Builder.io, Inc.
Security
Privacy Policy
SaaS Terms
Compliance
Cookie Preferences
Gartner Cool Vendor 2024



