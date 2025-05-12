
'use server';
/**
 * @fileOverview Generates an article based on user inputs, supporting various formats and languages.
 *
 * - generateArticle - A function for non-streaming article generation.
 * - GenerateArticleInput - The input type for the generateArticle function.
 * - GenerateArticleOutput - The output type for non-streaming generation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod'; 

// Schema for the input of the article generation
const GenerateArticleInputSchema = z.object({
  keywords: z.string().describe('Comma-separated keywords or topics for the article.'),
  contentType: z.string().describe('The type of content to generate (e.g., blog post, technical summary).'),
  language: z.string().describe('The target language for the generated article (e.g., English, Spanish).'),
  uploadedContent: z.string().optional().describe('Text content extracted from a user-uploaded document. This is prioritized as primary reference.'),
  additionalContext: z.string().optional().describe('Any additional textual context, description, or notes provided by the user.'),
  outputFormat: z.enum(['text', 'markdown', 'html']).describe("The desired output format: 'text', 'markdown', or 'html'."),
});
export type GenerateArticleInput = z.infer<typeof GenerateArticleInputSchema>;

// Schema for the output of the article generation
const GenerateArticleOutputSchema = z.object({
  article: z.string().describe('The generated article content.'),
});
export type GenerateArticleOutput = z.infer<typeof GenerateArticleOutputSchema>;


const generateArticlePrompt = ai.definePrompt({
  name: 'generateArticlePrompt',
  input: { schema: GenerateArticleInputSchema },
  output: { schema: GenerateArticleOutputSchema },
  prompt: `You are an AI assistant specializing in content generation. Your primary goal is to create a well-structured and coherent "{{contentType}}" based on the provided information.

Output Format: {{outputFormat}}. Ensure your entire output strictly adheres to this format. For example, if 'markdown' is requested, use Markdown syntax (headings, lists, bold, italics, code blocks, tables etc. where appropriate). If 'html' is requested, use valid, semantic HTML structure (e.g. <article>, <p>, <h1>, <ul>, <li>). If 'text' is requested, provide plain text.

Target Language: {{language}}. Make sure the entire output is in this language.

{{#if uploadedContent}}
User-Uploaded Document (Primary Reference):
---
{{{uploadedContent}}}
---
{{/if}}

{{#if additionalContext}}
Additional Context/Notes from User:
---
{{{additionalContext}}}
---
{{/if}}

Keywords/Topics to focus on: {{keywords}}

Content Type to generate: {{contentType}}

Instructions:
1. If a user-uploaded document is provided, use it as the main foundation for the article. Prioritize this content.
2. If additional context is provided, incorporate it intelligently to enhance the article, ensuring it aligns with the uploaded document's theme if one exists.
3. If no uploaded document is provided, generate the article based on the keywords, additional context (if any), content type, and output format.
4. Ensure the final article is logical, easy to understand, and directly addresses the specified keywords, content type, and output format.
5. Generate the entire article STRICTLY in the "Target Language" specified above and in the "Output Format" specified. Do not mix languages or formats.
6. For 'markdown' or 'html' formats, ensure the output is well-formed and complete. For example, for HTML, generally provide the body content suitable for embedding or a complete document if appropriate for the content type. For Markdown, use appropriate syntax for structure and emphasis.

Generated Article (in {{language}}, format: {{outputFormat}}):`,
});


const generateArticleFlow = ai.defineFlow(
  {
    name: 'generateArticleFlow',
    inputSchema: GenerateArticleInputSchema,
    outputSchema: GenerateArticleOutputSchema,
  },
  async (input) => {
    const { output } = await generateArticlePrompt(input); // Pass input directly to prompt
    if (!output || typeof output.article !== 'string') { 
      throw new Error('No valid article content received from generateArticlePrompt');
    }
    return { article: output.article };
  }
);

export async function generateArticle(input: GenerateArticleInput): Promise<GenerateArticleOutput> {
  return generateArticleFlow(input);
}
