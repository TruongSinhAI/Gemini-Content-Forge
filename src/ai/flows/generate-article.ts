// src/ai/flows/generate-article.ts
'use server';

/**
 * @fileOverview Generates a draft article based on keywords and content type.
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
  prompt: `You are an AI assistant specializing in content generation.  Based on the keywords provided, generate a draft article of the specified content type.

Content Type: {{{contentType}}}
Keywords: {{{keywords}}}

Article:`,
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
