
# Gemini Content Forge

**Gemini Content Forge** is an AI-powered content generation application built with Next.js, TypeScript, and Google's Genkit. It empowers users to create diverse content such as articles, blog posts, product descriptions, and more, by leveraging generative AI. The application offers features like topic suggestion, real-time web research, document uploading for context, and multi-language output.

## Features

*   **AI-Powered Content Generation**:
    *   Generate various types of content (blog posts, articles, marketing copy, technical summaries, etc.).
    *   Specify keywords/topics to guide the AI.
    *   Define custom content types.
    *   Select the desired output language from a list of supported languages.
*   **Topic & Keyword Suggester**:
    *   Input an initial idea and get AI-generated suggestions for related topics and keywords.
    *   Easily add suggested topics to your content generation keywords.
*   **Real-time Web Search**:
    *   Integrates with Google Custom Search API to fetch up-to-date information from the web.
    *   AI-extracts the main textual content from search result URLs.
    *   Add snippets or full extracted content from search results to the "Additional Context" for content generation.
*   **Document Upload for Context**:
    *   Upload your own documents (.txt, .md, .pdf, .xlsx, .xls) to provide primary reference material for the AI.
    *   The AI prioritizes uploaded content when generating articles.
*   **Additional Context Input**:
    *   Provide a textual description, specific points, or notes to further guide the AI.
*   **Modern & Responsive UI**:
    *   Built with ShadCN UI components and Tailwind CSS for a clean, modern, and responsive user experience.
    *   User-friendly interface with clear sections for each step of the content creation process.
*   **Toast Notifications**: Provides feedback to the user for actions like successful generation, errors, or required inputs.

## Tech Stack

