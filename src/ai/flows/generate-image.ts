
'use server';
/**
 * @fileOverview Generates an image based on a textual prompt.
 *
 * - generateImage - A function for image generation.
 * - GenerateImageInput - The input type for the generateImage function.
 * - GenerateImageOutput - The output type for image generation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Schema for the input of the image generation
const GenerateImageInputSchema = z.object({
  prompt: z.string().describe('A textual description of the image to generate.'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

// Schema for the output of the image generation
const GenerateImageOutputSchema = z.object({
  imageDataUri: z.string().describe("The generated image as a data URI (e.g., 'data:image/png;base64,...')."),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (input) => {
    if (!input.prompt || input.prompt.trim() === "") {
      throw new Error("Image generation prompt cannot be empty.");
    }

    try {
      const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // Must use this model for image generation
        prompt: input.prompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'], // Must include IMAGE
        },
      });

      if (!media || !media.url) {
        throw new Error('Image generation did not return a valid image media object.');
      }
      // The URL is expected to be a data URI for generated images
      return { imageDataUri: media.url };
    } catch (error) {
      console.error('Error during image generation flow:', error);
      if (error instanceof Error) {
        throw new Error(`Image generation failed: ${error.message}`);
      }
      throw new Error('An unknown error occurred during image generation.');
    }
  }
);

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  return generateImageFlow(input);
}
