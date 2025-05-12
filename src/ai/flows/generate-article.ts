// src/ai/flows/generate-article.ts
'use server';

/**
 * @fileOverview Generates a draft article based on keywords, content type, optional uploaded content, and additional context.
 *
 * - generateArticle - A function that generates a draft article.
 * - GenerateArticleInput - The input type for the generateArticle function.
 * - GenerateArticleOutput - The return type for the generateArticle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateArticleInputSchema = z.object({
  keywords: z.string().describe('Keywords to guide article generation.'),
  contentType: z
    .enum(['blog post', 'product description', 'marketing content'])
    .describe('The type of content to generate.'),
  uploadedContent: z.string().optional().describe('Optional user-uploaded content (e.g., Markdown text) to use as a primary reference.'),
  additionalContext: z.string().optional().describe('Optional additional context, possibly from search results or user notes.')
});
export type GenerateArticleInput = z.infer<typeof GenerateArticleInputSchema>;

const GenerateArticleOutputSchema = z.object({
  article: z.string().describe('The generated article content.'),
});
export type GenerateArticleOutput = z.infer<typeof GenerateArticleOutputSchema>;

export async function generateArticle(input: GenerateArticleInput): Promise<GenerateArticleOutput> {
  return generateArticleFlow(input);
}

const generateArticlePrompt = ai.definePrompt({
  name: 'generateArticlePrompt',
  input: {schema: GenerateArticleInputSchema},
  output: {schema: GenerateArticleOutputSchema},
  prompt: `You are an AI assistant specializing in content generation. Your primary goal is to create a well-structured and coherent "{{contentType}}" based on the provided information.

{{#if uploadedContent}}
IMPORTANT: The following user-uploaded document is the MOST CRITICAL source. Prioritize its content above all else. Your generated article should primarily be derived from, expand upon, or summarize this document, tailored to the requested content type and keywords.
--- USER UPLOADED DOCUMENT START ---
{{{uploadedContent}}}
--- USER UPLOADED DOCUMENT END ---
{{/if}}

{{#if additionalContext}}
Consider the following additional context, which might include search results or specific notes. Integrate relevant parts of this context if it complements the user-uploaded document (if provided) and the overall goal.
--- ADDITIONAL CONTEXT START ---
{{{additionalContext}}}
--- ADDITIONAL CONTEXT END ---
{{/if}}

Keywords/Topics to focus on: {{{keywords}}}

Content Type to generate: {{{contentType}}}

Instructions:
1. If a user-uploaded document is provided, use it as the main foundation for the article.
2. If additional context is provided, incorporate it intelligently to enhance the article, ensuring it aligns with the uploaded document's theme if one exists.
3. If no uploaded document is provided, generate the article based on the keywords, additional context (if any), and content type.
4. Ensure the final article is logical, easy to understand, and directly addresses the specified keywords and content type.

Generated Article:`,
});

const generateArticleFlow = ai.defineFlow(
  {
    name: 'generateArticleFlow',
    inputSchema: GenerateArticleInputSchema,
    outputSchema: GenerateArticleOutputSchema,
  },
  async input => {
    const {output} = await generateArticlePrompt(input);
    return output!;
  }
);
