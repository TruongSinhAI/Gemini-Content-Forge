
# Gemini Content Forge ✨

**Gemini Content Forge** is an AI-powered content and image generation application built with Next.js, TypeScript, and Google's Genkit. It empowers users to create diverse content such as articles, blog posts, product descriptions, and generate images from textual prompts, by leveraging generative AI. The application offers features like topic suggestion, real-time web research, document uploading for context, multi-language output, AI-driven image embedding, and a standalone image generator.

![image](https://github.com/user-attachments/assets/5d19d1bf-67cc-4983-88e9-7295d48e933b)


## 🚀 Key Features

*   **📝 AI-Powered Content Generation**:
    *   Craft various content types (blog posts, articles, marketing copy, technical summaries, emails, poems, etc.).
    *   Guide the AI with specific keywords and topics.
    *   Define custom content types (e.g., "a persuasive product review," "a short story in the style of...").
    *   Select the desired output language from a list of supported languages (default: Vietnamese).
    *   Choose output format: Plain Text, Markdown, or HTML (default: HTML).
    *   Generate and embed 0-5 contextually relevant AI images directly within your articles.
*   **🖼️ AI-Powered Image Generation**:
    *   Standalone feature to generate images from detailed textual prompts.
    *   Leverages Google's `gemini-2.0-flash-preview-image-generation` model.
    *   AI is instructed to avoid generating images with text overlays.
*   **💡 Intelligent Assistant Tools**:
    *   **Topic & Keyword Suggester**: Input an initial idea and receive AI-generated suggestions for related topics and keywords. Easily add them to your content generation pipeline.
    *   **Real-time Web Search**: Integrates with Google Custom Search API to fetch up-to-date information. The AI extracts main textual content from search result URLs, which can be added to your content's context.
*   **📚 Enhanced Contextual Understanding**:
    *   **Document Upload**: Upload your own documents (.txt, .md, .pdf, .xlsx, .xls). The AI prioritizes this content as primary reference material.
    *   **Additional Context Input**: Provide textual descriptions, specific points, or notes to further guide the AI's content creation process.
*   **✨ Modern & User-Friendly Experience**:
    *   Built with ShadCN UI components and Tailwind CSS for a clean, modern, and responsive interface.
    *   Intuitive layout with clear sections for each step of the content and image creation process.
    *   **Article Viewer Modal**: Preview generated articles in a dedicated modal with adjustable font sizes for optimal readability.
    *   **Convenient Output Handling**: Easily copy (text-only or raw) or download generated articles.
    *   Toast notifications for user feedback (success, errors, guidance).

## 🛠️ Tech Stack

*   **Frontend**:
    *   [Next.js](https://nextjs.org/) (App Router, Server Components)
    *   [React](https://reactjs.org/)
    *   [TypeScript](https://www.typescriptlang.org/)
    *   [Tailwind CSS](https://tailwindcss.com/)
    *   [ShadCN UI](https://ui.shadcn.com/) (for UI components)
    *   [Lucide React](https://lucide.dev/) (for icons)
    *   [next/image](https://nextjs.org/docs/pages/api-reference/components/image) (for image optimization where applicable, AI images are data URIs)
*   **Backend/AI**:
    *   [Genkit (Firebase Genkit)](https://firebase.google.com/docs/genkit) - An open-source framework to build, deploy, and monitor AI-powered features.
        *   `@genkit-ai/googleai` plugin for integrating with Google's Gemini models.
    *   Google Gemini Models (via Genkit):
        *   `gemini-2.5-flash-preview-04-17` for text generation and content extraction.
        *   `gemini-2.0-flash-preview-image-generation` for image generation.
*   **Utilities**:
    *   `pdfjs-dist` for PDF text extraction.
    *   `xlsx` for Excel file text extraction.
    *   `react-markdown` and `remark-gfm` for rendering Markdown content.

## 🏁 Getting Started

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
    Create a `.env` file in the root of your project. **It is crucial to configure these correctly for the application to function.**

    ```env
    # For Google Custom Search API & Genkit (Gemini Models)
    # IMPORTANT:
    # - GOOGLE_API_KEY and CUSTOM_SEARCH_ENGINE_ID are read by Genkit on the server-side.
    # - NEXT_PUBLIC_GOOGLE_API_KEY and NEXT_PUBLIC_CUSTOM_SEARCH_ENGINE_ID are used by the Next.js
    #   frontend *only* to display warnings if these keys seem unconfigured.
    #   The actual API calls for search are made server-side.
    # Ensure your Google API Key has "Custom Search API" and "Vertex AI API"
    # (or "Generative Language API" if using older Gemini models directly) enabled in the Google Cloud Console.
    # For Image Generation, ensure the Vertex AI API is enabled and the specific model
    # (gemini-2.0-flash-preview-image-generation) is accessible with your API key.

    GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY_HERE
    CUSTOM_SEARCH_ENGINE_ID=YOUR_CUSTOM_SEARCH_ENGINE_ID_HERE

    NEXT_PUBLIC_GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY_HERE
    NEXT_PUBLIC_CUSTOM_SEARCH_ENGINE_ID=YOUR_CUSTOM_SEARCH_ENGINE_ID_HERE
    ```

    *   Replace `YOUR_GOOGLE_API_KEY_HERE` with your API key from Google Cloud Console.
    *   Replace `YOUR_CUSTOM_SEARCH_ENGINE_ID_HERE` with your Custom Search Engine ID (CX ID). You can create one at the [Programmable Search Engine control panel](https://programmablesearchengine.google.com/).

4.  **Run the development server**:
    The application runs on `http://localhost:9002` by default.
    ```bash
    npm run dev
    ```

5.  **(Optional) Run Genkit Developer UI**:
    To inspect and test your Genkit flows, run the Genkit Developer UI in a separate terminal:
    ```bash
    npm run genkit:dev
    # or for watching changes
    npm run genkit:watch
    ```
    This usually starts the Genkit UI on `http://localhost:4000`.

## ⚙️ How to Use

The application is divided into intuitive sections to streamline your content and image creation workflow.

### 1. Idea Generation & Research (Optional but Recommended)

*   **Topic Suggester**:
    *   Navigate to the "Topic Suggester" card.
    *   Enter an initial idea or keyword (e.g., "benefits of remote work").
    *   Click "Suggest Topics". AI-generated suggestions will appear.
    *   Click on any suggestion to automatically add it to the "Keywords / Topics" field in the Content Generation section.
*   **Web Search**:
    *   Go to the "Web Search" card.
    *   Enter your search query (e.g., "latest trends in AI marketing").
    *   Click the search icon. Results from Google will be displayed.
    *   Each result includes a title, snippet, and a link to the source. The AI also attempts to extract the main textual content from each URL.
    *   Expand a search result to view its details and extracted content.
    *   Click "Add to Context" to append the result's title, snippet, and extracted content to the "Additional Context" field for your article.

### 2. Content Generation Setup

Located in the "Content Generation Setup" card:

*   **Keywords / Topics**: Fill this field with comma-separated keywords that define your desired content.
*   **Upload Document (Optional)**:
    *   Click "Choose .txt, .md, .pdf, .xlsx, .xls..." to upload a file.
    *   Supported formats: .txt, .md, .pdf, .xlsx, .xls.
    *   The extracted text will be prioritized by the AI as primary reference material.
*   **Additional Context (Optional)**: Provide extra notes, a detailed description, or paste relevant snippets (e.g., from web search results) here.
*   **Content Type**: Specify the type of content (e.g., "informative blog post," "technical summary," "persuasive email," "short poem").
*   **Output Format**: Choose between "Plain Text", "Markdown", or "HTML" (default: HTML).
*   **Output Language**: Select the target language (default: Vietnamese).
*   **Number of Images (0-5)**: Specify how many AI-generated images you want embedded within the article. The AI will determine suitable locations and generate relevant images.

### 3. Generate & Refine Article

*   Once all relevant fields are configured, click the "Generate Article" button.
*   The AI will process your inputs. An activity indicator will show progress.
*   The generated article will appear in the "Generated Article" section.
    *   For **Plain Text**: The content is displayed in an editable textarea.
    *   For **Markdown/HTML**: The content is rendered visually. You can toggle to "View Raw" to see the source code.
*   **Article Actions**:
    *   **View Article**: Opens a modal for a focused view of the article with adjustable font sizes (S, M, L, XL, XXL).
    *   **Copy Article**: Copies the article content. For HTML/Markdown, it copies the raw source. For Plain Text, it copies the text.
    *   **Download Article**: Downloads the article in the selected format (.txt, .md, .html).

### 4. Standalone Image Generation (Functionality present in code, UI may vary)

*   If there's a dedicated "Image Generation" section (as per project structure):
    *   Enter a descriptive prompt for the image (e.g., "a serene landscape with a futuristic city in the background").
    *   Click "Generate Image".
    *   The AI-generated image will be displayed.

## ✨ Genkit - The AI Engine

This project leverages **Genkit**, Google's open-source framework, to build and manage AI-powered features. Genkit orchestrates calls to Google's Gemini AI models for various tasks. Key flows include:

*   **`suggest-topics.ts`**: Takes a user's initial idea and suggests related topics or keywords using an LLM.
*   **`google-search.ts`**:
    *   Performs a Google Custom Search using the provided API key and CX ID.
    *   For each search result URL, it fetches the HTML content.
    *   Calls the `extract-html-content.ts` flow to derive the main text.
*   **`extract-html-content.ts`**: Uses an LLM to analyze raw HTML and extract the main textual article, stripping away boilerplate like navigation, ads, and footers.
*   **`generate-article-flow.ts`**:
    *   The core content generation logic.
    *   Accepts keywords, content type, language, output format, number of images, and optional context (uploaded document text, additional notes).
    *   Constructs a detailed prompt for the Gemini model (`gemini-2.5-flash-preview-04-17`).
    *   If images are requested, it instructs the LLM to:
        1.  Generate the article text with placeholders (e.g., `{{IMAGE_PLACEHOLDER_0}}`).
        2.  Suggest image prompts for each placeholder.
    *   It then calls the `generate-image.ts` flow for each suggested prompt and replaces placeholders with the actual image data (as data URIs) formatted according to the chosen output format.
*   **`generate-image.ts`**:
    *   Generates an image from a textual prompt using the `gemini-2.0-flash-preview-image-generation` model.
    *   Includes instructions to the AI to avoid generating text within the images.
    *   Configured with safety settings to allow a broader range of content generation.
    *   Returns the image as a data URI.

All Genkit flows are defined in the `src/ai/flows/` directory and are initialized in `src/ai/genkit.ts`. You can inspect and test these flows using the Genkit Developer UI (`npm run genkit:dev`).

## 📂 Project Structure

```
.
├── public/                  # Static assets
├── src/
│   ├── ai/                  # Genkit related files
│   │   ├── flows/           # Genkit flow definitions
│   │   │   ├── extract-html-content.ts
│   │   │   ├── generate-article-flow.ts
│   │   │   ├── generate-image.ts
│   │   │   ├── google-search.ts
│   │   │   └── suggest-topics.ts
│   │   ├── dev.ts           # Genkit development server entry point
│   │   └── genkit.ts        # Genkit global AI configuration & model selection
│   ├── app/                 # Next.js App Router
│   │   ├── globals.css      # Global styles & ShadCN theme variables
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Main application page component
│   ├── components/          # Reusable UI components
│   │   └── ui/              # ShadCN UI components
│   ├── hooks/               # Custom React hooks (e.g., useToast, useMobile)
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/                 # Utility functions (e.g., cn for classnames)
│   │   └── utils.ts
├── .env                     # Local environment variables (create this file)
├── components.json          # ShadCN UI configuration
├── next.config.ts           # Next.js configuration
├── package.json
├── tailwind.config.ts       # Tailwind CSS configuration
└── tsconfig.json            # TypeScript configuration
```

## 🔮 Future Roadmap

*   **Streaming Output for Articles**: Re-introduce streaming for generated articles to enhance user experience for longer content (previously prototyped, needs robust implementation).
*   **Advanced Image Control**: Allow options like aspect ratio, style guidance, or negative prompts for image generation.
*   **User Accounts & History**: Implement user authentication to save generated content, images, and preferences.
*   **Sophisticated Context Management**: Allow users to select specific parts of search results or uploaded documents to include, rather than entire texts.
*   **Tone & Style Customization**: Provide explicit options to specify the tone (e.g., formal, casual, humorous) or writing style of the generated content.
*   **Enhanced Error Handling & Retries**: More robust error handling for API calls and content generation, potentially with user-friendly retry mechanisms.
*   **Content Templates**: Offer pre-defined templates for common content types (e.g., social media posts, ad copy).
*   **Plagiarism Checker Integration**: Option to check generated content for originality.

##🤝 Contributing

Contributions are welcome! If you have ideas for improvements or new features, feel free to open an issue or submit a pull request. Please follow standard coding practices and ensure your changes are well-tested.

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📜 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](./LICENSE) file for details.


---

Crafted by [TruongSinhAI](https://github.com/TruongSinhAI). Powered by Generative AI.
