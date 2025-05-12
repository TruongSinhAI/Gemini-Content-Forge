'use server';
/**
 * @fileOverview Generates an article based on user inputs, supporting various formats, languages, and optional integrated image generation.
 *
 * - generateArticle - A function for non-streaming article generation, potentially including an AI-generated image.
 * - GenerateArticleInput - The input type for the generateArticle function.
 * - GenerateArticleOutput - The output type for non-streaming generation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { generateImage } from './generate-image'; // For integrated image generation

// Schema for the input of the article generation
const GenerateArticleInputSchema = z.object({
  keywords: z.string().describe('Comma-separated keywords or topics for the article.'),
  contentType: z.string().describe('The type of content to generate (e.g., blog post, technical summary).'),
  language: z.string().describe('The target language for the generated article (e.g., English, Spanish).'),
  uploadedContent: z.string().optional().describe('Text content extracted from a user-uploaded document. This is prioritized as primary reference.'),
  additionalContext: z.string().optional().describe('Any additional textual context, description, or notes provided by the user.'),
  outputFormat: z.enum(['text', 'markdown', 'html']).describe("The desired output format: 'text', 'markdown', or 'html'."),
  includeImage: z.boolean().optional().describe('Whether to generate and include an image in the article.'),
});
export type GenerateArticleInput = z.infer<typeof GenerateArticleInputSchema>;

// Schema for the output of the article generation (final output to client)
const GenerateArticleOutputSchema = z.object({
  article: z.string().describe('The generated article content, potentially including an embedded image.'),
});
export type GenerateArticleOutput = z.infer<typeof GenerateArticleOutputSchema>;

// Schema for the direct output from the LLM for article generation step
const GenerateArticleLLMOutputSchema = z.object({
  articleContent: z.string().describe(
    "The generated article content. If an image was requested and is to be included (includeImage=true), this content MUST include the exact placeholder string '{{IMAGE_PLACEHOLDER}}' at the single, most contextually appropriate location for an image. Otherwise, no placeholder."
  ),
  imagePromptSuggestion: z.string().optional().describe(
    "If includeImage was true, this is a concise, descriptive prompt (max 20 words) for an image generation model that would visually complement the article at the placeholder's location. This field should only be present if an image was requested and a placeholder was included."
  ),
});

const generateArticlePrompt = ai.definePrompt({
  name: 'generateArticleWithOptionalImagePrompt',
  input: { schema: GenerateArticleInputSchema },
  output: { schema: GenerateArticleLLMOutputSchema }, // LLM should output according to this schema
  prompt: `You are an AI assistant specializing in content generation and structuring. Your primary goal is to create a well-structured and coherent "{{contentType}}" based on the provided information.

Output Format for Textual Content: {{outputFormat}}. Ensure the textual part of your output strictly adheres to this format. For example, if 'markdown' is requested, use Markdown syntax. If 'html' is requested, use valid, semantic HTML. If 'text' is requested, provide plain text.

Target Language: {{language}}. Make sure the entire textual output is in this language.

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

{{#if includeImage}}
Image Integration Instructions:
1.  First, generate the complete "{{contentType}}" as described by the user.
2.  Within this generated textual content, identify ONE single, most contextually appropriate location for an image.
3.  At this chosen location, you MUST insert the exact placeholder string: {{IMAGE_PLACEHOLDER}}
    DO NOT add any other text, markdown, or HTML tags around this placeholder. Just the placeholder itself.
4.  After determining the placeholder's location and generating the article text around it, create a concise and descriptive image generation prompt (max 20 words) that would visually complement the article content at the placeholder's location. This prompt will be used to generate an actual image.
5.  The final textual article content you provide in 'articleContent' field must contain this '{{IMAGE_PLACEHOLDER}}'.
6.  The 'imagePromptSuggestion' field should contain your generated image prompt.

Example for "includeImage: true": If generating a blog post about "baking apple pie" and you decide an image of the finished pie is best after the introduction, your 'articleContent' might be:
"Baking an apple pie is a delightful experience... {{IMAGE_PLACEHOLDER}} Now, let's get to the ingredients..."
And 'imagePromptSuggestion' could be: "A golden-brown baked apple pie cooling on a rustic table."
{{else}}
Image Integration Instructions:
No image is requested. Generate only the textual content. Do not include any image placeholders or image prompt suggestions. The 'imagePromptSuggestion' field should be omitted or empty.
{{/if}}

General Instructions for Textual Content:
1.  If a user-uploaded document is provided, use it as the main foundation for the article. Prioritize this content.
2.  If additional context is provided, incorporate it intelligently to enhance the article.
3.  Ensure the final article is logical, easy to understand, and directly addresses the specified keywords and content type.
4.  Generate the entire article STRICTLY in the "Target Language" and "Output Format" specified. Do not mix languages or formats.
5.  For 'markdown' or 'html' formats, ensure the output is well-formed and complete.

Respond with a JSON object matching the defined output schema (articleContent, imagePromptSuggestion).`,
});


const generateArticleFlow = ai.defineFlow(
  {
    name: 'generateArticleFlow',
    inputSchema: GenerateArticleInputSchema,
    outputSchema: GenerateArticleOutputSchema, // Final output to client
  },
  async (input) => {
    // Call the LLM to get article content (potentially with placeholder) and an image prompt suggestion
    const llmResponse = await generateArticlePrompt(input);
    
    if (!llmResponse.output || typeof llmResponse.output.articleContent !== 'string') {
      throw new Error('No valid article content received from the LLM.');
    }

    let finalArticleContent = llmResponse.output.articleContent;
    const imagePromptSuggestion = llmResponse.output.imagePromptSuggestion;

    if (input.includeImage && imagePromptSuggestion && imagePromptSuggestion.trim() !== "" && finalArticleContent.includes('{{IMAGE_PLACEHOLDER}}')) {
      try {
        const imageResult = await generateImage({ prompt: imagePromptSuggestion });
        
        // Ensure imageDataUri is a valid, non-empty, non-whitespace string
        if (imageResult && imageResult.imageDataUri && imageResult.imageDataUri.trim() !== "") {
          let imageEmbedCode = '';
          const altText = imagePromptSuggestion || `Generated image for ${input.contentType}`;

          switch (input.outputFormat) {
            case 'html':
              imageEmbedCode = `<div style="margin: 1.5em 0; text-align: center;"><img src="${imageResult.imageDataUri.trim()}" alt="${altText}" style="max-width: 100%; height: auto; border-radius: 0.5rem; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" /></div>`;
              break;
            case 'markdown':
              imageEmbedCode = `\n\n![${altText}](${imageResult.imageDataUri.trim()})\n\n`;
              break;
            case 'text':
              imageEmbedCode = `\n\n[An AI-generated image was created for this section based on the prompt: "${imagePromptSuggestion}". In HTML/Markdown formats, this image would be displayed here.]\n\n`;
              break;
          }
          finalArticleContent = finalArticleContent.replace('{{IMAGE_PLACEHOLDER}}', imageEmbedCode);
        } else {
            // If image generation failed or returned no URI / empty or whitespace URI, remove placeholder or add a note
            finalArticleContent = finalArticleContent.replace('{{IMAGE_PLACEHOLDER}}', 
                input.outputFormat === 'text' 
                ? '\n[Image generation was attempted but failed or did not produce a valid image.]\n' 
                : ''); // For markdown/html, just remove placeholder
        }
      } catch (imageError) {
        console.error('Error generating or embedding image:', imageError);
        const errorMsg = imageError instanceof Error ? imageError.message : "Unknown error during image generation";
        finalArticleContent = finalArticleContent.replace('{{IMAGE_PLACEHOLDER}}', 
            input.outputFormat === 'text' 
            ? `\n[Image generation failed: ${errorMsg}]\n` 
            : ''); // For markdown/html, just remove placeholder
      }
    } else {
        // If no image was requested, or no prompt/placeholder, ensure placeholder is removed if it somehow exists
        finalArticleContent = finalArticleContent.replace('{{IMAGE_PLACEHOLDER}}', '');
    }

    return { article: finalArticleContent };
  }
);

export async function generateArticle(input: GenerateArticleInput): Promise<GenerateArticleOutput> {
  return generateArticleFlow(input);
}
