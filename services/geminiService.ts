import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SermonContent, MeditationContent, DailyInspiration, BibleStudyResponse, BibleVerse, WisdomContent, ProfileAnalysis, User, Group, AISuggestion, Event, TimedMeditationSegment, ScheduledMeditation, BibleChapter, BibleSearchResult, ChatMessage, RewardPoster, StreamContent, BibleInsight, BibleStudyPlan, LibraryItemType, SermonOutline, LeadershipArticle, SpiritualCommunity, RecommendedReading, BiblicalParable, FurtherReading, StudyCurriculum, CounselingPrompt, InterfaithDialogue, MeditationTheme, AIMusicTrack, LibraryMusicTrack, Playlist, Soundscape, PrayerContent } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const isQuotaError = (error: any): boolean => {
    const errorString = String(error);
    return errorString.includes('RESOURCE_EXHAUSTED') || 
           errorString.includes('429') || 
           errorString.includes('quota');
};

// FIX: Add and export ensureVeoApiKey to handle API key selection for Veo models.
export const ensureVeoApiKey = async (): Promise<boolean> => {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
        if (await (window as any).aistudio.hasSelectedApiKey()) {
            return true;
        }
        await (window as any).aistudio.openSelectKey();
        // Per guidelines, assume success after opening the dialog to mitigate race conditions.
        return true;
    }
    // If not in the aistudio environment, assume the key is set and proceed.
    return true;
};

export const getDynamicWelcomeMessage = async (userName: string): Promise<string> => {
  try {
    const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening';
    const prompt = `You are Kai, a friendly AI companion. Generate a short, warm, and uplifting welcome message for a user named ${userName}. It's currently the ${timeOfDay}. Be creative and vary the message. For example: "Good ${timeOfDay}, ${userName}. May you find moments of peace and clarity today. 🙏" or "Welcome back, ${userName}. Wishing you a peaceful ${timeOfDay}." Return only the message.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating welcome message:", error);
    return `Welcome back, ${userName}. Wishing you a peaceful day. 🙏`; // Fallback
  }
};


export const getDailyInspiration = async (): Promise<DailyInspiration | null | 'QUOTA_EXCEEDED'> => {
  try {
    const inspirationTypes: Array<'quote' | 'proverb' | 'riddle'> = ['quote', 'proverb', 'riddle'];
    const randomType = inspirationTypes[Math.floor(Math.random() * inspirationTypes.length)];
    const topics = ['patience', 'love', 'growth', 'gratitude', 'mindfulness', 'forgiveness', 'community'];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];

    const prompt = `You are The Guiding Light AI. For the topic of "${randomTopic}", generate a JSON object with two properties: "inspirationText" and "imagePrompt".
1.  "inspirationText": A short, profound ${randomType}. It should be uplifting, poetic, accessible, and include a relevant emoji at the end.
2.  "imagePrompt": A visually striking and descriptive prompt for an image generation AI (like Imagen) to create a motivational poster based on the ${randomType}. This prompt should describe an abstract, symbolic, or serene scene in a painterly style with soft, glowing light. Do not include the text of the ${randomType} in the image prompt.
`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            inspirationText: {
              type: Type.STRING,
              description: `The inspirational ${randomType}.`
            },
            imagePrompt: {
              type: Type.STRING,
              description: 'The prompt for the image generation AI.'
            }
          },
          required: ['inspirationText', 'imagePrompt']
        }
      }
    });

    let inspirationText, imagePrompt;
    try {
        const jsonText = response.text;
        const parsed = JSON.parse(jsonText);
        inspirationText = parsed.inspirationText;
        imagePrompt = parsed.imagePrompt;
        if (!inspirationText || !imagePrompt) throw new Error("Missing properties in JSON response.");
    } catch (e) {
        console.error("Failed to parse daily inspiration JSON:", e, "Raw text:", response.text);
        return null;
    }

    const imageResponse = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: imagePrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });

    const imageBytes = (imageResponse.generatedImages && imageResponse.generatedImages.length > 0)
      ? imageResponse.generatedImages[0].image.imageBytes
      : '';

    return {
      text: inspirationText,
      posterImage: imageBytes,
    };
  } catch (error) {
    console.error("Error fetching daily inspiration:", error);
    if (isQuotaError(error)) {
        return 'QUOTA_EXCEEDED';
    }
    return null;
  }
};


export const generateSermon = async (topic: string, length: string, tone: string, speakerName?: string): Promise<SermonContent | null | 'QUOTA_EXCEEDED'> => {
  try {
    const speakerInstruction = speakerName
      ? ` The sermon is to be delivered by "${speakerName}". Write the sermon from their perspective or in a style suitable for them. You can optionally return the speaker's name in a 'speaker' field.`
      : '';
    const prompt = `As The Guiding Light AI, write a ${length} sermon on '${topic}' with a ${tone} tone.${speakerInstruction} Structure it with an introduction, main points, and a conclusion. After the sermon, provide two distinct prompts: one for a text-to-video AI (like Veo) to create accompanying visuals, and one for a text-to-audio AI (like nano-banana) to narrate it, including suggestions for background music.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sermonText: {
              type: Type.STRING,
              description: 'The full text of the sermon.'
            },
            videoPrompt: {
              type: Type.STRING,
              description: 'A prompt for a text-to-video AI to generate visuals.'
            },
            audioPrompt: {
              type: Type.STRING,
              description: 'A prompt for a text-to-audio AI to generate a narration with music.'
            },
            speaker: {
              type: Type.STRING,
              description: "Optional: The name of the speaker if it was provided in the prompt."
            }
          },
          required: ['sermonText', 'videoPrompt', 'audioPrompt']
        }
      }
    });
    
    try {
        const jsonText = response.text;
        return JSON.parse(jsonText) as SermonContent;
    } catch (e) {
        console.error("Failed to parse sermon JSON:", e, "Raw text:", response.text);
        return null;
    }
  } catch (error) {
    console.error("Error generating sermon:", error);
    if (isQuotaError(error)) {
        return 'QUOTA_EXCEEDED';
    }
    return null;
  }
};

export const generatePrayer = async (topic: string, length: string, tone: string): Promise<PrayerContent | null | 'QUOTA_EXCEEDED'> => {
  try {
    const prompt = `As The Guiding Light AI, write a ${length} prayer on '${topic}' with a ${tone} tone. Structure it with an introduction (addressing a higher power), a body (the main requests or expressions of gratitude/praise), and a conclusion (closing words like 'Amen'). After the prayer, provide two distinct prompts: one for a text-to-video AI (like Veo) to create accompanying visuals of serene, abstract light and nature, and one for a text-to-audio AI (like nano-banana) to narrate it with a gentle, reverent voice, including suggestions for soft, instrumental background music.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prayerText: {
              type: Type.STRING,
              description: 'The full text of the prayer.'
            },
            videoPrompt: {
              type: Type.STRING,
              description: 'A prompt for a text-to-video AI to generate visuals.'
            },
            audioPrompt: {
              type: Type.STRING,
              description: 'A prompt for a text-to-audio AI to generate a narration with music.'
            }
          },
          required: ['prayerText', 'videoPrompt', 'audioPrompt']
        }
      }
    });
    
    try {
        const jsonText = response.text;
        return JSON.parse(jsonText) as PrayerContent;
    } catch (e) {
        console.error("Failed to parse prayer JSON:", e, "Raw text:", response.text);
        return null;
    }
  } catch (error) {
    console.error("Error generating prayer:", error);
    if (isQuotaError(error)) {
        return 'QUOTA_EXCEEDED';
    }
    return null;
  }
};

export const generatePrayerPoster = async (prayerText: string, outputMimeType: 'image/jpeg' | 'image/png', aspectRatio: '3:4' | '16:9'): Promise<{ imageBytes: string | null; mimeType: 'image/jpeg' | 'image/png' }> => {
  try {
    const imagePromptInstruction = `Based on the core message of the following prayer, create a visually striking and descriptive prompt for an image generation AI to create a beautiful, serene poster. The prompt should describe an abstract, symbolic, or natural scene that captures the prayer's essence. The style should be ethereal with soft, hopeful lighting.

    Prayer Text:
    ---
    ${prayerText.substring(0, 1000)}... 
    ---
    `;

    const imagePromptResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: imagePromptInstruction,
    });
    const imagePrompt = imagePromptResponse.text;

    const imageResponse = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: imagePrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: outputMimeType,
        aspectRatio: aspectRatio,
      },
    });

    const imageBytes = (imageResponse.generatedImages && imageResponse.generatedImages.length > 0)
      ? imageResponse.generatedImages[0].image.imageBytes
      : null;

    return { imageBytes, mimeType: outputMimeType };
  } catch (error) {
    console.error("Error generating prayer poster:", error);
    return { imageBytes: null, mimeType: outputMimeType };
  }
};


export const suggestPrayerVideoStyles = async (prayerText: string): Promise<{title: string, description: string}[] | null> => {
  try {
    const prompt = `You are an expert creative director AI agent specializing in visuals for prayer and reflection. Your task is to generate 3 distinct video style concepts for a prayer. Analyze the prayer's text for its core message, tone (e.g., reverence, gratitude, supplication), and emotional arc.

For each concept, provide:
1.  "title": A short, evocative title for the style (e.g., "Sacred Light," "Gentle Dawn").
2.  "description": A rich, descriptive prompt for a video generation AI (like Veo). Detail the color palette, mood, camera work, and key visual elements that would complement the prayer. Focus on abstract, symbolic, and natural imagery like light, water, sky, and nature.

Prayer Text:
---
${prayerText.substring(0, 1500)}...
---

Return a valid JSON array of objects, each with "title" and "description" string properties.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ['title', 'description']
          }
        }
      }
    });

    return JSON.parse(response.text) as {title: string, description: string}[];
  } catch (error) {
    console.error("Error suggesting prayer video styles:", error);
    return null;
  }
};


export const suggestPrayerAudioStyles = async (prayerText: string): Promise<{title: string, description: string}[] | null> => {
  try {
    const prompt = `You are an expert sound designer AI specializing in immersive audio for prayers. Based on the following prayer text, generate 3 distinct audio style concepts.

For each concept, provide:
1.  title: A short, catchy title (e.g., "Cathedral Echoes," "Peaceful Plains").
2.  description: A descriptive prompt for an audio generation AI. Detail the narrator's voice (e.g., "gentle female voice, warm and reverent") and the background soundscape (e.g., "subtle, soft choir hums and a gentle string pad").

Prayer Text:
---
${prayerText.substring(0, 1500)}...
---

Return a valid JSON array of objects, each with "title" and "description" string properties.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ['title', 'description']
          }
        }
      }
    });

    return JSON.parse(response.text) as {title: string, description: string}[];
  } catch (error) {
    console.error("Error suggesting prayer audio styles:", error);
    return null;
  }
};

export const suggestMeditationGoal = async (): Promise<string | null> => {
  try {
    const prompt = `You are The Guiding Light AI. Suggest a single, creative, and insightful goal for a meditation session. The goal should be a short phrase. For example: "Cultivating patience," "Releasing past grievances," or "Finding clarity in the present moment." Return only the phrase itself.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text.replace(/"/g, '').trim();
  } catch (error) {
    console.error("Error suggesting meditation goal:", error);
    return null;
  }
};

export const generateMeditation = async (goal: string, length: string): Promise<MeditationContent | null | 'QUOTA_EXCEEDED'> => {
    try {
        const prompt = `As The Guiding Light AI, write a ${length} guided meditation script to help the user achieve the goal of '${goal}'. The script should guide the user through breathing and visualization with a calm, soothing voice. After the script, provide two distinct prompts: one for a text-to-video AI (like Veo) for visuals, and one for a text-to-audio AI (like nano-banana) for narration, including specific suggestions for ambient sounds and meditative music.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        meditationScript: {
                            type: Type.STRING,
                            description: 'The full text of the meditation script.'
                        },
                        videoPrompt: {
                            type: Type.STRING,
                            description: 'A prompt for a text-to-video AI to generate visuals for the meditation.'
                        },
                        audioPrompt: {
                            type: Type.STRING,
                            description: 'A prompt for a text-to-audio AI to generate a narration with ambient sounds and music.'
                        }
                    },
                    required: ['meditationScript', 'videoPrompt', 'audioPrompt']
                }
            }
        });
        
        try {
            const jsonText = response.text;
            return JSON.parse(jsonText) as MeditationContent;
        } catch (e) {
            console.error("Failed to parse meditation JSON:", e, "Raw text:", response.text);
            return null;
        }
    } catch (error) {
        console.error("Error generating meditation:", error);
        if (isQuotaError(error)) {
            return 'QUOTA_EXCEEDED';
        }
        return null;
    }
};

// --- ADVANCED VIDEO GENERATION ---

// FIX: Update generateVideoWithVeo to accept aspectRatio, use the latest model, and create a new GoogleGenAI instance for each call as per guidelines.
/**
 * A helper function to generate video using Google's Veo model.
 * It initiates the generation, polls for completion, and returns a usable video URL.
 * @param prompt The detailed prompt for the video generation AI.
 * @param onProgress A callback to update the UI with the generation progress.
 * @param aspectRatio The desired aspect ratio for the video.
 * @returns A local object URL for the generated video blob, a special "QUOTA_EXCEEDED" string for quota errors, or null on other failures.
 */
