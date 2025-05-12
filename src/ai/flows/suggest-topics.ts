'use server';

/**
 * @fileOverview This flow suggests topics or keywords related to the user's input.
 *
 * - suggestTopics - A function that suggests topics based on the input.
 * - SuggestTopicsInput - The input type for the suggestTopics function.
 * - SuggestTopicsOutput - The return type for the suggestTopics function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTopicsInputSchema = z.object({
  input: z.string().describe('The initial input from the user.'),
});
export type SuggestTopicsInput = z.infer<typeof SuggestTopicsInputSchema>;

const SuggestTopicsOutputSchema = z.object({
  topics: z.array(z.string()).describe('An array of suggested topics or keywords.'),
});
export type SuggestTopicsOutput = z.infer<typeof SuggestTopicsOutputSchema>;

export async function suggestTopics(input: SuggestTopicsInput): Promise<SuggestTopicsOutput> {
  return suggestTopicsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTopicsPrompt',
  input: {schema: SuggestTopicsInputSchema},
  output: {schema: SuggestTopicsOutputSchema},
  prompt: `Suggest topics or keywords related to the following input:\n\n{{input}}\n\nReturn the topics as a JSON array of strings.`,
});

const suggestTopicsFlow = ai.defineFlow(
  {
    name: 'suggestTopicsFlow',
    inputSchema: SuggestTopicsInputSchema,
    outputSchema: SuggestTopicsOutputSchema,
  },
  async input => {
 console.log(prompt(input));
    const {output} = await prompt(input);
    return output!;
  }
);
