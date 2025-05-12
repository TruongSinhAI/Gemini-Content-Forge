'use server';
/**
 * @fileOverview Performs a Google Custom Search and returns relevant results, including extracted content from URLs.
 *
 * - performGoogleSearch - A function that fetches search results from Google Custom Search API.
 * - GoogleSearchInput - The input type for the performGoogleSearch function.
 * - GoogleSearchOutput - The return type for the performGoogleSearch function.
 * - SearchResultItem - Represents a single search result item, now including fetchedContent.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {extractHtmlContent} from './extract-html-content'; // Import the new flow

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CUSTOM_SEARCH_ENGINE_ID = process.env.CUSTOM_SEARCH_ENGINE_ID;

const SearchResultItemSchema = z.object({
  title: z.string().describe('The title of the search result.'),
  link: z.string().describe('The URL of the search result.'),
  snippet: z.string().describe('A brief snippet or summary of the search result.'),
  fetchedContent: z.string().optional().describe('Extracted main textual content from the URL.'),
});
export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;

const GoogleSearchInputSchema = z.object({
  query: z.string().describe('The search query.'),
});
export type GoogleSearchInput = z.infer<typeof GoogleSearchInputSchema>;

const GoogleSearchOutputSchema = z.object({
  results: z.array(SearchResultItemSchema).describe('An array of search results.'),
});
export type GoogleSearchOutput = z.infer<typeof GoogleSearchOutputSchema>;

async function searchGoogleInternal(input: GoogleSearchInput): Promise<GoogleSearchOutput> {
  if (!GOOGLE_API_KEY || !CUSTOM_SEARCH_ENGINE_ID || GOOGLE_API_KEY === 'YOUR_GOOGLE_API_KEY_HERE' || CUSTOM_SEARCH_ENGINE_ID === 'YOUR_CUSTOM_SEARCH_ENGINE_ID_HERE') {
    console.warn('Google API Key or Custom Search Engine ID is not configured or using default placeholder values. Google Search will not function.');
    return { results: [] };
  }

  const { query } = input;
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${CUSTOM_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google Search API Error:', errorData);
      let message = `Google Search API request failed: ${response.statusText}`;
      if (errorData && errorData.error && errorData.error.message) {
        message = `Google Search API Error: ${errorData.error.message}`;
      }
      throw new Error(message);
    }
    const data = await response.json();

    const results: SearchResultItem[] = await Promise.all(
      (data.items || []).map(async (item: any): Promise<SearchResultItem> => {
        let fetchedContentString: string | undefined = undefined;
        if (item.link && (item.link.startsWith('http://') || item.link.startsWith('https://'))) {
          try {
            const pageResponse = await fetch(item.link, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
              },
              // Add a timeout to prevent hanging indefinitely
              // Note: AbortController is the standard way, but for simplicity with Genkit's environment:
              // signal: AbortSignal.timeout(10000) // 10 seconds, requires Node 16.14+ or modern browsers
            });

            if (pageResponse.ok) {
              const rawHtml = await pageResponse.text();
              const MAX_HTML_LENGTH = 35000; // Adjusted limit
              const truncatedHtml = rawHtml.length > MAX_HTML_LENGTH ? rawHtml.substring(0, MAX_HTML_LENGTH) + "\n[Content truncated]" : rawHtml;

              if (truncatedHtml.trim()) {
                const extractionResult = await extractHtmlContent({ htmlContent: truncatedHtml });
                fetchedContentString = extractionResult.extractedText;
              } else {
                 fetchedContentString = "[Content appears empty or could not be fetched meaningfully]";
              }
            } else {
              console.warn(`Failed to fetch content from ${item.link}: ${pageResponse.status} ${pageResponse.statusText}`);
              fetchedContentString = `[Failed to retrieve content from ${item.link}: Server responded with ${pageResponse.status} ${pageResponse.statusText}]`;
            }
          } catch (e: any) {
            console.error(`Error fetching or processing content from ${item.link}:`, e);
            fetchedContentString = `[Error fetching content from ${item.link}: ${(e as Error).message}]`;
          }
        } else {
          fetchedContentString = "[Invalid or non-HTTP(S) link, content not fetched]";
        }
        return {
          title: item.title || 'N/A',
          link: item.link || '#',
          snippet: item.snippet || 'No snippet available.',
          fetchedContent: fetchedContentString,
        };
      })
    );

    return { results };
  } catch (error) {
    console.error('Error during Google search:', error);
    if (error instanceof Error) {
        throw new Error(`Failed to perform Google search: ${error.message}`);
    }
    throw new Error('An unknown error occurred during Google search.');
  }
}

const googleSearchFlow = ai.defineFlow(
  {
    name: 'googleSearchFlow',
    inputSchema: GoogleSearchInputSchema,
    outputSchema: GoogleSearchOutputSchema,
  },
  async (input) => {
    return searchGoogleInternal(input);
  }
);

export async function performGoogleSearch(input: GoogleSearchInput): Promise<GoogleSearchOutput> {
    return googleSearchFlow(input);
}