const generateVideoWithVeo = async (
  prompt: string,
  onProgress: (progress: number) => void,
  aspectRatio: '16:9' | '9:16' | '1:1'
): Promise<string | null | 'QUOTA_EXCEEDED'> => {
  try {
    onProgress(0);
    
    // Per guidelines, create a new instance right before the API call for Veo.
    const localAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Step 1: Start the video generation operation
    let operation = await localAi.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        aspectRatio: aspectRatio,
        resolution: '720p',
      }
    });
    
    onProgress(10); // Initial progress after request is sent

    // Step 2: Poll for completion with a timeout
    let pollCount = 0;
    const maxPolls = 30; // 30 polls * 10 seconds = 5 minutes timeout
    
    while (!operation.done && pollCount < maxPolls) {
      pollCount++;
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds between polls
      operation = await localAi.operations.getVideosOperation({ operation: operation });
      
      const progress = 10 + Math.round((pollCount / maxPolls) * 80);
      onProgress(progress);
    }
    
    if (!operation.done) {
        console.error("Video generation timed out after 5 minutes.");
        onProgress(100);
        return null;
    }
    
    onProgress(95);

    // Step 3: Get the download link and fetch the video data
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        console.error("No download link found in operation response.");
        return null;
    }

    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) {
        console.error(`Failed to fetch video from download link. Status: ${videoResponse.statusText}`);
        return null;
    }

    const videoBlob = await videoResponse.blob();
    onProgress(100);

    // Step 4: Revoke any previous object URLs to prevent memory leaks and return a new one
    return URL.createObjectURL(videoBlob);
  } catch (error) {
    onProgress(100);
    if (isQuotaError(error)) {
      console.warn("Veo generation quota exceeded. Returning fallback signal.", error);
      return "QUOTA_EXCEEDED";
    }
    console.error("Error generating video with Veo:", error);
    return null;
  }
};

export const generateMeditationVideo = async (
  prompt: string,
  style: string,
  onProgress: (progress: number) => void
): Promise<string | null | 'QUOTA_EXCEEDED'> => {
    try {
        const finalVideoPrompt = `Create a video for a guided meditation. The core theme is: "${prompt}". The desired artistic style is: "${style}". Combine these ideas into a seamless, tranquil, and visually immersive experience. The video should be slow-paced, with gentle camera movements and a serene atmosphere.`;
        
        console.log("Generated Veo Prompt for Meditation:", finalVideoPrompt);
        // FIX: Pass a default aspect ratio to the updated generateVideoWithVeo function.
        return await generateVideoWithVeo(finalVideoPrompt, onProgress, '16:9');
    } catch (error) {
        console.error("Error in generateMeditationVideo:", error);
        onProgress(100);
        return null;
    }
};

export const generateSocialPost = async (sermonText: string): Promise<string> => {
  try {
    const prompt = `You are a social media manager AI agent. Based on the following sermon text, create a short, engaging post for social media (like Twitter or Instagram). The post should be concise, inspirational, and include 2-3 relevant hashtags.

    Sermon Text:
    ---
    ${sermonText}
    ---
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error generating social post:", error);
    return "Could not generate a social media post at this time.";
  }
};


export const generateEventPlan = async (eventTopic: string): Promise<any | null> => {
  try {
    const prompt = `As The Guiding Light AI, you are an expert event host. A user wants to create a "Deep Dive Discussion" event on the topic of "${eventTopic}". Generate a structured plan for this 30-minute virtual event. The plan should be engaging, reflective, and foster a sense of community.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            eventTitle: {
              type: Type.STRING,
              description: "A creative and inviting title for the event."
            },
            eventDescription: {
              type: Type.STRING,
              description: "A short, compelling paragraph describing the event's purpose and what attendees can expect."
            },
            openingMeditation: {
              type: Type.STRING,
              description: "A brief (2-3 sentences) opening meditation or reflective thought to set the tone."
            },
            discussionPoints: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: "A list of 3-4 thought-provoking questions or points to guide the discussion."
            }
          },
          required: ['eventTitle', 'eventDescription', 'openingMeditation', 'discussionPoints']
        }
      }
    });

    const jsonText = response.text;
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error generating event plan:", error);
    return null;
  }
};

export const getBibleStudyResponse = async (query: string, useGoogleSearch: boolean): Promise<BibleStudyResponse | null> => {
  try {
    if (useGoogleSearch) {
      const prompt = `As "The Guiding Light AI," you are a wise and knowledgeable Bible study assistant enhanced with Google Search. A user has a question: "${query}". 
      
Your response MUST be in markdown format with these exact headers: "### Direct Answer", "### Relevant Verses", and "### AI Theologian Agent Insights".
- Under "### Direct Answer", provide a clear, direct, and compassionate answer.
- Under "### Relevant Verses", list 2-3 key Bible verses. Format each as: **Reference** - "Verse text".
- Under "### AI Theologian Agent Insights", provide deeper insights, historical context, or theological interpretations. Leverage your external knowledge for this part.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{googleSearch: {}}],
        },
      });
      
      const text = response.text;

      // Helper function to extract content between headers
      const extractSection = (header: string, content: string) => {
        const nextHeaderIndex = content.indexOf('###', content.indexOf(header) + header.length);
        const section = content.substring(
          content.indexOf(header) + header.length,
          nextHeaderIndex > -1 ? nextHeaderIndex : content.length
        );
        return section.trim();
      };

      const directAnswer = extractSection('### Direct Answer', text);
      const agentInsights = extractSection('### AI Theologian Agent Insights', text);
      const versesText = extractSection('### Relevant Verses', text);

      const relevantVerses: BibleVerse[] = versesText.split('\n').map(line => {
        const match = line.match(/\*\*(.*?)\*\* - "(.*)"/);
        if (match && match.length === 3) {
          return { reference: match[1].trim(), verse: match[2].trim() };
        }
        return null;
      }).filter((v): v is BibleVerse => v !== null);

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks
        .map((chunk: any) => chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : null)
        .filter((s): s is { uri: string; title: string } => s !== null && s.uri);

      return { directAnswer, relevantVerses, agentInsights, sources };

    } else {
      const prompt = `As "The Guiding Light AI," you are a wise and knowledgeable Bible study assistant. A user has a question: "${query}". 

      1.  Provide a clear, direct, and compassionate answer to their question.
      2.  Identify 2-3 key Bible verses that are highly relevant to the answer. Provide the full verse text and its reference (e.g., John 3:16).
      3.  Finally, act as a specialized "AI Theologian Agent." In this role, provide deeper insights. This could include historical context, original language nuances (Hebrew/Greek), connections to other scriptures, or different theological interpretations. This section should be distinct and add scholarly depth.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              directAnswer: {
                type: Type.STRING,
                description: "The direct and compassionate answer to the user's question."
              },
              relevantVerses: {
                type: Type.ARRAY,
                description: "A list of relevant Bible verses.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    reference: {
                      type: Type.STRING,
                      description: "The scripture reference (e.g., Genesis 1:1)."
                    },
                    verse: {
                      type: Type.STRING,
                      description: "The full text of the Bible verse."
                    }
                  },
                  required: ['reference', 'verse']
                }
              },
              agentInsights: {
                type: Type.STRING,
                description: "The deeper insights from the AI Theologian Agent, including historical or linguistic context."
              }
            },
            required: ['directAnswer', 'relevantVerses', 'agentInsights']
          }
        }
      });

      const jsonText = response.text;
      return JSON.parse(jsonText) as BibleStudyResponse;
    }
  } catch (error) {
    console.error("Error generating Bible study response:", error);
    return null;
  }
};

export const generateBibleStudySocialPost = async (query: string, studyResponse: BibleStudyResponse): Promise<string> => {
  try {
    const prompt = `You are a social media manager AI agent for "The Guiding Light AI". Based on the following Bible study session, create a short, thought-provoking, and shareable post for social media.

    The user asked: "${query}"

    Key insights from the study:
    - Main Answer: ${studyResponse.directAnswer}
    - Key Verse: ${studyResponse.relevantVerses[0]?.reference}: "${studyResponse.relevantVerses[0]?.verse}"
    - Deeper Insight: ${studyResponse.agentInsights}

    Your post should summarize a key takeaway in an accessible way and encourage reflection. End with 2-3 relevant hashtags like #BibleStudy, #SpiritualGrowth, #Faith, or #Theology.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error generating Bible study social post:", error);
    return "Could not generate a social media post for this study at this time.";
  }
};

export const generateCommunityShoutOut = async (userName: string, achievement: string): Promise<string | null> => {
    try {
        const prompt = `You are an AI community manager for "The Guiding Light AI" app. Your role is to be super encouraging and make users feel seen.
        
        Generate a short, vibrant, and celebratory "shout out" for a user's recent achievement.
        
        User's Name: ${userName}
        Achievement: Completed the "${achievement}" challenge.
        
        Make it sound exciting and inspiring. Use 1-2 relevant emojis. Start with something like "Community Shout Out! 🎉" or "Let's celebrate! 🥳".`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Error generating community shout out:", error);
        return null;
    }
};

export const getWisdomFromText = async (source: string): Promise<WisdomContent | null> => {
    try {
        const prompt = `You are a "Spiritual Historian AI Agent." Your task is to provide wisdom from the selected public domain spiritual/philosophical text: "${source}".
        
Your response must be a JSON object containing:
1.  "source": The name of the source text (e.g., '${source}').
2.  "excerpt": A short, poignant excerpt from the text.
3.  "historicalContext": A brief overview of the historical context: who wrote it, when, and why it's significant.
4.  "relatedQuote": A short, relevant quote or proverb from the same era or author that relates to the context.
5.  "modernApplication": A thoughtful interpretation of how this specific excerpt can be applied to modern life.
6.  "imagePrompt": A visually rich prompt for an image generation AI, describing an abstract or symbolic scene that captures the essence of the excerpt.
7.  "audioPrompt": A prompt for a text-to-audio AI to narrate a brief reflection on the excerpt, including suggestions for tone and background soundscape.

Ensure all information is accurate and the tone is wise, accessible, and respectful.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        source: { type: Type.STRING },
                        excerpt: { type: Type.STRING },
                        historicalContext: { type: Type.STRING },
                        relatedQuote: { type: Type.STRING },
                        modernApplication: { type: Type.STRING },
                        imagePrompt: { type: Type.STRING },
                        audioPrompt: { type: Type.STRING }
                    },
                    required: ['source', 'excerpt', 'historicalContext', 'relatedQuote', 'modernApplication', 'imagePrompt', 'audioPrompt']
                }
            }
        });

        const jsonText = response.text;
        const wisdomData = JSON.parse(jsonText);
        
        const imageResponse = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: wisdomData.imagePrompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '16:9' },
        });

        return {
            ...wisdomData,
            imageUrl: imageResponse.generatedImages?.[0]?.image.imageBytes || '',
        };
    } catch (error) {
        console.error("Error fetching wisdom from text:", error);
        return null;
    }
};

export const askQuestionAboutText = async (wisdom: WisdomContent | BiblicalParable, question: string): Promise<string> => {
    try {
        let context = '';
        if ('excerpt' in wisdom) { // It's WisdomContent
            context = `Source: ${wisdom.source}\nExcerpt: "${wisdom.excerpt}"\nHistorical Context: ${wisdom.historicalContext}\nModern Application: ${wisdom.modernApplication}`;
        } else { // It's BiblicalParable
             context = `Parable: ${wisdom.title}\nScripture: "${wisdom.scriptureReference}"\nSummary: ${wisdom.summary}\nCore Teaching: ${wisdom.coreTeaching}\nModern Relevance: ${wisdom.modernRelevance}`;
        }

        const prompt = `You are a scholarly AI assistant specializing in historical and philosophical texts. Your knowledge is strictly limited to the text provided below. Based *only* on the following text, answer the user's question. 
        - If the answer is present in the text, provide it directly and concisely.
        - If the answer cannot be found in the text, you MUST state: "I cannot answer that question based on the provided text." Do not use outside knowledge.

        --- TEXT ---
        ${context}
        --- END TEXT ---

        Question: ${question}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Error asking question about text:", error);
        return "I'm sorry, I encountered an error while trying to answer your question.";
    }
};

export const generateProfileAnalysis = async (stats: { sermons: number; meditations: number; challenges: number; completedChallengeTitles: string[], connections: number, groups: number }): Promise<ProfileAnalysis | null> => {
    try {
        const prompt = `You are a "Spiritual Growth Analyst AI Agent" for The Guiding Light app. Analyze the user's activity and provide personalized, encouraging feedback. Consider their community engagement as well.

User's Stats:
- Sermons Generated: ${stats.sermons}
- Meditations Completed: ${stats.meditations}
- Challenges Unlocked: ${stats.challenges} (${stats.completedChallengeTitles.join(', ') || 'None yet'})
- Community Connections: ${stats.connections}
- Groups Joined: ${stats.groups}

Based on this holistic view, generate a JSON response with:
1.  "journeySummary": A brief, positive summary of their activity so far, including community involvement.
2.  "encouragingObservation": A specific, uplifting observation. What does their activity suggest about their path? (e.g., "Your active participation in groups shows a strong desire for shared growth.")
3.  "nextStepSuggestion": A concrete, actionable suggestion for what they could do next in the app. Be specific. (e.g., "Consider creating your own group around a topic you're passionate about, like '${stats.completedChallengeTitles[0] || 'Gratitude'}'.")
4.  "suggestedTitle": A creative, new "Spiritual Title" for the user that reflects their entire journey (e.g., "Community Weaver," "Mindful Scribe," "Seeker of Stillness," "Compassionate Explorer").`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        journeySummary: { type: Type.STRING, description: "A brief, positive summary of the user's activity." },
                        encouragingObservation: { type: Type.STRING, description: "A specific, uplifting observation about their spiritual path based on their activity." },
                        nextStepSuggestion: { type: Type.STRING, description: "A concrete suggestion for their next action in the app." },
                        suggestedTitle: { type: Type.STRING, description: "A creative, new spiritual title for the user." }
                    },
                    required: ['journeySummary', 'encouragingObservation', 'nextStepSuggestion', 'suggestedTitle']
                }
            }
        });

        const jsonText = response.text;
        return JSON.parse(jsonText) as ProfileAnalysis;

    } catch (error) {
        console.error("Error generating profile analysis:", error);
        return null;
    }
};

export const generateGroupDescription = async (topic: string): Promise<string> => {
    try {
        const prompt = `You are a community-building AI agent. A user wants to create a spiritual growth group centered around the topic of "${topic}". 
        
        Write a welcoming, inspiring, and concise group description (2-3 sentences). It should state the group's purpose and invite like-minded people to join.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Error generating group description:", error);
        return "A space for us to explore and grow together.";
    }
};

