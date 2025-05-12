'use server';
/**
 * @fileOverview Generates an article based on user inputs, supporting various formats, languages, and integrated image generation.
 *
 * - generateArticle - A function for non-streaming article generation, potentially including AI-generated images.
 * - GenerateArticleInput - The input type for the generateArticle function.
 * - GenerateArticleOutput - The output type for non-streaming generation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { generateImage } from './generate-image';

// Schema for the input of the article generation
const GenerateArticleInputSchema = z.object({
  keywords: z.string().describe('Comma-separated keywords or topics for the article.'),
  contentType: z.string().describe('The type of content to generate (e.g., blog post, technical summary).'),
  language: z.string().describe('The target language for the generated article (e.g., English, Spanish).'),
  uploadedContent: z.string().optional().describe('Text content extracted from a user-uploaded document. This is prioritized as primary reference.'),
  additionalContext: z.string().optional().describe('Any additional textual context, description, or notes provided by the user.'),
  outputFormat: z.enum(['text', 'markdown', 'html']).describe("The desired output format: 'text', 'markdown', or 'html'."),
  numberOfImages: z.number().int().min(0).max(5).optional().describe('Number of images to generate and embed (0-5).'),
});
export type GenerateArticleInput = z.infer<typeof GenerateArticleInputSchema>;

// Schema for the output of the article generation (final output to client)
const GenerateArticleOutputSchema = z.object({
  article: z.string().describe('The generated article content, potentially including embedded images.'),
});
export type GenerateArticleOutput = z.infer<typeof GenerateArticleOutputSchema>;

// Schema for the direct output from the LLM for article generation step
const GenerateArticleLLMOutputSchema = z.object({
  articleContent: z.string().describe(
    "The generated article content. If images were requested (numberOfImages > 0), this content MUST include the exact placeholder strings like '{{IMAGE_PLACEHOLDER_0}}', '{{IMAGE_PLACEHOLDER_1}}', etc., at the most contextually appropriate locations for each image. The number of placeholders should match 'numberOfImages' if possible."
  ),
  imagePromptSuggestions: z.array(z.string()).optional().describe(
    "If images were requested, this is an array of concise, descriptive prompts (max 20 words each) for an image generation model. Each prompt corresponds to a placeholder (e.g., first prompt for {{IMAGE_PLACEHOLDER_0}}). The number of prompts should ideally match 'numberOfImages'."
  ),
});

const generateArticlePrompt = ai.definePrompt({
  name: 'generateArticleWithMultipleImagesPrompt',
  input: { schema: GenerateArticleInputSchema },
  output: { schema: GenerateArticleLLMOutputSchema },
  prompt: `You are an AI assistant specializing in content generation and structuring. Your primary goal is to create a well-structured and coherent "{{contentType}}" based on the provided information.

Output Format for Textual Content: {{outputFormat}}. Ensure the textual part of your output strictly adheres to this format.
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

{{#if numberOfImages}}
{{#if (gt numberOfImages 0)}}
Image Integration Instructions (Generating {{numberOfImages}} image(s)):
1.  First, generate the complete "{{contentType}}" as described by the user.
2.  Within this generated textual content, identify {{numberOfImages}} single, most contextually appropriate unique locations for images.
3.  At each chosen location, you MUST insert a unique placeholder string. The placeholders must be in the format '{{IMAGE_PLACEHOLDER_X}}', where X is a zero-based index (e.g., '{{IMAGE_PLACEHOLDER_0}}', '{{IMAGE_PLACEHOLDER_1}}', etc.).
    If {{numberOfImages}} images are requested, generate placeholders sequentially from '{{IMAGE_PLACEHOLDER_0}}' up to the placeholder corresponding to the ({{numberOfImages}} - 1)-th index.
    For example, if {{numberOfImages}} is 3, the placeholders would be '{{IMAGE_PLACEHOLDER_0}}', '{{IMAGE_PLACEHOLDER_1}}', and '{{IMAGE_PLACEHOLDER_2}}'.
    DO NOT add any other text, markdown, or HTML tags around these placeholders. Just the placeholder itself.
4.  After determining placeholder locations and generating the article text, create an array of {{numberOfImages}} concise and descriptive image generation prompts (max 20 words each). Each prompt in the 'imagePromptSuggestions' array should correspond to its placeholder (e.g., the first prompt for '{{IMAGE_PLACEHOLDER_0}}').
5.  The final textual article content you provide in the 'articleContent' field must contain these '{{IMAGE_PLACEHOLDER_X}}' strings.
6.  The 'imagePromptSuggestions' field should contain your array of generated image prompts. If you can't find a suitable place or prompt for some images, provide fewer prompts than {{numberOfImages}}, but ensure placeholders match the number of prompts.

Example for "numberOfImages: 2":
'articleContent': "Intro text... {{IMAGE_PLACEHOLDER_0}} More text... {{IMAGE_PLACEHOLDER_1}} Conclusion."
'imagePromptSuggestions': ["A photo of concept A", "An illustration of concept B"]
{{else}}
Image Integration Instructions:
No images are requested (numberOfImages is 0). Generate only the textual content. Do not include any image placeholders or image prompt suggestions.
{{/if}}
{{else}}
Image Integration Instructions:
No images are requested. Generate only the textual content. Do not include any image placeholders or image prompt suggestions.
{{/if}}

General Instructions for Textual Content:
1.  Prioritize user-uploaded document content if provided.
2.  Incorporate additional context intelligently.
3.  Ensure the final article is logical, addresses keywords and content type.
4.  Generate STRICTLY in the "Target Language" and "Output Format".

Respond with a JSON object matching the defined output schema (articleContent, imagePromptSuggestions).`,
});


const generateArticleFlow = ai.defineFlow(
  {
    name: 'generateArticleFlow',
    inputSchema: GenerateArticleInputSchema,
    outputSchema: GenerateArticleOutputSchema,
  },
  async (input) => {
    const llmResponse = await generateArticlePrompt(input);
    
    if (!llmResponse.output || typeof llmResponse.output.articleContent !== 'string') {
      throw new Error('No valid article content received from the LLM.');
    }

    let finalArticleContent = llmResponse.output.articleContent;
    const imagePromptSuggestions = llmResponse.output.imagePromptSuggestions || [];
    
    const numImagesToProcess = Math.min(input.numberOfImages || 0, imagePromptSuggestions.length);

    if (numImagesToProcess > 0) {
      for (let i = 0; i < numImagesToProcess; i++) {
        const placeholder = `{{IMAGE_PLACEHOLDER_${i}}}`;
        const promptText = imagePromptSuggestions[i];

        if (!promptText || promptText.trim() === "") {
          // If prompt is empty, replace placeholder with a note
          const noPromptMessage = `[Image placeholder ${i} had no associated prompt.]`;
          if (input.outputFormat === 'text') {
            finalArticleContent = finalArticleContent.replace(placeholder, `\n${noPromptMessage}\n`);
          } else {
            finalArticleContent = finalArticleContent.replace(placeholder, `\n\n*${noPromptMessage}*\n\n`);
          }
          continue; 
        }

        try {
          const imageResult = await generateImage({ prompt: promptText });
          const imageDataUri = imageResult?.imageDataUri;

          if (imageDataUri && imageDataUri.trim() !== "" && imageDataUri.startsWith('data:image')) {
            let imageEmbedCode = '';
            const altText = promptText || `Generated image ${i + 1} for ${input.contentType}`;

            switch (input.outputFormat) {
              case 'html':
                imageEmbedCode = `<div style="margin: 1.5em 0; text-align: center;"><img src="${imageDataUri.trim()}" alt="${altText}" style="max-width: 100%; height: auto; border-radius: 0.5rem; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" /></div>`;
                break;
              case 'markdown':
                imageEmbedCode = `\n\n![${altText}](${imageDataUri.trim()})\n\n`;
                break;
              case 'text':
                imageEmbedCode = `\n\n[AI-generated image for: "${promptText}". In HTML/Markdown, this image would be displayed here.]\n\n`;
                break;
            }
            finalArticleContent = finalArticleContent.replace(placeholder, imageEmbedCode);
          } else {
            // Image generation failed or returned invalid URI
            const failureMessage = `[Image for prompt "${promptText}" could not be generated or was invalid.]`;
            if (input.outputFormat === 'text') {
              finalArticleContent = finalArticleContent.replace(placeholder, `\n${failureMessage}\n`);
            } else { // For MD/HTML
              finalArticleContent = finalArticleContent.replace(placeholder, `\n\n*${failureMessage}*\n\n`);
            }
          }
        } catch (imageError: any) {
          console.error(`Error generating or embedding image ${i} for prompt "${promptText}":`, imageError);
          const errorMsg = imageError instanceof Error ? imageError.message : "Unknown error";
          const failureMessage = `[Image generation failed for prompt "${promptText}": ${errorMsg}]`;
          if (input.outputFormat === 'text') {
            finalArticleContent = finalArticleContent.replace(placeholder, `\n${failureMessage}\n`);
          } else { // For MD/HTML
            finalArticleContent = finalArticleContent.replace(placeholder, `\n\n*${failureMessage}*\n\n`);
          }
        }
      }
    }

    // Fallback for any placeholders that were not specifically processed or if LLM hallucinated extra ones
    const placeholderRegex = /{{IMAGE_PLACEHOLDER_\d+}}/g;
    if (finalArticleContent.match(placeholderRegex)) {
        const missedPlaceholderMessage = `[An AI-generated image placeholder was present but not filled.]`;
        if (input.outputFormat === 'text') {
            finalArticleContent = finalArticleContent.replace(placeholderRegex, `\n${missedPlaceholderMessage}\n`);
        } else { // For MD/HTML
            finalArticleContent = finalArticleContent.replace(placeholderRegex, `\n\n*${missedPlaceholderMessage}*\n\n`);
        }
    }
    
    return { article: finalArticleContent };
  }
);

export async function generateArticle(input: GenerateArticleInput): Promise<GenerateArticleOutput> {
  return generateArticleFlow(input);
}
