// src/ai/flows/generate-article.ts
'use server';

/**
 * @fileOverview Generates a draft article based on keywords, content type, optional uploaded content, additional context, target language, and output format.
 * Implements streaming output.
 *
 * - generateArticleStream - A function that generates a draft article as a ReadableStream.
 * - GenerateArticleInput - The input type for the generateArticleStream function.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';
import {MessageData} from 'genkit/generate';


const GenerateArticleInputSchema = z.object({
  keywords: z.string().describe('Keywords to guide article generation.'),
  contentType: z
    .string()
    .describe('The type of content to generate (e.g., blog post, product description, marketing content, technical whitepaper).'),
  language: z.string().optional().describe('The target language for the generated article (e.g., "English", "Vietnamese", "Spanish"). Defaults to English if not specified.'),
  uploadedContent: z.string().optional().describe('Optional user-uploaded content (e.g., Markdown text) to use as a primary reference.'),
  additionalContext: z.string().optional().describe('Optional additional context, possibly from search results or user notes.'),
  outputFormat: z.enum(['text', 'markdown', 'html']).default('text').describe('The desired output format (e.g., "text", "markdown", "html"). Defaults to "text".')
});
export type GenerateArticleInput = z.infer<typeof GenerateArticleInputSchema>;

// Output schema is not strictly needed for streaming text, but good for potential structured output in future non-streaming versions.
// const GenerateArticleOutputSchema = z.object({
//   articleChunk: z.string().describe('A chunk of the generated article content.'),
// });


export const generateArticleStreamFlow = ai.defineFlow(
  {
    name: 'generateArticleStreamFlow',
    inputSchema: GenerateArticleInputSchema,
    outputSchema: z.string(), // The flow will return a stream of strings
    stream: true, // Enable streaming for this flow
  },
  async (input, $stream) => {
    // Construct the prompt messages array
    let fullPromptText = `You are an AI assistant specializing in content generation. Your primary goal is to create a well-structured and coherent "${input.contentType}" based on the provided information.

Output Format: ${input.outputFormat}. Ensure your entire output strictly adheres to this format. For example, if 'markdown' is requested, use Markdown syntax (headings, lists, bold, italics, code blocks, tables etc. where appropriate). If 'html' is requested, use valid, semantic HTML structure (e.g. <article>, <p>, <h1>, <ul>, <li>). If 'text' is requested, provide plain text.

Target Language: ${input.language || 'English'}. Make sure the entire output is in this language.
`;

    if (input.uploadedContent) {
      fullPromptText += `\n\nIMPORTANT: The following user-uploaded document is the MOST CRITICAL source. Prioritize its content above all else. Your generated article should primarily be derived from, expand upon, or summarize this document, tailored to the requested content type, keywords, and output format.\n--- USER UPLOADED DOCUMENT START ---\n${input.uploadedContent}\n--- USER UPLOADED DOCUMENT END ---`;
    }
    if (input.additionalContext) {
      fullPromptText += `\n\nConsider the following additional context, which might include search results or specific notes. Integrate relevant parts of this context if it complements the user-uploaded document (if provided) and the overall goal.\n--- ADDITIONAL CONTEXT START ---\n${input.additionalContext}\n--- ADDITIONAL CONTEXT END ---`;
    }
    fullPromptText += `\n\nKeywords/Topics to focus on: ${input.keywords}`;
    fullPromptText += `\n\nContent Type to generate: ${input.contentType}`;
    fullPromptText += `\n\nInstructions:\n1. If a user-uploaded document is provided, use it as the main foundation for the article.\n2. If additional context is provided, incorporate it intelligently to enhance the article, ensuring it aligns with the uploaded document's theme if one exists.\n3. If no uploaded document is provided, generate the article based on the keywords, additional context (if any), content type, and output format.\n4. Ensure the final article is logical, easy to understand, and directly addresses the specified keywords, content type, and output format.\n5. Generate the entire article STRICTLY in the "Target Language" specified above and in the "Output Format" specified. Do not mix languages or formats.\n6. For 'markdown' or 'html' formats, ensure the output is well-formed and complete. For example, for HTML, include necessary tags. For Markdown, use appropriate syntax for structure and emphasis.`;
    fullPromptText += `\n\nGenerated Article (in ${input.language || 'English'}, format: ${input.outputFormat}):`;
    
    if (typeof fullPromptText !== 'string' || !fullPromptText.trim()) {
      const errorDetail = `Prompt text is invalid or empty. Type: ${typeof fullPromptText}, Value: '${String(fullPromptText).substring(0,100)}...'`;
      console.error(errorDetail + ". Cannot generate article.");
      // This error will be caught by the ReadableStream wrapper in the exported function
      throw new Error(errorDetail); 
    }

    // Pass the fullPromptText string directly to ai.generateStream
    const {stream, response} = ai.generateStream({
      prompt: fullPromptText, 
      model: 'googleai/gemini-2.0-flash', 
      config: {
        // safetySettings: [
        //   { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        // ],
      },
    });
    
    for await (const chunk of stream) {
      if (chunk.text) {
        $stream.write(chunk.text);
      }
    }
    await response; 
  }
);


export async function generateArticleStream(input: GenerateArticleInput): Promise<ReadableStream<Uint8Array>> {
  try {
    // Call the Genkit flow. It returns a Genkit-specific stream object.
    const genkitStream = await generateArticleStreamFlow(input);
    const encoder = new TextEncoder();
    
    // Adapt Genkit's stream to a standard ReadableStream<Uint8Array>
    const readableStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          // Iterate over chunks from the Genkit stream
          for await (const chunk of genkitStream) {
            if (typeof chunk === 'string') {
              controller.enqueue(encoder.encode(chunk));
            } else if (chunk && typeof chunk === 'object' && 'text' in chunk && typeof chunk.text === 'string') {
              // Handle cases where chunk might be an object with a text property (though flow outputSchema is z.string())
              controller.enqueue(encoder.encode(chunk.text));
            }
          }
          // Check if controller is still active before closing
          if (controller.desiredSize !== null && controller.desiredSize > 0) {
             controller.close();
          }
        } catch (error) {
          console.error('Error reading from Genkit stream or encoding in ReadableStream:', error);
          let errorMessage = "An unexpected error occurred during content generation streaming.";
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          // Check if controller is still active
          if (controller.desiredSize !== null && controller.desiredSize > 0) {
            try {
              controller.enqueue(encoder.encode(`\n\n--- STREAMING ERROR ---\n${errorMessage}`));
              controller.error(new Error(errorMessage)); 
            } catch (e) {
              console.warn("Controller was already closed or errored when trying to signal stream error:", e);
            }
          }
        } finally {
          // Ensure close is only called if controller is active and not already closed/errored
           if (controller.desiredSize !== null && controller.desiredSize > 0) {
            try {
                // controller.close(); // controller.error() already closes it. Explicit close here can cause errors if already errored.
            } catch (e) {
                // console.warn("Controller was already closed when trying to close in finally block:", e);
            }
          }
        }
      }
    });

    return readableStream;

  } catch (error) {
    console.error("Error initiating article generation stream (outer try-catch):", error);
    const encoder = new TextEncoder();
    let errorMessage = "Failed to start article generation stream.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Return a stream that immediately errors out with the message
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`--- ERROR INITIALIZING STREAM ---\n${errorMessage}`));
        controller.error(new Error(errorMessage));
        // controller.close() is not needed here as controller.error() closes it.
      }
    });
  }
}

// Kept for compatibility or non-streaming scenarios if needed in the future, but primary usage is streaming
export async function generateArticle(input: GenerateArticleInput): Promise<{article: string}> {
   const promptText = `You are an AI assistant specializing in content generation. Your primary goal is to create a well-structured and coherent "${input.contentType}" based on the provided information.

Output Format: ${input.outputFormat}. Ensure your entire output strictly adheres to this format. For example, if 'markdown' is requested, use Markdown syntax (headings, lists, bold, italics, code blocks, tables etc. where appropriate). If 'html' is requested, use valid, semantic HTML structure (e.g. <article>, <p>, <h1>, <ul>, <li>). If 'text' is requested, provide plain text.

Target Language: ${input.language || 'English'}. Make sure the entire output is in this language.
${input.uploadedContent ? `\n\nIMPORTANT: The following user-uploaded document is the MOST CRITICAL source. Prioritize its content above all else. Your generated article should primarily be derived from, expand upon, or summarize this document, tailored to the requested content type, keywords, and output format.\n--- USER UPLOADED DOCUMENT START ---\n${input.uploadedContent}\n--- USER UPLOADED DOCUMENT END ---` : ''}
${input.additionalContext ? `\n\nConsider the following additional context, which might include search results or specific notes. Integrate relevant parts of this context if it complements the user-uploaded document (if provided) and the overall goal.\n--- ADDITIONAL CONTEXT START ---\n${input.additionalContext}\n--- ADDITIONAL CONTEXT END ---` : ''}

Keywords/Topics to focus on: ${input.keywords}
Content Type to generate: ${input.contentType}

Instructions:
1. If a user-uploaded document is provided, use it as the main foundation for the article.
2. If additional context is provided, incorporate it intelligently to enhance the article, ensuring it aligns with the uploaded document's theme if one exists.
3. If no uploaded document is provided, generate the article based on the keywords, additional context (if any), content type, and output format.
4. Ensure the final article is logical, easy to understand, and directly addresses the specified keywords, content type, and output format.
5. Generate the entire article STRICTLY in the "Target Language" specified above and in the "Output Format" specified. Do not mix languages or formats.
6. For 'markdown' or 'html' formats, ensure the output is well-formed and complete.

Generated Article (in ${input.language || 'English'}, format: ${input.outputFormat}):`;
  
  const { text } = await ai.generate({
    prompt: promptText,
    model: 'googleai/gemini-2.0-flash',
  });
  return { article: text || '' };
}