export const suggestConnections = async (currentUser: User, allUsers: User[]): Promise<AISuggestion<User>[]> => {
    // This is a mock implementation. In a real app, you'd send user activity data to the AI.
    await new Promise(res => setTimeout(res, 1000)); // simulate network delay
    const suggestions: AISuggestion<User>[] = [];
    const potentialUsers = allUsers.filter(u => u.id !== currentUser.id).slice(0, 3);
    const reasons = [
        "Based on your interest in 'Gratitude' challenges, you might enjoy connecting with this user.",
        "You've both explored meditations on 'Inner Peace'.",
        "This user also generates sermons on philosophical topics."
    ];
    potentialUsers.forEach((user, index) => {
        suggestions.push({ item: user, reason: reasons[index % reasons.length] });
    });
    return suggestions;
};

export const suggestGroups = async (allGroups: Group[], userGroups: string[]): Promise<AISuggestion<Group>[]> => {
    // Mock implementation
    await new Promise(res => setTimeout(res, 1000));
    const suggestions: AISuggestion<Group>[] = [];
    const potentialGroups = allGroups.filter(g => !userGroups.includes(g.id) && g.isPublic).slice(0, 2);
    const reasons = [
        "This group's focus on 'Mindfulness' aligns with your recent meditation themes.",
        "A great place to discuss the 'Ancient Wisdom' you've been exploring."
    ];
    potentialGroups.forEach((group, index) => {
        suggestions.push({ item: group, reason: reasons[index % reasons.length] });
    });
    return suggestions;
};

export const generateRatingFeedback = async (rating: number, topic: string): Promise<string> => {
  try {
    const prompt = `You are an encouraging AI assistant for "The Guiding Light AI" app. A user has just rated a sermon on the topic "${topic}" with ${rating} out of 5 stars. 

    - If the rating is high (4 or 5), write a short, warm, and grateful message.
    - If the rating is mid-range (3), write a thoughtful message acknowledging their feedback and encouraging continued reflection.
    - If the rating is low (1 or 2), write a respectful and constructive message, thanking them for their honesty and mentioning that the AI is always learning.
    
    The message should be one sentence and end with a relevant emoji.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error generating rating feedback:", error);
    return "Thank you for your valuable feedback. 🙏";
  }
};

export const suggestSermonAudioStyles = async (sermonText: string): Promise<{title: string, description: string}[] | null> => {
  try {
    const prompt = `You are an expert sound designer AI specializing in immersive audio for sermons and speeches. Based on the following sermon text, generate 3 distinct audio style concepts.

For each concept, provide:
1.  title: A short, catchy title (e.g., "Warm & Reflective," "Authoritative & Clear").
2.  description: A descriptive prompt for an audio generation AI. Detail the narrator's voice (e.g., "gentle male voice, reassuring and calm") and the background soundscape (e.g., "subtle, uplifting orchestral music that swells at key moments").

Sermon Text:
---
${sermonText.substring(0, 1500)}...
---

Return a valid JSON array of objects, each with "title" and "description" string properties.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'A short, catchy title for the audio style.' },
              description: { type: Type.STRING, description: 'A descriptive phrase for the audio generation AI prompt.' }
            },
            required: ['title', 'description']
          }
        }
      }
    });

    const jsonText = response.text;
    return JSON.parse(jsonText) as {title: string, description: string}[];
  } catch (error) {
    console.error("Error suggesting sermon audio styles:", error);
    return null;
  }
};

export const suggestSermonVideoStyles = async (sermonText: string): Promise<{title: string, description: string}[] | null> => {
  try {
    const prompt = `You are an expert creative director AI agent for "The Guiding Light AI". Your task is to generate 3 distinct video style concepts for a sermon. Analyze the sermon's text for its core message, tone, and emotional arc. Then, drawing upon data analytics of what visual styles are most impactful for spiritual and philosophical content, create concepts that are not only artistic and symbolic but also highly engaging.

For each concept, provide:
1.  "title": A short, evocative title for the style (e.g., "Sacred Light," "Abstract Journey").
2.  "description": A rich, descriptive prompt for a video generation AI (like Veo). Detail the color palette, mood, camera work, and key visual elements that would complement the sermon.

Sermon Text:
---
${sermonText.substring(0, 1500)}...
---

Return a valid JSON array of objects, each with "title" and "description" string properties.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'A short, catchy title for the style.' },
              description: { type: Type.STRING, description: 'A descriptive phrase for the video generation AI prompt.' }
            },
            required: ['title', 'description']
          }
        }
      }
    });

    const jsonText = response.text;
    return JSON.parse(jsonText) as {title: string, description: string}[];
  } catch (error) {
    console.error("Error suggesting sermon video styles:", error);
    return null;
  }
};


export const suggestMeditationVideoStyles = async (script: string): Promise<{title: string, description: string}[] | null> => {
  try {
    const prompt = `You are an expert creative director AI specializing in meditative visuals. Based on the following meditation script, generate 3 distinct video style concepts.

For each concept, provide:
1.  title: A short, evocative title (e.g., "Celestial Journey," "Forest Bathe").
2.  description: A rich, descriptive prompt for a video generation AI. Detail the color palette, mood, camera work, and key visual elements.

Meditation Script:
---
${script.substring(0, 1500)}...
---

Return a valid JSON array of objects, each with "title" and "description" string properties.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'A short, catchy title for the style.' },
              description: { type: Type.STRING, description: 'A descriptive phrase for the video generation AI prompt.' }
            },
            required: ['title', 'description']
          }
        }
      }
    });

    const jsonText = response.text;
    return JSON.parse(jsonText) as {title: string, description: string}[];
  } catch (error) {
    console.error("Error suggesting meditation video styles:", error);
    return null;
  }
};

export const suggestMeditationAudioStyles = async (script: string): Promise<{title: string, description: string}[] | null> => {
  try {
    const prompt = `You are an expert sound designer AI specializing in immersive audio for meditation. Based on the following script, generate 3 distinct and detailed audio style concepts.

For each concept, provide:
1.  title: A short, catchy title (e.g., "Rainy Day Comfort," "Cosmic Hum").
2.  description: A detailed and descriptive prompt for an audio generation AI. Be very specific.
    - Narrator's Voice: Describe the voice's characteristics including gender, tone (e.g., warm, reassuring, calm), accent (e.g., gentle American, soothing British), and pace (e.g., slow and deliberate).
    - Background Soundscape: Describe the ambient sounds (e.g., soft rainfall, distant thunder) and any musical elements, including genre (e.g., ambient synth pad, minimalist piano), and specific instrumentation.

Meditation Script:
---
${script.substring(0, 1500)}...
---

Return a valid JSON array of objects, each with "title" and "description" string properties.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'A short, catchy title for the audio style.' },
              description: { type: Type.STRING, description: 'A descriptive phrase for the audio generation AI prompt.' }
            },
            required: ['title', 'description']
          }
        }
      }
    });

    const jsonText = response.text;
    return JSON.parse(jsonText) as {title: string, description: string}[];
  } catch (error) {
    console.error("Error suggesting meditation audio styles:", error);
    return null;
  }
};

// FIX: Update function signature to accept aspectRatio, resolving argument mismatch errors.
export const generateSermonVideo = async (
  sermonText: string,
  style: string,
  onProgress: (progress: number) => void,
  aspectRatio: '16:9' | '9:16'
): Promise<string | null | 'QUOTA_EXCEEDED'> => {
    try {
        onProgress(5); // Initial progress for prompt generation
        const promptGenPrompt = `You are an AI Creative Director specializing in video generation. Your task is to create a single, highly descriptive, and artistic prompt for a text-to-video AI model (like Google Veo) based on a sermon text and a desired artistic style.

        **Analysis Context:**
        - **Sermon Text:** "${sermonText.substring(0, 2000)}..."
        - **Selected Artistic Style:** "${style}"

        **Your Task:**
        Synthesize the core themes, emotions, and keywords from the sermon text with the user's selected style. Create a single, detailed paragraph that describes the desired video. The prompt should be cinematic, mentioning camera movements, color palettes, lighting, and specific visual metaphors related to the sermon. The goal is to produce a visually stunning, emotionally resonant, and thematically appropriate video.
        
        **Example Output:**
        "A cinematic, slow-motion journey through a misty forest at dawn. Sunbeams pierce through the canopy, illuminating dewdrops on leaves, symbolizing hope and new beginnings. The color palette is soft greens and golds, with a feeling of tranquility and peace. Gentle dolly shots move through the trees, following a path that represents the spiritual journey. The video should evoke a sense of calm reflection and profound optimism."
        
        Return ONLY the final video prompt as a single string.`;

        const promptResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: promptGenPrompt
        });

        const finalVideoPrompt = promptResponse.text;
        console.log("Generated Veo Prompt for Sermon:", finalVideoPrompt);

        // FIX: Pass aspectRatio to the updated helper function.
        return await generateVideoWithVeo(finalVideoPrompt, onProgress, aspectRatio);
    } catch (error) {
        console.error("Error in generateSermonVideo:", error);
        onProgress(100);
        return null;
    }
};

export const generateSermonPoster = async (sermonText: string, outputMimeType: 'image/jpeg' | 'image/png', aspectRatio: '3:4' | '16:9'): Promise<{ imageBytes: string | null; mimeType: 'image/jpeg' | 'image/png' }> => {
  try {
    const imagePromptInstruction = `Based on the core message of the following sermon, create a visually striking and descriptive prompt for an image generation AI (like Imagen) to create a motivational or reflective poster. The prompt should describe an abstract, symbolic, or serene scene that captures the essence of the sermon. Do not include any text from the sermon in the image prompt itself. The style should be painterly with dramatic, hopeful lighting.

    Sermon Text:
    ---
    ${sermonText.substring(0, 1000)}... 
    ---
    `;

    const imagePromptResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: imagePromptInstruction,
    });
    const imagePrompt = imagePromptResponse.text;

    const imageResponse = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: imagePrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: outputMimeType,
        aspectRatio: aspectRatio,
      },
    });

    const imageBytes = (imageResponse.generatedImages && imageResponse.generatedImages.length > 0)
      ? imageResponse.generatedImages[0].image.imageBytes
      : null;

    return { imageBytes, mimeType: outputMimeType };
  } catch (error) {
    console.error("Error generating sermon poster:", error);
    return { imageBytes: null, mimeType: outputMimeType };
  }
};

export const generateMeditationPoster = async (meditationScript: string, outputMimeType: 'image/jpeg' | 'image/png', aspectRatio: '3:4' | '16:9'): Promise<{ imageBytes: string | null; mimeType: 'image/jpeg' | 'image/png' }> => {
  try {
    const imagePromptInstruction = `Based on the mood and imagery of the following meditation script, create a visually striking and descriptive prompt for an image generation AI (like Imagen) to create a serene and calming poster. The prompt should describe a tranquil, abstract, or natural scene that captures the essence of the meditation. Avoid any text in the image prompt itself. The style should be soft, ethereal, with a gentle, glowing light.

    Meditation Script:
    ---
    ${meditationScript.substring(0, 1000)}... 
    ---
    `;

    const imagePromptResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: imagePromptInstruction,
    });
    const imagePrompt = imagePromptResponse.text;

    const imageResponse = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: imagePrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: outputMimeType,
        aspectRatio: aspectRatio,
      },
    });

    const imageBytes = (imageResponse.generatedImages && imageResponse.generatedImages.length > 0)
      ? imageResponse.generatedImages[0].image.imageBytes
      : null;

    return { imageBytes, mimeType: outputMimeType };
  } catch (error) {
    console.error("Error generating meditation poster:", error);
    return { imageBytes: null, mimeType: outputMimeType };
  }
};

export const generateEventSocialPost = async (event: Event): Promise<string> => {
  try {
    const prompt = `You are a social media manager AI for "The Guiding Light AI" app. Create a short, engaging, and inviting post for social media about an event.

    Event Details:
    - Title: "${event.title}"
    - Description: "${event.description}"
    - Start Time: ${event.startTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}

    Your post should be concise (like a tweet), generate excitement, and include all key details in a natural way. End with 2-3 relevant hashtags.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error generating event social post:", error);
    // Fallback response
    return `Join me for "${event.title}" on ${event.startTime.toLocaleDateString()}! It's a session on "${event.description}". Hope to see you there! #SpiritualEvent #GuidingLightAI`;
  }
};