*   **Frontend**:
    *   [Next.js](https://nextjs.org/) (App Router, Server Components, Server Actions)
    *   [React](https://reactjs.org/)
    *   [TypeScript](https://www.typescriptlang.org/)
    *   [Tailwind CSS](https://tailwindcss.com/)
    *   [ShadCN UI](https://ui.shadcn.com/) (for UI components)
    *   [Lucide React](https://lucide.dev/) (for icons)
*   **Backend/AI**:
    *   [Genkit (Firebase Genkit)](https://firebase.google.com/docs/genkit) - An open-source framework to build, deploy, and monitor AI-powered features.
        *   `@genkit-ai/googleai` plugin for integrating with Google's Gemini models.
    *   Google Gemini Models (via Genkit) for text generation and content extraction.
*   **Utilities**:
    *   `pdfjs-dist` for PDF text extraction.
    *   `xlsx` for Excel file text extraction.

## Getting Started

### Prerequisites

*   Node.js (version 18.x or later recommended)
*   npm or yarn

### Setup

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd gemini-content-forge 
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up Environment Variables**:
    Create a `.env` file in the root of your project and add the following environment variables:

    ```env
    # For Google Custom Search API
    # These MUST start with NEXT_PUBLIC_ to be accessible on the client-side for initial warnings,
    # but the actual API calls are made server-side via Genkit flows which read them without the prefix.
    # So, define both versions for full functionality.
    NEXT_PUBLIC_GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY_HERE
    NEXT_PUBLIC_CUSTOM_SEARCH_ENGINE_ID=YOUR_CUSTOM_SEARCH_ENGINE_ID_HERE

    # For Genkit flows (server-side)
    GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY_HERE
    CUSTOM_SEARCH_ENGINE_ID=YOUR_CUSTOM_SEARCH_ENGINE_ID_HERE

    # Ensure your Google API Key has "Custom Search API" and "Vertex AI API" (or "Generative Language API" if using older Gemini models directly) enabled in the Google Cloud Console.
    ```

    *   `YOUR_GOOGLE_API_KEY_HERE`: Your API key from Google Cloud Console. Ensure the "Custom Search API" and "Vertex AI API" (or "Generative Language API") are enabled for this key.
    *   `YOUR_CUSTOM_SEARCH_ENGINE_ID_HERE`: Your Custom Search Engine ID (CX ID). You can create one [here](https://programmablesearchengine.google.com/).

4.  **Run the development server**:
    The application runs on `http://localhost:9002` by default.
    ```bash
    npm run dev
    ```

5.  **(Optional) Run Genkit Developer UI**:
    To inspect and test your Genkit flows, you can run the Genkit Developer UI in a separate terminal:
    ```bash
    npm run genkit:dev
    # or for watching changes
    npm run genkit:watch
    ```
    This usually starts the Genkit UI on `http://localhost:4000`.

### Using the Application

1.  **Topic & Keyword Suggester**:
    *   Enter an initial idea in the "Your Initial Idea" field.
    *   Click "Suggest Topics".
    *   Suggested topics will appear below. Click on any suggestion to add it to the "Keywords / Topics" field in the Content Generation section.
2.  **Real-time Web Search**:
    *   Enter a query in the "Search Query" field.
    *   Click the search button.
    *   Search results will be displayed in an accordion.
    *   Each result shows the title, snippet, and a link to the source.
    *   The AI attempts to extract the main textual content from each URL, which is shown in the accordion content.
    *   Click "Add Snippet & Extracted Content to Context" to append the result's information to the "Additional Context" field in the Content Generation section.
3.  **Content Generation Setup**:
    *   **Keywords / Topics**: Fill this field with comma-separated keywords that define your desired content. You can use suggestions from the Topic Suggester.
    *   **Upload Document (Optional)**: Click "Choose a file..." to upload a `.txt`, `.md`, `.pdf`, `.xlsx`, or `.xls` file. The text content will be extracted and used as a primary reference by the AI.
    *   **Additional Context / Description (Optional)**: Provide any extra notes, a short description, or paste snippets from web search results here.
    *   **Custom Content Type**: Specify the type of content you want (e.g., "blog post," "product review," "technical summary," "email," "poem").
    *   **Output Language**: Select the target language for the generated content.
4.  **Generate Article**:
    *   Once all relevant fields are filled, click "Generate Article".
    *   The AI will process your inputs and generate the content.
    *   The generated article will appear in the "Generated Article" section, where you can review and edit it.

## Genkit Integration

This project uses Genkit to orchestrate calls to Google's Gemini AI models for various tasks:

*   **`suggest-topics.ts`**: Takes user input and suggests related topics or keywords.
*   **`google-search.ts`**:
    *   Performs a Google Custom Search using the provided API key and CX ID.
    *   For each search result URL, it attempts to fetch the HTML content.
    *   Calls the `extract-html-content.ts` flow to get the main text from the fetched HTML.
*   **`extract-html-content.ts`**: Takes raw HTML content and uses an LLM to extract the main textual article, stripping away boilerplate like navigation, footers, ads, etc.
*   **`generate-article.ts`**:
    *   The core content generation flow.
    *   Takes keywords, content type, target language, optional uploaded document content, and optional additional context.
    *   Constructs a prompt for the Gemini model to generate the desired article, prioritizing uploaded content if provided.

All Genkit flows are defined in the `src/ai/flows/` directory and are initialized in `src/ai/genkit.ts`. The Genkit development server can be started with `npm run genkit:dev` for debugging and flow inspection.

## Project Structure

```
.
├── public/
├── src/
│   ├── ai/                  # Genkit related files
│   │   ├── flows/           # Genkit flow definitions
│   │   │   ├── extract-html-content.ts
│   │   │   ├── generate-article.ts
│   │   │   ├── google-search.ts
│   │   │   └── suggest-topics.ts
│   │   ├── dev.ts           # Genkit development server entry point
│   │   └── genkit.ts        # Genkit global AI configuration
│   ├── app/                 # Next.js App Router
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx         # Main application page
│   ├── components/          # Reusable UI components (mostly ShadCN)
│   │   └── ui/
│   ├── hooks/               # Custom React hooks
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/                 # Utility functions
│   │   └── utils.ts
├── .env.example             # Example environment variables
├── components.json          # ShadCN UI configuration
├── next.config.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Potential Future Enhancements

*   **Streaming Output**: Implement streaming for generated articles for a better user experience with longer content.
*   **Image Generation**: Integrate image generation capabilities (e.g., using Gemini's image generation features via Genkit) based on article content or keywords.
*   **Advanced Formatting**: Allow more control over the output format (e.g., Markdown, HTML).
*   **User Accounts & History**: Save generated content and user preferences.
*   **More Sophisticated Context Management**: Allow users to select specific parts of search results or uploaded documents to include.
*   **Tone & Style Customization**: Provide options to specify the tone (e.g., formal, casual, humorous) or style of the generated content.
*   **Error Handling and Retries**: More robust error handling for API calls and content generation.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue.
```