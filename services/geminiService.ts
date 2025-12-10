import { GoogleGenAI, Type } from "@google/genai";
import { ProjectData, AIAnalysis, ClickUpComment } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateDashboardSummary = async (projects: ProjectData[], recentComments: ClickUpComment[]): Promise<AIAnalysis> => {
    // Safety check
    if ((!projects || projects.length === 0) && (!recentComments || recentComments.length === 0)) {
        return {
            summary: "No project data or comments available to analyze.",
            topRisks: [],
            actions: ["Connect a ClickUp workspace with tasks to get started."],
            emailDraft: "No data available for email draft."
        };
    }

    // Prepare a text block of the recent comments (limit to last 50 to fit context window comfortably)
    const commentNarrative = recentComments.slice(0, 50).map(c => {
        return `[${new Date(parseInt(c.date)).toLocaleDateString()}] ${c.user.username} on task "${c.task_name}": "${c.comment_text}"`;
    }).join('\n');

    // Context from projects (just names and risk levels to help group the narrative)
    const projectContext = projects.map(p => `${p.name} (Risk: ${p.riskLevel})`).join(', ');

    const prompt = `
    You are a Project Manager Assistant. Your goal is to write a weekly status summary based PRIMARILY on the team's latest comments.
    
    CONTEXT:
    Projects: ${projectContext}

    LATEST TEAM COMMENTS (Past 7 days):
    ${commentNarrative || "No comments recorded this week."}
    
    INSTRUCTIONS:
    1. **Summary**: Synthesize the comments into a cohesive narrative. Don't just list them. Group updates by project or topic. e.g., "The team made progress on Reporting, with Michael submitting the West Coast files..."
       - If there are no comments, state that there have been no written updates recorded this week.
    2. **Top Risks**: Identify risks based on *blockers* or *issues* mentioned in the comments (e.g., "waiting for", "stuck", "error"). If none mentioned, look at project risk levels.
    3. **Actions**: Suggest follow-ups based on the comments (e.g., "Review Michael's submission", "Unblock Sarah").
    4. **Email Draft**: Write a professional status email to stakeholders. 
       - The body should be a polished version of the summary. 
       - Highlight key achievements mentioned in the comments.
       - Tone: Professional, concise, results-oriented.

    Provide the output in JSON format.
    `;

    try {
        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        topRisks: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING } 
                        },
                        actions: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING } 
                        },
                        emailDraft: { type: Type.STRING }
                    }
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        
        const result = JSON.parse(text) as AIAnalysis;

        // Ensure robust return even if AI omits fields
        return {
            summary: result.summary || "Summary generation incomplete.",
            topRisks: Array.isArray(result.topRisks) ? result.topRisks : [],
            actions: Array.isArray(result.actions) ? result.actions : [],
            emailDraft: result.emailDraft || "Unable to generate email draft."
        };
    } catch (error: any) {
        // IMPROVED ERROR HANDLING
        
        // Check for rate limits / quota issues
        let isQuotaError = false;
        
        // 1. Check HTTP status or SDK codes
        if (error.status === 429 || error.status === 503) isQuotaError = true;
        
        // 2. Check Error Object structure (like the one provided in prompt)
        if (error.error && (error.error.code === 429 || error.error.status === 'RESOURCE_EXHAUSTED')) isQuotaError = true;

        // 3. Check Message String and embedded JSON
        if (!isQuotaError && (error.message || typeof error === 'string')) {
             const msg = (error.message || error).toString();
             if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
                 isQuotaError = true;
             }
             
             // Try parsing embedded JSON in message if not yet detected
             if (!isQuotaError) {
                 try {
                     const jsonMatch = msg.match(/\{[\s\S]*\}/); // Match potential JSON object
                     if (jsonMatch) {
                         const parsed = JSON.parse(jsonMatch[0]);
                         if (parsed.error && (parsed.error.code === 429 || parsed.error.status === 'RESOURCE_EXHAUSTED')) {
                             isQuotaError = true;
                         }
                     }
                 } catch (e) { /* ignore parse error */ }
             }
        }

        if (isQuotaError) {
             console.warn("Gemini Quota Exceeded: request suppressed.");
             return {
                summary: "⚠️ Quota Exceeded. The AI service is temporarily unavailable due to high traffic. Please try again in a minute.",
                topRisks: [],
                actions: ["Wait 60 seconds", "Click Sync Data manually"],
                emailDraft: "Draft generation paused due to rate limits."
            };
        }

        console.error("Gemini Analysis Failed", error);

        return {
            summary: "Unable to generate summary at this time due to a technical error.",
            topRisks: [],
            actions: ["Check network connection", "Verify API keys"],
            emailDraft: "Error generating draft."
        };
    }
};