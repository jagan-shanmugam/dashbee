import { generateText } from "ai";
import { getModelProvider, CUSTOM_OPENAI_MODELS } from "./ai-providers";

const DEFAULT_MODEL = "gpt-5";

/**
 * Generate a natural language explanation of SQL query results
 */
export async function explainQueryResults(
  query: string,
  results: unknown[],
  model: string = DEFAULT_MODEL,
): Promise<string> {
  try {
    const systemPrompt = `You are a data analyst who explains SQL query results in clear, natural language. 
Provide insights about the data and explain what it means in a business context.`;

    const prompt = `SQL Query: ${query}

Results: ${JSON.stringify(results, null, 2)}

Provide a brief explanation of what this data shows:`;

    const result = await generateText({
      model: getModelProvider(model),
      system: systemPrompt,
      prompt: prompt,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "explainQueryResults",
      },
    });

    return result.text.trim();
  } catch (error) {
    console.error("Error explaining query results:", error);
    throw new Error("Failed to explain query results");
  }
}

/**
 * Generate SQL query suggestions based on natural language input
 */
export async function generateSQLSuggestions(
  input: string,
  schema: string,
  model: string = DEFAULT_MODEL,
): Promise<string[]> {
  try {
    const systemPrompt = `You are an expert SQL query generator. Based on the user's natural language input and the database schema, generate 3-5 relevant SQL queries they might want to run.

Format your response as a JSON array of strings, e.g.:
["SELECT * FROM table WHERE...", "SELECT COUNT(*) FROM..."]

DATABASE SCHEMA:
${schema}

Each query should:
- Be valid SQL
- Use only tables and columns from the schema
- Be specific and useful
- Cover different aspects of the user's request`;

    const result = await generateText({
      model: getModelProvider(model),
      system: systemPrompt,
      prompt: input,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "generateSQLSuggestions",
      },
    });

    try {
      const queries = JSON.parse(result.text.trim());
      return Array.isArray(queries) ? queries : [];
    } catch {
      // Fallback: extract SQL-like lines
      const lines = result.text
        .split("\n")
        .filter((line) => line.trim().toUpperCase().includes("SELECT"));
      return lines.length > 0 ? lines : [result.text.trim()];
    }
  } catch (error) {
    console.error("Error generating SQL suggestions:", error);
    throw new Error("Failed to generate SQL suggestions");
  }
}

/**
 * Refine dashboard prompts to make them more specific and effective
 */
export async function refineDashboardPrompt(
  input: string,
  model: string = DEFAULT_MODEL,
): Promise<string> {
  try {
    const systemPrompt = `You are an expert at refining dashboard requests. 
Your task is to enhance the user's request by:
- Making it more specific about metrics, visualizations, and data points
- Adding relevant business context
- Suggesting appropriate chart types and layouts
- Ensuring the request is clear and actionable

Return only the refined prompt, no explanations.`;

    const result = await generateText({
      model: getModelProvider(model),
      system: systemPrompt,
      prompt: input,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "refineDashboardPrompt",
      },
    });

    return result.text.trim();
  } catch (error) {
    console.error("Error refining dashboard prompt:", error);
    throw new Error("Failed to refine dashboard prompt");
  }
}

/**
 * Generate insights from dashboard data
 */
export async function generateDataInsights(
  data: Record<string, unknown[]>,
  dashboardDescription: string,
  model: string = DEFAULT_MODEL,
): Promise<string[]> {
  try {
    const systemPrompt = `You are a business analyst who generates actionable insights from data.
Based on the dashboard data provided, generate 3-5 key insights or observations.

Format your response as a JSON array of strings, e.g.:
["Revenue increased 15% month-over-month", "Top performing region is North with $1.2M"]

Each insight should be:
- Based on the actual data
- Clear and concise
- Actionable or informative
- Focused on trends, anomalies, or key findings`;

    const prompt = `Dashboard: ${dashboardDescription}

Data: ${JSON.stringify(data, null, 2)}

Generate key insights from this data:`;

    const result = await generateText({
      model: getModelProvider(model),
      system: systemPrompt,
      prompt: prompt,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "generateDataInsights",
      },
    });

    try {
      const insights = JSON.parse(result.text.trim());
      return Array.isArray(insights) ? insights : [];
    } catch {
      // Fallback: split by newlines
      const lines = result.text
        .split("\n")
        .filter((line) => line.trim().length > 10);
      return lines.length > 0 ? lines : [result.text.trim()];
    }
  } catch (error) {
    console.error("Error generating data insights:", error);
    throw new Error("Failed to generate data insights");
  }
}

export { CUSTOM_OPENAI_MODELS };
