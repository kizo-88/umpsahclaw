import { TokenJuice } from "../utils/TokenJuice";

class LocalLLMService {
  constructor() {
    this.engine = null;
    this.currentModelId = null;
    this.onProgress = null;
  }

  async init(modelId, onProgress) {
    if (this.currentModelId === modelId && this.engine) {
      return this.engine;
    }
    
    if (this.initPromise) {
      return this.initPromise;
    }

    this.onProgress = onProgress;
    this.currentModelId = modelId;

    // Lazy-load WebLLM (large) only when the local engine is actually used — keeps it out of the main bundle.
    const webllm = await import("@mlc-ai/web-llm");

    // Create a new engine
    this.initPromise = webllm.CreateMLCEngine(modelId, {
      initProgressCallback: (report) => {
        if (this.onProgress) {
          this.onProgress(report.progress);
        }
        console.log("Model Load Progress:", report.text);
      },
    }).then(engine => {
      this.engine = engine;
      this.initPromise = null;
      return engine;
    }).catch(err => {
      this.initPromise = null;
      throw err;
    });

    return this.initPromise;
  }

  async generate(messages) {
    if (!this.engine) {
      throw new Error("Engine not initialized. Please load a model first.");
    }

    const formattedMessages = messages.map(m => ({
      role: m.role,
      content: m.text || m.content
    }));

    const compressedMessages = TokenJuice.compress(formattedMessages);

    const reply = await this.engine.chat.completions.create({
      messages: compressedMessages
    });

    return reply.choices[0].message.content;
  }

  async generateStream(messages, onChunk) {
    if (!this.engine) {
      throw new Error("Engine not initialized.");
    }

    const formattedMessages = messages.map(m => ({
      role: m.role,
      content: m.text || m.content
    }));

    const compressedMessages = TokenJuice.compress(formattedMessages);

    const chunks = await this.engine.chat.completions.create({
      messages: compressedMessages,
      stream: true,
    });

    let fullText = "";
    for await (const chunk of chunks) {
      const content = chunk.choices[0]?.delta?.content || "";
      fullText += content;
      if (onChunk) onChunk(fullText);
    }

    return fullText;
  }
}

export const localLLMService = new LocalLLMService();
