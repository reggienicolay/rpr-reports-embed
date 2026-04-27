---
title: How to capture leads in Google Sheets with the RPR Market Reports widget
slug: google-sheets-setup
draft: true
---

If you've added the **RPR Market Reports** widget to your website and you want every lead to land in a Google Sheet — with optional email notifications when a new row is added — this is your three-minute setup.

You don't need to write any code. We've published a Google Sheets template with the receiver script already attached. You make a copy, deploy it as a Web App, and paste the URL into the embed generator.

---

## What you'll end up with

- A Google Sheet that gains a new row every time a visitor submits the form
- Columns: **Timestamp · First Name · Last Name · Email · Phone · Area · Report URL**
- Optional: a Google Sheets **Notification Rule** that emails you when a row is added — fires within a minute or two
- Total cost: free, on any Google account

> **Heads up about the form mode you picked.** If you set up your widget in **Minimal** mode, the *First Name*, *Last Name*, and *Phone* columns will arrive empty — the Minimal form only captures email + area. That's by design (lower friction, higher conversions). If you need names and phone numbers, switch to **Full** mode in the embed generator's Widget Settings.

---

## Step 1 — Make a copy of the RPR template

Click the link below. Google will open a "Copy document?" prompt. Click **Make a copy**.

**[Make a copy of the RPR Lead Capture template →](https://docs.google.com/spreadsheets/d/1idAudX9UPqkYLvlMXK8TZcnBLKwKQQZzCA0y3U4ZoCE/copy)**

You'll get your own private copy in your Google Drive. The receiver script is already attached — you don't need to paste any code.

> Rename the Sheet if you like ("Beverly Hills leads", "Q3 market reports", whatever). The script doesn't care about the file name.

[SCREENSHOT: the "Copy document?" prompt with the **Make a copy** button highlighted]

---

## Step 2 — Deploy the script as a Web App

In your new Sheet, go to **Extensions → Apps Script**. A new tab opens with the script editor.

[SCREENSHOT: the Extensions menu with Apps Script highlighted]

In the top-right corner of the script editor, click **Deploy → New deployment**.

[SCREENSHOT: the Deploy button with "New deployment" expanded]

In the dialog:

1. Click the **gear icon** (⚙) next to "Select type" and choose **Web app**
2. Set **Execute as** to **Me (your-email@gmail.com)**
3. Set **Who has access** to **Anyone**
4. Click **Deploy**

[SCREENSHOT: the New deployment dialog with the three settings filled in]

> **About "Anyone".** This means anyone with the URL can POST data to your Sheet. The URL Google gives you is randomly generated and unguessable. Don't share it publicly — treat it like a password. Only the embed widget on your website needs to know it.

The first time you deploy, Google will ask you to **authorize access**. This is normal — you're granting your own script permission to write to your own Sheet. Click through the consent screens. If Google warns "This app isn't verified," click **Advanced → Go to (your project name) (unsafe)** — it's only "unverified" because it's a private project, not a public Marketplace add-on.

[SCREENSHOT: the authorization warning + Advanced link]

When the deploy finishes, you'll see your **Web app URL**. Click **Copy**.

[SCREENSHOT: the deployment success screen with the Web app URL + Copy button]

---

## Step 3 — Paste the URL into the embed generator

Go back to the [RPR embed generator](https://blog.narrpr.com/embed-generator/) (or wherever you build your widget code), open the **Lead Delivery** tab, pick **Google Sheets** from the dropdown, and paste the URL into the **Webhook URL** field.

Click **Send test** in the generator. If everything is wired up, a test row appears in your Sheet within a few seconds.

[SCREENSHOT: the embed generator's Lead Delivery panel showing the URL pasted in + a test row in the Sheet]

If the test row doesn't appear, see the troubleshooting section at the bottom of this post.

---

## Step 4 (optional) — Get an email when a new lead arrives

In your Sheet, go to **Tools → Notification settings → Edit notifications**.

Pick:
- **Notify me at: your-email@example.com**
- **When… Any changes are made**
- **How often… Right away**

[SCREENSHOT: the Notification rules dialog]

Click **Save**. You'll now get a short email every time a row is added to the Sheet, usually within 1–2 minutes of submission. Google batches these on busy days.

---

## Troubleshooting

**The test row never appears.**

Three things to check, in order:

1. The URL you pasted ends in `/exec` (not `/dev`). The `/dev` URL is the development sandbox — only `/exec` actually runs.
2. **Who has access** is set to **Anyone**, not "Anyone with Google account". The latter requires the visitor to be logged into Google, which most aren't.
3. The deployment is **active** — open Apps Script → **Deploy → Manage deployments** and confirm there's an active "Web app" deployment.

**Some columns are empty.**

You're probably running the widget in **Minimal** mode (email + area only). Switch the widget to **Full** mode in the Widget Settings panel of the embed generator, copy the new embed code, and paste it back into your website. The Minimal form is great for high-conversion lead capture, but it doesn't ask for first/last/phone.

**I want to update the script (you released a new version).**

Make a fresh copy from the template URL above. Your old Sheet keeps working — but the new copy will have any updated logic. You'll need to redeploy the new copy as a Web App and replace the URL in your widget.

**The Sheet is filling up with test/spam submissions.**

The widget has a built-in honeypot that silently blocks bots. If you're still getting noise, it's likely from someone who has your live page URL and is submitting the actual form. You can rate-limit by checking the most recent row's timestamp inside the script — ping us if you want a snippet.

---

## How it works (for the curious)

The widget runs entirely in the visitor's browser. When they submit the form, it does a `fetch()` POST to the URL you pasted, with a JSON body like:

```json
{
  "form_id":       "rpr-reports-abc123",
  "first_name":    "Sarah",
  "last_name":     "Johnson",
  "email":         "sarah@example.com",
  "phone":         "555-555-5555",
  "selected_area": "Beverly Hills 90210",
  "report_url":    "https://www.narrpr.com/reports-v2/UUID/pdf",
  "agent_name":    "Your Name",
  "brokerage":     "Your Brokerage",
  "gdpr_consent":  null,
  "source_url":    "https://yoursite.com/market-reports",
  "timestamp":     "2026-04-27T10:00:00.000Z"
}
```

Google's Apps Script invokes a function called `doPost(e)` whenever a POST hits the Web App URL. Our template's `doPost` parses the JSON body and calls `appendRow()` on your Sheet. That's it — the whole script is about 30 lines, and you can read it any time at **Extensions → Apps Script** in your Sheet.

If you'd rather host the receiver yourself (e.g. on Cloudflare Workers, a custom backend, etc.), the [embed widget README](https://github.com/reggienicolay/rpr-reports-embed#webhook-payload) documents the full payload contract.

---

## Privacy & data handling

- All lead data flows from the visitor's browser straight to **your** Google Sheet. RPR never sees it.
- The Web App URL is hosted on `script.google.com` — Google's own infrastructure. You control retention.
- If a visitor exercises their GDPR right to be deleted, find their row in the Sheet and delete it. Done.
- Don't share the Web App URL publicly. Anyone with it can write rows to your Sheet.