export const generateIcsFileContent = async (event: Event): Promise<string | null> => {
    try {
        const prompt = `You are a helpful calendar assistant AI. A user wants to add an event to their calendar.
        
        Event Details:
        - Title: ${event.title}
        - Description: ${event.description}
        - Start Time (ISO): ${event.startTime.toISOString()}
        - Duration (Minutes): ${event.durationMinutes}
        
        Generate the content for a standard .ics (iCalendar) file for this event. The format must be strictly followed.
        - UID should be unique, you can use the event ID and current timestamp.
        - DTSTAMP should be the current UTC time.
        - DTSTART should be the event start time.
        - DTEND should be calculated based on the start time and duration.
        
        Return ONLY the raw .ics content, starting with "BEGIN:VCALENDAR" and ending with "END:VCALENDAR".`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        // Basic validation
        let icsContent = response.text;
        if (icsContent.startsWith('```') && icsContent.endsWith('```')) {
            icsContent = icsContent.substring(3, icsContent.length - 3).trim();
            if (icsContent.startsWith('ics')) {
                icsContent = icsContent.substring(3).trim();
            }
        }

        if (icsContent.startsWith('BEGIN:VCALENDAR') && icsContent.endsWith('END:VCALENDAR')) {
            return icsContent;
        } else {
            console.error("Generated ICS content is invalid:", icsContent);
            return null;
        }
    } catch (error) {
        console.error("Error generating ICS file content:", error);
        return null;
    }
};

export const generateIcsForMeditation = async (meditation: ScheduledMeditation): Promise<string | null> => {
    try {
        const durationMinutes = parseInt(meditation.duration.split('-')[0], 10);
        const startTime = new Date(meditation.scheduledTime);
        const prompt = `You are a helpful calendar assistant AI. A user wants to schedule a meditation session.
        
        Event Details:
        - Title: Meditation: ${meditation.theme}
        - Description: A guided meditation session on "${meditation.theme}".\\n\\nScript Excerpt:\\n${meditation.script.substring(0, 200)}...
        - Start Time (ISO): ${startTime.toISOString()}
        - Duration (Minutes): ${durationMinutes}
        
        Generate the content for a standard .ics (iCalendar) file for this event. The format must be strictly followed.
        - UID should be unique, you can use the event ID and current timestamp.
        - DTSTAMP should be the current UTC time.
        - DTSTART should be the event start time.
        - DTEND should be calculated based on the start time and duration.
        
        Return ONLY the raw .ics content, starting with "BEGIN:VCALENDAR" and ending with "END:VCALENDAR".`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        let icsContent = response.text;
        if (icsContent.startsWith('```') && icsContent.endsWith('```')) {
            icsContent = icsContent.substring(3, icsContent.length - 3).trim();
            if (icsContent.startsWith('ics')) {
                icsContent = icsContent.substring(3).trim();
            }
        }

        if (icsContent.startsWith('BEGIN:VCALENDAR') && icsContent.endsWith('END:VCALENDAR')) {
            return icsContent;
        } else {
            console.error("Generated ICS content for meditation is invalid:", icsContent);
            return null;
        }
    } catch (error) {
        console.error("Error generating ICS file content for meditation:", error);
        return null;
    }
};

export const generateTimedMeditationGuide = async (script: string, durationMinutes: number): Promise<TimedMeditationSegment[] | null> => {
    try {
        const prompt = `You are an AI meditation guide. You need to structure a meditation session.
        
        Meditation Script:
        ---
        ${script}
        ---
        Total Duration: ${durationMinutes} minutes.
        
        Your task is to break down the script into logical, timed segments. The total duration of all segments MUST equal ${durationMinutes} minutes.
        Create a JSON array where each object represents a segment of the meditation, containing:
        1. "startTime": The start time of this segment in seconds from the beginning (e.g., 0, 30, 120).
        2. "duration": The duration of this segment in seconds.
        3. "instruction": A short, clear instruction for the user during this segment, derived from the script.
        
        Example for a 3-minute session:
        [
          {"startTime": 0, "duration": 30, "instruction": "Settle in and find a comfortable position. Close your eyes and begin to focus on your breath."},
          {"startTime": 30, "duration": 120, "instruction": "Visualize a calm, serene lake. Notice the stillness of the water."},
          {"startTime": 150, "duration": 30, "instruction": "Gently bring your awareness back to the room. Take one last deep breath and open your eyes."}
        ]
        
        Ensure the "startTime" of a segment plus its "duration" equals the "startTime" of the next segment. The final segment should end exactly at ${durationMinutes * 60} seconds.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            startTime: { type: Type.INTEGER, description: "Start time in seconds." },
                            duration: { type: Type.INTEGER, description: "Duration in seconds." },
                            instruction: { type: Type.STRING, description: "Instruction for this segment." }
                        },
                        required: ["startTime", "duration", "instruction"]
                    }
                }
            }
        });
        
        const jsonText = response.text;
        return JSON.parse(jsonText) as TimedMeditationSegment[];

    } catch (error) {
        console.error("Error generating timed meditation guide:", error);
        return null;
    }
};

export const getBibleChapter = async (book: string, chapter: number): Promise<BibleChapter | null> => {
    try {
        const prompt = `You are a biblical scholar AI agent. Your task is to return the full text of a specific chapter of the Bible.
        
        Book: ${book}
        Chapter: ${chapter}
        
        Return the response as a JSON object with the following structure:
        - "book": The name of the book.
        - "chapter": The chapter number.
        - "verses": An array of objects, where each object has:
          - "verse": The verse number (integer).
          - "text": The full text of the verse (string).
          
        Ensure the text is from a standard, well-regarded translation like the KJV, NIV, or ESV. Do not include any commentary or introductions, only the structured JSON.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        book: { type: Type.STRING },
                        chapter: { type: Type.INTEGER },
                        verses: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    verse: { type: Type.INTEGER },
                                    text: { type: Type.STRING }
                                },
                                required: ["verse", "text"]
                            }
                        }
                    },
                    required: ["book", "chapter", "verses"]
                }
            }
        });
        
        const jsonText = response.text;
        return JSON.parse(jsonText) as BibleChapter;

    } catch (error) {
        console.error(`Error fetching Bible chapter (${book} ${chapter}):`, error);
        return null;
    }
};

export const searchBible = async (query: string): Promise<BibleSearchResult | null> => {
    try {
        const prompt = `You are a powerful biblical search engine AI. A user wants to search the entire Bible for the following query: "${query}".

        Perform a comprehensive, semantic search. Your goal is to find the most relevant verses, even if they don't contain the exact keywords.
        
        Return the response as a JSON object with the following structure:
        - "summary": A brief (1-2 sentences) summary of what the Bible says about the query topic, based on your findings.
        - "results": An array of the top 5-7 most relevant verses. Each object in the array should have:
          - "reference": The full reference (e.g., "John 3:16").
          - "verse": The full text of the verse.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING, description: "A brief summary of the search findings." },
                        results: {
                            type: Type.ARRAY,
                            description: "A list of relevant Bible verses.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    reference: { type: Type.STRING, description: "The scripture reference." },
                                    verse: { type: Type.STRING, description: "The full text of the verse." }
                                },
                                required: ["reference", "verse"]
                            }
                        }
                    },
                    required: ["summary", "results"]
                }
            }
        });

        const jsonText = response.text;
        return JSON.parse(jsonText) as BibleSearchResult;

    } catch (error) {
        console.error("Error searching Bible:", error);
        return null;
    }
};

export const generateRewardPoster = async (challengeTitle: string): Promise<RewardPoster | null> => {
    try {
        const prompt = `You are The Guiding Light AI. A user has completed the spiritual challenge "${challengeTitle}". Generate a JSON object with two properties: "posterText" and "imagePrompt".
        1. "posterText": A short, celebratory, and inspirational quote related to the theme of the challenge.
        2. "imagePrompt": A visually striking prompt for an image generation AI to create a beautiful poster based on the quote. The style should be vibrant, hopeful, and slightly abstract. Do not include the text in the image prompt.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        posterText: { type: Type.STRING },
                        imagePrompt: { type: Type.STRING }
                    },
                    required: ['posterText', 'imagePrompt']
                }
            }
        });

        const { posterText, imagePrompt } = JSON.parse(response.text);

        const imageResponse = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: imagePrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '3:4',
            },
        });

        const imageBytes = imageResponse.generatedImages?.[0]?.image.imageBytes || '';
        
        return { text: posterText, image: imageBytes };
    } catch (error) {
        console.error("Error generating reward poster:", error);
        return null;
    }
};

export const generateRewardSoundscape = async (): Promise<string | null> => {
    try {
        console.log("Generating calming nature soundscape...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        // Using another royalty-free sound for demonstration
        return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3";
    } catch (error) {
        console.error("Error generating soundscape:", error);
        return null;
    }
};


const getChatbotSystemInstruction = (context: string): string => {
    const baseInstruction = `You are Kai (Knowledge and Inspiration), a friendly and helpful AI assistant for 'The Guiding Light AI' app. Your goal is to help users, be their companion, and guide them through the app's features. Be concise, encouraging, and use emojis appropriately. Never reveal that you are a language model. You are part of the app.`;

    switch (context) {
        case 'DASHBOARD':
            return `${baseInstruction} You're on the Dashboard. Be a proactive guide. Suggest reflecting on the 'Daily Inspiration', or if a user mentions a feeling (e.g., "I feel anxious"), suggest a relevant meditation or sermon topic. Nudge them towards exploring a new feature. For example: "Have you tried one of our Spiritual Growth Challenges yet? They're a great way to build positive habits." 🗺️`;
        case 'SERMONS':
            return `${baseInstruction} You're in the Sermon section. Be a creative partner. If the user provides a topic, suggest a compelling title or opening line. If they seem unsure, ask what's on their heart and offer topic ideas. After a sermon is made, remind them they can generate accompanying audio, video, and even a social media post. 📖✨`;
        case 'PRAYERS':
            return `${baseInstruction} You're in the Prayer section. Be a compassionate companion. If a user is seeking a prayer, gently ask what they're praying for (e.g., 'strength', 'gratitude', 'healing'). Offer encouragement and guide them in crafting a meaningful prayer. 🙏`;
        case 'MEDITATIONS':
            return `${baseInstruction} You're in the Meditations section. Be a gentle guide. If a user needs a goal, ask about their day to suggest something personal, like 'Releasing today's stress' or 'Finding focus for tomorrow'. Explain how the different audio and video styles can create a unique, immersive experience for their session. 🧘‍♀️`;
        case 'MUSIC_HUB':
            return `${baseInstruction} You're in the Music Hub. Be a creative muse. Encourage users to try the AI Composer with imaginative prompts like "a soundtrack for a peaceful dream." If they are searching the library, help them find the perfect vibe by asking about their current mood or activity. 🎶`;
        case 'CHALLENGES':
            return `${baseInstruction} You're in the Challenges section. Act as a motivational coach! Be very encouraging. Explain the specific rewards for challenges. Example: "The 'Nature Walk' challenge unlocks a beautiful, calming soundscape generated just for you! 🌳" Celebrate their completions enthusiastically. 🎉`;
        case 'STREAMING':
            return `${baseInstruction} You're on "The Serenity Channel." Be a serene host. Welcome users and gently remind them of the current theme. Encourage interaction by asking reflective questions related to the theme, such as, "How does this theme of 'Stillness' show up in your life?" Foster a peaceful, shared experience. 💖`;
        case 'PROFILE':
            return `${baseInstruction} You're on the Profile page. Be a supportive friend. Acknowledge the user's stats positively (e.g., "I see you've completed 5 meditations, that's a wonderful commitment to peace."). Guide them to use the 'AI Growth Analyst' for deeper insights into their journey. 📈`;
        case 'EVENTS':
             return `${baseInstruction} You're in Events. Be a community coordinator. Inform users about upcoming events and ask if they'd like to RSVP. Proactively offer to help them plan their own event using the 'AI Event Planner' by asking, "Is there a topic you're passionate about discussing with others?" 🗓️`;
        case 'STUDY_ASSISTANT':
            return `${baseInstruction} You're in the Study Assistant. Be a wise and knowledgeable scribe. Encourage curiosity: "No question is too simple or too complex. Whether you're curious about a specific verse or a broad theological concept, I'm here to help you explore." Remind them they can toggle Google Search for more recent context. 📜`;
        case 'BIBLE':
            return `${baseInstruction} You're in the Bible section. Be a helpful librarian. Offer to find verses related to feelings like 'hope', 'anxiety', or 'joy'. Remind them that the 'AI Insights' tab provides a personalized starting point for their daily reading, tailored to their recent activity in the app. 🔎`;
        case 'WISDOM_LIBRARY':
            return `${baseInstruction} You're in the Wisdom Library. Be a curious philosopher. After they've read an excerpt, prompt them with a reflective question like, "How does that ancient idea resonate with your life today?" to encourage deeper engagement. ✨`;
        case 'COMMUNITY':
            return `${baseInstruction} You're in the Community Hub. Be a warm connector. Encourage users to not just join groups but to introduce themselves. Suggest actions: "Why not create a post in the 'Mindfulness Practitioners' group about your recent meditation experience?" Help them feel like a valued member. 🤗`;
        case 'LIBRARY':
             return `${baseInstruction} You're in the Spiritual Content Library. Be an intelligent archivist. Congratulate users on uploading content. You can say things like, "It's wonderful that you're archiving your spiritual materials here." If they seem unsure, suggest they try the 'Edit with AI' feature on an image to see its power. 📚`;
        case 'RESOURCE_CENTRE':
             return `${baseInstruction} You're in the Resource Centre. Be a professional and knowledgeable assistant. Help spiritual leaders find tools for sermon prep or leadership. Guide any user to find a local community or interesting books. Be efficient and supportive. 🛠️`;
        default:
            return baseInstruction;
    }
};

export const generateChatbotResponse = async (messages: ChatMessage[], context: string): Promise<string> => {
    try {
        const systemInstruction = getChatbotSystemInstruction(context);

        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: { systemInstruction },
            history: messages.slice(0, -1).map(msg => ({
                role: msg.sender === 'ai' ? 'model' : 'user',
                parts: [{ text: msg.text }]
            }))
        });

        const lastMessage = messages[messages.length - 1];
        const result = await chat.sendMessage({ message: lastMessage.text });

        return result.text;

    } catch (error) {
        console.error("Error generating chatbot response:", error);
        return "I'm sorry, I'm having a little trouble connecting right now. Please try again in a moment. 🙏";
    }
};

