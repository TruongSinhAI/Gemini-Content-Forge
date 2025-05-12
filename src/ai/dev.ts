import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-topics.ts';
import '@/ai/flows/generate-article-flow.ts';
import '@/ai/flows/google-search.ts';
import '@/ai/flows/extract-html-content.ts';
import '@/ai/flows/generate-image.ts'; 
