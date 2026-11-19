const AI_MODELS = [
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    provider: "OpenAI",
    description: "Suitable for general AI assistance and interview sessions.",
    isActive: true
  },
  {
    id: "claude-sonnet",
    name: "Claude Sonnet",
    provider: "Anthropic",
    description: "Suitable for detailed reasoning and professional responses.",
    isActive: true
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro",
    provider: "Google",
    description: "Suitable for general-purpose AI assistance.",
    isActive: true
  }
];

export const getModels = async (req, res, next) => {
  try {
    const models = AI_MODELS.filter((model) => model.isActive);

    return res.status(200).json({
      success: true,
      message: "AI models fetched successfully.",
      data: { models }
    });
  } catch (error) {
    next(error);
  }
};