export const getStreamContent = async (): Promise<StreamContent | null | 'QUOTA_EXCEEDED'> => {
  try {
    const prompt = `You are The Guiding Light AI, an advanced producer for "The Serenity Channel", a live spiritual stream. Your task is to generate dynamic content by analyzing real-time data and trends.
1.  Analyze current global moods, recent news, and trending online spiritual discourse to identify 2-3 highly relevant "trendingTopics". For each, provide the 'topic' name and a 'reason' explaining its current significance.
2.  Based on the most prominent trend, generate a central 'theme' for the stream.
3.  Create a powerful 'overlayQuote' that encapsulates this theme.
4.  Write a highly descriptive and artistic 'videoPrompt' for a text-to-video AI to generate a continuous visual loop related to the theme.
5.  Write an 'audioPrompt' for a text-to-audio AI to generate a soothing ambient soundscape.
6.  Generate an array of 5-7 short 'affirmations' related to the theme that can be spoken over the soundscape for a live transcript.

The response must be a JSON object.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            theme: { type: Type.STRING, description: 'The inspirational theme for the stream.' },
            videoPrompt: { type: Type.STRING, description: 'The prompt for the video generation AI.' },
            audioPrompt: { type: Type.STRING, description: 'The prompt for the audio generation AI.' },
            overlayQuote: { type: Type.STRING, description: 'A short quote for a text overlay.' },
            trendingTopics: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        topic: { type: Type.STRING, description: 'The name of the trending topic.' },
                        reason: { type: Type.STRING, description: 'A brief reason for its relevance.' }
                    },
                    required: ['topic', 'reason']
                }
            },
            affirmations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'A list of 5-7 short, spoken affirmations related to the theme.'
            }
          },
          required: ['theme', 'videoPrompt', 'audioPrompt', 'overlayQuote', 'trendingTopics', 'affirmations']
        }
      }
    });

    const jsonText = response.text;
    return JSON.parse(jsonText) as StreamContent;

  } catch (error) {
    console.error("Error generating stream content:", error);
    if (isQuotaError(error)) {
        return 'QUOTA_EXCEEDED';
    }
    return null;
  }
};

export const getAIHostQuestion = async (theme: string): Promise<string> => {
    try {
        const prompt = `You are Kai, the AI host of "The Serenity Channel." The current theme is "${theme}". Generate a single, short, gentle, and reflective question to post in the live chat to encourage community interaction. The question should be open-ended and related to the theme.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error getting AI host question:", error);
        return "How does this theme resonate with you today?"; // Fallback
    }
};

export const summarizeChat = async (chatHistory: string): Promise<string> => {
    try {
        if (chatHistory.trim().length < 50) return ''; // Don't summarize very short chats
        const prompt = `You are an AI chat analyst. Briefly summarize the current mood or key themes from the following chat transcript in one short, insightful sentence. Start with "Community Reflection:". Example: "Community Reflection: A feeling of gratitude is flowing through the chat."

Chat Transcript:
---
${chatHistory}
---`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error summarizing chat:", error);
        return ''; // Return empty on failure
    }
};

export const getDynamicOverlay = async (theme: string): Promise<string | null> => {
    try {
        const prompt = `You are The Guiding Light AI. The current stream theme is "${theme}". Provide a single, short, new, and inspirational quote or affirmation that is related to this theme. Do not repeat previous ones if possible. Return only the quote.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error getting dynamic overlay:", error);
        return null;
    }
}

export const getBibleInsights = async (userActivity: { 
    recentSermonTopics: string[], 
    recentMeditationGoals: string[],
    completedChallenges: string[],
    communityGroupTopics: string[]
}): Promise<BibleInsight | null> => {
    try {
        const prompt = `You are an AI Biblical Analyst for The Guiding Light app. Your goal is to provide a deeply personalized and holistic daily briefing. Analyze the user's *entire* recent activity across the app to tailor your response.

User's Recent Activity:
- Sermon topics explored: ${userActivity.recentSermonTopics.join(', ') || 'None'}
- Meditation goals pursued: ${userActivity.recentMeditationGoals.join(', ') || 'None'}
- Spiritual challenges completed: ${userActivity.completedChallenges.join(', ') || 'None'}
- Community groups joined/active in: ${userActivity.communityGroupTopics.join(', ') || 'None'}

Based on this holistic view of their journey, generate a JSON response with:
1.  "verseOfTheDay": Select a Bible verse that strongly resonates with the *combination* of the user's recent activities. Provide the "reference", "verse", and a short, insightful "reflection" (2-3 sentences) that connects the verse to their specific, multi-faceted interests.
2.  "trendingTopics": Generate an array of 3 spiritual topics. Two of these topics should be directly inspired by the user's activity (e.g., if they completed a 'Gratitude' challenge, a topic could be 'Thankfulness'). The third topic can be a more general, popular spiritual theme (e.g., 'Hope').
3.  "personalizedSuggestion": An object with a "suggestion" (e.g., "Since you've been exploring 'Forgiveness' and 'Gratitude', consider a study plan on 'Grace'") and a brief "reason" explaining how this suggestion builds upon their recent, comprehensive activity.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        verseOfTheDay: {
                            type: Type.OBJECT,
                            properties: {
                                reference: { type: Type.STRING },
                                verse: { type: Type.STRING },
                                reflection: { type: Type.STRING }
                            },
                            required: ["reference", "verse", "reflection"]
                        },
                        trendingTopics: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        personalizedSuggestion: {
                            type: Type.OBJECT,
                            properties: {
                                suggestion: { type: Type.STRING },
                                reason: { type: Type.STRING }
                            },
                            required: ["suggestion", "reason"]
                        }
                    },
                    required: ["verseOfTheDay", "trendingTopics", "personalizedSuggestion"]
                }
            }
        });

        const jsonText = response.text;
        return JSON.parse(jsonText) as BibleInsight;

    } catch (error) {
        console.error("Error fetching Bible insights:", error);
        return null;
    }
};

export const generateBibleStudyPlan = async (topic: string, userActivity: { recentSermonTopics: string[], recentMeditationGoals: string[] }): Promise<BibleStudyPlan | null> => {
    const duration = 5; // Fixed 5-day plan for now
    try {
        const prompt = `You are an AI Bible Study Curriculum Designer. Create a highly personalized ${duration}-day Bible study plan on the topic of "${topic}".
        
Use the user's recent activity to tailor the "focusPoint" for each day, making them more relevant and resonant.

User's Recent Activity:
- Sermon topics explored: ${userActivity.recentSermonTopics.join(', ') || 'None'}
- Meditation goals pursued: ${userActivity.recentMeditationGoals.join(', ') || 'None'}

The response should be a JSON object containing:
1.  "title": A creative title for the study plan that reflects the topic and user's interests.
2.  "duration": The duration as a string (e.g., '${duration} Days').
3.  "dailyReadings": An array of objects for each day. Each object must have "day" (number), "reading" (string, e.g., 'John 1:1-14'), and a personalized "focusPoint" (a short, reflective question or thought that connects the reading to the user's past activities).`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        duration: { type: Type.STRING },
                        dailyReadings: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    day: { type: Type.INTEGER },
                                    reading: { type: Type.STRING },
                                    focusPoint: { type: Type.STRING }
                                },
                                required: ["day", "reading", "focusPoint"]
                            }
                        }
                    },
                    required: ["title", "duration", "dailyReadings"]
                }
            }
        });
        
        const jsonText = response.text;
        return JSON.parse(jsonText) as BibleStudyPlan;

    } catch (error) {
        console.error("Error generating Bible study plan:", error);
        return null;
    }
};

// --- Library Functions ---

export const generateTagsForFile = async (fileName: string, fileType: LibraryItemType): Promise<string[]> => {
    try {
        const prompt = `You are an AI content organizer. A user has uploaded a file named "${fileName}" which is a ${fileType}. Based on the file name and type, suggest 3-5 relevant, one-word tags for spiritual or personal growth topics.

        Examples:
        - If the file is "My Morning Meditation.mp3", tags could be: meditation, mindfulness, morning, audio, peace.
        - If the file is "Sermon Notes on Forgiveness.pdf", tags could be: sermon, notes, forgiveness, study, reflection.
        - If the file is "Gratitude Journal Entry.txt", tags could be: gratitude, journal, writing, reflection.
        - If the file is "Hopeful Sunrise.jpg", tags could be: hope, nature, sunrise, visual, inspiration.

        Return a valid JSON array of strings.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                }
            }
        });
        const jsonText = response.text;
        return JSON.parse(jsonText);
    } catch (error) {
        if (isQuotaError(error)) {
            console.warn(`Quota exceeded while generating tags for file: ${fileName}`);
        } else {
            console.error("Error generating tags for file:", error);
        }
        return ["untagged"];
    }
};

export const generateShareableSummary = async (fileName: string, fileType: LibraryItemType): Promise<string> => {
    try {
        const prompt = `You are an AI assistant helping a user share content from their Spiritual Library. The user is sharing a ${fileType} named "${fileName}".
        
        Create a short, engaging, and positive message to accompany the share.
        
        Example:
        - For "My Morning Meditation.mp3": "Sharing a calming morning meditation session from my library. Hope it brings you some peace! 🙏"
        - For "Sermon Notes on Forgiveness.pdf": "Here are some notes I took on a powerful sermon about forgiveness. So much to reflect on here."
        
        Return only the text of the message.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating shareable summary:", error);
        return `Sharing "${fileName}" from my Spiritual Library.`;
    }
};

export const editImageWithAI = async (base64Image: string, mimeType: string, prompt: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType,
                        },
                    },
                    { text: prompt },
                ],
            },
            // FIX: Corrected responseModalities to only include IMAGE as per guidelines.
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        // Find the image part in the response
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                return part.inlineData.data; // Return the new base64 image string
            }
        }
        
        console.error("No image part found in AI edit response");
        return null;
    } catch (error) {
        console.error("Error editing image with AI:", error);
        return null;
    }
};

// --- Resource Centre Functions ---

