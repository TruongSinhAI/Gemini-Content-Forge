'use server';
/**
 * @fileOverview Extracts main textual content from raw HTML.
 *
 * - extractHtmlContent - A function that takes raw HTML and returns extracted text.
 * - ExtractHtmlInput - The input type for the extractHtmlContent function.
 * - ExtractHtmlOutput - The return type for the extractHtmlContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractHtmlInputSchema = z.object({
  htmlContent: z.string().describe('Raw HTML content of a web page.'),
});
export type ExtractHtmlInput = z.infer<typeof ExtractHtmlInputSchema>;

const ExtractHtmlOutputSchema = z.object({
  extractedText: z.string().describe('The main textual content extracted from the HTML.'),
});
export type ExtractHtmlOutput = z.infer<typeof ExtractHtmlOutputSchema>;

export async function extractHtmlContent(input: ExtractHtmlInput): Promise<ExtractHtmlOutput> {
  return extractHtmlContentFlow(input);
}

const extractContentPrompt = ai.definePrompt({
  name: 'extractContentFromHtmlPrompt',
  input: {schema: ExtractHtmlInputSchema},
  output: {schema: ExtractHtmlOutputSchema},
  prompt: `You are an expert web content extractor. Your task is to analyze raw HTML content and extract the main textual article or primary readable content.

Instructions:
1.  Identify the core content body of the webpage.
2.  Extract all meaningful text from this main content area.
3.  Remove all HTML tags, JavaScript code, CSS styles.
4.  Exclude common boilerplate content such as:
    - Navigation menus (headers, sidebars)
    - Footers
    - Advertisements
    - Cookie consent pop-ups
    - Site branding elements that are not part of the main content
    - Social media sharing buttons
    - Comments sections (unless specifically part of the primary content, which is rare)
5.  Preserve paragraph structure and basic formatting if possible (e.g., line breaks between paragraphs).
6.  If the HTML appears to be an error page, a login page, or has no discernible main article/textual content, return a brief message like "[No significant textual content found on this page.]" or "[Page appears to be an error/login page.]".
7.  If the content is extremely long (e.g., more than a few thousand words), provide a concise summary of the main points or the first few significant paragraphs. Prioritize extracting the beginning of the article if full extraction is too verbose.

HTML Content to Process:
\`\`\`html
{{{htmlContent}}}
\`\`\`

Extracted Text:`,
});

const extractHtmlContentFlow = ai.defineFlow(
  {
    name: 'extractHtmlContentFlow',
    inputSchema: ExtractHtmlInputSchema,
    outputSchema: ExtractHtmlOutputSchema,
  },
  async input => {
    if (!input.htmlContent.trim()) {
      return { extractedText: "[No HTML content provided for extraction.]" };
    }
    const {output} = await extractContentPrompt(input);
    return output!;
  }
);
