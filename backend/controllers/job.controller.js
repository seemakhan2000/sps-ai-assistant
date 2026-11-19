
import axios from "axios";
import * as cheerio from "cheerio";
import dns from "node:dns/promises";
import net from "node:net";

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const MAX_CONTENT_LENGTH = 5 * 1024 * 1024;
const REQUEST_TIMEOUT = 20000;

const cleanText = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

function isPrivateIP(address) {
  const version = net.isIP(address);

  if (version === 4) {
    const parts = address.split(".").map(Number);
    const [a, b] = parts;

    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }

  if (version === 6) {
    const normalized = address.toLowerCase();

    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb") ||
      normalized.startsWith("ff") ||
      normalized.startsWith("::ffff:")
    );
  }

  return true;
}

async function validatePublicUrl(url) {
  const parsed = new URL(url);

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error("INVALID_URL");
  }

  const hostname = parsed.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("BLOCKED_URL");
  }

  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      throw new Error("BLOCKED_URL");
    }

    return parsed;
  }

  let addresses;

  try {
    addresses = await dns.lookup(hostname, {
      all: true,
      verbatim: true,
    });
  } catch {
    throw new Error("DNS_FAILED");
  }

  if (
    !addresses.length ||
    addresses.some(({ address }) => isPrivateIP(address))
  ) {
    throw new Error("BLOCKED_URL");
  }

  return parsed;
}

function findJobPosting(data) {
  if (!data) return null;

  if (Array.isArray(data)) {
    for (const item of data) {
      const result = findJobPosting(item);
      if (result) return result;
    }

    return null;
  }

  if (typeof data !== "object") return null;

  const type = data["@type"];

  if (
    type === "JobPosting" ||
    (Array.isArray(type) && type.includes("JobPosting"))
  ) {
    return data;
  }

  if (data["@graph"]) {
    const result = findJobPosting(data["@graph"]);
    if (result) return result;
  }

  if (data.mainEntity) {
    const result = findJobPosting(data.mainEntity);
    if (result) return result;
  }

  return null;
}

function extractJobData(html, sourceUrl) {
  const $ = cheerio.load(html);

  let jobPosting = null;

  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const json = JSON.parse($(element).text());
      const result = findJobPosting(json);

      if (result && !jobPosting) {
        jobPosting = result;
      }
    } catch {
      // Ignore invalid JSON-LD.
    }
  });

  const title =
    jobPosting?.title ||
    $('meta[property="og:title"]').attr("content") ||
    $('meta[name="twitter:title"]').attr("content") ||
    $("h1").first().text() ||
    $("title").text();

  const company =
    jobPosting?.hiringOrganization?.name ||
    $('meta[property="og:site_name"]').attr("content") ||
    "";

  const description =
    jobPosting?.description ||
    $('[itemprop="description"]').html() ||
    $('[class*="job-description"]').first().html() ||
    $('[id*="job-description"]').first().html() ||
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";

  const jobDescription = cleanText(description);

  return {
    title: cleanText(title),
    company: cleanText(company),
    jobDescription,
    sourceUrl,
    location:
      jobPosting?.jobLocation?.address?.addressLocality ||
      jobPosting?.jobLocation?.address?.addressRegion ||
      "",
    employmentType: Array.isArray(jobPosting?.employmentType)
      ? jobPosting.employmentType.join(", ")
      : jobPosting?.employmentType || "",
  };
}

export const importJob = asyncHandler(async (req, res) => {
  const { url } = req.body || {};

  if (!url || typeof url !== "string") {
    return res.status(400).json({
      success: false,
      message: "Job posting URL is required.",
    });
  }

  let parsedUrl;

  try {
    parsedUrl = await validatePublicUrl(url.trim());
  } catch (error) {
    if (error.message === "INVALID_URL") {
      return res.status(400).json({
        success: false,
        message: "Invalid job posting URL.",
      });
    }

    if (error.message === "BLOCKED_URL") {
      return res.status(400).json({
        success: false,
        message: "This URL is not allowed.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Unable to resolve the job website hostname.",
    });
  }

  let response;

  try {
    response = await axios.get(parsedUrl.toString(), {
      timeout: REQUEST_TIMEOUT,
      maxRedirects: 0,
      maxContentLength: MAX_CONTENT_LENGTH,
      maxBodyLength: MAX_CONTENT_LENGTH,
      responseType: "text",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
  } catch (error) {
    console.error("Job import request failed:", {
      url: parsedUrl.hostname,
      code: error.code,
      status: error.response?.status,
      message: error.message,
    });

    if (
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT"
    ) {
      return res.status(504).json({
        success: false,
        message:
          "The job website is taking too long to respond. Please try again or enter the job description manually.",
      });
    }

    if (error.response?.status >= 300 &&
        error.response?.status < 400) {
      return res.status(422).json({
        success: false,
        message:
          "This website requires a redirect. Please use its final job posting URL.",
      });
    }

    if (error.response) {
      return res.status(502).json({
        success: false,
        message: `The job website returned HTTP ${error.response.status}.`,
      });
    }

    return res.status(502).json({
      success: false,
      message:
        "Unable to connect to the job website. Please try again later.",
    });
  }

  const contentType = response.headers["content-type"] || "";

  if (!contentType.toLowerCase().includes("text/html")) {
    return res.status(422).json({
      success: false,
      message: "The URL does not contain an HTML job page.",
    });
  }

  const jobData = extractJobData(
    response.data,
    parsedUrl.toString()
  );

  if (!jobData.jobDescription) {
    return res.status(422).json({
      success: false,
      message:
        "Unable to extract the job description. Please enter it manually.",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Job details imported successfully.",
    data: jobData,
  });
});