export const generateSermonOutline = async (topic: string): Promise<SermonOutline | null> => {
    try {
        const prompt = `You are an AI Theological Assistant. A pastor or spiritual leader needs help preparing a sermon on the topic: "${topic}".
        
        Generate a comprehensive, well-structured sermon outline. The response must be a JSON object containing:
        1. "title": A compelling and creative title for the sermon.
        2. "keyVerse": A single, highly relevant Bible verse that serves as the foundation for the message.
        3. "introduction": An engaging opening to capture the audience's attention, perhaps with a question or short story.
        4. "points": An array of 3 distinct main points. Each point object should have:
           - "title": A clear title for the point.
           - "scripture": A primary supporting scripture for this point.
           - "details": A brief explanation or elaboration on the point.
        5. "conclusion": A powerful summary and a call to action or reflection for the congregation.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        keyVerse: { type: Type.STRING },
                        introduction: { type: Type.STRING },
                        points: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    scripture: { type: Type.STRING },
                                    details: { type: Type.STRING },
                                },
                                required: ["title", "scripture", "details"]
                            }
                        },
                        conclusion: { type: Type.STRING }
                    },
                    required: ["title", "keyVerse", "introduction", "points", "conclusion"]
                }
            }
        });
        const jsonText = response.text;
        return JSON.parse(jsonText) as SermonOutline;
    } catch (error) {
        console.error("Error generating sermon outline:", error);
        return null;
    }
};

export const generateLeadershipArticle = async (topic: string): Promise<LeadershipArticle | null> => {
    try {
        const prompt = `You are an AI Leadership Coach for spiritual leaders. Generate a concise, practical, and insightful article on the topic: "${topic}".

        The response must be a JSON object containing:
        1. "title": A clear and engaging title for the article.
        2. "summary": A brief, one-paragraph summary of the article's key takeaways.
        3. "sections": An array of 2-3 section objects. Each section object should have:
           - "heading": A subheading for the section.
           - "content": A paragraph providing actionable advice, insights, or reflective questions on that subheading.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        summary: { type: Type.STRING },
                        sections: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    heading: { type: Type.STRING },
                                    content: { type: Type.STRING }
                                },
                                required: ["heading", "content"]
                            }
                        }
                    },
                    required: ["title", "summary", "sections"]
                }
            }
        });
        const jsonText = response.text;
        return JSON.parse(jsonText) as LeadershipArticle;
    } catch (error) {
        console.error("Error generating leadership article:", error);
        return null;
    }
};

export const findLocalCommunities = async (query: string): Promise<SpiritualCommunity[] | null> => {
    try {
        const prompt = `You are an AI assistant that generates realistic mock data. A user is searching for spiritual communities near "${query}".
        
        Generate a JSON array of 3-5 fictional but plausible-looking spiritual communities. Each community should have a different denomination or spiritual focus (e.g., Christian, Buddhist, Jewish, Interfaith, Meditation Center). The addresses should look realistic for the queried area if it's a known location, otherwise use a generic major city.
        
        Each object must have:
        1. "id": A unique string ID (e.g., "comm-123").
        2. "name": The name of the community (e.g., "Gracepoint Community Church", "Oak Valley Zen Center").
        3. "address": A realistic-looking street address.
        4. "denomination": The spiritual tradition.
        5. "summary": A short, one-sentence AI-generated summary of the community's focus.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            name: { type: Type.STRING },
                            address: { type: Type.STRING },
                            denomination: { type: Type.STRING },
                            summary: { type: Type.STRING }
                        },
                        required: ["id", "name", "address", "denomination", "summary"]
                    }
                }
            }
        });
        const jsonText = response.text;
        return JSON.parse(jsonText) as SpiritualCommunity[];
    } catch (error) {
        console.error("Error finding local communities (mock):", error);
        return null;
    }
};

export const getRecommendedReading = async (topic: string): Promise<RecommendedReading[] | null> => {
    try {
        const prompt = `You are an AI librarian for spiritual leaders and seekers. A user is interested in the topic: "${topic}". Curate a list of 4 recommended books for spiritual growth related to this topic.
        
        For each book, provide a JSON object with:
        1. "title": The title of the book.
        2. "author": The author's name.
        3. "summary": A concise, one-sentence summary explaining why this book is valuable for someone interested in "${topic}".`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            author: { type: Type.STRING },
                            summary: { type: Type.STRING }
                        },
                        required: ["title", "author", "summary"]
                    }
                }
            }
        });
        const jsonText = response.text;
        return JSON.parse(jsonText) as RecommendedReading[];
    } catch (error) {
        console.error("Error getting recommended reading:", error);
        return null;
    }
};

export const generateStudyCurriculum = async (topic: string, duration: string): Promise<StudyCurriculum | null> => {
    try {
        const prompt = `You are an AI Curriculum Designer for spiritual education. Create a ${duration} study curriculum for a small group on the topic of "${topic}".

        The response must be a JSON object containing:
        1. "title": A compelling title for the study series.
        2. "topic": The main topic ("${topic}").
        3. "duration": The duration as a string ("${duration}").
        4. "weeklyBreakdown": An array of objects, one for each week. Each weekly object must contain:
           - "week": The week number (integer).
           - "theme": A specific theme for that week's session.
           - "reading": A suggested scripture or text reading for the week.
           - "discussionQuestions": An array of 3-4 thought-provoking questions.
           - "activity": A practical activity or reflection exercise for the group.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        topic: { type: Type.STRING },
                        duration: { type: Type.STRING },
                        weeklyBreakdown: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    week: { type: Type.INTEGER },
                                    theme: { type: Type.STRING },
                                    reading: { type: Type.STRING },
                                    discussionQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    activity: { type: Type.STRING }
                                },
                                required: ["week", "theme", "reading", "discussionQuestions", "activity"]
                            }
                        }
                    },
                    required: ["title", "topic", "duration", "weeklyBreakdown"]
                }
            }
        });
        return JSON.parse(response.text) as StudyCurriculum;
    } catch (error) {
        console.error("Error generating study curriculum:", error);
        return null;
    }
};

export const generateCounselingPrompts = async (category: string): Promise<CounselingPrompt | null> => {
    try {
        const prompt = `You are an AI assistant for spiritual counselors and pastors. A user needs guidance on how to approach a conversation about "${category}".

        Generate a JSON object containing:
        1. "category": The category provided ("${category}").
        2. "prompts": An array of 3-5 prompt objects. Each prompt object should have:
           - "prompt": A gentle, open-ended question or prompt to encourage sharing.
           - "purpose": A brief explanation of why this prompt is helpful in this context.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING },
                        prompts: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    prompt: { type: Type.STRING },
                                    purpose: { type: Type.STRING }
                                },
                                required: ["prompt", "purpose"]
                            }
                        }
                    },
                    required: ["category", "prompts"]
                }
            }
        });
        return JSON.parse(response.text) as CounselingPrompt;
    } catch (error) {
        console.error("Error generating counseling prompts:", error);
        return null;
    }
};

export const generateInterfaithDialogue = async (faith1: string, faith2: string, topic: string): Promise<InterfaithDialogue | null> => {
    try {
        const prompt = `You are an AI facilitator for interfaith dialogue. Generate a set of respectful and insightful conversation starters for a discussion between practitioners of ${faith1} and ${faith2} on the shared theme of "${topic}".

        The response must be a JSON object containing:
        1. "topic": The central theme ("${topic}").
        2. "faiths": An array containing the two faiths ["${faith1}", "${faith2}"].
        3. "introduction": A brief, unifying introduction to frame the conversation positively.
        4. "starters": An array of 3-4 starter objects. Each starter object should have:
           - "question": An open-ended question that both participants can answer from their perspective.
           - "context": A brief note explaining the value or goal of the question.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        topic: { type: Type.STRING },
                        faiths: { type: Type.ARRAY, items: { type: Type.STRING } },
                        introduction: { type: Type.STRING },
                        starters: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    question: { type: Type.STRING },
                                    context: { type: Type.STRING }
                                },
                                required: ["question", "context"]
                            }
                        }
                    },
                    required: ["topic", "faiths", "introduction", "starters"]
                }
            }
        });
        return JSON.parse(response.text) as InterfaithDialogue;
    } catch (error) {
        console.error("Error generating interfaith dialogue:", error);
        return null;
    }
};


// --- Wisdom Library Functions ---

export const getWisdomOfTheDay = async (userActivity: { recentSermonTopics: string[], recentMeditationGoals: string[] }): Promise<WisdomContent | null> => {
    try {
        const prompt = `You are an AI "Spiritual Curator" agent. Your goal is to provide a single, personalized piece of wisdom for the user based on their recent activity.
        
User's Recent Activity:
- Sermon topics: ${userActivity.recentSermonTopics.join(', ') || 'General interest'}
- Meditation goals: ${userActivity.recentMeditationGoals.join(', ') || 'General interest'}

Based on this, choose ONE piece of wisdom (either a quote from a public domain text like the Tao Te Ching or Meditations, OR a summary of a well-known Biblical Parable). Then, generate a JSON object with:
1.  "source": The name of the source text or parable (e.g., 'Tao Te Ching', 'The Parable of the Good Samaritan').
2.  "excerpt": The quote itself, or a 2-3 sentence summary of the parable.
3.  "historicalContext": A brief overview of the context of the source text or parable.
4.  "relatedQuote": A short, relevant quote that relates to the main excerpt.
5.  "modernApplication": A thoughtful interpretation of how this excerpt applies to modern life.
6.  "relevanceReason": A short (1-sentence) explanation of WHY this piece of wisdom was chosen for the user based on their activity.
7.  "imagePrompt": A rich, artistic prompt for an image generation AI that visually captures the essence of the wisdom.
8.  "audioPrompt": A prompt for a text-to-audio AI to narrate a brief reflection on the excerpt.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        source: { type: Type.STRING },
                        excerpt: { type: Type.STRING },
                        historicalContext: { type: Type.STRING },
                        relatedQuote: { type: Type.STRING },
                        modernApplication: { type: Type.STRING },
                        relevanceReason: { type: Type.STRING },
                        imagePrompt: { type: Type.STRING },
                        audioPrompt: { type: Type.STRING }
                    },
                    required: ['source', 'excerpt', 'historicalContext', 'relatedQuote', 'modernApplication', 'relevanceReason', 'imagePrompt', 'audioPrompt']
                }
            }
        });

        const wisdomData = JSON.parse(response.text);

        const imageResponse = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: wisdomData.imagePrompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '16:9' },
        });

        return {
            ...wisdomData,
            imageUrl: imageResponse.generatedImages?.[0]?.image.imageBytes || '',
        };
    } catch (error) {
        console.error("Error getting Wisdom of the Day:", error);
        return null;
    }
};

export const getBiblicalParable = async (parableName: string): Promise<BiblicalParable | null> => {
    try {
        const prompt = `You are an AI Biblical Scholar. Provide a detailed analysis of the parable: "${parableName}".
        
Your response must be a JSON object containing:
1.  "title": The name of the parable.
2.  "scriptureReference": The primary Bible reference(s) for this parable.
3.  "summary": A concise summary of the parable's story.
4.  "coreTeaching": The central spiritual or moral lesson of the parable.
5.  "modernRelevance": How the parable's teaching can be applied in today's world.
6.  "imagePrompt": A rich, symbolic prompt for an image AI to create artwork representing the parable's theme.
7.  "audioPrompt": A prompt for a text-to-audio AI to narrate a brief reflection on the parable's meaning.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        scriptureReference: { type: Type.STRING },
                        summary: { type: Type.STRING },
                        coreTeaching: { type: Type.STRING },
                        modernRelevance: { type: Type.STRING },
                        imagePrompt: { type: Type.STRING },
                        audioPrompt: { type: Type.STRING },
                    },
                    required: ['title', 'scriptureReference', 'summary', 'coreTeaching', 'modernRelevance', 'imagePrompt', 'audioPrompt']
                }
            }
        });
        
        const parableData = JSON.parse(response.text);
        
        const imageResponse = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: parableData.imagePrompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '16:9' },
        });

        return {
            ...parableData,
            imageUrl: imageResponse.generatedImages?.[0]?.image.imageBytes || '',
        };
    } catch (error) {
        console.error("Error getting Biblical Parable:", error);
        return null;
    }
};

export const getFurtherReading = async (topic: string): Promise<FurtherReading[] | null> => {
    try {
        const prompt = `You are an AI Librarian agent. A user is exploring the topic of "${topic}". Suggest two relevant resources (books or articles) for further reading.
        
Return a JSON array where each object has:
1. "title": The title of the book/article.
2. "author": The author's name.
3. "type": Either "Book" or "Article".
4. "summary": A concise, one-sentence AI-generated summary explaining why it's a good recommendation for this topic.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            author: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ['Book', 'Article'] },
                            summary: { type: Type.STRING },
                        },
                        required: ["title", "author", "type", "summary"]
                    }
                }
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error getting further reading:", error);
        return null;
    }
};

export const generateWisdomAudio = async (prompt: string): Promise<string | null> => {
  try {
    console.log("Generating wisdom audio for prompt:", prompt);
    await new Promise(resolve => setTimeout(resolve, 4000));
    // Using another royalty-free sound for demonstration
    return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3";
  } catch (error) {
    console.error("Error generating wisdom audio:", error);
    return null;
  }
};

export const suggestNarrationStyles = async (textSample: string): Promise<{title: string, description: string}[] | null> => {
  try {
    const prompt = `You are an expert voice director AI. Based on the following text sample, suggest 3 distinct and appropriate narration styles.

For each concept, provide:
1.  title: A short, descriptive title (e.g., "Warm Storyteller", "Clear Announcer").
2.  description: A detailed prompt for a text-to-audio AI, specifying voice gender, tone, and pace (e.g., "A gentle, mature male voice, speaking with a slow, deliberate pace, conveying wisdom and calm.").

Text Sample:
---
${textSample.substring(0, 1000)}...
---

Return a valid JSON array of objects, each with "title" and "description" string properties.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ['title', 'description']
          }
        }
      }
    });

    return JSON.parse(response.text) as {title: string, description: string}[];
  } catch (error) {
    console.error("Error suggesting narration styles:", error);
    return null;
  }
};

