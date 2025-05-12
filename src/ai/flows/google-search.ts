'use server';
/**
 * @fileOverview Performs a Google Custom Search and returns relevant results.
 *
 * - performGoogleSearch - A function that fetches search results from Google Custom Search API.
 * - GoogleSearchInput - The input type for the performGoogleSearch function.
 * - GoogleSearchOutput - The return type for the performGoogleSearch function.
 * - SearchResultItem - Represents a single search result item.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CUSTOM_SEARCH_ENGINE_ID = process.env.CUSTOM_SEARCH_ENGINE_ID;

const SearchResultItemSchema = z.object({
  title: z.string().describe('The title of the search result.'),
  link: z.string().describe('The URL of the search result.'),
  snippet: z.string().describe('A brief snippet or summary of the search result.'),
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
    // Return empty results or throw a more specific error if preferred
    // For now, let's return empty results to avoid breaking the UI if keys are not set
     return { results: [] };
    // throw new Error('Google API Key or Custom Search Engine ID is not configured.');
  }

  const { query } = input;
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${CUSTOM_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google Search API Error:', errorData);
      // Try to provide a more user-friendly error message if possible
      let message = `Google Search API request failed: ${response.statusText}`;
      if (errorData && errorData.error && errorData.error.message) {
        message = `Google Search API Error: ${errorData.error.message}`;
      }
      throw new Error(message);
    }
    const data = await response.json();

    const results: SearchResultItem[] = (data.items || []).map((item: any) => ({
      title: item.title || 'N/A',
      link: item.link || '#',
      snippet: item.snippet || 'No snippet available.',
    }));

    return { results };
  } catch (error) {
    console.error('Error during Google search:', error);
    // Re-throw to be caught by the caller, or handle more gracefully
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

// Exported wrapper function
export async function performGoogleSearch(input: GoogleSearchInput): Promise<GoogleSearchOutput> {
    return googleSearchFlow(input);
}

