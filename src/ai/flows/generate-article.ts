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
import {z} from 'genkit';
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
const GenerateArticleOutputSchema = z.object({
  articleChunk: z.string().describe('A chunk of the generated article content.'),
});


const generateArticlePrompt = ai.definePrompt({
  name: 'generateArticlePrompt',
  input: {schema: GenerateArticleInputSchema},
  // For streaming, output schema is more about the chunks, not the final object.
  // The flow itself will produce a ReadableStream<string>.
  prompt: `You are an AI assistant specializing in content generation. Your primary goal is to create a well-structured and coherent "{{contentType}}" based on the provided information.

Output Format: {{{outputFormat}}}. Ensure your entire output strictly adheres to this format. For example, if 'markdown' is requested, use Markdown syntax (headings, lists, bold, italics, code blocks, tables etc. where appropriate). If 'html' is requested, use valid, semantic HTML structure (e.g. <article>, <p>, <h1>, <ul>, <li>). If 'text' is requested, provide plain text.

Target Language: {{#if language}}{{{language}}}{{else}}English{{/if}}. Make sure the entire output is in this language.

{{#if uploadedContent}}
IMPORTANT: The following user-uploaded document is the MOST CRITICAL source. Prioritize its content above all else. Your generated article should primarily be derived from, expand upon, or summarize this document, tailored to the requested content type, keywords, and output format.
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
1.  If a user-uploaded document is provided, use it as the main foundation for the article.
2.  If additional context is provided, incorporate it intelligently to enhance the article, ensuring it aligns with the uploaded document's theme if one exists.
3.  If no uploaded document is provided, generate the article based on the keywords, additional context (if any), content type, and output format.
4.  Ensure the final article is logical, easy to understand, and directly addresses the specified keywords, content type, and output format.
5.  Generate the entire article STRICTLY in the "Target Language" specified above and in the "Output Format" specified. Do not mix languages or formats.
6.  For 'markdown' or 'html' formats, ensure the output is well-formed and complete. For example, for HTML, include necessary tags. For Markdown, use appropriate syntax for structure and emphasis.

Generated Article (in {{#if language}}{{{language}}}{{else}}English{{/if}}, format: {{{outputFormat}}}):`,
});


export const generateArticleStreamFlow = ai.defineFlow(
  {
    name: 'generateArticleStreamFlow',
    inputSchema: GenerateArticleInputSchema,
    outputSchema: z.string(), // The flow will return a stream of strings
    stream: true, // Enable streaming for this flow
  },
  async (input, $stream) => {
    // Construct the prompt messages array
    const promptMessages: MessageData[] = [];
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

    promptMessages.push({ role: 'user', content: [{ text: fullPromptText }] });

    const {stream, response} = ai.generateStream({
      prompt: promptMessages, // Use the constructed messages array
      input: input, // Pass the original input for context if needed by the model or plugins
      model: 'googleai/gemini-2.0-flash', // Ensure correct model is used
      // output: { schema: GenerateArticleOutputSchema }, // Not needed for direct streaming of text chunks
      config: {
        // You might want to adjust safety settings if you encounter issues with content generation being blocked.
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
    await response; // Wait for the full response metadata if needed
  }
);


export async function generateArticleStream(input: GenerateArticleInput): Promise<ReadableStream<Uint8Array>> {
  try {
    const resultStream = await generateArticleStreamFlow(input);
    const encoder = new TextEncoder();

    // Transform Genkit's stream of strings to a ReadableStream<Uint8Array>
    const transformStream = new TransformStream<string, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(encoder.encode(chunk));
      },
    });
    
    // It's important to handle the promise returned by pipeTo to catch errors during piping.
    // However, Genkit's flow stream might not be a standard ReadableStream<string> directly.
    // The 'resultStream' from a Genkit flow marked with 'stream:true' and outputSchema: z.string()
    // should be directly pipeable if it conforms to the expected stream type.
    // If Genkit `resultStream` is an async iterator, we need to manually read and write.
    
    const readableStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of resultStream) {
            if (typeof chunk === 'string') {
              controller.enqueue(encoder.encode(chunk));
            }
          }
          controller.close();
        } catch (error) {
          console.error('Error reading from Genkit stream or encoding:', error);
          let errorMessage = "An unexpected error occurred during content generation streaming.";
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          controller.enqueue(encoder.encode(`\n\n--- STREAMING ERROR ---\n${errorMessage}`));
          controller.error(new Error(errorMessage)); 
        }
      }
    });

    return readableStream;

  } catch (error) {
    console.error("Error initiating article generation stream:", error);
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
        controller.close();
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