export const getMeditationThemes = async (): Promise<MeditationTheme[] | null | 'QUOTA_EXCEEDED'> => {
  try {
    const prompt = `You are The Guiding Light AI. Generate a JSON array of 3 distinct and popular meditation themes. The themes should be inspired by concepts like: love and peace, relaxation, mindfulness, self-love, stress relief, healing, inner peace, calming, positive energy, sleep, and spiritual awakening.

For each theme, provide:
1. "title": A short, inspiring title (e.g., "Inner Peace").
2. "quote": A very short, powerful motivational quote related to the theme.
3. "imagePrompt": A visually striking and descriptive prompt for an image generation AI (like Imagen). The prompt should describe a beautiful, abstract, and colorful scene that evokes the feeling of the theme. Use words like "vibrant colors", "glowing light", "serene", "ethereal". Do not include any text in the image prompt.
`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              quote: { type: Type.STRING },
              imagePrompt: { type: Type.STRING }
            },
            required: ['title', 'quote', 'imagePrompt']
          }
        }
      }
    });

    const themesData = JSON.parse(response.text);

    const themedImages = await Promise.all(
        themesData.map(async (theme: any) => {
            const imageResponse = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: theme.imagePrompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: '1:1',
                },
            });
            const imageBytes = imageResponse.generatedImages?.[0]?.image.imageBytes || '';
            return {
                title: theme.title,
                quote: theme.quote,
                image: imageBytes,
            };
        })
    );

    return themedImages as MeditationTheme[];

  } catch (error) {
    console.error("Error fetching meditation themes:", error);
    if (isQuotaError(error)) {
        return 'QUOTA_EXCEEDED';
    }
    return null;
  }
};

// --- Music Hub Functions ---

export interface SongParameters {
    title: string;
    genre: string;
    mood: string;
    instrumentation: string;
    tempo: string;
    vocals: 'Male Lead' | 'Female Lead' | 'Harmonized Vocals' | 'Rap' | 'None';
}

export const analyzeLyricsAndSuggestSongParameters = async (lyrics: string): Promise<SongParameters | null> => {
  try {
    const genres = ['Pop', 'Rock', 'Folk', 'R&B', 'Gospel', 'Ambient', 'Electronic', 'Acoustic Ballad'];
    const moods = ['Hopeful', 'Melancholic', 'Joyful', 'Reflective', 'Energetic', 'Peaceful', 'Worshipful'];
    const tempos = ['Slow', 'Medium', 'Fast'];
    const instrumentations = ['Piano and Strings', 'Acoustic Guitar', 'Full Band (Drums, Bass, Guitar)', 'Synth Pad and E-Piano', 'Orchestral Ensemble', 'Gospel Choir with Organ'];
    const vocals = ['Male Lead', 'Female Lead', 'Harmonized Vocals', 'Rap', 'None'];

    const prompt = `You are an expert A&R and music producer AI. Analyze the following lyrics to determine the best musical arrangement.

Lyrics:
---
${lyrics.substring(0, 2000)}
---

Based on the theme, emotion, and structure of the lyrics, generate a JSON object with the most fitting parameters for a song.
- "title": A creative and suitable title for the song based on the lyrics.
- "genre": Choose the most appropriate genre from this list: ${genres.join(', ')}.
- "mood": Choose the most fitting mood from this list: ${moods.join(', ')}.
- "instrumentation": Suggest a fitting instrumentation from this list: ${instrumentations.join(', ')}.
- "tempo": Choose the best tempo from this list: ${tempos.join(', ')}.
- "vocals": Choose the most appropriate vocal style from this list: ${vocals.join(', ')}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            genre: { type: Type.STRING },
            mood: { type: Type.STRING },
            instrumentation: { type: Type.STRING },
            tempo: { type: Type.STRING },
            vocals: { type: Type.STRING },
          },
          required: ['title', 'genre', 'mood', 'instrumentation', 'tempo', 'vocals']
        }
      }
    });

    return JSON.parse(response.text) as SongParameters;

  } catch (error) {
    console.error("Error analyzing lyrics:", error);
    return null;
  }
};

export const composeSongFromLyrics = async (lyrics: string, params: SongParameters): Promise<{ artist: string; imageUrl: string; audioUrl: string; videoPrompt: string; } | null | 'QUOTA_EXCEEDED'> => {
    try {
        const aiPrompt = `You are an AI music creative director. A user wants to generate a song from their lyrics.
        
        - Lyrics: "${lyrics.substring(0, 500)}..."
        - Title: "${params.title}"
        - Genre: ${params.genre}
        - Mood: ${params.mood}
        - Instrumentation: ${params.instrumentation}
        - Tempo: ${params.tempo}
        - Vocals: ${params.vocals}

        Generate a JSON object with:
        1. "artist": A plausible-sounding artist name for an AI composer (e.g., "Aura AI", "Lyric Weavers").
        2. "imagePrompt": A rich, artistic prompt for an image generation AI to create album art that visually captures the song's theme and mood.
        3. "videoPrompt": A separate, descriptive prompt for a text-to-video AI to create a short, looping visualizer that matches the music's theme.
        4. "audioPrompt": A detailed prompt for a text-to-audio-with-singing AI. This should describe the full musical arrangement, vocal style, and include the instruction to sing the provided lyrics.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: aiPrompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        artist: { type: Type.STRING },
                        imagePrompt: { type: Type.STRING },
                        videoPrompt: { type: Type.STRING },
                        audioPrompt: { type: Type.STRING }
                    },
                    required: ['artist', 'imagePrompt', 'videoPrompt', 'audioPrompt']
                }
            }
        });

        const { artist, imagePrompt, videoPrompt, audioPrompt } = JSON.parse(response.text);
        console.log("Audio Generation Prompt for Song:", audioPrompt); // For debugging
        
        const imageResponse = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: imagePrompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' },
        });

        const imageUrl = imageResponse.generatedImages?.[0]?.image.imageBytes || '';
        
        // Placeholder for actual lyrics-to-song generation.
        await new Promise(resolve => setTimeout(resolve, 8000)); // Simulate longer generation time for a full song
        const audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3"; 

        return { artist, imageUrl, audioUrl, videoPrompt };

    } catch (error) {
        console.error("Error composing song from lyrics:", error);
        if (isQuotaError(error)) {
            return 'QUOTA_EXCEEDED';
        }
        return null;
    }
};

export const suggestMusicGenre = async (prompt: string): Promise<string | null> => {
  try {
    const genres = ['Cinematic', 'Lo-fi', 'Ambient', 'Electronic', 'Orchestral', 'Jazz', 'Classical', 'New Age', 'World Music', 'Acoustic', 'Minimalist', 'Choral'];
    const aiPrompt = `You are an expert musicologist AI. Based on the following user prompt for a piece of music, suggest the most fitting genre from the provided list. Return only the name of the genre as a single string.

    User Prompt: "${prompt}"

    Available Genres: ${genres.join(', ')}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: aiPrompt,
    });
    
    const suggestedGenre = response.text.trim();
    
    // Find the genre from our list, ignoring case, to return the correct casing.
    const correctCaseGenre = genres.find(g => g.toLowerCase() === suggestedGenre.toLowerCase());
    if (correctCaseGenre) {
        return correctCaseGenre;
    }
    
    console.warn(`AI suggested a genre not in the list: ${suggestedGenre}`);
    return null; // Return null if it's not a valid option from our list

  } catch (error) {
    console.error("Error suggesting music genre:", error);
    return null;
  }
};

export const composeAIMusic = async (prompt: string, genre: string, mood: string, instrumentation: string, tempo: string, vocals: string): Promise<{ title: string; artist: string; imageUrl: string; audioUrl: string; videoPrompt: string; } | null | 'QUOTA_EXCEEDED'> => {
    try {
        const aiPrompt = `You are an AI music composer and creative director. A user wants to generate a piece of music.
        - Prompt: "${prompt}"
        - Genre: ${genre}
        - Mood: ${mood}
        - Instrumentation: ${instrumentation}
        - Tempo: ${tempo}
        - Vocals: ${vocals}

        Generate a JSON object with:
        1. "title": A creative, evocative title for the song.
        2. "artist": A plausible-sounding artist name for an AI composer (e.g., "Aura AI", "Synaptic Soundscapes").
        3. "imagePrompt": A rich, artistic prompt for an image generation AI to create album art that visually captures all the user's inputs. The style should be abstract and beautiful.
        4. "videoPrompt": A separate, highly descriptive prompt for a text-to-video AI (like Veo) to create a short, looping, abstract visualizer that matches the music's theme and mood. Describe colors, motion, and textures.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: aiPrompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        artist: { type: Type.STRING },
                        imagePrompt: { type: Type.STRING },
                        videoPrompt: { type: Type.STRING }
                    },
                    required: ['title', 'artist', 'imagePrompt', 'videoPrompt']
                }
            }
        });

        const { title, artist, imagePrompt, videoPrompt } = JSON.parse(response.text);
        
        const imageResponse = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: imagePrompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' },
        });

        const imageUrl = imageResponse.generatedImages?.[0]?.image.imageBytes || '';
        
        // Placeholder for actual music generation. Return a royalty-free track.
        const audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3";

        return { title, artist, imageUrl, audioUrl, videoPrompt };

    } catch (error) {
        console.error("Error composing music with AI:", error);
        if (isQuotaError(error)) {
            return 'QUOTA_EXCEEDED';
        }
        return null;
    }
};

export const generateMusicSharePost = async (track: AIMusicTrack): Promise<string> => {
  try {
    const prompt = `You are a social media manager AI for "The Guiding Light AI". A user wants to share a piece of music they created.
    
    Music Details:
    - Title: "${track.title}"
    - Artist: "${track.artist}"
    - Prompt: "${track.prompt}"
    
    Create a short, exciting post for social media (like Twitter or Instagram). Mention that it was created with AI and invite others to listen. Include 1-2 relevant hashtags like #AIMusic, #GenerativeMusic.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error generating music share post:", error);
    return `Listen to this new track I created with AI called "${track.title}"! #AIMusic`;
  }
};

export const getMusicInsights = async (genre: string, mood: string, tempo: string): Promise<string> => {
    try {
        const prompt = `You are a music analyst AI. Based on the following musical attributes, provide a single, short (1-2 sentence) insight about its potential use case or popularity.
        - Genre: ${genre}
        - Mood: ${mood}
        - Tempo: ${tempo}
        
        Example: "The combination of a ${mood} mood and ${tempo} tempo in ${genre} music is often associated with enhanced focus and productivity, making it great for studying."
        Return only the insightful sentence.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error getting music insights:", error);
        return "A unique and creative combination!";
    }
};

export const generateMusicVisualizer = async (
  prompt: string,
  colorPalette: string,
  motionIntensity: string,
  onProgress: (progress: number) => void
): Promise<string | null | 'QUOTA_EXCEEDED'> => {
    try {
        const finalVideoPrompt = `Create a short, 8-second, seamlessly looping, abstract music visualizer video. The core theme is: "${prompt}". 
        
        **Visual Style:**
        - **Color Palette:** The video must prominently feature a "${colorPalette}" color scheme.
        - **Motion:** The motion should be "${motionIntensity}", with rhythmic movements that match the theme.
        
        The overall video should be hypnotic and beautiful, focusing on flowing light, abstract textures, and movement. Do not show any people or concrete objects.`;
        
        console.log("Generated Veo Prompt for Visualizer:", finalVideoPrompt);
        // FIX: Pass a default aspect ratio to the updated generateVideoWithVeo function.
        return await generateVideoWithVeo(finalVideoPrompt, onProgress, '1:1');
    } catch (error) {
        console.error("Error in generateMusicVisualizer:", error);
        onProgress(100);
        return null;
    }
};

export const getTrendingTracks = async (): Promise<AIMusicTrack[]> => {
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
    return [
        {
            id: 'trend-1',
            title: 'Celestial Drift',
            artist: 'Starstream AI',
            audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            imageUrl: 'PLACEHOLDER_CELESTIAL', // Placeholder to be replaced
            prompt: 'A calming ambient track for deep space travel, with shimmering synths and a slow, evolving pad.',
            genre: 'Ambient', mood: 'Calm', instrumentation: 'Synth', tempo: 'Slow', vocals: 'None',
            likes: 1253, shares: 234,
            comments: [
                { id: 'c1-1', userName: 'Elena', text: 'This is my new focus music! So beautiful.', createdAt: new Date(Date.now() - 3600000).toISOString() },
                { id: 'c1-2', userName: 'David', text: 'Incredible atmosphere. Perfect for late nights.', createdAt: new Date(Date.now() - 2 * 3600000).toISOString() }
            ],
            createdBy: 'Elena', createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
            id: 'trend-2',
            title: 'Midnight Lo-fi',
            artist: 'Urban Groove AI',
            audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
            imageUrl: 'PLACEHOLDER_LOFI', // Placeholder to be replaced
            prompt: 'A chill lo-fi beat for late night coding sessions, with a simple piano loop and a gentle vinyl crackle.',
            genre: 'Lo-fi', mood: 'Focused', instrumentation: 'Piano', tempo: 'Medium', vocals: 'None',
            likes: 987, shares: 156,
            comments: [
                 { id: 'c2-1', userName: 'Kenji', text: 'This is a vibe.', createdAt: new Date(Date.now() - 5 * 3600000).toISOString() }
            ],
            createdBy: 'David', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
            id: 'trend-3',
            title: 'Gospel Morning',
            artist: 'Spirit Singers AI',
            audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
            imageUrl: 'PLACEHOLDER_GOSPEL',
            prompt: 'An uplifting gospel choir performance with a powerful lead vocal and organ accompaniment.',
            genre: 'Gospel', mood: 'Uplifting', instrumentation: 'Choir', tempo: 'Medium', vocals: 'Female',
            likes: 2104, shares: 450,
            comments: [
                { id: 'c3-1', userName: 'Maria', text: 'This gives me chills! So powerful.', createdAt: new Date(Date.now() - 4 * 3600000).toISOString() },
            ],
            createdBy: 'Maria', createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
        {
            id: 'trend-4',
            title: 'Forest Awakening',
            artist: 'NatureSynth',
            audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
            imageUrl: 'PLACEHOLDER_NATURE',
            prompt: 'A gentle new age track with sounds of birds, a flowing stream, and soft pan flutes.',
            genre: 'New Age', mood: 'Peaceful', instrumentation: 'Flute', tempo: 'Slow', vocals: 'None',
            likes: 850, shares: 120,
            comments: [],
            createdBy: 'Kenji', createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        },
        {
            id: 'trend-5',
            title: 'Cybernetic Dreams',
            artist: 'Dataflow',
            audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
            imageUrl: 'PLACEHOLDER_CYBER',
            prompt: 'An energetic electronic track with a driving beat, arpeggiated synths, and a futuristic vibe.',
            genre: 'Electronic', mood: 'Energetic', instrumentation: 'Synth', tempo: 'Fast', vocals: 'None',
            likes: 1532, shares: 310,
            comments: [
                { id: 'c5-1', userName: 'David', text: 'Perfect for a workout!', createdAt: new Date(Date.now() - 6 * 3600000).toISOString() },
            ],
            createdBy: 'David', createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
        {
            id: 'trend-6',
            title: 'Acoustic Heart',
            artist: 'Lyric Weavers AI',
            audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
            imageUrl: 'PLACEHOLDER_ACOUSTIC',
            prompt: 'A simple and heartfelt acoustic ballad with a male vocalist and gentle guitar strumming.',
            genre: 'Acoustic', mood: 'Reflective', instrumentation: 'Acoustic Guitar', tempo: 'Slow', vocals: 'Male',
            likes: 1899, shares: 350,
            comments: [
                { id: 'c6-1', userName: 'Elena', text: 'So touching and raw.', createdAt: new Date(Date.now() - 7 * 3600000).toISOString() },
            ],
            createdBy: 'Elena', createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        }
    ];
};


export const getCuratedPlaylists = async (): Promise<Playlist[] | null> => {
    try {
        const prompt = `You are an AI music curator. Generate a JSON array of 4 diverse, curated playlists for a spiritual and wellness app.

For each playlist, provide:
1. "title": A catchy, evocative title (e.g., "Deep Focus Lo-fi", "Sunrise Meditation Ambient").
2. "description": A detailed and evocative description (2-3 sentences) that captures the playlist's mood, ideal use case (e.g., 'perfect for late-night study sessions or quiet mornings'), and the feeling it evokes.
3. "imagePrompt": A visually rich prompt for an image AI to create beautiful cover art. The style should be painterly or abstract.
4. "searchTerms": A simple, effective search query string that would find music for this playlist (e.g., "calm ambient instrumental", "upbeat lo-fi for study").`;
    
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                            imagePrompt: { type: Type.STRING },
                            searchTerms: { type: Type.STRING },
                        },
                        required: ["title", "description", "imagePrompt", "searchTerms"]
                    }
                }
            }
        });
        const playlistsData = JSON.parse(response.text);

        const playlistsWithImages = await Promise.all(
            playlistsData.map(async (playlist: any) => {
                const imageResponse = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: playlist.imagePrompt,
                    config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' },
                });
                const imageBytes = imageResponse.generatedImages?.[0]?.image.imageBytes || '';
                return {
                    title: playlist.title,
                    description: playlist.description,
                    imageUrl: imageBytes,
                    searchTerms: playlist.searchTerms,
                };
            })
        );
        return playlistsWithImages as Playlist[];
    } catch (error) {
        console.error("Error getting curated playlists:", error);
        return null;
    }
};

export const generateSoundscape = async (category: string, duration: string): Promise<{ videoPrompt: string; audioPrompt: string; title: string } | null> => {
    try {
        const prompt = `You are an AI sound and visualscape designer. A user wants to generate an ambient soundscape based on the category: "${category}".

Generate a JSON object with:
1. "title": A serene title for the experience (e.g., "Rainforest Canopy", "Cosmic Voyage").
2. "videoPrompt": A highly descriptive prompt for a text-to-video AI to create a long, seamless, looping video of the scene. It should be beautiful and calming.
3. "audioPrompt": A prompt for a text-to-audio AI describing the ambient sounds for a seamless, looping ${duration} audio track (e.g., "Gentle rain, distant thunder, sounds of birds and insects in a lush rainforest.").`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        videoPrompt: { type: Type.STRING },
                        audioPrompt: { type: Type.STRING },
                    },
                    required: ["title", "videoPrompt", "audioPrompt"]
                }
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error generating soundscape prompts:", error);
        return null;
    }
};

/**
 * Mocks the generation of a long, looping ambient audio track.
 * In a real application, this would call an AI audio generation service.
 * The delay is increased for longer requested durations to simulate a longer creation time.
 * This mock returns different audio tracks for different durations to simulate variety.
 */
export const generateAmbientAudio = async (prompt: string, duration: string): Promise<string | null> => {
  try {
    console.log("Generating ambient audio for prompt:", prompt);
    let delay = 5000; // Default for 1 minute
    let audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"; // Default track

    if (duration.includes('5')) {
        delay = 10000;
        audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3"; // Different track for 5 mins
    }
    if (duration.includes('10')) {
        delay = 15000;
        audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3"; // Different track for 10 mins
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Using royalty-free sounds for demonstration. In a real scenario, the returned URL would point to the newly generated audio of the correct length.
    return audioUrl;
  } catch (error) {
    console.error("Error generating ambient audio:", error);
    return null;
  }
};


export const searchCopyrightFreeMusic = async (query: string): Promise<LibraryMusicTrack[] | null> => {
    try {
        const prompt = `You are an AI music librarian. Find 5 copyright-free songs matching the query "${query}".
        
Search public domain and royalty-free music sites like Pixabay, Free Music Archive, etc. For each song, provide a plausible fictional 'title', 'artist', and 'source' (e.g., 'Pixabay', 'YouTube Audio Library').
Most importantly, for 'audioUrl', you MUST use one of the following real, playable placeholder mp3 URLs from soundhelix.com:
- https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3
- https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3
- https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3
- https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3
- https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3

Return a valid JSON array of objects.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            artist: { type: Type.STRING },
                            source: { type: Type.STRING },
                            audioUrl: { type: Type.STRING }
                        },
                        required: ["title", "artist", "source", "audioUrl"]
                    }
                }
            }
        });

        return JSON.parse(response.text) as LibraryMusicTrack[];

    } catch (error) {
        console.error("Error searching for copyright-free music:", error);
        return null;
    }
};

export const suggestSermonTopics = async (activity: {
    sermonHistory: string[];
    meditationHistory: string[];
}): Promise<string[] | null> => {
    try {
        const prompt = `You are an AI assistant for spiritual leaders called "The Guiding Light AI". Your task is to suggest 4 creative and relevant sermon topics.

Consider two sources of inspiration:
1.  **User's Recent Activity:** The user has recently created sermons on "${activity.sermonHistory.join(', ') || 'various topics'}" and meditated on "${activity.meditationHistory.join(', ') || 'various themes'}". Use this to generate 2 personalized suggestions.
2.  **Current Spiritual Trends:** Based on general spiritual, philosophical, and well-being discussions happening in the world today, generate 2 broader, trending topics.

The topics should be concise and engaging (e.g., "Finding Stillness in a Noisy World", "The Courage to Forgive", "Navigating Change with Grace").

Return a valid JSON array of 4 unique strings.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                }
            }
        });
        
        try {
            const jsonText = response.text;
            return JSON.parse(jsonText);
        } catch(e) {
            console.error("Failed to parse sermon topic suggestions JSON:", e, "Raw text:", response.text);
            return null;
        }

    } catch (error) {
        console.error("Error suggesting sermon topics:", error);
        return null;
    }
};

// --- NEWLY ADDED FUNCTIONS TO FIX ERRORS ---

// FIX: Add generateImage function to create images using Imagen.
export const generateImage = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4"): Promise<string | null> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio,
            },
        });
        
        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        }
        return null;
    } catch (error) {
        console.error("Error generating image:", error);
        return null;
    }
};

// FIX: Add analyzeImage function for multimodal queries with images.
export const analyzeImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string | null> => {
    try {
        const imagePart = { inlineData: { data: base64Image, mimeType: mimeType } };
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });

        return response.text;
    } catch (error) {
        console.error("Error analyzing image:", error);
        return null;
    }
};

// FIX: Add analyzeVideo function for multimodal queries with videos.
export const analyzeVideo = async (base64Video: string, mimeType: string, prompt: string): Promise<string | null> => {
    try {
        const videoPart = { inlineData: { data: base64Video, mimeType: mimeType } };
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [videoPart, textPart] },
        });

        return response.text;
    } catch (error) {
        console.error("Error analyzing video:", error);
        return null;
    }
};

// FIX: Add transcribeAudio function to handle audio-to-text transcription.
export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string | null> => {
    try {
        const audioPart = { inlineData: { data: base64Audio, mimeType: mimeType } };
        const textPart = { text: "Transcribe this audio." };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, textPart] },
        });

        return response.text;
    } catch (error) {
        console.error("Error transcribing audio:", error);
        return null;
    }
};


// --- TEXT TO SPEECH ---

const generateTextToSpeechAudio = async (text: string, style: string): Promise<string | null> => {
  try {
    const decode = (base64: string): Uint8Array => {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }

    const pcmToWav = (pcmData: Uint8Array): Blob => {
      const sampleRate = 24000;
      const numChannels = 1;
      const bitsPerSample = 16;
      const pcm = new Int16Array(pcmData.buffer);
      const format = 1; // PCM
      const subChunk1Size = 16;
      const blockAlign = (numChannels * bitsPerSample) / 8;
      const byteRate = sampleRate * blockAlign;
      const subChunk2Size = pcm.length * (bitsPerSample / 8);
      const chunkSize = 36 + subChunk2Size;
      const buffer = new ArrayBuffer(44 + subChunk2Size);
      const view = new DataView(buffer);
      const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      }
      writeString(view, 0, 'RIFF');
      view.setUint32(4, chunkSize, true);
      writeString(view, 8, 'WAVE');
      writeString(view, 12, 'fmt ');
      view.setUint32(16, subChunk1Size, true);
      view.setUint16(20, format, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitsPerSample, true);
      writeString(view, 36, 'data');
      view.setUint32(40, subChunk2Size, true);
      let offset = 44;
      for (let i = 0; i < pcm.length; i++, offset += 2) {
          view.setInt16(offset, pcm[i], true);
      }
      return new Blob([view], { type: 'audio/wav' });
    }

    const localAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Narrate with a ${style} voice: ${text.substring(0, 5000)}`; // Truncate long texts
    let voiceName = 'Zephyr'; // Gentle female default
    if (style.toLowerCase().includes('male')) { voiceName = 'Puck'; }
    else if (style.toLowerCase().includes('authoritative') || style.toLowerCase().includes('scholarly')) { voiceName = 'Kore'; }

    const response = await localAi.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName as any } },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const pcmData = decode(base64Audio);
      const wavBlob = pcmToWav(pcmData);
      return URL.createObjectURL(wavBlob);
    }
    return null;
  } catch (error) {
    if (isQuotaError(error)) { console.warn("TTS generation quota exceeded.", error); }
    else { console.error("Error generating text to speech audio:", error); }
    return null;
  }
};

export const generateSermonAudio = async (sermonText: string, style: string): Promise<string | null> => {
    return generateTextToSpeechAudio(sermonText, style);
};

export const generatePrayerAudio = async (prayerText: string, style: string): Promise<string | null> => {
    return generateTextToSpeechAudio(prayerText, style);
};

export const generateMeditationAudio = async (scriptText: string, style: string): Promise<string | null> => {
    return generateTextToSpeechAudio(scriptText, style);
};

export const generateNarration = async (textToNarrate: string, style: string): Promise<string | null> => {
    return generateTextToSpeechAudio(textToNarrate, style);
};